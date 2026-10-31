import { getSites } from '../tools/getSites.js';
import { getWeather, getExtendedWeather } from '../tools/getWeather.js';
import { degreesToCardinal, getSiteWindScore, isWindSpeedFlyable, scoreFlyingConditions } from '../utils/windUtils.js';
import { getAiWeeklyVerdicts } from '../services/aiVerdict.js';

export const analyzeFlyingConditionsDeclaration = {
    name: 'analyze_flying_conditions',
    description: 'Analyze whether flying conditions are safe and suitable at one or more paragliding sites. Combines site-specific wind direction requirements with current and forecast weather data to produce GO/MARGINAL/NO-GO ratings with detailed reasoning.',
    parameters: {
        type: 'object',
        properties: {
            lat: { type: 'number', description: 'Latitude to search for sites' },
            lng: { type: 'number', description: 'Longitude to search for sites' },
            distance: { type: 'number', description: 'Search radius in km (default 30)' },
            siteName: { type: 'string', description: 'Optional: filter to a specific site name' },
        },
        required: ['lat', 'lng'],
    },
};

export async function analyzeFlyingConditions({
    lat,
    lng,
    distance = 30,
    siteName,
    apiKey = null,
    provider = 'gemini',
    preferredModel = null,
    pilotProfile = null,
}) {
    const [sites, weather] = await Promise.all([
        getSites({ lat, lng, distance, limit: 10 }),
        getWeather({ lat, lng }),
    ]);

    const current = weather.current;
    const windDir = current.windDirection10m;
    const windSpeed = current.windSpeed10m;
    const windGusts = current.windGusts;
    const cloudCover = current.cloudCover;
    const visibility = current.visibility;
    const precipitation = current.precipitation;

    const windCardinal = degreesToCardinal(windDir);

    let targetSites = sites;
    if (siteName) {
        targetSites = sites.filter(s =>
            s.name.toLowerCase().includes(siteName.toLowerCase())
        );
        if (targetSites.length === 0) targetSites = sites;
    }

    const today = new Date().toISOString().slice(0, 10);

    // Only fetch 7-day extended weather for AI verdict if a cloud API key is available
    let extendedWeather7d = null;
    if (apiKey && provider !== 'webai') {
        try {
            extendedWeather7d = await getExtendedWeather(lat, lng);
        } catch (e) {
            console.warn('[analyzeFlyingConditions] 7-day weather fetch failed:', e.message);
        }
    }

    const analyses = await Promise.all(targetSites.map(async site => {
        const windCheck = isWindSpeedFlyable(windSpeed, windGusts, site.siteTypes);
        const windScore = getSiteWindScore(site.windDirections, windDir);
        const conditions = scoreFlyingConditions({ windScore, windCheck, cloudCover, visibility, precipitation });

        let aiVerdict = null;
        if (apiKey && provider !== 'webai') {
            try {
                const weatherForVerdict = extendedWeather7d || { hourly: weather.hourly, units: weather.units };
                const verdicts = await getAiWeeklyVerdicts(site, weatherForVerdict, apiKey, pilotProfile, provider, preferredModel);
                aiVerdict = verdicts?.[today] || null;
            } catch (e) {
                console.warn('[analyzeFlyingConditions] AI verdict fetch failed:', e.message);
            }
        }

        const effectiveRating = (aiVerdict && !aiVerdict._fallback) ? aiVerdict.rating : conditions.rating;

        return {
            site: {
                name: site.name,
                lat: site.lat,
                lng: site.lng,
                altitude: site.altitude,
                siteTypes: site.siteTypes,
                windDirections: site.windDirections,
                distanceFromSearch: site.distanceFromSearch,
            },
            analysis: {
                rating: effectiveRating,
                ruleBasedRating: conditions.rating,
                windDirection: windCardinal,
                windScore,
                windSpeedKmh: windSpeed,
                gustsKmh: windGusts,
                windCategory: windCheck.category,
                cloudCover,
                visibilityM: visibility,
                precipitationMmH: precipitation,
                positives: conditions.positives,
                issues: conditions.issues,
                summary: buildSummary(site.name, site.altitude || 0, effectiveRating, conditions.issues, conditions.positives, windCardinal, windSpeed, aiVerdict),
            },
            aiVerdict: aiVerdict && !aiVerdict._fallback ? aiVerdict : null,
            weather: {
                current: weather.current,
                hourly: weather.hourly,
                units: weather.units,
            },
        };
    }));

    return {
        timestamp: new Date().toISOString(),
        location: { lat, lng },
        analysisType: apiKey ? `AI-powered (${provider} weekly forecast)` : 'Rule-based meteorological analysis',
        currentConditions: {
            windDirection: windCardinal,
            windDegrees: windDir,
            windSpeedKmh: windSpeed,
            gustsKmh: windGusts,
            cloudCover,
            visibilityMi: visibility / 1609.34,
            precipitation,
            temperature: current.temperature,
            humidity: current.humidity,
            pressure: current.pressure,
        },
        sites: analyses,
    };
}

function buildSummary(siteName, siteAltitude, rating, issues, positives, windDir, windSpeed, aiVerdict = null) {
    const emoji = { GO: '✅', MARGINAL: '⚠️', NO_GO: '🚫' }[rating] || '⚠️';
    const label = { GO: 'GO — Great flying conditions!', MARGINAL: 'MARGINAL — Fly with caution', NO_GO: 'NO-GO — Not safe to fly' }[rating] || rating;

    let text = `${emoji} **${siteName}**: ${label}\n`;
    text += `Current wind at launch (~${siteAltitude + 33}ft ASL): ${windDir} at ${windSpeed.toFixed(0)} mph\n`;

    if (aiVerdict && !aiVerdict._fallback) {
        if (aiVerdict.headline) text += `AI Assessment: ${aiVerdict.headline}\n`;
        if (aiVerdict.reasoning) text += `Reasoning: ${aiVerdict.reasoning}\n`;
        if (aiVerdict.bestWindow) text += `Best window: ${aiVerdict.bestWindow}\n`;
        if (aiVerdict.siteModeLabel) text += `Site mode: ${aiVerdict.siteModeLabel}\n`;
    } else {
        if (issues.length > 0) text += `Issues: ${issues.join('; ')}\n`;
        if (positives.length > 0 && rating !== 'NO_GO') text += `Positives: ${positives.join('; ')}`;
    }
    return text;
}

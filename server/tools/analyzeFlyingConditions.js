import { getSites } from '../tools/getSites.js';
import { getWeather } from '../tools/getWeather.js';
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

export async function analyzeFlyingConditions({ lat, lng, distance = 30, siteName }) {
    // Fetch sites and weather in parallel
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

    // Filter by site name if provided
    let targetSites = sites;
    if (siteName) {
        targetSites = sites.filter(s =>
            s.name.toLowerCase().includes(siteName.toLowerCase())
        );
        if (targetSites.length === 0) targetSites = sites; // fallback to all
    }

    const today = new Date().toISOString().slice(0, 10);

    // Fetch 7-day extended weather for AI verdict generation.
    // getAiWeeklyVerdicts needs full week data; getWeather only returns 2 days/12h.
    // The aiVerdict cache (keyed per site+date, 6h TTL) means this extra fetch is
    // a one-time cost — warm if the Forecast Panel was already opened.
    let extendedWeather7d = null;
    try {
        const axios = (await import('axios')).default;
        const resp = await axios.get('https://api.open-meteo.com/v1/forecast', {
            params: {
                latitude: lat, longitude: lng,
                hourly: 'wind_speed_10m,wind_gusts_10m,wind_direction_10m,cloud_cover,visibility,precipitation',
                forecast_days: 7,
                timezone: 'auto',
                wind_speed_unit: 'mph',
            },
            timeout: 10000,
        });
        const h = resp.data.hourly;
        extendedWeather7d = {
            hourly: {
                times: h.time,
                windSpeed10m: h.wind_speed_10m,
                windGusts: h.wind_gusts_10m,
                windDirection10m: h.wind_direction_10m,
                cloudCover: h.cloud_cover,
                visibility: h.visibility,
                precipitation: h.precipitation,
            },
        };
    } catch (e) {
        console.warn('[analyzeFlyingConditions] 7-day weather fetch failed, AI verdict may use cache:', e.message);
    }

    // For each site, compute rule-based analysis AND fetch AI verdict in parallel
    const analyses = await Promise.all(targetSites.map(async site => {
        const windCheck = isWindSpeedFlyable(windSpeed, windGusts, site.siteTypes);
        const windScore = getSiteWindScore(site.windDirections, windDir);
        const conditions = scoreFlyingConditions({ windScore, windCheck, cloudCover, visibility, precipitation });

        // Fetch AI weekly verdicts for this site — use 7-day data when available
        let aiVerdict = null;
        try {
            const weatherForVerdict = extendedWeather7d || { hourly: weather.hourly, units: weather.units };
            const verdicts = await getAiWeeklyVerdicts(site, weatherForVerdict);
            aiVerdict = verdicts?.[today] || null;
        } catch (e) {
            console.warn('[analyzeFlyingConditions] AI verdict fetch failed:', e.message);
        }

        // Prefer AI verdict rating when available and not a fallback
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
            // Include full AI verdict so Gemini presents it as the authoritative source
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
        analysisType: 'AI-powered (backed by Gemini weekly forecast)',
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

    // Prefer AI verdict's headline and reasoning when available
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

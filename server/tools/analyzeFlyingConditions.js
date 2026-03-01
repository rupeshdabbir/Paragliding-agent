import { getSites } from '../tools/getSites.js';
import { getWeather } from '../tools/getWeather.js';
import { degreesToCardinal, getSiteWindScore, isWindSpeedFlyable, scoreFlyingConditions } from '../utils/windUtils.js';

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
    const windCheck = isWindSpeedFlyable(windSpeed, windGusts);

    // Filter by site name if provided
    let targetSites = sites;
    if (siteName) {
        targetSites = sites.filter(s =>
            s.name.toLowerCase().includes(siteName.toLowerCase())
        );
        if (targetSites.length === 0) targetSites = sites; // fallback to all
    }

    const analyses = targetSites.map(site => {
        const windScore = getSiteWindScore(site.windDirections, windDir);
        const conditions = scoreFlyingConditions({ windScore, windCheck, cloudCover, visibility, precipitation });

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
                rating: conditions.rating,
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
                summary: buildSummary(site.name, conditions.rating, conditions.issues, conditions.positives, windCardinal, windSpeed),
            },
            weather: {
                current: weather.current,
                hourly: weather.hourly,
                units: weather.units,
            },
        };
    });

    return {
        timestamp: new Date().toISOString(),
        location: { lat, lng },
        currentConditions: {
            windDirection: windCardinal,
            windDegrees: windDir,
            windSpeedKmh: windSpeed,
            gustsKmh: windGusts,
            cloudCover,
            visibilityKm: visibility / 1000,
            precipitation,
            temperature: current.temperature,
            humidity: current.humidity,
            pressure: current.pressure,
        },
        sites: analyses,
    };
}

function buildSummary(siteName, rating, issues, positives, windDir, windSpeed) {
    const emoji = { GO: '✅', MARGINAL: '⚠️', NO_GO: '🚫' }[rating];
    const label = { GO: 'GO — Great flying conditions!', MARGINAL: 'MARGINAL — Fly with caution', NO_GO: 'NO-GO — Not safe to fly' }[rating];

    let text = `${emoji} **${siteName}**: ${label}\n`;
    text += `Current wind: ${windDir} at ${windSpeed.toFixed(0)} mph\n`;

    if (issues.length > 0) {
        text += `Issues: ${issues.join('; ')}\n`;
    }
    if (positives.length > 0 && rating !== 'NO_GO') {
        text += `Positives: ${positives.join('; ')}`;
    }
    return text;
}

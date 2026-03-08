import express from 'express';
import { getSites } from '../tools/getSites.js';
import { getExtendedWeather } from '../tools/getWeather.js';
import { degreesToCardinal, getSiteWindScore, isWindSpeedFlyable, scoreFlyingConditions } from '../utils/windUtils.js';
import { getAiWeeklyVerdicts } from '../services/aiVerdict.js';

const router = express.Router();

/**
 * GET /api/forecast?lat=&lng=
 * Returns 7-day hourly forecast with per-hour and per-day flyability analysis for a site
 */
router.get('/', async (req, res) => {
    const { lat, lng, siteLat, siteLng, models = 'best_match' } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required' });

    const fLat = parseFloat(lat);
    const fLng = parseFloat(lng);

    // Use site coords for weather if provided, otherwise use query coords
    const weatherLat = siteLat ? parseFloat(siteLat) : fLat;
    const weatherLng = siteLng ? parseFloat(siteLng) : fLng;

    try {
        // Fetch nearby sites and weather in parallel
        const [sites, rawWeather] = await Promise.all([
            getSites({ lat: fLat, lng: fLng, distance: 5, limit: 3 }),
            getExtendedWeather(weatherLat, weatherLng, models),
        ]);

        // Pick the closest/most relevant site for wind direction analysis
        const site = sites[0];
        const windDirections = site?.windDirections || {};

        // Build per-hour analysis for all 7 days (168 hours)
        const hourlyAnalysis = rawWeather.hourly.times.map((time, i) => {
            const windDir = rawWeather.hourly.windDirection10m[i] ?? 0;
            const windSpeed = rawWeather.hourly.windSpeed10m[i] ?? 0;
            const windGusts = rawWeather.hourly.windGusts[i] ?? 0;
            const cloudCover = rawWeather.hourly.cloudCover[i] ?? 0;
            const visibility = rawWeather.hourly.visibility[i] ?? 10000;
            const precipitation = rawWeather.hourly.precipitation[i] ?? 0;

            const windScore = getSiteWindScore(windDirections, windDir);
            const windCheck = isWindSpeedFlyable(windSpeed, windGusts, site?.siteTypes);
            const conditions = scoreFlyingConditions({ windScore, windCheck, cloudCover, visibility, precipitation });

            return {
                time,
                hour: new Date(time).getHours(),
                windSpeed10m: windSpeed,
                windSpeed80m: rawWeather.hourly.windSpeed80m?.[i],
                windSpeed120m: rawWeather.hourly.windSpeed120m?.[i],
                windSpeed180m: rawWeather.hourly.windSpeed180m?.[i],
                windDirection: windDir,
                windDirectionCardinal: degreesToCardinal(windDir),
                windGusts,
                cloudCover,
                visibility,
                precipitation,
                temperature: rawWeather.hourly.temperature?.[i],
                humidity: rawWeather.hourly.humidity?.[i],
                pressure: rawWeather.hourly.pressure?.[i],
                weatherCode: rawWeather.hourly.weatherCode?.[i],
                windScore,
                rating: conditions.rating,
                issues: conditions.issues,
                positives: conditions.positives,
            };
        });

        // Group by day
        const dayGroups = {};
        hourlyAnalysis.forEach(h => {
            const date = h.time.slice(0, 10);
            if (!dayGroups[date]) dayGroups[date] = [];
            dayGroups[date].push(h);
        });

        // Per-day summary
        const days = Object.entries(dayGroups).map(([date, hours]) => {
            const flyableHours = hours.filter(h => h.rating === 'GO');
            const marginalHours = hours.filter(h => h.rating === 'MARGINAL');
            const dayLightHours = hours.filter(h => h.hour >= 7 && h.hour <= 19);
            const flyableDaylight = dayLightHours.filter(h => h.rating === 'GO');

            // Find best window (longest consecutive GO block during daylight)
            let bestWindowStart = null, bestWindowEnd = null;
            let maxRun = 0, currentRun = 0, runStart = null;
            dayLightHours.forEach(h => {
                if (h.rating === 'GO') {
                    if (currentRun === 0) runStart = h.time;
                    currentRun++;
                    if (currentRun > maxRun) {
                        maxRun = currentRun;
                        bestWindowStart = runStart;
                        bestWindowEnd = h.time;
                    }
                } else {
                    currentRun = 0;
                }
            });

            // Overall day rating
            const goCount = flyableDaylight.length;
            const totalCount = dayLightHours.length;
            let dayRating;
            if (goCount === 0) dayRating = 'NO_GO';
            else if (goCount >= totalCount * 0.5) dayRating = 'GO';
            else dayRating = 'MARGINAL';

            // Peak wind
            const windSpeeds = dayLightHours.map(h => h.windSpeed10m);
            const maxWind = Math.max(...windSpeeds);
            const avgWind = windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length;

            return {
                date,
                dayRating,
                goHours: flyableHours.length,
                marginalHours: marginalHours.length,
                flyableDaylightHours: flyableDaylight.length,
                totalDaylightHours: dayLightHours.length,
                bestWindowStart,
                bestWindowEnd,
                bestWindowHours: maxRun,
                maxWindMph: Math.round(maxWind),
                avgWindMph: Math.round(avgWind),
                hours,
            };
        });

        // Get AI verdicts for all 7 days in a single LLM call (non-blocking, cached, provider-aware)
        // Accept new unified header or legacy gemini-specific header
        const apiKey = req.headers['x-ai-api-key'] || req.headers['x-gemini-api-key'] || null;
        const provider = (req.headers['x-ai-provider'] || 'gemini').toLowerCase();
        let pilotProfile = null;
        const profileHeader = req.headers['x-pilot-profile'];
        if (profileHeader && profileHeader.trim()) {
            try { pilotProfile = JSON.parse(profileHeader); } catch { /* ignore */ }
        }

        // Short-circuit AI analysis if the user has not provided a BYOK API key.
        const aiVerdicts = (site && apiKey)
            ? await getAiWeeklyVerdicts(site, rawWeather, apiKey, pilotProfile, provider)
            : null;

        // For convenience also include the today verdict at the top level
        const today = new Date().toISOString().slice(0, 10);
        const aiVerdict = aiVerdicts?.[today] || null;

        res.json({
            site: site ? { name: site.name, description: site.description, windDirections: site.windDirections, lat: site.lat, lng: site.lng, altitude: site.altitude, siteTypes: site.siteTypes } : null,
            current: rawWeather.current,
            days,
            units: rawWeather.units,
            aiVerdict,        // today's verdict (for backward compat)
            aiVerdicts,       // full map: { [date]: verdict } for all 7 days
        });
    } catch (err) {
        console.error('[forecast]', err.message);
        res.status(500).json({ error: err.message });
    }
});


export default router;

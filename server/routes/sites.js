import express from 'express';
import { analyzeFlyingConditions } from '../tools/analyzeFlyingConditions.js';
import { getSites } from '../tools/getSites.js';
import { getWeather } from '../tools/getWeather.js';

const router = express.Router();

// GET /api/sites?lat=&lng=&distance=&limit=
router.get('/', async (req, res) => {
    const { lat, lng, distance = 50, limit = 10 } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required' });

    try {
        const sites = await getSites({ lat: parseFloat(lat), lng: parseFloat(lng), distance: parseFloat(distance), limit: parseInt(limit) });

        // Enrich each site with current weather + analysis
        const weather = await getWeather({ lat: parseFloat(lat), lng: parseFloat(lng) });
        const { getSiteWindScore, isWindSpeedFlyable, scoreFlyingConditions } = await import('../utils/windUtils.js');

        // Use today's daylight-hour average (7am–7pm) instead of a single current snapshot.
        // This aligns with how /api/forecast computes dayRating, avoiding rating inconsistencies.
        const today = new Date().toISOString().slice(0, 10);
        const daylightIndices = weather.hourly.times
            .map((t, i) => ({ t, i }))
            .filter(({ t }) => {
                const hr = parseInt(t.slice(11, 13), 10);
                return t.startsWith(today) && hr >= 7 && hr <= 19;
            });

        const enriched = sites.map(site => {
            // Fall back to current snapshot if no daylight hours are in the forecast window
            // (e.g. called after dark when today's flying hours are no longer in the slice)
            if (daylightIndices.length === 0) {
                const windCheck = isWindSpeedFlyable(weather.current.windSpeed10m, weather.current.windGusts, site.siteTypes);
                const windScore = getSiteWindScore(site.windDirections, weather.current.windDirection10m);
                const conditions = scoreFlyingConditions({
                    windScore, windCheck,
                    cloudCover: weather.current.cloudCover,
                    visibility: weather.current.visibility,
                    precipitation: weather.current.precipitation,
                });
                return { ...site, rating: conditions.rating, windScore };
            }

            let goCount = 0;
            const total = daylightIndices.length;
            let representativeWindScore = 0;

            for (const { i } of daylightIndices) {
                const windSpeed = weather.hourly.windSpeed10m[i] ?? 0;
                const windGusts = weather.hourly.windGusts[i] ?? 0;
                const windDir = weather.hourly.windDirection10m[i] ?? 0;
                const cloudCover = weather.hourly.cloudCover[i] ?? 0;
                const visibility = weather.hourly.visibility[i] ?? 10000;
                const precipitation = weather.hourly.precipitation[i] ?? 0;

                const windCheck = isWindSpeedFlyable(windSpeed, windGusts, site.siteTypes);
                const windScore = getSiteWindScore(site.windDirections, windDir);
                const conditions = scoreFlyingConditions({ windScore, windCheck, cloudCover, visibility, precipitation });

                if (conditions.rating === 'GO') goCount++;
                if (windScore > representativeWindScore) representativeWindScore = windScore;
            }

            // Same threshold logic as forecast.js lines 108–110
            let rating;
            if (goCount === 0) rating = 'NO_GO';
            else if (goCount >= total * 0.5) rating = 'GO';
            else rating = 'MARGINAL';

            return { ...site, rating, windScore: representativeWindScore };
        });

        res.json({ sites: enriched, weather: weather.current });
    } catch (err) {
        console.error('[sites] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

export default router;

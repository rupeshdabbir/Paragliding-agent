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

        const current = weather.current;
        const windDir = current.windDirection10m;
        const windCheck = isWindSpeedFlyable(current.windSpeed10m, current.windGusts);

        const enriched = sites.map(site => {
            const windScore = getSiteWindScore(site.windDirections, windDir);
            const conditions = scoreFlyingConditions({
                windScore, windCheck,
                cloudCover: current.cloudCover,
                visibility: current.visibility,
                precipitation: current.precipitation,
            });
            return { ...site, rating: conditions.rating, windScore };
        });

        res.json({ sites: enriched, weather: weather.current });
    } catch (err) {
        console.error('[sites] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

export default router;

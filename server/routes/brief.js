import express from 'express';
import { getSites } from '../tools/getSites.js';
import { getExtendedWeather } from '../tools/getWeather.js';
import { getRegionalComparativeVerdict } from '../services/aiVerdict.js';

const router = express.Router();

/**
 * GET /api/brief?lat=&lng=&radius=
 * Returns a ranked "Morning Brief" of nearby paragliding sites.
 */
router.get('/', async (req, res) => {
    const { lat, lng, radius = 80, favorites } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required' });

    const fLat = parseFloat(lat);
    const fLng = parseFloat(lng);
    const fRadius = parseFloat(radius);

    try {
        // 1. Parse favorites
        let favSites = [];
        try {
            if (favorites) {
                favSites = JSON.parse(favorites);
                // Mark them as starred
                favSites = favSites.map(s => ({ ...s, starred: true }));
            }
        } catch (e) {
            console.error('[brief] Failed to parse favorites:', e.message);
        }

        // 2. Get nearby sites
        const nearbySites = await getSites({ lat: fLat, lng: fLng, distance: fRadius, limit: 15 });

        // 3. Combine and prioritize: Favorites first, then nearby, no duplicates
        const combined = [...favSites];
        for (const site of nearbySites) {
            if (combined.length >= 4) break;
            const isDuplicate = combined.some(s => s.id === site.id || (s.lat === site.lat && s.lng === site.lng));
            if (!isDuplicate) {
                combined.push(site);
            }
        }

        const topSites = combined.slice(0, 4);

        if (topSites.length === 0) {
            return res.json({
                regionHeadline: "No paragliding sites found in your area.",
                siteOfDay: null,
                rankings: [],
                overallSafetyNote: "Try broadening your search radius."
            });
        }

        // 4. Fetch weather for each site in parallel
        const sitesWithWeather = await Promise.all(topSites.map(async (site) => {
            try {
                const weather = await getExtendedWeather(site.lat, site.lng);
                return { site, weather };
            } catch (err) {
                console.error(`[brief] Failed to fetch weather for ${site.name}:`, err.message);
                return null;
            }
        }));

        const validSitesData = sitesWithWeather.filter(d => d !== null);

        // 5. Get AI Regional Verdict
        const apiKey = req.headers['x-gemini-api-key'] || null;
        const brief = await getRegionalComparativeVerdict(validSitesData, apiKey);

        res.json(brief);
    } catch (err) {
        console.error('[brief] Route error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

export default router;

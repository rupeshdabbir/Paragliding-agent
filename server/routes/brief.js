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
        let favSites = [];
        try {
            if (favorites) {
                favSites = JSON.parse(favorites);
                favSites = favSites.map(s => ({ ...s, starred: true }));
            }
        } catch (e) {
            console.error('[brief] Failed to parse favorites:', e.message);
        }

        let nearbySites = [];
        try {
            nearbySites = await getSites({ lat: fLat, lng: fLng, distance: fRadius, limit: 15 });
        } catch (siteErr) {
            console.warn('[brief] getSites failed, continuing with favorites:', siteErr.message);
        }

        const combined = [...favSites];
        for (const site of nearbySites) {
            if (combined.length >= 4) break;
            const isDuplicate = combined.some(s =>
                (s.id && site.id && s.id === site.id) ||
                (Math.abs(s.lat - site.lat) < 0.005 && Math.abs(s.lng - site.lng) < 0.005)
            );
            if (!isDuplicate) {
                combined.push(site);
            }
        }

        const topSites = combined.slice(0, 4);

        if (topSites.length === 0) {
            return res.json({
                regionHeadline: 'No paragliding sites found in your area.',
                siteOfDay: null,
                rankings: [],
                overallSafetyNote: 'Try broadening your search radius.',
                sitesSummary: [],
            });
        }

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

        const apiKey = req.headers['x-ai-api-key'] || req.headers['x-gemini-api-key'] || null;
        const provider = (req.headers['x-ai-provider'] || 'gemini').toLowerCase();
        const preferredModel = req.headers['x-ai-model'] || null;
        let pilotProfile = null;
        const profileHeader = req.headers['x-pilot-profile'];
        if (profileHeader && profileHeader.trim()) {
            try { pilotProfile = JSON.parse(profileHeader); } catch { /* ignore */ }
        }

        const brief = await getRegionalComparativeVerdict(validSitesData, apiKey, pilotProfile, provider, preferredModel);

        res.json(brief);
    } catch (err) {
        console.error('[brief] Route error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

export default router;

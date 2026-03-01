import express from 'express';
import axios from 'axios';
import { cache } from '../services/cache.js';
import { getSites } from '../tools/getSites.js';

const router = express.Router();

/**
 * GET /api/search?q=mussel+rock&limit=8
 * Searches for paragliding sites by name using Nominatim geocoding + ParaglidingEarth
 */
router.get('/', async (req, res) => {
    const { q, limit = 8 } = req.query;
    if (!q || q.trim().length < 2) {
        return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const query = q.trim();
    const cacheKey = `search:${query.toLowerCase()}:${req.query.lat || 'gl'}:${req.query.lng || 'gl'}`;

    // Check cache
    const cached = cache.getSearch(cacheKey);
    if (cached) return res.json(cached);

    try {
        let searchPoints = [];

        // Step 0: If client provided lat/lng (their map center), prioritize searching locally FIRST
        if (req.query.lat && req.query.lng) {
            searchPoints.push({ lat: parseFloat(req.query.lat), lng: parseFloat(req.query.lng), source: 'local_map' });
        }

        // Step 1: Try to geocode the query with Nominatim
        const nominatimRes = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: { q: query, format: 'json', limit: 3, addressdetails: 0 },
            headers: { 'User-Agent': 'SkyPilot-ParaglidingApp/1.0' },
            timeout: 5000,
        });

        if (nominatimRes.data?.length > 0) {
            // Add top Nominatim results to our search points
            nominatimRes.data.forEach(place => {
                searchPoints.push({ lat: parseFloat(place.lat), lng: parseFloat(place.lon), source: 'geocode' });
            });
        }

        // Step 2: Search ParaglidingEarth around each geocoded point (small radius for name searches)
        const siteResults = new Map();

        for (const point of searchPoints) {
            const sites = await getSites({ lat: point.lat, lng: point.lng, distance: 30, limit: 50 });
            sites.forEach(site => {
                if (!siteResults.has(site.name)) {
                    siteResults.set(site.name, site);
                }
            });
        }

        // Step 3: Also try to find sites where the name fuzzy-matches the query
        // Broaden the search if geocoding returned something: use a wide-area search too
        if (searchPoints.length > 0) {
            const broadSites = await getSites({
                lat: searchPoints[0].lat, lng: searchPoints[0].lng,
                distance: 120, limit: 250,
            });
            broadSites.forEach(site => {
                if (site.name.toLowerCase().includes(query.toLowerCase()) && !siteResults.has(site.name)) {
                    siteResults.set(site.name, site);
                }
            });
        }

        // Sort: name matches first, then by distance
        const results = [...siteResults.values()]
            .sort((a, b) => {
                const aMatch = a.name.toLowerCase().includes(query.toLowerCase());
                const bMatch = b.name.toLowerCase().includes(query.toLowerCase());
                if (aMatch && !bMatch) return -1;
                if (!aMatch && bMatch) return 1;
                return a.distanceFromSearch - b.distanceFromSearch;
            })
            .slice(0, parseInt(limit));

        const response = { results, query };
        cache.setSearch(cacheKey, response);
        res.json(response);
    } catch (err) {
        console.error('[search]', err.message);
        res.status(500).json({ error: err.message });
    }
});

export default router;

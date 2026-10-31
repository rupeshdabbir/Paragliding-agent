import express from 'express';
import axios from 'axios';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { cache } from '../services/cache.js';
import { getSites, haversineKm } from '../tools/getSites.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
let FALLBACK_SITES = [];
try {
    FALLBACK_SITES = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'fallbackSites.json'), 'utf-8'));
} catch { /* ignore */ }

const router = express.Router();

/**
 * GET /api/search?q=mussel+rock&limit=8
 * Searches for paragliding sites by name using Curated Catalog + Nominatim geocoding + getSites (PGE/Overpass)
 */
router.get('/', async (req, res) => {
    const { q, limit = 8 } = req.query;
    if (!q || q.trim().length < 2) {
        return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const query = q.trim();
    const qLower = query.toLowerCase();
    const cacheKey = `search:${qLower}:${req.query.lat || 'gl'}:${req.query.lng || 'gl'}`;

    const cached = cache.getSearch(cacheKey);
    if (cached) return res.json(cached);

    try {
        const refLat = req.query.lat ? parseFloat(req.query.lat) : 37.7749;
        const refLng = req.query.lng ? parseFloat(req.query.lng) : -122.4194;

        const siteResults = new Map();

        // Step 0: Match against curated catalog immediately by name
        FALLBACK_SITES.forEach(site => {
            if (site.name.toLowerCase().includes(qLower) || (site.description || '').toLowerCase().includes(qLower)) {
                siteResults.set(site.name, {
                    ...site,
                    distanceFromSearch: Math.round(haversineKm(refLat, refLng, site.lat, site.lng)),
                });
            }
        });

        let searchPoints = [];
        if (req.query.lat && req.query.lng) {
            searchPoints.push({ lat: refLat, lng: refLng, source: 'local_map' });
        }

        // Step 1: Try to geocode the query with Nominatim
        try {
            const nominatimRes = await axios.get('https://nominatim.openstreetmap.org/search', {
                params: { q: query, format: 'json', limit: 3, addressdetails: 0 },
                headers: { 'User-Agent': 'SkyPilot-ParaglidingApp/2.1' },
                timeout: 4500,
            });

            if (nominatimRes.data?.length > 0) {
                nominatimRes.data.forEach(place => {
                    searchPoints.push({ lat: parseFloat(place.lat), lng: parseFloat(place.lon), source: 'geocode' });
                });
            }
        } catch (nomErr) {
            console.warn('[search] Nominatim geocoding skipped:', nomErr.message);
        }

        // Step 2: Query getSites around each search point
        for (const point of searchPoints.slice(0, 3)) {
            const sites = await getSites({ lat: point.lat, lng: point.lng, distance: 40, limit: 35 });
            sites.forEach(site => {
                if (!siteResults.has(site.name)) {
                    siteResults.set(site.name, site);
                }
            });
        }

        // Sort: exact/substring name matches first, then by distance
        const results = [...siteResults.values()]
            .sort((a, b) => {
                const aMatch = a.name.toLowerCase().includes(qLower);
                const bMatch = b.name.toLowerCase().includes(qLower);
                if (aMatch && !bMatch) return -1;
                if (!aMatch && bMatch) return 1;
                return (a.distanceFromSearch || 0) - (b.distanceFromSearch || 0);
            })
            .slice(0, parseInt(limit, 10));

        const response = { results, query };
        cache.setSearch(cacheKey, response);
        res.json(response);
    } catch (err) {
        console.error('[search]', err.message);
        res.status(500).json({ error: err.message });
    }
});

export default router;

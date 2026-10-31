import axios from 'axios';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { cache } from '../services/cache.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
let FALLBACK_SITES = [];
try {
    FALLBACK_SITES = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'fallbackSites.json'), 'utf-8'));
} catch (err) {
    console.warn('[getSites] Could not load fallbackSites.json:', err.message);
}

export const getSitesDeclaration = {
    name: 'get_paragliding_sites',
    description: 'Get paragliding sites near a specific location. Returns site names, coordinates, altitude, accepted wind directions, and site types (paragliding/soaring/thermaling).',
    parameters: {
        type: 'object',
        properties: {
            lat: { type: 'number', description: 'Latitude of the center point' },
            lng: { type: 'number', description: 'Longitude of the center point' },
            distance: { type: 'number', description: 'Search radius in km (default 50)' },
            limit: { type: 'number', description: 'Max number of sites to return (default 10)' },
        },
        required: ['lat', 'lng'],
    },
};

const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) SkyPilot/2.1 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
};

/**
 * Calculate Haversine distance in kilometers between two coordinates.
 */
export function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Parse OSM wind direction tags into ParaglidingEarth's 0-2 cardinal map.
 */
function parseOsmWindDirections(tags = {}) {
    const dirs = { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0 };
    let foundExplicit = false;

    for (const key of Object.keys(dirs)) {
        const val = tags[`free_flying:wind_direction:${key}`] || tags[`wind:${key}`];
        if (val === 'yes' || val === 'good' || val === '2') {
            dirs[key] = 2;
            foundExplicit = true;
        } else if (val === 'marginal' || val === '1') {
            dirs[key] = 1;
            foundExplicit = true;
        }
    }

    const rawDir = tags['free_flying:wind_direction'] || tags['wind_direction'] || tags['direction'];
    if (rawDir && typeof rawDir === 'string') {
        const tokens = rawDir.toUpperCase().split(/[,;/\s-]+/).map(s => s.trim());
        for (const t of tokens) {
            if (t in dirs) {
                dirs[t] = 2;
                foundExplicit = true;
            }
        }
    }

    // If OSM node doesn't list explicit wind directions, default common prevailing directions
    // so the rule-based engine can still evaluate wind speed/gusts/weather rather than hard-blocking.
    if (!foundExplicit) {
        return { N: 1, NE: 1, E: 1, SE: 1, S: 2, SW: 2, W: 2, NW: 2 };
    }
    return dirs;
}

/**
 * Tier 1: ParaglidingEarth GeoJSON API
 */
async function fetchFromParaglidingEarth({ lat, lng, distance, limit }) {
    const urls = [
        'https://paragliding.earth/api/geojson/getAroundLatLngSites.php',
        'http://www.paraglidingearth.com/api/geojson/getAroundLatLngSites.php',
    ];
    const params = { lat, lng, distance, limit, style: 'detailled' };

    let lastError = null;
    for (const url of urls) {
        try {
            const response = await axios.get(url, {
                params,
                headers: BROWSER_HEADERS,
                timeout: 3500,
            });
            if (!response.data || !Array.isArray(response.data.features)) {
                throw new Error('Invalid GeoJSON response from ParaglidingEarth');
            }

            return response.data.features.map(f => {
                const p = f.properties || {};
                const coords = f.geometry?.coordinates || [];
                const siteLat = coords[1];
                const siteLng = coords[0];
                const distKm = p.distance != null
                    ? parseInt(p.distance, 10)
                    : Math.round(haversineKm(lat, lng, siteLat, siteLng));
                return {
                    name: p.name || 'Unnamed Site',
                    lat: siteLat,
                    lng: siteLng,
                    altitude: Math.round(parseInt(p.takeoff_altitude || '0', 10) * 3.28084),
                    description: p.takeoff_description || '',
                    country: p.countryCode || '',
                    distanceFromSearch: distKm,
                    source: 'paraglidingearth',
                    siteTypes: {
                        paragliding: p.paragliding === '1' || p.paragliding === undefined,
                        hanggliding: p.hanggliding === '1',
                        thermaling: p.thermals === '1',
                        ridgeSoaring: p.soaring === '1',
                        winch: p.winch === '1',
                    },
                    windDirections: {
                        N: parseInt(p.N || '0', 10),
                        NE: parseInt(p.NE || '0', 10),
                        E: parseInt(p.E || '0', 10),
                        SE: parseInt(p.SE || '0', 10),
                        S: parseInt(p.S || '0', 10),
                        SW: parseInt(p.SW || '0', 10),
                        W: parseInt(p.W || '0', 10),
                        NW: parseInt(p.NW || '0', 10),
                    },
                };
            });
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError || new Error('ParaglidingEarth unreachable');
}

/**
 * Tier 2: OpenStreetMap Overpass API (`sport=free_flying`)
 */
async function fetchFromOverpass({ lat, lng, distance, limit }) {
    const radiusMeters = Math.min(Math.round(distance * 1000), 150000);
    const query = `[out:json][timeout:6];(nwr["sport"="free_flying"](around:${radiusMeters},${lat},${lng});nwr["free_flying:paragliding"](around:${radiusMeters},${lat},${lng}););out center tags;`;

    const response = await axios.post(
        'https://overpass-api.de/api/interpreter',
        `data=${encodeURIComponent(query)}`,
        {
            headers: {
                'User-Agent': 'SkyPilot-ParaglidingApp/2.1',
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 6500,
        }
    );

    const elements = response.data?.elements || [];
    const seenNames = new Set();
    const sites = [];

    for (const el of elements) {
        const tags = el.tags || {};
        // Skip dedicated landing zones if marked
        if (tags['free_flying:site'] === 'landing' || tags['site'] === 'landing') continue;

        const siteLat = el.lat ?? el.center?.lat;
        const siteLng = el.lon ?? el.center?.lon;
        if (siteLat == null || siteLng == null) continue;

        const name = (tags.name || tags['name:en'] || tags.description || '').trim();
        if (!name) continue;

        const normKey = name.toLowerCase();
        if (seenNames.has(normKey)) continue;
        seenNames.add(normKey);

        const eleMeters = parseFloat(tags.ele || tags.altitude || '0');
        const altitudeFt = !Number.isNaN(eleMeters) && eleMeters > 0
            ? Math.round(eleMeters * 3.28084)
            : 250;

        const distKm = Math.round(haversineKm(lat, lng, siteLat, siteLng));

        sites.push({
            name,
            lat: siteLat,
            lng: siteLng,
            altitude: altitudeFt,
            description: tags.description || tags.note || tags['free_flying:description'] || 'Community-mapped free-flight launch site (OpenStreetMap).',
            country: tags['addr:country'] || '',
            distanceFromSearch: distKm,
            source: 'openstreetmap',
            siteTypes: {
                paragliding: tags['free_flying:paragliding'] !== 'no',
                hanggliding: tags['free_flying:hanggliding'] === 'yes',
                thermaling: tags['free_flying:thermaling'] === 'yes' || altitudeFt > 1000,
                ridgeSoaring: tags['free_flying:soaring'] === 'yes' || altitudeFt <= 1200,
                winch: tags['free_flying:winch'] === 'yes',
            },
            windDirections: parseOsmWindDirections(tags),
        });
    }

    return sites.sort((a, b) => a.distanceFromSearch - b.distanceFromSearch).slice(0, limit);
}

/**
 * Tier 3: Curated Static Fallback Dataset (filtered by Haversine distance)
 */
export function getStaticFallbackSites({ lat, lng, distance = 50, limit = 10 }) {
    return FALLBACK_SITES
        .map(site => ({
            ...site,
            distanceFromSearch: Math.round(haversineKm(lat, lng, site.lat, site.lng)),
            source: 'curated',
        }))
        .filter(site => site.distanceFromSearch <= Math.max(distance, 80))
        .sort((a, b) => a.distanceFromSearch - b.distanceFromSearch)
        .slice(0, limit);
}

/**
 * Merge curated static sites with dynamic OSM sites, preferring curated metadata
 * when two sites are within ~1.5km or share a name.
 */
function mergeSites(primarySites, curatedSites, limit) {
    const merged = [...curatedSites];
    for (const s of primarySites) {
        const isDuplicate = merged.some(
            m =>
                m.name.toLowerCase() === s.name.toLowerCase() ||
                haversineKm(m.lat, m.lng, s.lat, s.lng) < 1.2
        );
        if (!isDuplicate) {
            merged.push(s);
        }
    }
    return merged.sort((a, b) => a.distanceFromSearch - b.distanceFromSearch).slice(0, limit);
}

let pgeCircuitOpenUntil = 0;
let overpassCircuitOpenUntil = 0;

export async function getSites({ lat, lng, distance = 50, limit = 10 }) {
    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);
    const numDist = parseFloat(distance) || 50;
    const numLimit = parseInt(limit, 10) || 10;

    // Check cache first
    const cached = cache.getSites(numLat, numLng, numDist);
    if (cached && cached.length > 0) {
        console.log(`[getSites] Cache hit for ${numLat.toFixed(3)},${numLng.toFixed(3)}`);
        return cached.slice(0, numLimit);
    }

    const curatedNearby = getStaticFallbackSites({ lat: numLat, lng: numLng, distance: numDist, limit: numLimit });

    // Tier 1: ParaglidingEarth (with 5-minute circuit breaker when PGE is 503/403)
    if (Date.now() > pgeCircuitOpenUntil) {
        try {
            const pgeSites = await fetchFromParaglidingEarth({ lat: numLat, lng: numLng, distance: numDist, limit: numLimit });
            if (pgeSites.length > 0) {
                cache.setSites(numLat, numLng, numDist, pgeSites);
                return pgeSites;
            }
        } catch (pgeErr) {
            pgeCircuitOpenUntil = Date.now() + 5 * 60 * 1000;
            console.warn(`[getSites] ParaglidingEarth unavailable (${pgeErr.message}). Falling back to OpenStreetMap Overpass + Curated catalog.`);
        }
    }

    // Tier 2: OpenStreetMap Overpass API + Curated Merge (with 2-minute circuit breaker on timeout/502)
    if (Date.now() > overpassCircuitOpenUntil) {
        try {
            const osmSites = await fetchFromOverpass({ lat: numLat, lng: numLng, distance: numDist, limit: numLimit });
            const combined = mergeSites(osmSites, curatedNearby, numLimit);
            if (combined.length > 0) {
                cache.setSites(numLat, numLng, numDist, combined);
                return combined;
            }
        } catch (osmErr) {
            overpassCircuitOpenUntil = Date.now() + 2 * 60 * 1000;
            console.warn(`[getSites] Overpass API fallback failed (${osmErr.message}). Using curated static catalog.`);
        }
    }

    // Tier 3: Curated Static Dataset
    if (curatedNearby.length > 0) {
        cache.setSites(numLat, numLng, numDist, curatedNearby);
    }
    return curatedNearby;
}

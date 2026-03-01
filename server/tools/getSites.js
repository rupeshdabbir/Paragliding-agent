import axios from 'axios';
import { cache } from '../services/cache.js';

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

export async function getSites({ lat, lng, distance = 50, limit = 10 }) {
    // Check cache first
    const cached = cache.getSites(lat, lng, distance);
    if (cached) {
        console.log(`[getSites] Cache hit for ${lat},${lng}`);
        return cached;
    }

    const url = `http://www.paraglidingearth.com/api/geojson/getAroundLatLngSites.php`;
    const params = { lat, lng, distance, limit, style: 'detailled' };

    const response = await axios.get(url, { params, timeout: 10000 });
    const features = response.data?.features || [];

    const sites = features.map(f => {
        const p = f.properties;
        const coords = f.geometry?.coordinates || [];
        return {
            name: p.name,
            lat: coords[1],
            lng: coords[0],
            altitude: Math.round(parseInt(p.takeoff_altitude || '0', 10) * 3.28084),
            description: p.takeoff_description || '',
            country: p.countryCode,
            distanceFromSearch: parseInt(p.distance || '0', 10),
            siteTypes: {
                paragliding: p.paragliding === '1',
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

    cache.setSites(lat, lng, distance, sites);
    return sites;
}

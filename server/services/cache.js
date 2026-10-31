import NodeCache from 'node-cache';

const siteCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
const weatherCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
const searchCache = new NodeCache({ stdTTL: 600, checkperiod: 120 }); // 10min

function normalizeSiteKey(lat, lng, distance) {
    return `sites:${parseFloat(lat).toFixed(3)},${parseFloat(lng).toFixed(3)},${Math.round(parseFloat(distance || 50))}`;
}

function normalizeWeatherKey(latOrKey, lng, models = 'best_match', forecastDays = 2) {
    // Support pre-formatted string keys like "37.66,-122.49,best_match,7"
    if (typeof latOrKey === 'string' && latOrKey.includes(',') && (lng === undefined || typeof lng === 'object')) {
        const parts = latOrKey.split(',');
        const pLat = parseFloat(parts[0]).toFixed(3);
        const pLng = parseFloat(parts[1]).toFixed(3);
        const pModels = parts[2] || 'best_match';
        const pDays = parts[3] || '2';
        return `weather:${pLat},${pLng},${pModels},${pDays}`;
    }
    return `weather:${parseFloat(latOrKey).toFixed(3)},${parseFloat(lng).toFixed(3)},${models},${forecastDays}`;
}

export const cache = {
    // Sites cache
    getSites(lat, lng, distance) {
        return siteCache.get(normalizeSiteKey(lat, lng, distance));
    },
    setSites(lat, lng, distance, data) {
        siteCache.set(normalizeSiteKey(lat, lng, distance), data);
    },

    // Weather cache (supports both (cacheKeyString) and (lat, lng, models, forecastDays))
    getWeather(latOrKey, lng, models = 'best_match', forecastDays = 2) {
        return weatherCache.get(normalizeWeatherKey(latOrKey, lng, models, forecastDays));
    },
    setWeather(latOrKey, lngOrData, maybeData, models = 'best_match', forecastDays = 2) {
        if (maybeData === undefined && typeof latOrKey === 'string' && latOrKey.includes(',')) {
            weatherCache.set(normalizeWeatherKey(latOrKey), lngOrData);
            return;
        }
        weatherCache.set(normalizeWeatherKey(latOrKey, lngOrData, models, forecastDays), maybeData);
    },

    // Search cache
    getSearch(key) { return searchCache.get(key); },
    setSearch(key, data) { searchCache.set(key, data); },

    // Clear all caches (useful for testing)
    flushAll() {
        siteCache.flushAll();
        weatherCache.flushAll();
        searchCache.flushAll();
    },

    // Stats for debugging
    stats() {
        return {
            sites: siteCache.getStats(),
            weather: weatherCache.getStats(),
            search: searchCache.getStats(),
        };
    },
};

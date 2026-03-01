import NodeCache from 'node-cache';

const siteCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
const weatherCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
const searchCache = new NodeCache({ stdTTL: 600, checkperiod: 120 }); // 10min

export const cache = {
    // Sites cache
    getSites(lat, lng, distance) {
        return siteCache.get(`sites:${lat},${lng},${distance}`);
    },
    setSites(lat, lng, distance, data) {
        siteCache.set(`sites:${lat},${lng},${distance}`, data);
    },

    // Weather cache
    getWeather(lat, lng) {
        return weatherCache.get(`weather:${parseFloat(lat).toFixed(3)},${parseFloat(lng).toFixed(3)}`);
    },
    setWeather(lat, lng, data) {
        weatherCache.set(`weather:${parseFloat(lat).toFixed(3)},${parseFloat(lng).toFixed(3)}`, data);
    },

    // Search cache
    getSearch(key) { return searchCache.get(key); },
    setSearch(key, data) { searchCache.set(key, data); },

    // Stats for debugging
    stats() {
        return {
            sites: siteCache.getStats(),
            weather: weatherCache.getStats(),
        };
    },
};

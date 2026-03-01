import express from 'express';
import { getSites } from '../tools/getSites.js';
import { getWeather } from '../tools/getWeather.js';
import { degreesToCardinal, getSiteWindScore, isWindSpeedFlyable, scoreFlyingConditions } from '../utils/windUtils.js';

const router = express.Router();

/**
 * GET /api/forecast?lat=&lng=
 * Returns 7-day hourly forecast with per-hour and per-day flyability analysis for a site
 */
router.get('/', async (req, res) => {
    const { lat, lng, siteLat, siteLng, models = 'best_match' } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required' });

    const fLat = parseFloat(lat);
    const fLng = parseFloat(lng);

    // Use site coords for weather if provided, otherwise use query coords
    const weatherLat = siteLat ? parseFloat(siteLat) : fLat;
    const weatherLng = siteLng ? parseFloat(siteLng) : fLng;

    try {
        // Fetch nearby sites and weather in parallel
        const [sites, rawWeather] = await Promise.all([
            getSites({ lat: fLat, lng: fLng, distance: 5, limit: 3 }),
            getExtendedWeather(weatherLat, weatherLng, models),
        ]);

        // Pick the closest/most relevant site for wind direction analysis
        const site = sites[0];
        const windDirections = site?.windDirections || {};

        // Build per-hour analysis for all 7 days (168 hours)
        const hourlyAnalysis = rawWeather.hourly.times.map((time, i) => {
            const windDir = rawWeather.hourly.windDirection10m[i] ?? 0;
            const windSpeed = rawWeather.hourly.windSpeed10m[i] ?? 0;
            const windGusts = rawWeather.hourly.windGusts[i] ?? 0;
            const cloudCover = rawWeather.hourly.cloudCover[i] ?? 0;
            const visibility = rawWeather.hourly.visibility[i] ?? 10000;
            const precipitation = rawWeather.hourly.precipitation[i] ?? 0;

            const windScore = getSiteWindScore(windDirections, windDir);
            const windCheck = isWindSpeedFlyable(windSpeed, windGusts, site?.siteTypes);
            const conditions = scoreFlyingConditions({ windScore, windCheck, cloudCover, visibility, precipitation });

            return {
                time,
                hour: new Date(time).getHours(),
                windSpeed10m: windSpeed,
                windSpeed80m: rawWeather.hourly.windSpeed80m?.[i],
                windSpeed120m: rawWeather.hourly.windSpeed120m?.[i],
                windSpeed180m: rawWeather.hourly.windSpeed180m?.[i],
                windDirection: windDir,
                windDirectionCardinal: degreesToCardinal(windDir),
                windGusts,
                cloudCover,
                visibility,
                precipitation,
                temperature: rawWeather.hourly.temperature?.[i],
                humidity: rawWeather.hourly.humidity?.[i],
                pressure: rawWeather.hourly.pressure?.[i],
                weatherCode: rawWeather.hourly.weatherCode?.[i],
                windScore,
                rating: conditions.rating,
                issues: conditions.issues,
                positives: conditions.positives,
            };
        });

        // Group by day
        const dayGroups = {};
        hourlyAnalysis.forEach(h => {
            const date = h.time.slice(0, 10);
            if (!dayGroups[date]) dayGroups[date] = [];
            dayGroups[date].push(h);
        });

        // Per-day summary
        const days = Object.entries(dayGroups).map(([date, hours]) => {
            const flyableHours = hours.filter(h => h.rating === 'GO');
            const marginalHours = hours.filter(h => h.rating === 'MARGINAL');
            const dayLightHours = hours.filter(h => h.hour >= 7 && h.hour <= 19);
            const flyableDaylight = dayLightHours.filter(h => h.rating === 'GO');

            // Find best window (longest consecutive GO block during daylight)
            let bestWindowStart = null, bestWindowEnd = null;
            let maxRun = 0, currentRun = 0, runStart = null;
            dayLightHours.forEach(h => {
                if (h.rating === 'GO') {
                    if (currentRun === 0) runStart = h.time;
                    currentRun++;
                    if (currentRun > maxRun) {
                        maxRun = currentRun;
                        bestWindowStart = runStart;
                        bestWindowEnd = h.time;
                    }
                } else {
                    currentRun = 0;
                }
            });

            // Overall day rating
            const goCount = flyableDaylight.length;
            const totalCount = dayLightHours.length;
            let dayRating;
            if (goCount === 0) dayRating = 'NO_GO';
            else if (goCount >= totalCount * 0.5) dayRating = 'GO';
            else dayRating = 'MARGINAL';

            // Peak wind
            const windSpeeds = dayLightHours.map(h => h.windSpeed10m);
            const maxWind = Math.max(...windSpeeds);
            const avgWind = windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length;

            return {
                date,
                dayRating,
                goHours: flyableHours.length,
                marginalHours: marginalHours.length,
                flyableDaylightHours: flyableDaylight.length,
                totalDaylightHours: dayLightHours.length,
                bestWindowStart,
                bestWindowEnd,
                bestWindowHours: maxRun,
                maxWindMph: Math.round(maxWind),
                avgWindMph: Math.round(avgWind),
                hours,
            };
        });

        res.json({
            site: site ? { name: site.name, description: site.description, windDirections: site.windDirections, lat: site.lat, lng: site.lng, altitude: site.altitude, siteTypes: site.siteTypes } : null,
            current: rawWeather.current,
            days,
            units: rawWeather.units,
        });
    } catch (err) {
        console.error('[forecast]', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Extended weather fetch — 7 full days of hourly data
 */
async function getExtendedWeather(lat, lng, modelsStr = 'best_match') {
    const axios = (await import('axios')).default;

    const hourlyVars = [
        'wind_speed_10m', 'wind_speed_80m', 'wind_speed_120m', 'wind_speed_180m',
        'wind_direction_10m', 'wind_direction_80m', 'wind_direction_120m', 'wind_direction_180m',
        'wind_gusts_10m', 'temperature_2m', 'cloud_cover', 'visibility',
        'precipitation', 'relative_humidity_2m', 'surface_pressure', 'weather_code',
    ];
    const currentVars = [
        'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m',
        'temperature_2m', 'cloud_cover', 'visibility', 'precipitation',
        'relative_humidity_2m', 'surface_pressure', 'weather_code',
    ];

    const params = {
        latitude: lat, longitude: lng,
        hourly: hourlyVars.join(','),
        current: currentVars.join(','),
        forecast_days: 7,
        timezone: 'auto',
        wind_speed_unit: 'mph',
    };
    if (modelsStr) params.models = modelsStr;

    const resp = await axios.get('https://api.open-meteo.com/v1/forecast', {
        params,
        timeout: 12000,
    });

    const data = resp.data;
    const h = data.hourly;

    return {
        current: {
            time: data.current.time,
            windSpeed10m: data.current.wind_speed_10m,
            windDirection10m: data.current.wind_direction_10m,
            windGusts: data.current.wind_gusts_10m,
            temperature: data.current.temperature_2m,
            cloudCover: data.current.cloud_cover,
            visibility: data.current.visibility,
            precipitation: data.current.precipitation,
            humidity: data.current.relative_humidity_2m,
            pressure: data.current.surface_pressure,
            weatherCode: data.current.weather_code,
        },
        hourly: {
            times: h.time,
            windSpeed10m: h.wind_speed_10m,
            windSpeed80m: h.wind_speed_80m,
            windSpeed120m: h.wind_speed_120m,
            windSpeed180m: h.wind_speed_180m,
            windDirection10m: h.wind_direction_10m,
            windGusts: h.wind_gusts_10m,
            cloudCover: h.cloud_cover,
            visibility: h.visibility,
            precipitation: h.precipitation,
            temperature: h.temperature_2m,
            humidity: h.relative_humidity_2m,
            pressure: h.surface_pressure,
            weatherCode: h.weather_code,
        },
        units: { windSpeed: 'mph', temperature: '°C', visibility: 'mi', precipitation: 'mm/h', pressure: 'hPa' },
    };
}

export default router;

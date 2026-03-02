import axios from 'axios';
import { cache } from '../services/cache.js';

export const getWeatherDeclaration = {
    name: 'get_weather_forecast',
    description: 'Get current weather conditions and hourly forecast for a specific location. Returns wind speeds at multiple altitudes (10m, 80m, 120m, 180m), wind direction, gusts, temperature, cloud cover, visibility, precipitation, humidity, and pressure. Essential for evaluating paragliding conditions.',
    parameters: {
        type: 'object',
        properties: {
            lat: { type: 'number', description: 'Latitude of the location' },
            lng: { type: 'number', description: 'Longitude of the location' },
            timezone: { type: 'string', description: 'Timezone string e.g. America/Los_Angeles (default: auto)' },
        },
        required: ['lat', 'lng'],
    },
};

export async function getWeather({ lat, lng, timezone = 'auto', models = 'best_match', forecastDays = 2 }) {
    // Generate cache key incorporating models
    const cacheKey = `${lat},${lng},${models}`;
    const cached = cache.getWeather(cacheKey);
    if (cached) {
        console.log(`[getWeather] Cache hit for ${cacheKey}`);
        return cached;
    }

    const hourlyVars = [
        'wind_speed_10m', 'wind_speed_80m', 'wind_speed_120m', 'wind_speed_180m',
        'wind_direction_10m', 'wind_direction_80m', 'wind_direction_120m', 'wind_direction_180m',
        'wind_gusts_10m',
        'temperature_2m',
        'cloud_cover',
        'visibility',
        'precipitation',
        'relative_humidity_2m',
        'surface_pressure',
        'weather_code',
    ];

    const currentVars = [
        'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m',
        'temperature_2m', 'cloud_cover', 'visibility', 'precipitation',
        'relative_humidity_2m', 'surface_pressure', 'weather_code',
    ];

    const params = {
        latitude: lat,
        longitude: lng,
        hourly: hourlyVars.join(','),
        current: currentVars.join(','),
        forecast_days: forecastDays,
        timezone,
        wind_speed_unit: 'mph',
    };
    if (models) params.models = models;

    const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
        params,
        timeout: 10000,
    });

    const data = response.data;
    const current = data.current;

    // Get next 12 hours of hourly data starting from current hour
    const now = new Date();
    const hourlyTimes = data.hourly?.time || [];
    const startIdx = hourlyTimes.findIndex(t => new Date(t) >= now);
    const slice = (arr) => (arr || []).slice(startIdx >= 0 ? startIdx : 0, (startIdx >= 0 ? startIdx : 0) + 12);

    const result = {
        current: {
            time: current.time,
            windSpeed10m: current.wind_speed_10m,
            windDirection10m: current.wind_direction_10m,
            windGusts: current.wind_gusts_10m,
            temperature: current.temperature_2m,
            cloudCover: current.cloud_cover,
            visibility: current.visibility,
            precipitation: current.precipitation,
            humidity: current.relative_humidity_2m,
            pressure: current.surface_pressure,
            weatherCode: current.weather_code,
        },
        hourly: {
            times: slice(hourlyTimes),
            windSpeed10m: slice(data.hourly?.wind_speed_10m),
            windSpeed80m: slice(data.hourly?.wind_speed_80m),
            windSpeed120m: slice(data.hourly?.wind_speed_120m),
            windSpeed180m: slice(data.hourly?.wind_speed_180m),
            windDirection10m: slice(data.hourly?.wind_direction_10m),
            windDirection80m: slice(data.hourly?.wind_direction_80m),
            windDirection120m: slice(data.hourly?.wind_direction_120m),
            windDirection180m: slice(data.hourly?.wind_direction_180m),
            windGusts: slice(data.hourly?.wind_gusts_10m),
            temperature: slice(data.hourly?.temperature_2m),
            cloudCover: slice(data.hourly?.cloud_cover),
            visibility: slice(data.hourly?.visibility),
            precipitation: slice(data.hourly?.precipitation),
            humidity: slice(data.hourly?.relative_humidity_2m),
            pressure: slice(data.hourly?.surface_pressure),
            weatherCode: slice(data.hourly?.weather_code),
        },
        units: {
            windSpeed: 'km/h',
            temperature: '°C',
            visibility: 'm',
            precipitation: 'mm/h',
            pressure: 'hPa',
        },
    };

    cache.setWeather(cacheKey, result);
    return result;
}

/**
 * Extended weather fetch — 7 full days of hourly data.
 * Wraps getWeather for simplicity.
 */
export async function getExtendedWeather(lat, lng, models = 'best_match') {
    return await getWeather({ lat, lng, models, forecastDays: 7 });
}

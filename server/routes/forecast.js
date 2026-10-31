import express from 'express';
import { getSites } from '../tools/getSites.js';
import { getExtendedWeather } from '../tools/getWeather.js';
import { degreesToCardinal, getSiteWindScore, isWindSpeedFlyable, scoreFlyingConditions } from '../utils/windUtils.js';
import { getAiWeeklyVerdicts } from '../services/aiVerdict.js';

const router = express.Router();

/**
 * GET /api/forecast?lat=&lng=
 * Returns 7-day hourly forecast with per-hour and per-day flyability analysis for a site.
 */
router.get('/', async (req, res) => {
    const {
        lat,
        lng,
        siteLat,
        siteLng,
        siteName,
        siteAlt,
        siteDesc,
        windDirs,
        siteTypes,
        models = 'best_match',
    } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required' });

    const fLat = parseFloat(lat);
    const fLng = parseFloat(lng);

    const weatherLat = siteLat ? parseFloat(siteLat) : fLat;
    const weatherLng = siteLng ? parseFloat(siteLng) : fLng;

    try {
        // Parse optional client-supplied site metadata so forecast works even if site lookup degrades
        let clientSite = null;
        if (siteName) {
            let parsedDirs = { N: 1, NE: 1, E: 1, SE: 1, S: 2, SW: 2, W: 2, NW: 2 };
            let parsedTypes = { paragliding: true, ridgeSoaring: true };
            if (windDirs) {
                try { parsedDirs = JSON.parse(windDirs); } catch { /* ignore */ }
            }
            if (siteTypes) {
                try { parsedTypes = JSON.parse(siteTypes); } catch { /* ignore */ }
            }
            clientSite = {
                name: siteName,
                lat: fLat,
                lng: fLng,
                altitude: siteAlt ? parseInt(siteAlt, 10) : 0,
                description: siteDesc || '',
                windDirections: parsedDirs,
                siteTypes: parsedTypes,
            };
        }

        const [sites, rawWeather] = await Promise.all([
            clientSite
                ? Promise.resolve([clientSite])
                : getSites({ lat: fLat, lng: fLng, distance: 10, limit: 3 }).catch(err => {
                    console.warn('[forecast] getSites fallback triggered:', err.message);
                    return [];
                }),
            getExtendedWeather(weatherLat, weatherLng, models),
        ]);

        const site = sites[0] || clientSite || {
            name: `Site (${fLat.toFixed(2)}, ${fLng.toFixed(2)})`,
            lat: fLat,
            lng: fLng,
            altitude: 250,
            description: '',
            windDirections: { N: 1, NE: 1, E: 1, SE: 1, S: 2, SW: 2, W: 2, NW: 2 },
            siteTypes: { paragliding: true, ridgeSoaring: true, thermaling: true },
        };
        const windDirections = site?.windDirections || {};

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

        const dayGroups = {};
        hourlyAnalysis.forEach(h => {
            const date = h.time.slice(0, 10);
            if (!dayGroups[date]) dayGroups[date] = [];
            dayGroups[date].push(h);
        });

        const days = Object.entries(dayGroups).map(([date, hours]) => {
            const flyableHours = hours.filter(h => h.rating === 'GO');
            const marginalHours = hours.filter(h => h.rating === 'MARGINAL');
            const dayLightHours = hours.filter(h => h.hour >= 7 && h.hour <= 19);
            const flyableDaylight = dayLightHours.filter(h => h.rating === 'GO');

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

            const goCount = flyableDaylight.length;
            const totalCount = dayLightHours.length;
            let dayRating;
            if (goCount === 0) dayRating = 'NO_GO';
            else if (goCount >= totalCount * 0.5) dayRating = 'GO';
            else dayRating = 'MARGINAL';

            const windSpeeds = dayLightHours.map(h => h.windSpeed10m);
            const maxWind = windSpeeds.length > 0 ? Math.max(...windSpeeds) : 0;
            const avgWind = windSpeeds.length > 0 ? windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length : 0;
            const maxGust = dayLightHours.length > 0 ? Math.max(...dayLightHours.map(h => h.windGusts || 0)) : 0;
            const avgCloud = dayLightHours.length > 0
                ? Math.round(dayLightHours.reduce((a, h) => a + (h.cloudCover || 0), 0) / dayLightHours.length)
                : 0;
            const maxPrecip = dayLightHours.length > 0
                ? Math.max(...dayLightHours.map(h => h.precipitation || 0))
                : 0;
            const dominantDirs = [...new Set(dayLightHours.map(h => h.windDirectionCardinal).filter(Boolean))].join('/');

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
                maxGustMph: Math.round(maxGust),
                avgCloudPct: avgCloud,
                maxPrecipMm: Number(maxPrecip.toFixed(2)),
                dominantWindDirs: dominantDirs,
                hours,
            };
        });

        const apiKey = req.headers['x-ai-api-key'] || req.headers['x-gemini-api-key'] || null;
        const provider = (req.headers['x-ai-provider'] || 'gemini').toLowerCase();
        const preferredModel = req.headers['x-ai-model'] || null;
        let pilotProfile = null;
        const profileHeader = req.headers['x-pilot-profile'];
        if (profileHeader && profileHeader.trim()) {
            try { pilotProfile = JSON.parse(profileHeader); } catch { /* ignore */ }
        }

        // Only run server-side LLM when a cloud BYOK key is present and provider is not client-side webai
        const aiVerdicts = (site && apiKey && provider !== 'webai')
            ? await getAiWeeklyVerdicts(site, rawWeather, apiKey, pilotProfile, provider, preferredModel)
            : null;

        const today = new Date().toISOString().slice(0, 10);
        const aiVerdict = aiVerdicts?.[today] || null;

        res.json({
            site: site ? {
                name: site.name,
                description: site.description,
                windDirections: site.windDirections,
                lat: site.lat,
                lng: site.lng,
                altitude: site.altitude,
                siteTypes: site.siteTypes,
            } : null,
            current: rawWeather.current,
            days,
            units: rawWeather.units,
            aiVerdict,
            aiVerdicts,
        });
    } catch (err) {
        console.error('[forecast]', err.message);
        res.status(500).json({ error: err.message });
    }
});

export default router;

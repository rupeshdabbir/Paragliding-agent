/**
 * AI-powered flyability verdict service — 7-day weekly analysis.
 * Uses a SINGLE Gemini call to analyze the entire week at once, returning
 * a per-day verdict keyed by date. This is shared across:
 *   - Forecast panel (Today/Tomorrow cards, This Week list)
 *   - Ask SkyPilot chat (injected as ground truth)
 *
 * Cache: per site + week-start date, refreshed every 6 hours.
 */
import { getGenAI } from '../utils/geminiClient.js';
import { degreesToCardinal } from '../utils/windUtils.js';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const verdictCache = new Map();

/**
 * Build a compact per-day weather summary (daylight hours only).
 */
function buildDaySummary(hours = [], date) {
    const daylight = hours.filter(h => {
        const hr = parseInt(h.time.slice(11, 13), 10);
        return hr >= 6 && hr <= 20;
    });
    if (daylight.length === 0) return `  ${date}: No data`;

    const avgWind = daylight.reduce((s, h) => s + (h.windSpeed10m || 0), 0) / daylight.length;
    const maxGust = Math.max(...daylight.map(h => h.windGusts || 0));
    const avgCloud = daylight.reduce((s, h) => s + (h.cloudCover || 0), 0) / daylight.length;
    const maxPrecip = Math.max(...daylight.map(h => h.precipitation || 0));
    const dirs = [...new Set(daylight.map(h => degreesToCardinal(h.windDirection || 0)))].join('/');

    return `  ${date}: avg wind ${avgWind.toFixed(0)} mph from ${dirs}, max gusts ${maxGust.toFixed(0)} mph, cloud ${avgCloud.toFixed(0)}%, precip ${maxPrecip.toFixed(2)} mm/h`;
}

/**
 * Get AI-generated flyability verdicts for a full 7-day period.
 * Returns a map of { [date]: verdict } for all available days.
 *
 * @param {object} site - Site object from ParaglidingEarth
 * @param {object} weather - Weather object from getExtendedWeather (7 days hourly)
 * @returns {Promise<{[date: string]: DayVerdict}>}
 */
export async function getAiWeeklyVerdicts(site, weather, apiKey = null) {
    const today = weather.current?.time?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    const keyPrefix = apiKey ? apiKey.slice(-6) : 'env';
    const cacheKey = `${keyPrefix}_${site.lat?.toFixed(4)},${site.lng?.toFixed(4)},${today}`;

    const cached = verdictCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        console.log(`[aiVerdict] Cache hit for ${site.name} (week)`);
        return cached.verdicts;
    }

    // Group all hourly data by date
    const hoursByDate = {};
    (weather?.hourly?.times || []).forEach((time, i) => {
        const date = time.slice(0, 10);
        if (!hoursByDate[date]) hoursByDate[date] = [];
        hoursByDate[date].push({
            time,
            windSpeed10m: weather.hourly.windSpeed10m?.[i],
            windGusts: weather.hourly.windGusts?.[i],
            windDirection: weather.hourly.windDirection10m?.[i],
            cloudCover: weather.hourly.cloudCover?.[i],
            precipitation: weather.hourly.precipitation?.[i],
            visibility: weather.hourly.visibility?.[i],
        });
    });

    const dates = Object.keys(hoursByDate).sort();
    const weekSummary = dates.map(d => buildDaySummary(hoursByDate[d], d)).join('\n');

    const windDirsSupported = site.windDirections
        ? Object.entries(site.windDirections)
            .filter(([, s]) => parseInt(s) >= 1)
            .map(([dir, s]) => `${dir} (${s === '2' ? 'ideal' : 'marginal'})`)
            .join(', ')
        : 'Unknown';

    const prompt = `You are an expert paragliding safety analyst. Analyze the following 7-day weather forecast for a specific site and produce a structured flyability verdict for EACH day.

SITE INFORMATION:
- Name: ${site.name || 'Unknown'}
- Launch Altitude: ${site.altitude > 0 ? `${site.altitude}ft ASL` : 'Unknown'}
- Site Types registered: ${JSON.stringify(site.siteTypes || {})}
- Takeoff Notes: ${site.description || 'None'}
- Supported wind directions: ${windDirsSupported}

7-DAY WEATHER SUMMARY (daylight hours, 6am-8pm):
${weekSummary}

ANALYSIS TASK:
For each day listed above:
1. Determine the SITE MODE for that day — even if registered as "thermaling", assess whether that day's actual conditions support thermaling (needs heat + instability + light winds), ridge soaring (needs steady 10-25 mph from a supported direction), or just a sled ride (any direction, light winds, short flight). 
2. Give a GO/MARGINAL/NO_GO rating.
3. Identify the best flight window if any (e.g. "1pm-3pm").

Respond with ONLY a valid JSON object (no markdown, no backticks) with this exact structure:
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "siteMode": "thermaling" | "ridgeSoaring" | "sledRide" | "mixed" | "noFly",
      "siteModeLabel": "Human-readable label e.g. 'Sled Ride Day'",
      "rating": "GO" | "MARGINAL" | "NO_GO",
      "confidence": "high" | "medium" | "low",
      "headline": "One punchy sentence",
      "reasoning": "1-3 sentences",
      "bestWindow": "e.g. '1pm-3pm' or null",
      "safetyNotes": []
    }
  ]
}`;

    try {
        const ai = getGenAI(apiKey);

        const attemptGenerate = async (modelName) => {
            const generativeModel = ai.getGenerativeModel({
                model: modelName,
                generationConfig: { temperature: 0.2, maxOutputTokens: 3000 },
            });
            console.log(`[aiVerdict] Calling Gemini (7-day) for ${site.name} using ${modelName}…`);
            return await generativeModel.generateContent(prompt);
        };

        let result;
        let usedModel = 'gemini-3-flash-preview';
        try {
            result = await attemptGenerate('gemini-3-flash-preview');
        } catch (err) {
            const msg = err.message || '';
            if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('too many requests')) {
                console.warn(`[aiVerdict] 429 Quota Exceeded on gemini-3-flash-preview. Falling back to gemini-2.5-flash`);
                usedModel = 'gemini-2.5-flash';
                result = await attemptGenerate('gemini-2.5-flash');
            } else {
                throw err;
            }
        }

        const raw = (result?.response?.text && typeof result.response.text === 'function')
            ? result.response.text().trim()
            : '';
        console.log(`[aiVerdict] Raw 7-day response (first 500):`, raw.slice(0, 500));

        // Strip markdown fences if present
        const cleaned = raw
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

        if (!cleaned) {
            return buildFallbackWeekVerdicts(dates, 'Empty response from AI model', usedModel);
        }

        let parsed;
        try {
            parsed = JSON.parse(cleaned);
        } catch (parseErr) {
            console.error('[aiVerdict] JSON parse failed:', parseErr.message, '| raw:', raw.slice(0, 300));
            return buildFallbackWeekVerdicts(dates, `JSON parse failed: ${parseErr.message}`, usedModel);
        }

        if (!parsed.days || !Array.isArray(parsed.days)) {
            console.error('[aiVerdict] Unexpected response shape:', JSON.stringify(parsed).slice(0, 200));
            return buildFallbackWeekVerdicts(dates, 'Unexpected response shape', usedModel);
        }

        // Index by date
        const verdicts = {};
        parsed.days.forEach(d => {
            if (d.date) {
                d.usedModel = usedModel;
                verdicts[d.date] = d;
            }
        });

        // Fill any missing dates with fallback
        dates.forEach(date => {
            if (!verdicts[date]) {
                verdicts[date] = buildFallbackDayVerdict(date, 'No AI verdict returned for this date', usedModel);
            }
        });

        verdictCache.set(cacheKey, { verdicts, expiresAt: Date.now() + CACHE_TTL_MS });
        console.log(`[aiVerdict] Week verdicts for ${site.name}:`, Object.entries(verdicts).map(([d, v]) => `${d}:${v.rating}`).join(', '));
        return verdicts;

    } catch (err) {
        let errorDetail = err.message || '';
        if (err.errorDetails) errorDetail += ' | details: ' + JSON.stringify(err.errorDetails);
        if (err.status) errorDetail += ' | status: ' + err.status;
        if (!errorDetail) errorDetail = JSON.stringify(err, Object.getOwnPropertyNames(err));
        if (!errorDetail || errorDetail === '{}') errorDetail = String(err);

        // Can't reliably know usedModel here if it failed on the first call, but usually it means it failed completely.
        const modelStr = errorDetail.includes('gemini-2.5-flash') ? 'gemini-2.5-flash' : 'gemini-3-flash-preview';

        console.error('[aiVerdict] Gemini 7-day call FAILED for', site?.name, ':', errorDetail);
        return buildFallbackWeekVerdicts(dates, errorDetail, modelStr);
    }
}

function buildFallbackDayVerdict(date, errorMessage = null, usedModel = 'unknown') {
    return {
        date,
        siteMode: 'unknown',
        siteModeLabel: 'Analysis Unavailable',
        rating: 'MARGINAL',
        confidence: 'low',
        headline: 'AI analysis unavailable — using basic rules.',
        reasoning: 'The AI analysis could not be completed. Refer to the hourly chart for rule-based conditions.',
        bestWindow: null,
        safetyNotes: ['Verify conditions with local pilots before flying.'],
        _fallback: true,
        _error: errorMessage || 'Unknown error',
        usedModel
    };
}

function buildFallbackWeekVerdicts(dates, errorMessage, usedModel = 'unknown') {
    console.error(`[aiVerdict] FALLBACK for entire week. Reason: ${errorMessage}`);
    const result = {};
    dates.forEach(date => { result[date] = buildFallbackDayVerdict(date, errorMessage, usedModel); });
    return result;
}


/**
 * Perform a comparative analysis across multiple sites to find the best flight options.
 */
export async function getRegionalComparativeVerdict(sitesData = [], apiKey = null) {
    if (sitesData.length === 0) return { bestSite: null, rankings: [] };

    // Build a condensed summary for each site
    const siteSummaries = sitesData.map(({ site, weather }) => {
        const today = weather.current?.time?.slice(0, 10) || new Date().toISOString().slice(0, 10);
        const hours = (weather?.hourly?.times || []).filter(t => t.startsWith(today));

        // Find daylight hours (6am-8pm)
        const daylight = hours.filter(t => {
            const hr = parseInt(t.slice(11, 13), 10);
            return hr >= 6 && hr <= 20;
        });

        const avgWind = daylight.reduce((s, t, i) => s + (weather.hourly.windSpeed10m[i] || 0), 0) / daylight.length;
        const maxGust = Math.max(...daylight.map((t, i) => weather.hourly.windGusts[i] || 0));
        const dirs = [...new Set(daylight.map((t, i) => degreesToCardinal(weather.hourly.windDirection10m[i] || 0)))].join('/');

        const windDirsSupported = site.windDirections
            ? Object.entries(site.windDirections)
                .filter(([, s]) => parseInt(s) >= 1)
                .map(([dir, s]) => `${dir} (${s === '2' ? 'ideal' : 'marginal'})`)
                .join(', ')
            : 'Unknown';

        return `SITE: ${site.name}
- Launch Altitude: ${site.altitude}ft ASL
- Supported Directions: ${windDirsSupported}
- Today's Summary: avg wind ${avgWind.toFixed(0)} mph from ${dirs}, max gusts ${maxGust.toFixed(0)} mph
- Site Types: ${JSON.stringify(site.siteTypes)}
${site.starred ? '- User Preference: This is a STARRED/FAVORITE site by the user.' : ''}`;
    }).join('\n---\n');

    const prompt = `You are an expert paragliding regional coordinator. Analyze the following paragliding sites and their conditions for TODAY to provide a ranked "Morning Brief" for pilots.

Some sites are "STARRED/FAVORITE" by the user. While safety is the priority, give these sites extra consideration for "Site of the Day" if they are flyable (GO or MARGINAL).

SITES DATA:
${siteSummaries}

ANALYSIS TASK:
1. Identify the "Site of the Day" (the absolute best option).
2. Rank all sites from best to worst based on flight safety, quality (ridge soaring vs sled ride), and reliability of wind direction.
3. Provide a punchy "Morning Headline" for the whole region.
4. For EACH site, providing a 1-sentence "Why this rank?" explanation.

Respond with ONLY a valid JSON object:
{
  "regionHeadline": "e.g. 'Epic Ridge Soaring day at the coast; inland too gusty.'",
  "siteOfDay": "Site Name",
  "rankings": [
    {
      "siteName": "Site Name",
      "rank": 1,
      "rating": "GO" | "MARGINAL" | "NO_GO",
      "bestWindow": "e.g. 1pm-4pm",
      "reasoning": "1 sentence explanation",
      "recommendedMode": "ridgeSoaring" | "thermaling" | "sledRide"
    }
  ],
  "overallSafetyNote": "Important regional safety advisory"
}`;

    try {
        const ai = getGenAI(apiKey);

        const attemptGenerate = async (modelName) => {
            const generativeModel = ai.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 2000,
                    responseMimeType: 'application/json'
                },
            });
            console.log(`[aiVerdict] Calling Gemini for Regional Comparative Brief using ${modelName}...`);
            return await generativeModel.generateContent(prompt);
        };

        let result;
        let usedModel = 'gemini-3-flash-preview';
        try {
            result = await attemptGenerate('gemini-3-flash-preview');
        } catch (err) {
            const msg = err.message || '';
            if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('too many requests')) {
                console.warn(`[aiVerdict] 429 Quota Exceeded on gemini-3-flash-preview. Falling back to gemini-2.5-flash`);
                usedModel = 'gemini-2.5-flash';
                result = await attemptGenerate('gemini-2.5-flash');
            } else {
                throw err;
            }
        }

        const raw = (result?.response?.text && typeof result.response.text === 'function')
            ? result.response.text().trim()
            : '';

        const cleaned = raw
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

        if (!cleaned) throw new Error('Empty AI response');

        const parsed = JSON.parse(cleaned);
        parsed.usedModel = usedModel;

        // Post-process: Add isStarred flag to rankings for UI
        if (parsed.rankings) {
            parsed.rankings = parsed.rankings.map(r => {
                const originalSite = sitesData.find(d => d.site?.name === r.siteName);
                if (originalSite?.site?.starred) {
                    return { ...r, isStarred: true };
                }
                return r;
            });
        }

        return parsed;
    } catch (err) {
        console.error('[aiVerdict] Regional Brief FAILED:', err.message);
        // Minimal fallback
        return {
            regionHeadline: "Regional analysis unavailable.",
            siteOfDay: sitesData[0]?.site?.name || "Unknown",
            rankings: sitesData.map((d, i) => ({
                siteName: d.site?.name,
                rank: i + 1,
                rating: 'MARGINAL',
                reasoning: `AI analysis failed: ${err.message}`, // Added for debugging
                recommendedMode: 'mixed'
            })),
            overallSafetyNote: "Always check local conditions before launching.",
            _error: err.message
        };
    }
}

// Legacy single-day export (kept for backward compat — now delegates to weekly)
export async function getAiVerdict(site, weather, apiKey = null) {
    const verdicts = await getAiWeeklyVerdicts(site, weather, apiKey);
    const today = weather.current?.time?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    return verdicts[today] || buildFallbackDayVerdict(today, 'Today not in weekly verdicts', 'unknown');
}

/**
 * AI-powered flyability verdict service — 7-day weekly analysis.
 * Uses a SINGLE LLM call to analyze the entire week at once, returning
 * a per-day verdict keyed by date. This is shared across:
 *   - Forecast panel (Today/Tomorrow cards, This Week list)
 *   - Ask SkyPilot chat (injected as ground truth)
 *
 * Supports: gemini (default, unchanged), openai, grok, anthropic
 * Cache: per site + week-start date + provider, refreshed every 6 hours.
 *
 * IMPORTANT: The Gemini path is untouched from the battle-tested original.
 * Other providers use the same prompts with their own SDK JSON completion calls.
 */
import { getGenAI } from '../utils/geminiClient.js';
import { degreesToCardinal } from '../utils/windUtils.js';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const verdictCache = new Map();

// ─── Provider-agnostic JSON completion ───────────────────────────────────────

/**
 * Call any provider with a prompt and return the model's response as a parsed
 * JSON object. This is the single abstraction point — all parsing, cleaning,
 * and error handling lives here so the callers stay clean.
 *
 * @param {string} prompt  - The full prompt text (already includes JSON schema)
 * @param {'gemini'|'openai'|'grok'|'anthropic'} provider
 * @param {string|null} apiKey
 * @param {{ temperature?: number, maxTokens?: number, modelOverrides?: object }} opts
 * @returns {Promise<{ raw: string, parsed: object, usedModel: string }>}
 */
async function callJsonLLM(prompt, provider = 'gemini', apiKey = null, opts = {}) {
    const temperature = opts.temperature ?? 0.2;
    const maxTokens = opts.maxTokens ?? 8192;

    // ── Gemini ────────────────────────────────────────────────────────────────
    if (provider === 'gemini') {
        const ai = getGenAI(apiKey);

        const attemptGenerate = async (modelName) => {
            const generativeModel = ai.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    temperature,
                    maxOutputTokens: maxTokens,
                    responseMimeType: 'application/json',
                },
            });
            console.log(`[aiVerdict] Calling Gemini using ${modelName}…`);
            return await generativeModel.generateContent(prompt);
        };

        let result;
        let usedModel = opts.modelOverrides?.gemini || 'gemini-3-flash-preview';
        try {
            result = await attemptGenerate(usedModel);
        } catch (err) {
            const msg = err.message || '';
            if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('too many requests')) {
                console.warn(`[aiVerdict] 429 Quota on ${usedModel}. Falling back to gemini-2.5-flash`);
                usedModel = 'gemini-2.5-flash';
                result = await attemptGenerate(usedModel);
            } else {
                throw err;
            }
        }

        const raw = (result?.response?.text && typeof result.response.text === 'function')
            ? result.response.text().trim()
            : '';
        const cleaned = stripFences(raw);
        return { raw, cleaned, usedModel };
    }

    // ── OpenAI / Grok ─────────────────────────────────────────────────────────
    if (provider === 'openai' || provider === 'grok') {
        const { default: OpenAI } = await import('openai');
        const BASE_URLS = { openai: undefined, grok: 'https://api.x.ai/v1' };
        const DEFAULT_MODELS = { openai: 'gpt-4.1-mini', grok: 'grok-3-mini' };

        const client = new OpenAI({ apiKey, baseURL: BASE_URLS[provider] });
        const usedModel = opts.modelOverrides?.[provider] || DEFAULT_MODELS[provider];

        console.log(`[aiVerdict] Calling ${provider} (${usedModel}) for JSON completion…`);
        const response = await client.chat.completions.create({
            model: usedModel,
            temperature,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert paragliding safety analyst. Always respond with valid JSON only — no markdown, no prose.',
                },
                { role: 'user', content: prompt },
            ],
        });

        const raw = response.choices[0]?.message?.content?.trim() || '';
        const cleaned = stripFences(raw);
        return { raw, cleaned, usedModel };
    }

    // ── Anthropic ─────────────────────────────────────────────────────────────
    if (provider === 'anthropic') {
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const client = new Anthropic({ apiKey });
        const usedModel = opts.modelOverrides?.anthropic || 'claude-3-5-haiku-latest';

        console.log(`[aiVerdict] Calling Anthropic (${usedModel}) for JSON completion…`);
        const response = await client.messages.create({
            model: usedModel,
            max_tokens: Math.min(maxTokens, 4096), // Anthropic max varies by model
            temperature,
            system: 'You are an expert paragliding safety analyst. Always respond with a single valid JSON object — no markdown fences, no prose, no explanation before or after the JSON.',
            messages: [{ role: 'user', content: prompt }],
        });

        const raw = response.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
        const cleaned = stripFences(raw);
        return { raw, cleaned, usedModel };
    }

    throw new Error(`Unknown provider for JSON LLM: ${provider}`);
}

/**
 * Strip markdown code fences from a string (some models include them despite instructions).
 */
function stripFences(raw) {
    return raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
}

// ─── Day summary builder (unchanged) ─────────────────────────────────────────

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

// ─── Weekly verdict ───────────────────────────────────────────────────────────

/**
 * Get AI-generated flyability verdicts for a full 7-day period.
 * Returns a map of { [date]: verdict } for all available days.
 *
 * Now supports all providers — same prompts, same output schema.
 *
 * @param {object} site - Site object from ParaglidingEarth
 * @param {object} weather - Weather object from getExtendedWeather (7 days hourly)
 * @param {string|null} apiKey
 * @param {object|null} pilotProfile
 * @param {'gemini'|'openai'|'grok'|'anthropic'} provider
 */
export async function getAiWeeklyVerdicts(site, weather, apiKey = null, pilotProfile = null, provider = 'gemini') {
    const today = weather.current?.time?.slice(0, 10) || new Date().toISOString().slice(0, 10);

    // Build profile hash for cache key so different pilot skill levels don't share verdicts
    const styleCacheKey = pilotProfile?.flyingStyle
        ? (Array.isArray(pilotProfile.flyingStyle) ? pilotProfile.flyingStyle.slice().sort().join('-') : pilotProfile.flyingStyle)
        : '';
    const profileKey = (pilotProfile && pilotProfile.certification && pilotProfile.flyingStyle)
        ? `_${pilotProfile.certification}_${styleCacheKey}_${pilotProfile.wingType || ''}_${pilotProfile.experience || ''}`
        : '_default';
    const cacheKey = `week_${provider}_${site.lat?.toFixed(4)},${site.lng?.toFixed(4)},${today}${profileKey}`;

    const cached = verdictCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        console.log(`[aiVerdict] Cache hit for ${site.name} (week, ${provider})`);
        const cachedVerdicts = { ...cached.verdicts };
        for (const date in cachedVerdicts) {
            cachedVerdicts[date] = { ...cachedVerdicts[date], _isCached: true, _cachedAt: cached.cachedAt };
        }
        return cachedVerdicts;
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

    const certLabels = { student: 'Student (in training)', p2: 'P2 (Novice)', p3: 'P3 (Intermediate)', p4: 'P4 (Advanced)', comp: 'Competition-level' };
    const styleLabels = { thermal: 'Thermalling', ridge: 'Ridge Soaring', xc: 'Cross Country (XC)', hike: 'Hike & Fly' };
    const wingLabels = { a: 'Beginner (A-class)', b: 'Intermediate (B-class)', c: 'Advanced (C/D-class)' };
    const expLabels = { lt50: 'Under 50 hours', '50_200': '50–200 hours', '200_500': '200–500 hours', gt500: '500+ hours' };

    let pilotProfileBlock = '';
    if (pilotProfile && pilotProfile.certification) {
        const cert = certLabels[pilotProfile.certification] || pilotProfile.certification;
        const styleFlags = Array.isArray(pilotProfile.flyingStyle) ? pilotProfile.flyingStyle : [pilotProfile.flyingStyle].filter(Boolean);
        const style = styleFlags.map(s => styleLabels[s] || s).join(', ');
        const wing = wingLabels[pilotProfile.wingType] || pilotProfile.wingType;
        const exp = expLabels[pilotProfile.experience] || pilotProfile.experience;

        let thresholdGuidance = 'Apply STANDARD thresholds.';
        if (pilotProfile.certification === 'student' || pilotProfile.certification === 'p2') {
            thresholdGuidance = 'Apply CONSERVATIVE thresholds. Rate MARGINAL when winds exceed 10 mph, NO_GO when winds exceed 13 mph or gusts exceed 15 mph. Populate safetyNotes with beginner-specific warnings about rotor, thermal triggers, and launch conditions.';
        } else if (pilotProfile.certification === 'p4' || pilotProfile.certification === 'comp') {
            thresholdGuidance = 'Apply EXPERIENCED thresholds. Include XC potential analysis, thermal cycle quality, and advanced atmospheric notes in reasoning and safetyNotes.';
        }

        pilotProfileBlock = `

PILOT PROFILE (calibrate your GO/MARGINAL/NO_GO thresholds and safetyNotes for this pilot):
- Certification: ${cert}
- Style: ${style}
- Wing: ${wing}
- Experience: ${exp}
- Guidance: ${thresholdGuidance}`;
    }

    // This prompt is identical for all providers — only the API call differs
    const prompt = `You are an expert paragliding safety analyst. Analyze the following 7-day weather forecast for a specific site and produce a structured flyability verdict for EACH day.${pilotProfileBlock}

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
        const { cleaned, usedModel } = await callJsonLLM(prompt, provider, apiKey, {
            temperature: 0.2,
            maxTokens: 8192,
        });

        console.log(`[aiVerdict] Raw 7-day response (first 500):`, cleaned.slice(0, 500));

        if (!cleaned) {
            return buildFallbackWeekVerdicts(dates, 'Empty response from AI model', usedModel);
        }

        let parsed;
        try {
            parsed = JSON.parse(cleaned);
        } catch (parseErr) {
            console.error('[aiVerdict] JSON parse failed:', parseErr.message, '| raw:', cleaned.slice(0, 300));
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

        verdictCache.set(cacheKey, { verdicts, expiresAt: Date.now() + CACHE_TTL_MS, cachedAt: Date.now() });
        console.log(`[aiVerdict] Week verdicts for ${site.name} (${provider}):`, Object.entries(verdicts).map(([d, v]) => `${d}:${v.rating}`).join(', '));
        return verdicts;

    } catch (err) {
        let errorDetail = err.message || '';
        if (err.errorDetails) errorDetail += ' | details: ' + JSON.stringify(err.errorDetails);
        if (err.status) errorDetail += ' | status: ' + err.status;
        if (!errorDetail) errorDetail = JSON.stringify(err, Object.getOwnPropertyNames(err));
        if (!errorDetail || errorDetail === '{}') errorDetail = String(err);

        console.error(`[aiVerdict] ${provider} 7-day call FAILED for`, site?.name, ':', errorDetail);
        return buildFallbackWeekVerdicts(dates, errorDetail, provider);
    }
}

// ─── Fallback builders (unchanged) ───────────────────────────────────────────

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
        usedModel,
    };
}

function buildFallbackWeekVerdicts(dates, errorMessage, usedModel = 'unknown') {
    console.error(`[aiVerdict] FALLBACK for entire week. Reason: ${errorMessage}`);
    const result = {};
    dates.forEach(date => { result[date] = buildFallbackDayVerdict(date, errorMessage, usedModel); });
    return result;
}

// ─── Regional comparative verdict ────────────────────────────────────────────

/**
 * Perform a comparative analysis across multiple sites to find the best options.
 * Now supports all providers.
 */
export async function getRegionalComparativeVerdict(sitesData = [], apiKey = null, pilotProfile = null, provider = 'gemini') {
    if (sitesData.length === 0) return { bestSite: null, rankings: [] };

    const certLabels = { student: 'Student', p2: 'P2 (Novice)', p3: 'P3 (Intermediate)', p4: 'P4 (Advanced)', comp: 'Competition' };
    const styleLabels = { thermal: 'Thermalling', ridge: 'Ridge Soaring', xc: 'Cross Country', hike: 'Hike & Fly' };

    let pilotProfileBlock = '';
    if (pilotProfile && pilotProfile.certification) {
        const cert = certLabels[pilotProfile.certification] || pilotProfile.certification;
        const styleFlags = Array.isArray(pilotProfile.flyingStyle) ? pilotProfile.flyingStyle : [pilotProfile.flyingStyle].filter(Boolean);
        const styleStr = styleFlags.map(s => styleLabels[s] || s).join(', ');
        pilotProfileBlock = `\n\nPILOT PROFILE: This brief is for a ${cert} pilot focused on ${styleStr}. Weight site recommendations accordingly — prioritize calmer, more forgiving sites for beginners; technical, high-quality sites for advanced pilots.`;
    }

    const siteSummaries = sitesData.map(({ site, weather }) => {
        const today = weather.current?.time?.slice(0, 10) || new Date().toISOString().slice(0, 10);
        const hours = (weather?.hourly?.times || []).filter(t => t.startsWith(today));
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

    // Identical prompt for all providers
    const prompt = `You are an expert paragliding regional coordinator. Analyze the following paragliding sites and their conditions for TODAY to provide a ranked "Morning Brief" for pilots.${pilotProfileBlock}

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
        const { cleaned, usedModel } = await callJsonLLM(prompt, provider, apiKey, {
            temperature: 0.1,
            maxTokens: 2000,
        });

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
        console.error(`[aiVerdict] Regional Brief FAILED (${provider}):`, err.message);
        return {
            regionHeadline: 'Regional analysis unavailable.',
            siteOfDay: sitesData[0]?.site?.name || 'Unknown',
            rankings: sitesData.map((d, i) => ({
                siteName: d.site?.name,
                rank: i + 1,
                rating: 'MARGINAL',
                reasoning: `AI analysis failed: ${err.message}`,
                recommendedMode: 'mixed',
            })),
            overallSafetyNote: 'Always check local conditions before launching.',
            _error: err.message,
        };
    }
}

// ─── Legacy single-day export (unchanged — backward compat) ──────────────────

export async function getAiVerdict(site, weather, apiKey = null, provider = 'gemini') {
    const verdicts = await getAiWeeklyVerdicts(site, weather, apiKey, null, provider);
    const today = weather.current?.time?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    return verdicts[today] || buildFallbackDayVerdict(today, 'Today not in weekly verdicts', 'unknown');
}

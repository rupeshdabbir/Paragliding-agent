import { getAIModel } from '../utils/aiHeaders.jsx';
import { generateStructuredJson, generateChatStream } from './webAiEngine.js';

const VERDICT_CACHE_PREFIX = 'skypilot_webai_verdict_v2:';
const VERDICT_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function getCachedLocalVerdict(cacheKey) {
  try {
    const raw = localStorage.getItem(VERDICT_CACHE_PREFIX + cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > VERDICT_TTL_MS) {
      localStorage.removeItem(VERDICT_CACHE_PREFIX + cacheKey);
      return null;
    }
    return { ...parsed.payload, _cachedAt: parsed.ts };
  } catch {
    return null;
  }
}

function setCachedLocalVerdict(cacheKey, payload) {
  try {
    localStorage.setItem(
      VERDICT_CACHE_PREFIX + cacheKey,
      JSON.stringify({ ts: Date.now(), payload })
    );
  } catch {
    // ignore quota errors
  }
}

function normalizeRating(raw, fallback = 'MARGINAL') {
  const u = String(raw || '').toUpperCase().replace('-', '_');
  if (u === 'GO' || u === 'GOOD') return 'GO';
  if (u === 'NO_GO' || u === 'NOGO' || u === 'UNFLYABLE') return 'NO_GO';
  if (u === 'MARGINAL') return 'MARGINAL';
  return fallback;
}

/**
 * Generates 7-day structured flying verdicts on-device using WebAI (WebLLM or Chrome Gemini Nano).
 * Returns `{ aiVerdict, aiVerdicts, usedModel }` matching `/api/forecast` schema.
 */
export async function generateLocalWeeklyVerdicts(site, days, pilotProfile = null) {
  if (!days || days.length === 0) {
    return { aiVerdict: null, aiVerdicts: null, usedModel: null };
  }

  const requestedModelId = getAIModel('webai');
  const certLevel = pilotProfile?.rating || pilotProfile?.certificationLevel || 'P3';
  const siteKey = `${Number(site?.lat || 0).toFixed(2)},${Number(site?.lng || 0).toFixed(2)}`;
  const cacheKey = `${siteKey}:${days[0]?.date}:${certLevel}:${requestedModelId}`;

  const cached = getCachedLocalVerdict(cacheKey);
  if (cached && cached.aiVerdicts) {
    const hydrated = {};
    for (const [dateStr, v] of Object.entries(cached.aiVerdicts)) {
      hydrated[dateStr] = { ...v, _isCached: true, _cachedAt: cached._cachedAt };
    }
    const todayDate = days[0]?.date;
    return {
      aiVerdict: hydrated[todayDate] || Object.values(hydrated)[0] || null,
      aiVerdicts: hydrated,
      usedModel: cached.usedModel,
    };
  }

  // Build compact daylight summary for 1.5B-3B parameter context efficiency
  const compactDays = days
    .map((d) => {
      const daylight = (d.hours || []).filter(
        (h) => typeof h.hour === 'number' && h.hour >= 9 && h.hour <= 17 && h.hour % 2 === 1
      );
      const sample = daylight
        .map(
          (h) =>
            `${h.hour}h:${Math.round(h.windSpeed10m ?? 0)}/${Math.round(h.windGusts ?? 0)}mph@${h.windDirectionCardinal || ''}`
        )
        .join(' ');
      return `${d.date}(rule:${d.dayRating},avg:${d.avgWindMph}mph,gust:${d.maxGustMph}mph,dirs:${d.dominantWindDirs || 'var'}): ${sample}`;
    })
    .join('\n');

  const idealDirs =
    site?.windDirections && Object.keys(site.windDirections).length > 0
      ? Object.keys(site.windDirections).join(',')
      : 'Any';

  const systemPrompt =
    'You are SkyPilot AI, an expert paragliding meteorologist. Return ONLY valid JSON with no markdown fences.';

  const userPrompt = `Analyze 7-day paragliding conditions for ${site?.name || 'Launch Site'} (alt:${site?.altitude || 0}ft, idealWinds:${idealDirs}, pilot:${certLevel}).
Forecast summary:
${compactDays}

Return a JSON object with a "days" dictionary mapping each YYYY-MM-DD date to:
{
  "rating": "GO" | "MARGINAL" | "NO_GO",
  "headline": "Short 4-8 word headline",
  "reasoning": "1-2 concise sentences explaining wind speed, gusts, and direction alignment",
  "bestWindow": "e.g. 11am - 3pm or null",
  "siteMode": "thermaling" | "ridgeSoaring" | "sledRide" | "mixed" | "noFly",
  "siteModeLabel": "Thermaling Day" | "Ridge Soaring Day" | "Sled Ride" | "Mixed Conditions" | "Non-Flyable",
  "safetyNotes": ["1 short caution note if applicable"],
  "confidence": "High" | "Medium" | "Low"
}`;

  const schema = {
    type: 'object',
    properties: {
      days: { type: 'object' },
    },
    required: ['days'],
  };

  const { data, usedModel } = await generateStructuredJson({
    modelId: requestedModelId,
    systemPrompt,
    userPrompt,
    schema,
    temperature: 0.2,
    maxTokens: 950,
  });

  const rawDays = data?.days || {};
  const aiVerdicts = {};

  for (const d of days) {
    const v = rawDays[d.date] || {};
    const rating = normalizeRating(v.rating, d.dayRating || 'MARGINAL');
    aiVerdicts[d.date] = {
      rating,
      headline:
        v.headline ||
        (rating === 'GO'
          ? `Flyable conditions at ${site?.name || 'site'}`
          : rating === 'MARGINAL'
            ? 'Marginal conditions — monitor gusts'
            : 'Not recommended for flying'),
      reasoning:
        v.reasoning ||
        `Average wind ${d.avgWindMph} mph (gusts up to ${d.maxGustMph} mph) from ${d.dominantWindDirs || 'variable directions'}.`,
      bestWindow: v.bestWindow || null,
      siteMode: v.siteMode || (rating === 'NO_GO' ? 'noFly' : 'mixed'),
      siteModeLabel:
        v.siteModeLabel ||
        (rating === 'NO_GO' ? 'Non-Flyable' : rating === 'GO' ? 'Ridge / Thermal' : 'Marginal Conditions'),
      safetyNotes: Array.isArray(v.safetyNotes) ? v.safetyNotes : [],
      confidence: v.confidence || 'Medium',
      usedModel,
      _fallback: false,
      _isCached: false,
    };
  }

  setCachedLocalVerdict(cacheKey, { aiVerdicts, usedModel });

  const todayDate = days[0]?.date;
  return {
    aiVerdict: aiVerdicts[todayDate] || Object.values(aiVerdicts)[0] || null,
    aiVerdicts,
    usedModel,
  };
}

/**
 * Generates a regional morning brief on-device using WebAI from `/api/brief` sitesSummary.
 */
export async function generateLocalRegionalBrief(sitesSummary, pilotProfile = null) {
  if (!sitesSummary || sitesSummary.length === 0) {
    return null;
  }

  const requestedModelId = getAIModel('webai');
  const certLevel = pilotProfile?.rating || pilotProfile?.certificationLevel || 'P3';

  const compactSites = sitesSummary
    .map(
      (s) =>
        `- ${s.name} (alt:${s.altitude}ft, supportedWinds:${s.supportedDirectionsText}, todayAvg:${s.avgWindMph}mph, gust:${s.maxGustMph}mph, dir:${s.windDirsToday}, fav:${s.starred})`
    )
    .join('\n');

  const systemPrompt =
    'You are an expert paragliding safety officer writing a concise regional morning briefing. Return ONLY valid JSON.';

  const userPrompt = `Pilot certification: ${certLevel}.
Today's regional site conditions:
${compactSites}

Return a JSON object with:
{
  "regionHeadline": "1-2 sentence punchy regional overview for today",
  "siteOfDay": "Name of the single best site today",
  "rankings": [
    {
      "siteName": "Exact site name",
      "rank": 1,
      "rating": "GO" | "MARGINAL" | "NO_GO",
      "bestWindow": "e.g. 11am - 3pm or None",
      "reasoning": "1-2 sentence explanation of wind alignment and gusts",
      "recommendedMode": "thermaling" | "ridgeSoaring" | "sledRide" | "noFly"
    }
  ],
  "overallSafetyNote": "1 concise regional safety reminder"
}`;

  const { data, usedModel } = await generateStructuredJson({
    modelId: requestedModelId,
    systemPrompt,
    userPrompt,
    schema: {
      type: 'object',
      properties: {
        regionHeadline: { type: 'string' },
        siteOfDay: { type: 'string' },
        rankings: { type: 'array' },
        overallSafetyNote: { type: 'string' },
      },
      required: ['regionHeadline', 'rankings'],
    },
    temperature: 0.25,
    maxTokens: 900,
  });

  const normalizedRankings = Array.isArray(data?.rankings)
    ? data.rankings.map((r, idx) => {
        const matchedSummary = sitesSummary.find((s) => s.name === r.siteName);
        return {
          siteName: r.siteName || sitesSummary[idx]?.name || `Site ${idx + 1}`,
          rank: r.rank || idx + 1,
          rating: normalizeRating(r.rating, 'MARGINAL'),
          bestWindow: r.bestWindow || '11am - 3pm',
          reasoning: r.reasoning || '',
          recommendedMode: r.recommendedMode || 'mixed',
          isStarred: Boolean(matchedSummary?.starred),
        };
      })
    : [];

  return {
    regionHeadline: data?.regionHeadline || 'Regional WebAI forecast complete.',
    siteOfDay: data?.siteOfDay || normalizedRankings[0]?.siteName || null,
    rankings: normalizedRankings,
    overallSafetyNote:
      data?.overallSafetyNote || 'Always verify live windsock and local pilot reports at launch.',
    usedModel,
    aiPowered: true,
  };
}

/**
 * Runs a local client-side ReAct-style chat turn with live site & forecast context.
 */
export async function runLocalChatAgent({
  message,
  history = [],
  location,
  pilotProfile = null,
  onChunk,
  onThinkingStep,
}) {
  const thinkingSteps = [];
  const toolResults = [];

  const emitStep = (stepText) => {
    thinkingSteps.push(stepText);
    if (onThinkingStep) onThinkingStep(stepText);
  };

  let contextBlock = '';
  if (location?.lat && location?.lng) {
    try {
      emitStep('Fetching pilot sites near you 🗺️');
      const sitesParams = new URLSearchParams({
        lat: String(location.lat),
        lng: String(location.lng),
        distance: '50',
        limit: '6',
      });
      const sitesRes = await fetch(`/api/sites?${sitesParams.toString()}`);
      const sitesData = sitesRes.ok ? await sitesRes.json() : {};
      const sites = (sitesData?.sites || []).slice(0, 5);

      if (sites.length > 0) {
        const lowerMsg = message.toLowerCase();
        const matchedSite =
          sites.find((s) => lowerMsg.includes(s.name.toLowerCase())) || sites[0];

        emitStep(`Checking wind conditions at ${matchedSite.name} ⛰️`);

        const forecastParams = new URLSearchParams({
          lat: String(matchedSite.lat),
          lng: String(matchedSite.lng),
          siteName: matchedSite.name,
          siteAlt: String(matchedSite.altitude || 0),
          windDirs: JSON.stringify(matchedSite.windDirections || {}),
          siteTypes: JSON.stringify(matchedSite.siteTypes || {}),
        });
        const forecastRes = await fetch(`/api/forecast?${forecastParams.toString()}`);
        const forecastData = forecastRes.ok ? await forecastRes.json() : {};

        const today = forecastData?.days?.[0];
        const tomorrow = forecastData?.days?.[1];

        toolResults.push({
          tool: 'analyze_flying_conditions',
          result: {
            site: matchedSite,
            overallVerdict: today?.dayRating || 'MARGINAL',
          },
        });

        const siteListStr = sites
          .map(
            (s) =>
              `${s.name} (${s.distanceKm ?? '?'}km away, alt ${s.altitude}ft, ideal winds: ${Object.keys(s.windDirections || {}).join('/') || 'Any'})`
          )
          .join('; ');

        contextBlock = `Nearby Sites: ${siteListStr}\nFeatured Site Forecast (${matchedSite.name}):
- Today (${today?.date}): ${today?.dayRating} (avg ${today?.avgWindMph} mph, max gust ${today?.maxGustMph} mph, dirs ${today?.dominantWindDirs || 'variable'}, flyable ${today?.flyableDaylightHours}/${today?.totalDaylightHours} daylight hrs)
- Tomorrow (${tomorrow?.date}): ${tomorrow?.dayRating} (avg ${tomorrow?.avgWindMph} mph, max gust ${tomorrow?.maxGustMph} mph, dirs ${tomorrow?.dominantWindDirs || 'variable'})`;
      }
    } catch {
      // Non-fatal: continue with general paragliding knowledge
    }
  }

  emitStep('Running on-device AI model ✨');

  const certLevel = pilotProfile?.rating || pilotProfile?.certificationLevel || 'P3 (Intermediate)';
  const wingType = pilotProfile?.wingClass || pilotProfile?.wingType || 'EN-B';

  const systemPrompt = `You are SkyPilot, a safety-first paragliding weather & site advisor running 100% locally in the pilot's browser.
Pilot Profile: ${certLevel}, Wing: ${wingType}.
${contextBlock ? `\nLIVE TELEMETRY CONTEXT:\n${contextBlock}\n` : ''}
Provide concise, actionable, safety-oriented advice with wind speeds in mph and specific launch windows when available.`;

  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6).map((m) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user',
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  const { reply, usedModel } = await generateChatStream({
    modelId: getAIModel('webai'),
    messages: chatMessages,
    temperature: 0.4,
    maxTokens: 650,
    onChunk,
  });

  return {
    reply,
    toolResults,
    usedModel,
  };
}

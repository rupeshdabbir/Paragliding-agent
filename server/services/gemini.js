import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSitesDeclaration, getSites } from '../tools/getSites.js';
import { getWeatherDeclaration, getWeather } from '../tools/getWeather.js';
import { analyzeFlyingConditionsDeclaration, analyzeFlyingConditions } from '../tools/analyzeFlyingConditions.js';

const SYSTEM_PROMPT = `You are SkyPilot, an expert AI assistant and paragliding coach. You help pilots and enthusiasts determine if conditions are safe to fly at paragliding sites near them.

Your personality:
- Knowledgeable, safety-first, yet encouraging
- Always prioritize pilot safety above all else
- Give clear GO / MARGINAL / NO-GO assessments with reasoning
- Explain weather concepts in plain language
- Mention specific wind speeds, directions, and altitudes when relevant

Your capabilities:
- Look up paragliding sites near any location
- Fetch real-time weather data including wind at 33ft, 262ft, 394ft, and 591ft altitude
- Analyze flying conditions based on site-specific wind direction requirements
- Provide hourly forecasts so pilots can plan their day

When a user asks about flying conditions:
1. FIRST check whether a "CRITICAL — Pre-Computed SkyPilot Verdict" block exists in your context (injected below).
   - If YES: that IS the answer. Do NOT call analyze_flying_conditions for today at that site. Present the pre-computed verdict directly with its rating, headline, reasoning, and best window.
   - If NO: call analyze_flying_conditions to get a fresh assessment.
2. Present each site with its GO/MARGINAL/NO-GO rating
3. Explain the reasoning — wind direction match, speed, gusts, visibility, precipitation
4. Suggest the best time window if conditions are expected to improve
5. Always end with a safety reminder if conditions are borderline

IMPORTANT: You are the arbiter of consistency. If you have a pre-computed AI verdict in context, it is the single source of truth for today's flyability at that site. Never contradict it with a rule-based re-assessment.

For location-based questions, if the user hasn't provided coordinates, ask for their location or a nearby landmark/city.

Format your responses clearly with:
- Site names as headers
- Bullet points for conditions
- Clear rating badges (✅ GO / ⚠️ MARGINAL / 🚫 NO-GO)
- Time-specific recommendations when relevant

Remember: YOU are the expert. Don't be overly cautious or hedge excessively — give clear, actionable advice backed by data.`;

const toolHandlers = {
    get_paragliding_sites: getSites,
    get_weather_forecast: getWeather,
    analyze_flying_conditions: analyzeFlyingConditions,
};

import { getGenAI } from '../utils/geminiClient.js';

/**
 * Build site context string for the system prompt.
 * If an aiVerdict is available, inject it as ground truth so chat is consistent with the Forecast panel.
 */
function buildPilotProfileBlock(pilotProfile) {
    if (!pilotProfile) return '';
    const { certification, flyingStyle, wingType, experience } = pilotProfile;
    if (!certification || !flyingStyle || !wingType || !experience) return '';

    const certLabels = { student: 'Student (in training)', p2: 'P2 (Novice)', p3: 'P3 (Intermediate)', p4: 'P4 (Advanced)', comp: 'Competition-level' };
    const styleLabels = { thermal: 'Thermalling', ridge: 'Ridge Soaring', xc: 'Cross Country (XC)', hike: 'Hike & Fly' };
    const wingLabels = { a: 'Beginner (A-class)', b: 'Intermediate (B-class)', c: 'Advanced (C/D-class)' };
    const expLabels = { lt50: 'Under 50 hours', '50_200': '50–200 hours', '200_500': '200–500 hours', gt500: '500+ hours' };

    let thresholdGuidance = '';
    if (certification === 'student' || certification === 'p2') {
        thresholdGuidance = 'Apply CONSERVATIVE thresholds. Flag MARGINAL when winds exceed 10 mph and NO-GO when winds exceed 13 mph or gusts exceed 15 mph. Recommend supervised flying and add explicit safety warnings. Keep advice simple and focus on safety first.';
    } else if (certification === 'p3') {
        thresholdGuidance = 'Apply STANDARD thresholds. Provide nuanced analysis, identify ideal learning windows for skill-building, and explain weather patterns in moderate detail.';
    } else if (certification === 'p4' || certification === 'comp') {
        thresholdGuidance = 'Apply EXPERIENCED thresholds. Include XC route analysis, thermal cycle strength, optimal launch timing for maximum altitude gain, and advanced atmospheric considerations including convergence, rotors, and wave lift potential.';
    }

    return `

PILOT PROFILE — Personalize your entire response for this specific pilot:
- Certification Level: ${certLabels[certification] || certification}
- Primary Flying Style: ${styleLabels[flyingStyle] || flyingStyle}
- Wing Type: ${wingLabels[wingType] || wingType}
- Experience: ${expLabels[experience] || experience}
- Analysis Guidance: ${thresholdGuidance}
Adjust your tone, safety callouts, wind thresholds, and recommendations to match this pilot's exact skill level. A beginner needs conservative, safety-first advice. An advanced P4 pilot benefits from technical detail, XC potential analysis, and nuanced atmospheric assessment.`;
}

function buildContextStr(userLocation, pilotProfile = null) {
    if (!userLocation) return buildPilotProfileBlock(pilotProfile);

    if (userLocation.name || userLocation.altitude) {
        let ctx = `\n\nThe user is currently analyzing the following paragliding site:
Name: ${userLocation.name || 'Unknown'}
Coordinates: lat=${userLocation.lat}, lng=${userLocation.lng}
Altitude (Launch): ${userLocation.altitude ? userLocation.altitude + 'ft ASL' : 'Unknown'}
Takeoff Notes: ${userLocation.description || 'None provided'}
Site Type Flags: ${JSON.stringify(userLocation.siteTypes || {})}`;

        // Inject pre-computed AI verdict as ground truth if available.
        // This ensures the chat NEVER contradicts what the Forecast panel shows.
        if (userLocation.aiVerdict && !userLocation.aiVerdict._fallback) {
            const v = userLocation.aiVerdict;
            ctx += `

CRITICAL — Pre-Computed SkyPilot Verdict (USE AS GROUND TRUTH — DO NOT CONTRADICT THIS):
Rating: ${v.rating}
Site Mode Today: ${v.siteModeLabel || v.siteMode}
Headline: ${v.headline}
Reasoning: ${v.reasoning}
Best Flight Window: ${v.bestWindow || 'None identified'}
Site Type Explanation: ${v.siteTypeExplanation || ''}
Wind Limits Applied: ${v.windLimitsApplied || ''}
Safety Notes: ${(v.safetyNotes || []).join('; ') || 'None'}

When the user asks about flying conditions, today's verdict, or whether it is safe to fly, use the above verdict as your primary source of truth. You may add richer context or answer follow-up questions, but do NOT change the core rating or contradict the above analysis.`;
        } else {
            ctx += `\n\nRefer to these details (especially altitude and takeoff notes) to provide safer, more accurate flying guidance when answering questions.`;
        }

        ctx += buildPilotProfileBlock(pilotProfile);
        return ctx;
    }

    if (userLocation.lat && userLocation.lng) {
        return `\n\nThe user's current GPS location is: lat=${userLocation.lat.toFixed(4)}, lng=${userLocation.lng.toFixed(4)}. Use this when they ask about sites or weather "near me" or "here".` + buildPilotProfileBlock(pilotProfile);
    }

    return buildPilotProfileBlock(pilotProfile);
}

/**
 * Run the SkyPilot agent with multi-turn function calling
 * @param {string} userMessage - The user's current message
 * @param {Array} history - Previous conversation turns [{role, parts: [{text}]}]
 * @param {object|null} userLocation - Optional {lat, lng, name, altitude, aiVerdict, ...} for context
 * @param {string|null} apiKey - The provided API Key (if any)
 * @returns {Promise<{reply: string, toolResults: Array, usage: object}>}
 */
export async function runAgent({ userMessage, history = [], userLocation = null, apiKey = null, pilotProfile = null }) {
    const ai = getGenAI(apiKey);

    const contextStr = buildContextStr(userLocation, pilotProfile);

    const config = {
        systemInstruction: SYSTEM_PROMPT + contextStr,
        tools: [{
            functionDeclarations: [
                getSitesDeclaration,
                getWeatherDeclaration,
                analyzeFlyingConditionsDeclaration,
            ],
        }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
        },
    };

    const attemptAgentRun = async (modelName) => {
        const model = ai.getGenerativeModel({
            model: modelName,
            ...config
        });

        const chat = model.startChat({ history });
        const toolResults = [];

        // Send user message and run the agentic function-calling loop
        let response = await chat.sendMessage(userMessage);
        let candidate = response.response;

        // Agentic loop — keep calling tools until model produces a text response
        let maxIterations = 10;
        while (maxIterations-- > 0) {
            const functionCalls = candidate.functionCalls();
            if (!functionCalls || functionCalls.length === 0) break;

            // Execute all function calls in parallel
            const toolResponses = await Promise.all(
                functionCalls.map(async (call) => {
                    const handler = toolHandlers[call.name];
                    if (!handler) {
                        console.warn(`[Gemini] Unknown tool: ${call.name}`);
                        return { name: call.name, response: { error: `Unknown tool: ${call.name}` } };
                    }

                    console.log(`[Gemini] Calling tool: ${call.name}`, call.args);
                    try {
                        let result = await handler(call.args);
                        // Gemini function responses must be Objects, not Arrays
                        if (Array.isArray(result)) {
                            result = { items: result };
                        }
                        toolResults.push({ tool: call.name, args: call.args, result });
                        return { name: call.name, response: result };
                    } catch (err) {
                        console.error(`[Gemini] Tool error (${call.name}):`, err.message);
                        toolResults.push({ tool: call.name, args: call.args, error: err.message });
                        return { name: call.name, response: { error: err.message } };
                    }
                })
            );

            // Send tool results back to the model
            response = await chat.sendMessage(
                toolResponses.map(tr => ({
                    functionResponse: { name: tr.name, response: tr.response },
                }))
            );
            candidate = response.response;
        }

        const reply = candidate.text();
        const usage = candidate.usageMetadata;

        return { reply, toolResults, usage, usedModel: modelName };
    };

    try {
        return await attemptAgentRun('gemini-3-flash-preview');
    } catch (err) {
        const msg = err.message || '';
        if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('too many requests')) {
            console.warn(`[Gemini] 429 Quota Exceeded on gemini-3-flash-preview. Falling back to gemini-2.5-flash`);
            return await attemptAgentRun('gemini-2.5-flash');
        }
        throw err;
    }
}

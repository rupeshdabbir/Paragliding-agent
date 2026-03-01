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
1. Use analyze_flying_conditions to get a comprehensive assessment (it fetches sites AND weather internally)
2. Present each site with its GO/MARGINAL/NO-GO rating
3. Explain the reasoning — wind direction match, speed, gusts, visibility, precipitation
4. Suggest the best time window if conditions are expected to improve
5. Always end with a safety reminder if conditions are borderline

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

let genAI = null;

function getGenAI() {
    if (!genAI) {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not set in environment variables');
        }
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    return genAI;
}

/**
 * Build site context string for the system prompt.
 * If an aiVerdict is available, inject it as ground truth so chat is consistent with the Forecast panel.
 */
function buildContextStr(userLocation) {
    if (!userLocation) return '';

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

        return ctx;
    }

    if (userLocation.lat && userLocation.lng) {
        return `\n\nThe user's current GPS location is: lat=${userLocation.lat.toFixed(4)}, lng=${userLocation.lng.toFixed(4)}. Use this when they ask about sites or weather "near me" or "here".`;
    }

    return '';
}

/**
 * Run the SkyPilot agent with multi-turn function calling
 * @param {string} userMessage - The user's current message
 * @param {Array} history - Previous conversation turns [{role, parts: [{text}]}]
 * @param {object|null} userLocation - Optional {lat, lng, name, altitude, aiVerdict, ...} for context
 * @returns {Promise<{reply: string, toolResults: Array, usage: object}>}
 */
export async function runAgent({ userMessage, history = [], userLocation = null }) {
    const ai = getGenAI();

    const contextStr = buildContextStr(userLocation);

    const model = ai.getGenerativeModel({
        model: 'gemini-2.0-flash',
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

    return { reply, toolResults, usage };
}

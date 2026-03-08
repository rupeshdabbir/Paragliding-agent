import express from 'express';
import { runProviderAgent } from '../utils/aiClient.js';
import { getSitesDeclaration, getSites } from '../tools/getSites.js';
import { getWeatherDeclaration, getWeather } from '../tools/getWeather.js';
import { analyzeFlyingConditionsDeclaration, analyzeFlyingConditions } from '../tools/analyzeFlyingConditions.js';

// Bring in the same system prompt and context builder used by the Gemini agent
// so non-Gemini providers get the exact same instructions.
import { SYSTEM_PROMPT, buildContextStr } from '../services/gemini.js';

const router = express.Router();

const TOOL_HANDLERS = {
    get_paragliding_sites: getSites,
    get_weather_forecast: getWeather,
    analyze_flying_conditions: analyzeFlyingConditions,
};

const TOOL_DECLARATIONS = [
    getSitesDeclaration,
    getWeatherDeclaration,
    analyzeFlyingConditionsDeclaration,
];

// POST /api/chat
// Body: { message: string, history: Array, location?: {lat, lng} }
router.post('/', async (req, res) => {
    const { message, history = [], location = null } = req.body;

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'message is required' });
    }

    try {
        // Read provider + key from the new unified headers (with fallback to old header name)
        const provider = (req.headers['x-ai-provider'] || 'gemini').toLowerCase();
        const apiKey = req.headers['x-ai-api-key'] || req.headers['x-gemini-api-key'] || null;

        // Parse pilot profile from header (JSON string)
        let pilotProfile = null;
        const profileHeader = req.headers['x-pilot-profile'];
        if (profileHeader && profileHeader.trim()) {
            try { pilotProfile = JSON.parse(profileHeader); } catch { /* ignore malformed */ }
        }

        // Build the system prompt with location/pilot context (used by non-Gemini providers)
        const contextStr = buildContextStr(location, pilotProfile);
        const systemPrompt = SYSTEM_PROMPT + contextStr;

        // Normalize history to {role, content} format
        const normalizedHistory = (history || []).map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            content: m.content,
        }));

        const { reply, toolResults, usage, usedModel } = await runProviderAgent({
            provider,
            apiKey,
            userMessage: message,
            history: normalizedHistory,
            userLocation: location,
            pilotProfile,
            systemPrompt,
            toolDeclarations: TOOL_DECLARATIONS,
            toolHandlers: TOOL_HANDLERS,
        });

        res.json({ reply, toolResults, usage, usedModel });
    } catch (err) {
        console.error(`[chat] Error:`, err.message);

        let attemptedModel = 'unknown';
        if (err.message?.includes('gemini')) attemptedModel = 'gemini-3-flash-preview';
        else if (err.message?.includes('grok')) attemptedModel = 'grok-3-mini';
        else if (err.message?.includes('claude')) attemptedModel = 'claude-3-5-haiku-latest';
        else if (err.message?.includes('gpt')) attemptedModel = 'gpt-4.1-mini';

        res.status(500).json({
            error: err.message || 'Internal server error from AI service',
            usedModel: attemptedModel,
        });
    }
});

export default router;

import express from 'express';
import { runProviderAgent } from '../utils/aiClient.js';
import { getSitesDeclaration, getSites } from '../tools/getSites.js';
import { getWeatherDeclaration, getWeather } from '../tools/getWeather.js';
import { analyzeFlyingConditionsDeclaration, analyzeFlyingConditions } from '../tools/analyzeFlyingConditions.js';
import { SYSTEM_PROMPT, buildContextStr } from '../services/gemini.js';
import { resolveProviderModel } from '../config/aiCatalog.js';

const router = express.Router();

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

    // Hard truncate to prevent massive prompt-stuffing OOM attacks
    const safeMessage = message.slice(0, 2000);

    const provider = (req.headers['x-ai-provider'] || 'gemini').toLowerCase();
    const preferredModel = req.headers['x-ai-model'] || null;
    const apiKey = req.headers['x-ai-api-key'] || req.headers['x-gemini-api-key'] || null;

    try {
        let pilotProfile = null;
        const profileHeader = req.headers['x-pilot-profile'];
        if (profileHeader && profileHeader.trim()) {
            try { pilotProfile = JSON.parse(profileHeader); } catch { /* ignore malformed */ }
        }

        const contextStr = buildContextStr(location, pilotProfile);
        const systemPrompt = SYSTEM_PROMPT + contextStr;

        const normalizedHistory = (history || []).map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            content: m.content,
        }));

        const toolHandlers = {
            get_paragliding_sites: getSites,
            get_weather_forecast: getWeather,
            analyze_flying_conditions: (args) =>
                analyzeFlyingConditions({
                    ...args,
                    apiKey,
                    provider,
                    preferredModel,
                    pilotProfile,
                }),
        };

        const { reply, toolResults, usage, usedModel } = await runProviderAgent({
            provider,
            apiKey,
            preferredModel,
            userMessage: safeMessage,
            history: normalizedHistory,
            userLocation: location,
            pilotProfile,
            systemPrompt,
            toolDeclarations: TOOL_DECLARATIONS,
            toolHandlers,
        });

        res.json({ reply, toolResults, usage, usedModel });
    } catch (err) {
        console.error(`[chat] Error:`, err.message);
        const attemptedModel = resolveProviderModel(provider, preferredModel);

        res.status(500).json({
            error: err.message || 'Internal server error from AI service',
            usedModel: attemptedModel,
        });
    }
});

export default router;

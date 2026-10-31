import express from 'express';
import { resolveProviderModel } from '../config/aiCatalog.js';

const router = express.Router();

// Validates the API key by making a lightweight request to the provider's API.
router.post('/', async (req, res) => {
    const { provider, apiKey } = req.body;

    if (!provider) {
        return res.status(400).json({ valid: false, error: 'Provider is required.' });
    }

    // Client-side WebAI requires no server API key
    if (provider === 'webai') {
        return res.json({ valid: true });
    }

    if (!apiKey) {
        return res.status(400).json({ valid: false, error: 'Provider and API key are required.' });
    }

    try {
        if (provider === 'gemini') {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            if (response.ok) {
                return res.json({ valid: true });
            } else {
                return res.json({ valid: false, error: 'Invalid Google Gemini API Key' });
            }
        }
        else if (provider === 'openai') {
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` },
            });
            if (response.ok) return res.json({ valid: true });
            return res.json({ valid: false, error: 'Invalid OpenAI API Key' });
        }
        else if (provider === 'anthropic') {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    model: resolveProviderModel('anthropic'),
                    max_tokens: 1,
                    messages: [{ role: 'user', content: 'hello' }],
                }),
            });
            if (response.status === 401) {
                return res.json({ valid: false, error: 'Invalid Anthropic API Key' });
            }
            return res.json({ valid: true });
        }
        else if (provider === 'grok') {
            const response = await fetch('https://api.x.ai/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` },
            });
            if (response.ok) return res.json({ valid: true });
            return res.json({ valid: false, error: 'Invalid xAI Grok API Key' });
        }

        return res.status(400).json({ valid: false, error: `Unknown provider: ${provider}` });
    } catch (err) {
        console.error(`[validate] Error checking ${provider} key:`, err.message);
        return res.json({ valid: false, error: `Failed to validate key: ${err.message}` });
    }
});

export default router;

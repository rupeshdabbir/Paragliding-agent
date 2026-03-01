import express from 'express';
import { runAgent } from '../services/gemini.js';

const router = express.Router();

// POST /api/chat
// Body: { message: string, history: Array, location?: {lat, lng} }
router.post('/', async (req, res) => {
    const { message, history = [], location = null } = req.body;

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'message is required' });
    }

    try {
        // Convert history from client format to Gemini format
        const geminiHistory = (history || []).map(turn => ({
            role: turn.role, // 'user' or 'model'
            parts: [{ text: turn.content }],
        }));

        const { reply, toolResults, usage } = await runAgent({
            userMessage: message,
            history: geminiHistory,
            userLocation: location,
        });

        res.json({ reply, toolResults, usage });
    } catch (err) {
        console.error('[chat] Error from Gemini API:', err.message);
        // Do not crash the server on API errors (like rate limits or bad keys)
        res.status(500).json({ error: err.message || 'Internal server error from AI service' });
    }
});

export default router;

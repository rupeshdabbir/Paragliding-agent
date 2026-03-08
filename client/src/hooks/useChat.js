import { useState, useCallback, useRef, useEffect } from 'react';

const THINKING_STEPS = [
    'Checking wind conditions ⛰️',
    'Reading weather models...',
    'Fetching pilot sites near you 🗺️',
    'Analyzing thermals & lift 🪂',
    'Reading site wind limits...',
    'Cross-referencing HRRR model...',
    'Calculating best launch window...',
    'Putting together your brief ✨',
];

export function useChat() {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [thinkingStep, setThinkingStep] = useState(THINKING_STEPS[0]);
    const thinkingIntervalRef = useRef(null);
    const stepIndexRef = useRef(0);

    // Cycle through thinking steps while loading
    useEffect(() => {
        if (loading) {
            stepIndexRef.current = 0;
            setThinkingStep(THINKING_STEPS[0]);
            thinkingIntervalRef.current = setInterval(() => {
                stepIndexRef.current = (stepIndexRef.current + 1) % THINKING_STEPS.length;
                setThinkingStep(THINKING_STEPS[stepIndexRef.current]);
            }, 1600);
        } else {
            if (thinkingIntervalRef.current) {
                clearInterval(thinkingIntervalRef.current);
                thinkingIntervalRef.current = null;
            }
        }
        return () => {
            if (thinkingIntervalRef.current) clearInterval(thinkingIntervalRef.current);
        };
    }, [loading]);

    const sendMessage = useCallback(async (text, location = null) => {
        if (!text.trim()) return;

        const userMessage = {
            role: 'user',
            content: text,
            timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, userMessage]);
        setLoading(true);
        setError(null);

        // Build history for the provider (all turns so far)
        const history = messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            content: m.content,
        }));

        try {
            const { getAIHeaders } = await import('../utils/aiHeaders.js');
            const aiHeaders = getAIHeaders();
            const pilotProfile = localStorage.getItem('skypilot_pilot_profile') || '';

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...aiHeaders,
                    'x-pilot-profile': pilotProfile,
                },
                body: JSON.stringify({ message: text, history, location }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                const e = new Error(err.error || `Server error ${res.status}`);
                e.usedModel = err.usedModel;
                throw e;
            }

            const data = await res.json();

            const aiMessage = {
                role: 'model',
                content: data.reply,
                toolResults: data.toolResults || [],
                timestamp: new Date().toISOString(),
                usedModel: data.usedModel || 'unknown',
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (err) {
            setError(err.message);
            setMessages(prev => [
                ...prev,
                {
                    role: 'model',
                    content: `Sorry, I encountered an error: ${err.message}`,
                    timestamp: new Date().toISOString(),
                    usedModel: err.usedModel || 'unknown',
                },
            ]);
        } finally {
            setLoading(false);
        }
    }, [messages]);

    const clearMessages = useCallback(() => {
        setMessages([]);
        setError(null);
    }, []);

    return { messages, loading, error, thinkingStep, sendMessage, clearMessages };
}

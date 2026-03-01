import { useState, useCallback } from 'react';

export function useChat() {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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

        // Build history for Gemini (all turns so far)
        const history = messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            content: m.content,
        }));

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, history, location }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `Server error ${res.status}`);
            }

            const data = await res.json();

            const aiMessage = {
                role: 'model',
                content: data.reply,
                toolResults: data.toolResults || [],
                timestamp: new Date().toISOString(),
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (err) {
            setError(err.message);
            setMessages(prev => [...prev, {
                role: 'model',
                content: `Sorry, I encountered an error: ${err.message}. Please check that your GEMINI_API_KEY is configured.`,
                timestamp: new Date().toISOString(),
            }]);
        } finally {
            setLoading(false);
        }
    }, [messages]);

    const clearMessages = useCallback(() => {
        setMessages([]);
        setError(null);
    }, []);

    return { messages, loading, error, sendMessage, clearMessages };
}

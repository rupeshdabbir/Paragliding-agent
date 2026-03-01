import { useState, useRef, useEffect } from 'react';
import { Send, MapPin, LocateFixed, Trash2, Wind, ChevronRight } from 'lucide-react';
import { useChat } from '../hooks/useChat.js';
import { useGeolocation } from '../hooks/useGeolocation.js';
import ChatMessage, { TypingIndicator } from '../components/ChatMessage.jsx';

const SUGGESTED_PROMPTS = [
    'Can I fly today near me?',
    'What are the best paragliding sites within 50km?',
    'What is the wind like at 120m altitude right now?',
    'Is there a better time window to fly today?',
    'Explain ridge soaring conditions at this site',
];

export default function Chat() {
    const { messages, loading, sendMessage, clearMessages } = useChat();
    const [input, setInput] = useState('');
    const [useLocation, setUseLocation] = useState(false);
    const { location, loading: locLoading, error: locError, requestLocation } = useGeolocation();
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Auto-scroll on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        const text = input.trim();
        setInput('');
        await sendMessage(text, useLocation && location ? location : null);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleLocationToggle = () => {
        if (!useLocation && !location) requestLocation();
        setUseLocation(v => !v);
    };

    const isEmpty = messages.length === 0;

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100vh',
            background: 'radial-gradient(ellipse at 30% -10%, #0a1e3d 0%, #080d1a 50%)',
            paddingTop: 60, // navbar height
        }}>

            {/* Messages area */}
            <div style={{
                flex: 1, overflowY: 'auto', padding: '24px 0',
                display: 'flex', flexDirection: 'column',
            }}>
                <div style={{ maxWidth: 760, width: '100%', margin: '0 auto', padding: '0 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>

                    {/* Empty state */}
                    {isEmpty && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'fade-up 0.6s ease' }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: 18,
                                background: 'linear-gradient(135deg, var(--color-sky), #0055cc)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: 20, animation: 'float 4s ease-in-out infinite',
                                boxShadow: '0 8px 32px rgba(0,200,255,0.3)',
                            }}>
                                <Wind size={32} color="#fff" />
                            </div>
                            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginBottom: 10 }}>
                                Ask SkyPilot Anything
                            </h2>
                            <p style={{ color: 'rgba(232,237,245,0.5)', textAlign: 'center', maxWidth: 400, marginBottom: 32, lineHeight: 1.6 }}>
                                I'll check real-time weather, find nearby sites, and tell you exactly whether it's safe to fly today.
                            </p>

                            {/* Suggested prompts */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 480 }}>
                                {SUGGESTED_PROMPTS.map((prompt) => (
                                    <button key={prompt} onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                                        style={{
                                            background: 'rgba(13,21,40,0.7)', border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: 12, padding: '12px 16px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                                            cursor: 'pointer', color: 'rgba(232,237,245,0.7)', fontSize: '0.88rem',
                                            transition: 'all 0.2s ease', textAlign: 'left',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,200,255,0.3)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(0,200,255,0.06)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(232,237,245,0.7)'; e.currentTarget.style.background = 'rgba(13,21,40,0.7)'; }}
                                    >
                                        {prompt}
                                        <ChevronRight size={14} style={{ flexShrink: 0 }} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    {!isEmpty && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {messages.map((msg, i) => (
                                <ChatMessage key={i} message={msg} />
                            ))}
                            {loading && <TypingIndicator />}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>
            </div>

            {/* Input bar */}
            <div style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(8,13,26,0.9)',
                backdropFilter: 'blur(20px)',
                padding: '16px 20px',
            }}>
                <div style={{ maxWidth: 760, margin: '0 auto' }}>
                    {/* Location + Clear controls */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                        <button
                            onClick={handleLocationToggle}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '5px 12px', borderRadius: 100,
                                background: useLocation && location ? 'var(--color-sky-dim)' : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${useLocation && location ? 'rgba(0,200,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                color: useLocation && location ? 'var(--color-sky)' : 'rgba(232,237,245,0.45)',
                                fontSize: '0.78rem', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s ease',
                            }}
                        >
                            {locLoading ? (
                                <div style={{ width: 12, height: 12, border: '2px solid var(--color-sky)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            ) : (
                                <LocateFixed size={12} />
                            )}
                            {location && useLocation ? `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}` : 'Use my location'}
                        </button>

                        {messages.length > 0 && (
                            <button onClick={clearMessages}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    padding: '5px 12px', borderRadius: 100,
                                    background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                                    color: 'rgba(232,237,245,0.35)', fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.color = 'rgba(239,68,68,0.7)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(232,237,245,0.35)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                            >
                                <Trash2 size={12} /> Clear
                            </button>
                        )}
                    </div>

                    {/* Text input */}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about flying conditions, sites, weather..."
                            rows={1}
                            style={{
                                flex: 1, background: 'rgba(13,21,40,0.8)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 14, padding: '13px 16px',
                                color: '#e8edf5', fontFamily: 'var(--font-body)', fontSize: '0.92rem',
                                resize: 'none', outline: 'none',
                                transition: 'border-color 0.2s ease',
                                lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
                            }}
                            onFocus={e => e.target.style.borderColor = 'rgba(0,200,255,0.4)'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || loading}
                            style={{
                                width: 46, height: 46, borderRadius: 12, border: 'none',
                                background: input.trim() && !loading
                                    ? 'linear-gradient(135deg, var(--color-sky), #0055cc)'
                                    : 'rgba(255,255,255,0.06)',
                                color: input.trim() && !loading ? '#fff' : 'rgba(232,237,245,0.3)',
                                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s ease', flexShrink: 0,
                                boxShadow: input.trim() && !loading ? '0 4px 16px rgba(0,200,255,0.25)' : 'none',
                            }}
                        >
                            {loading
                                ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                : <Send size={18} />
                            }
                        </button>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'rgba(232,237,245,0.25)', marginTop: 8, textAlign: 'center' }}>
                        Press Enter to send · Shift+Enter for new line · Powered by Gemini
                    </p>
                </div>
            </div>
        </div>
    );
}

import { useState, useRef, useEffect } from 'react';
import { Send, LocateFixed, Trash2, Wind, ChevronRight, Sparkles, MapPin, Clock, Cloud } from 'lucide-react';
import { useChat } from '../hooks/useChat.js';
import { useGeolocation } from '../hooks/useGeolocation.js';
import ChatMessage, { TypingIndicator } from '../components/ChatMessage.jsx';

const SUGGESTED_PROMPTS = [
    { text: 'Can I fly today near me?', icon: '📍', category: 'Conditions' },
    { text: 'Best sites within 50km?', icon: '🗺️', category: 'Sites' },
    { text: 'Wind at 400ft altitude right now?', icon: '💨', category: 'Wind' },
    { text: 'Better time window to fly today?', icon: '⏰', category: 'Timing' },
    { text: 'Ridge soaring conditions here?', icon: '⛰️', category: 'Soaring' },
    { text: 'Is it safe to fly in thermals today?', icon: '☀️', category: 'Safety' },
];

export default function Chat() {
    const { messages, loading, sendMessage, clearMessages } = useChat();
    const [input, setInput] = useState('');
    const [useLocation, setUseLocation] = useState(false);
    const { location, loading: locLoading, requestLocation } = useGeolocation();
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

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
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const handleLocationToggle = () => {
        if (!useLocation && !location) requestLocation();
        setUseLocation(v => !v);
    };

    const isEmpty = messages.length === 0;

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100vh',
            background: 'radial-gradient(ellipse at 30% -10%, rgba(0,50,120,0.4) 0%, var(--color-bg) 55%)',
            paddingTop: 'var(--navbar-height)',
        }}>
            {/* Messages area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 0', display: 'flex', flexDirection: 'column' }}>
                <div style={{ maxWidth: 760, width: '100%', margin: '0 auto', padding: '0 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>

                    {/* ── Empty state / Hero ── */}
                    {isEmpty && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'fade-up 0.6s ease', gap: 0, paddingTop: 20 }}>

                            {/* Animated icon cluster */}
                            <div style={{ position: 'relative', marginBottom: 28 }}>
                                {/* Outer glow ring */}
                                <div style={{
                                    position: 'absolute', inset: -20, borderRadius: '50%',
                                    background: 'radial-gradient(circle, rgba(0,200,255,0.15) 0%, transparent 70%)',
                                    animation: 'glow-pulse 3s ease-in-out infinite',
                                }} />
                                {/* Icon container */}
                                <div style={{
                                    width: 76, height: 76, borderRadius: 22,
                                    background: 'linear-gradient(145deg, #0a1a40, #0d2060)',
                                    border: '1px solid rgba(0,200,255,0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    position: 'relative', animation: 'float-gentle 5s ease-in-out infinite',
                                    boxShadow: '0 8px 48px rgba(0,200,255,0.25), 0 0 0 1px rgba(0,200,255,0.1)',
                                }}>
                                    {/* Sparkle dots */}
                                    {[
                                        { top: -6, right: -6, size: 10, color: 'var(--color-sky)', delay: '0s' },
                                        { top: 8, left: -10, size: 7, color: 'var(--color-go)', delay: '0.8s' },
                                        { bottom: -4, right: 10, size: 8, color: '#a78bfa', delay: '1.6s' },
                                    ].map((dot, i) => (
                                        <div key={i} style={{
                                            position: 'absolute', width: dot.size, height: dot.size,
                                            borderRadius: '50%', background: dot.color,
                                            top: dot.top, right: dot.right, left: dot.left, bottom: dot.bottom,
                                            boxShadow: `0 0 8px ${dot.color}`,
                                            animation: `glow-pulse 2s ease-in-out ${dot.delay} infinite`,
                                        }} />
                                    ))}
                                    <Wind size={36} color="var(--color-sky)" strokeWidth={1.8} style={{ filter: 'drop-shadow(0 0 8px rgba(0,200,255,0.6))' }} />
                                </div>
                            </div>

                            {/* Headline */}
                            <h1 style={{
                                fontFamily: 'var(--font-heading)', fontWeight: 800,
                                fontSize: 'clamp(1.6rem, 5vw, 2.1rem)',
                                color: 'transparent',
                                backgroundClip: 'text', WebkitBackgroundClip: 'text',
                                backgroundImage: 'linear-gradient(135deg, #fff 20%, var(--color-sky) 80%)',
                                marginBottom: 10, textAlign: 'center', letterSpacing: '-0.03em',
                            }}>
                                Your AI Flight Advisor
                            </h1>
                            <p style={{
                                color: 'rgba(232,237,245,0.5)', textAlign: 'center',
                                maxWidth: 420, marginBottom: 36, lineHeight: 1.65, fontSize: '0.95rem',
                            }}>
                                Ask about flying conditions, find nearby sites, and get personalized advice — powered by real-time weather data.
                            </p>

                            {/* Prompt chip grid */}
                            <div className="prompt-chip-grid" style={{ width: '100%', maxWidth: 520 }}>
                                {SUGGESTED_PROMPTS.map((prompt) => (
                                    <button key={prompt.text}
                                        onClick={() => { setInput(prompt.text); inputRef.current?.focus(); }}
                                        style={{
                                            background: 'rgba(10, 16, 30, 0.7)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: 14, padding: '12px 14px',
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            cursor: 'pointer', textAlign: 'left',
                                            transition: 'all 0.22s ease',
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.borderColor = 'rgba(0,200,255,0.3)';
                                            e.currentTarget.style.background = 'rgba(0,200,255,0.06)';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                                            e.currentTarget.style.background = 'rgba(10,16,30,0.7)';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        <span style={{
                                            fontSize: '1.2rem', lineHeight: 1,
                                            width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: 'rgba(255,255,255,0.06)', borderRadius: 8, flexShrink: 0,
                                        }}>{prompt.icon}</span>
                                        <div>
                                            <div style={{ fontSize: '0.82rem', color: 'rgba(232,237,245,0.8)', fontWeight: 500, lineHeight: 1.3 }}>{prompt.text}</div>
                                            <div style={{ fontSize: '0.68rem', color: 'rgba(232,237,245,0.35)', marginTop: 2 }}>{prompt.category}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    {!isEmpty && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {messages.map((msg, i) => <ChatMessage key={i} message={msg} />)}
                            {loading && <TypingIndicator />}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>
            </div>

            {/* Input bar */}
            <div style={{
                borderTop: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(6, 10, 20, 0.95)',
                backdropFilter: 'blur(24px)',
                padding: '14px 16px',
                paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
            }}>
                <div style={{ maxWidth: 760, margin: '0 auto' }}>
                    {/* Controls row */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                        {/* Location pill */}
                        <button onClick={handleLocationToggle} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '5px 12px', borderRadius: 100,
                            background: useLocation && location ? 'var(--color-sky-dim)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${useLocation && location ? 'rgba(0,200,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                            color: useLocation && location ? 'var(--color-sky)' : 'rgba(232,237,245,0.45)',
                            fontSize: '0.78rem', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s ease',
                        }}>
                            {locLoading
                                ? <div style={{ width: 12, height: 12, border: '2px solid var(--color-sky)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                : <LocateFixed size={12} />
                            }
                            {location && useLocation ? `📍 ${location.lat.toFixed(2)}, ${location.lng.toFixed(2)}` : 'Share location'}
                        </button>

                        {messages.length > 0 && (
                            <button onClick={clearMessages} style={{
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

                        {/* Powered by tag */}
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: 'rgba(232,237,245,0.25)' }}>
                            <Sparkles size={10} />
                            Powered by Gemini
                        </div>
                    </div>

                    {/* Text input */}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask about flying conditions, sites, weather..."
                                rows={1}
                                style={{
                                    width: '100%',
                                    background: 'rgba(13, 21, 40, 0.85)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 16, padding: '13px 16px',
                                    color: '#e8edf5', fontFamily: 'var(--font-body)', fontSize: '0.92rem',
                                    resize: 'none', outline: 'none',
                                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                                    lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
                                }}
                                onFocus={e => {
                                    e.target.style.borderColor = 'rgba(0,200,255,0.5)';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(0,200,255,0.1)';
                                }}
                                onBlur={e => {
                                    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || loading}
                            style={{
                                width: 48, height: 48, borderRadius: 14, border: 'none', flexShrink: 0,
                                background: input.trim() && !loading
                                    ? 'linear-gradient(135deg, var(--color-sky), #0055cc)'
                                    : 'rgba(255,255,255,0.06)',
                                color: input.trim() && !loading ? '#fff' : 'rgba(232,237,245,0.3)',
                                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s ease',
                                boxShadow: input.trim() && !loading ? '0 4px 20px rgba(0,200,255,0.35)' : 'none',
                                transform: input.trim() && !loading ? 'scale(1)' : 'scale(0.96)',
                            }}
                        >
                            {loading
                                ? <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                : <Send size={18} />
                            }
                        </button>
                    </div>
                    <p style={{ fontSize: '0.68rem', color: 'rgba(232,237,245,0.2)', marginTop: 8, textAlign: 'center' }}>
                        Enter to send · Shift+Enter for new line
                    </p>
                </div>
            </div>
        </div>
    );
}

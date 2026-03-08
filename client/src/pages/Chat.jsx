import { useState, useRef, useEffect } from 'react';
import { Send, LocateFixed, Trash2, Wind, ChevronRight, Sparkles, MapPin, Clock, Cloud, User } from 'lucide-react';
import { useChat } from '../hooks/useChat.js';
import { useGeolocation } from '../hooks/useGeolocation.js';
import ChatMessage, { ThinkingIndicator } from '../components/ChatMessage.jsx';
import { usePilotProfile } from '../hooks/usePilotProfile.js';

const SUGGESTED_PROMPTS = [
    { text: 'Can I fly today near me?', icon: '📍', category: 'Conditions' },
    { text: 'Best sites within 50km?', icon: '🗺️', category: 'Sites' },
    { text: 'Wind at 400ft altitude right now?', icon: '💨', category: 'Wind' },
    { text: 'Better time window to fly today?', icon: '⏰', category: 'Timing' },
    { text: 'Ridge soaring conditions here?', icon: '⛰️', category: 'Soaring' },
    { text: 'Is it safe to fly in thermals today?', icon: '☀️', category: 'Safety' },
];

export default function Chat() {
    const { messages, loading, thinkingStep, sendMessage, clearMessages } = useChat();
    const [input, setInput] = useState('');
    const [useLocation, setUseLocation] = useState(false);
    const { location, loading: locLoading, requestLocation } = useGeolocation();
    const { hasProfile, summary: profileSummary } = usePilotProfile();
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
            background: `radial-gradient(ellipse at 30% -10%, var(--color-hero-glow) 0%, var(--color-bg) 55%)`,
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
                                    background: 'radial-gradient(circle, var(--color-sky-dim) 0%, transparent 70%)',
                                    animation: 'glow-pulse 3s ease-in-out infinite',
                                }} />
                                {/* Icon container */}
                                <div style={{
                                    width: 76, height: 76, borderRadius: 22,
                                    background: `linear-gradient(145deg, var(--color-hero-icon-from), var(--color-hero-icon-to))`,
                                    border: '1px solid var(--color-border-glow)',
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
                                backgroundImage: `linear-gradient(135deg, var(--color-hero-headline-from) 20%, var(--color-sky) 80%)`,
                                marginBottom: 10, textAlign: 'center', letterSpacing: '-0.03em',
                            }}>
                                Your AI Flight Advisor
                            </h1>
                            <p style={{
                                color: 'var(--color-text-muted)', textAlign: 'center',
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
                                            background: 'var(--color-glass-subtle-bg)',
                                            border: '1px solid var(--color-border-base)',
                                            borderRadius: 14, padding: '12px 14px',
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            cursor: 'pointer', textAlign: 'left',
                                            transition: 'all 0.22s ease',
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.borderColor = 'var(--color-border-glow)';
                                            e.currentTarget.style.background = 'var(--color-sky-dim)';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.borderColor = 'var(--color-border-base)';
                                            e.currentTarget.style.background = 'var(--color-glass-subtle-bg)';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        <span style={{
                                            fontSize: '1.2rem', lineHeight: 1,
                                            width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: 'var(--color-surface-3)', borderRadius: 8, flexShrink: 0,
                                        }}>{prompt.icon}</span>
                                        <div>
                                            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', fontWeight: 500, lineHeight: 1.3 }}>{prompt.text}</div>
                                            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)', marginTop: 2 }}>{prompt.category}</div>
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
                            {loading && <ThinkingIndicator step={thinkingStep} />}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>
            </div>

            {/* Input bar */}
            <div style={{
                borderTop: '1px solid var(--color-border-subtle)',
                background: 'var(--color-surface-overlay)',
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
                            background: useLocation && location ? 'var(--color-sky-dim)' : 'var(--color-surface-3)',
                            border: `1px solid ${useLocation && location ? 'var(--color-border-glow)' : 'var(--color-border-base)'}`,
                            color: useLocation && location ? 'var(--color-sky)' : 'var(--color-text-muted)',
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
                                background: 'transparent', border: '1px solid var(--color-border-base)',
                                color: 'var(--color-text-dim)', fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s ease',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.color = 'rgba(239,68,68,0.7)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-dim)'; e.currentTarget.style.borderColor = 'var(--color-border-base)'; }}
                            >
                                <Trash2 size={12} /> Clear
                            </button>
                        )}

                        {/* Pilot profile chip */}
                        <button
                            onClick={() => window.dispatchEvent(new Event('open-pilot-profile'))}
                            title={hasProfile ? 'Edit your pilot profile' : 'Add your pilot profile for personalized advice'}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '5px 12px', borderRadius: 100,
                                background: hasProfile ? 'var(--color-surface-3)' : 'transparent',
                                border: `1px solid ${hasProfile ? 'var(--color-border-base)' : 'var(--color-border-subtle)'}`,
                                color: hasProfile ? 'var(--color-text-secondary)' : 'var(--color-text-dim)',
                                fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-border-glow)'; e.currentTarget.style.color = 'var(--color-sky)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = hasProfile ? 'var(--color-border-base)' : 'var(--color-border-subtle)'; e.currentTarget.style.color = hasProfile ? 'var(--color-text-secondary)' : 'var(--color-text-dim)'; }}
                        >
                            <User size={12} />
                            {hasProfile ? profileSummary : 'Set Pilot Profile'}
                        </button>

                        {/* Powered by tag */}
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: 'var(--color-text-faint)' }}>
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
                                    background: 'var(--color-input-bg)',
                                    border: '1px solid var(--color-border-base)',
                                    borderRadius: 16, padding: '13px 16px',
                                    color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', fontSize: '0.92rem',
                                    resize: 'none', outline: 'none',
                                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                                    lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
                                }}
                                onFocus={e => {
                                    e.target.style.borderColor = 'var(--color-border-glow)';
                                    e.target.style.boxShadow = '0 0 0 3px var(--color-sky-dim)';
                                }}
                                onBlur={e => {
                                    e.target.style.borderColor = 'var(--color-border-base)';
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
                                    : 'var(--color-surface-3)',
                                color: input.trim() && !loading ? '#fff' : 'var(--color-text-dim)',
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
                    <p style={{ fontSize: '0.68rem', color: 'var(--color-text-faint)', marginTop: 8, textAlign: 'center' }}>
                        Enter to send · Shift+Enter for new line
                    </p>
                </div>
            </div>
        </div>
    );
}

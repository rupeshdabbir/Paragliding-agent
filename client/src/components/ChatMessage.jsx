import { useState, useEffect, useRef } from 'react';
import { FlyabilityBadge } from './FlyabilityBadge.jsx';
import SiteCard from './SiteCard.jsx';
import { Wind, User, Loader2, Map, CloudSun, Compass, AlertTriangle } from 'lucide-react';

// ─── Tool step icons map ──────────────────────────────────────────────────────
const TOOL_ICONS = {
    get_paragliding_sites: Map,
    get_weather_forecast: CloudSun,
    analyze_flying_conditions: Compass,
};

const TOOL_LABELS = {
    get_paragliding_sites: 'Looking up nearby sites',
    get_weather_forecast: 'Fetching live weather',
    analyze_flying_conditions: 'Analyzing flying conditions',
};

// ─── Animated ThinkingIndicator ───────────────────────────────────────────────
export function ThinkingIndicator({ step = 'Thinking...' }) {
    const [displayStep, setDisplayStep] = useState(step);
    const [visible, setVisible] = useState(true);
    const prevStep = useRef(step);

    // Cross-fade when step changes
    useEffect(() => {
        if (step === prevStep.current) return;
        setVisible(false);
        const t = setTimeout(() => {
            setDisplayStep(step);
            setVisible(true);
            prevStep.current = step;
        }, 220);
        return () => clearTimeout(t);
    }, [step]);

    return (
        <div style={{
            display: 'flex', gap: 12, alignItems: 'flex-end',
            animation: 'fade-up 0.3s ease',
        }}>
            {/* Avatar with pulsing glow */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--color-sky), #0055cc)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 0 0 rgba(0,200,255,0.5)',
                    animation: 'thinking-pulse 1.8s ease-in-out infinite',
                }}>
                    <Wind size={16} color="#fff" />
                </div>
            </div>

            {/* Thinking bubble */}
            <div style={{
                background: 'var(--color-bubble-bot-bg)',
                border: '1px solid var(--color-bubble-bot-border)',
                borderRadius: '18px 18px 18px 4px',
                padding: '12px 16px',
                display: 'flex', flexDirection: 'column', gap: 8,
                minWidth: 220, maxWidth: 320,
                backdropFilter: 'blur(12px)',
            }}>
                {/* Dots row */}
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                        <div key={i} style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: 'var(--color-sky)',
                            opacity: 0.8,
                            animation: `typing-dot 1.2s ease ${i * 0.2}s infinite`,
                        }} />
                    ))}
                    <div style={{
                        marginLeft: 'auto',
                        animation: 'spin 1.4s linear infinite',
                        color: 'var(--color-text-faint)',
                        display: 'flex', alignItems: 'center',
                    }}>
                        <Loader2 size={11} />
                    </div>
                </div>

                {/* Cycling step text */}
                <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-secondary)',
                    fontWeight: 500,
                    lineHeight: 1.4,
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(4px)',
                    transition: 'opacity 0.22s ease, transform 0.22s ease',
                    minHeight: '1.1rem',
                }}>
                    {displayStep}
                </div>

                {/* Shimmer progress bar */}
                <div style={{
                    height: 2, borderRadius: 100,
                    background: 'var(--color-border-subtle)',
                    overflow: 'hidden', position: 'relative',
                }}>
                    <div style={{
                        position: 'absolute', top: 0, left: 0,
                        height: '100%', width: '40%',
                        background: 'linear-gradient(90deg, transparent, var(--color-sky), transparent)',
                        animation: 'shimmer-slide 1.6s ease-in-out infinite',
                    }} />
                </div>
            </div>
        </div>
    );
}

// ─── Chat message bubble ──────────────────────────────────────────────────────
export default function ChatMessage({ message }) {
    const isUser = message.role === 'user';
    const toolResults = message.toolResults || [];

    // Extract site analyses from tool results
    const siteAnalyses = toolResults
        .filter(t => t.tool === 'analyze_flying_conditions' && t.result?.sites)
        .flatMap(t => t.result.sites);

    // Derive tool chips from tool results (for bot messages)
    const toolChips = !isUser ? toolResults.map(t => ({
        tool: t.tool,
        label: TOOL_LABELS[t.tool] || t.tool,
        Icon: TOOL_ICONS[t.tool] || Compass,
    })) : [];

    return (
        <div style={{
            display: 'flex',
            flexDirection: isUser ? 'row-reverse' : 'row',
            gap: 10,
            alignItems: 'flex-end',
            animation: 'fade-up 0.4s ease forwards',
            maxWidth: '100%',
        }}>
            {/* Avatar */}
            <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: isUser
                    ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                    : 'linear-gradient(135deg, var(--color-sky), #0055cc)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isUser ? '0 2px 8px rgba(79,70,229,0.4)' : '0 2px 8px rgba(0,200,255,0.3)',
            }}>
                {isUser ? <User size={15} color="#fff" /> : <Wind size={15} color="#fff" />}
            </div>

            <div style={{ maxWidth: 'min(680px, 85%)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Tool chips (shown above bot message bubble) */}
                {toolChips.length > 0 && (
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {toolChips.map((chip, i) => (
                            <div key={i} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '3px 8px', borderRadius: 100,
                                background: 'var(--color-sky-dim)',
                                border: '1px solid rgba(0,200,255,0.18)',
                                fontSize: '0.62rem', fontWeight: 600,
                                color: 'var(--color-sky)',
                                animation: `slide-up-in 0.3s ease ${i * 0.07}s both`,
                            }}>
                                <chip.Icon size={9} />
                                {chip.label}
                            </div>
                        ))}
                    </div>
                )}

                {/* Message bubble */}
                <div style={{
                    background: isUser
                        ? 'linear-gradient(135deg, rgba(79,70,229,0.35), rgba(124,58,237,0.25))'
                        : message.isError
                            ? 'rgba(239,68,68,0.08)'
                            : 'var(--color-bubble-bot-bg)',
                    border: `1px solid ${isUser ? 'rgba(79,70,229,0.3)' : message.isError ? 'rgba(239,68,68,0.25)' : 'var(--color-bubble-bot-border)'}`,
                    borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    padding: '14px 18px',
                    backdropFilter: 'blur(12px)',
                    fontSize: '0.9rem',
                    lineHeight: 1.65,
                    color: 'var(--color-text-primary)',
                }}>
                    {isUser ? (
                        <span>{message.content}</span>
                    ) : message.isError ? (
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <AlertTriangle size={15} color="rgba(239,68,68,0.8)" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'rgba(239,68,68,0.85)', marginBottom: 5 }}>
                                    {message.errorCode === '503' ? 'AI Overloaded' :
                                        message.errorCode === '429' ? 'Rate Limited' :
                                            message.errorCode === 'auth' ? 'API Key Error' :
                                                message.errorCode === 'network' ? 'Network Error' : 'Something went wrong'}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
                                    {message.content}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="markdown-body">
                            <MarkdownRenderer content={message.content} />
                        </div>
                    )}
                </div>

                {/* Tool result site cards */}
                {!isUser && siteAnalyses.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {siteAnalyses.slice(0, 5).map((item, i) => (
                            <SiteCard
                                key={i}
                                site={item.site}
                                analysis={item.analysis}
                                weather={item.weather?.current}
                            />
                        ))}
                    </div>
                )}

                {/* Timestamp + model badge */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                }}>
                    {message.timestamp && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-faint)' }}>
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    )}
                    {!isUser && message.usedModel && (
                        <span style={{
                            fontSize: '0.55rem', padding: '1px 5px', borderRadius: 4,
                            background: 'var(--color-surface-3)', border: '1px solid var(--color-border-base)',
                            color: 'var(--color-text-faint)', fontFamily: 'monospace',
                        }}>
                            {message.usedModel}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Markdown renderer ────────────────────────────────────────────────────────
function MarkdownRenderer({ content }) {
    return (
        <div style={{ fontSize: '0.9rem', lineHeight: 1.65 }}>
            {content.split('\n').map((line, i) => {
                if (line.startsWith('# ')) return <h1 key={i} style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8, color: 'var(--color-text-heading)', fontFamily: 'var(--font-heading)' }}>{line.slice(2)}</h1>;
                if (line.startsWith('## ')) return <h2 key={i} style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 6, color: 'var(--color-text-heading)', fontFamily: 'var(--font-heading)' }}>{line.slice(3)}</h2>;
                if (line.startsWith('### ')) return <h3 key={i} style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 4, color: 'var(--color-text-secondary)' }}>{line.slice(4)}</h3>;
                if (line.startsWith('- ')) return (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 3 }}>
                        <span style={{ color: 'var(--color-sky)', marginTop: 2, flexShrink: 0 }}>•</span>
                        <span>{formatInline(line.slice(2))}</span>
                    </div>
                );
                if (line.startsWith('✅') || line.startsWith('⚠️') || line.startsWith('🚫')) {
                    return <div key={i} style={{ marginBottom: 6, padding: '6px 10px', background: 'var(--color-surface-3)', borderRadius: 8 }}>{formatInline(line)}</div>;
                }
                if (line === '') return <div key={i} style={{ height: 8 }} />;
                return <p key={i} style={{ marginBottom: 4 }}>{formatInline(line)}</p>;
            })}
        </div>
    );
}

function formatInline(text) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} style={{ color: 'var(--color-text-heading)', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
        }
        return part.split(/(`[^`]+`)/g).map((p, j) => {
            if (p.startsWith('`') && p.endsWith('`')) {
                return <code key={j} style={{ background: 'var(--color-sky-dim)', color: 'var(--color-sky)', padding: '1px 5px', borderRadius: 4, fontSize: '0.85em' }}>{p.slice(1, -1)}</code>;
            }
            return p;
        });
    });
}

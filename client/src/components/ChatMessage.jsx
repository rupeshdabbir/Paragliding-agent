import { FlyabilityBadge } from './FlyabilityBadge.jsx';
import SiteCard from './SiteCard.jsx';
import WeatherCard from './WeatherCard.jsx';
import { Wind, Bot, User } from 'lucide-react';

// Typing indicator
export function TypingIndicator() {
    return (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', animation: 'fade-in 0.3s ease' }}>
            <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--color-sky), #0055cc)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <Wind size={16} color="#fff" />
            </div>
            <div style={{
                background: 'var(--color-bubble-bot-bg)', border: '1px solid var(--color-bubble-bot-border)',
                borderRadius: '18px 18px 18px 4px', padding: '14px 18px',
                display: 'flex', gap: 5, alignItems: 'center',
            }}>
                {[0, 1, 2].map(i => (
                    <div key={i} style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: 'var(--color-sky)',
                        animation: `typing-dot 1.2s ease ${i * 0.2}s infinite`,
                    }} />
                ))}
            </div>
        </div>
    );
}

export default function ChatMessage({ message }) {
    const isUser = message.role === 'user';
    const toolResults = message.toolResults || [];

    // Extract site analyses from tool results
    const siteAnalyses = toolResults
        .filter(t => t.tool === 'analyze_flying_conditions' && t.result?.sites)
        .flatMap(t => t.result.sites);

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

            <div style={{ maxWidth: 'min(680px, 85%)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Message bubble */}
                <div style={{
                    background: isUser
                        ? 'linear-gradient(135deg, rgba(79,70,229,0.35), rgba(124,58,237,0.25))'
                        : 'var(--color-bubble-bot-bg)',
                    border: `1px solid ${isUser ? 'rgba(79,70,229,0.3)' : 'var(--color-bubble-bot-border)'}`,
                    borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    padding: '14px 18px',
                    backdropFilter: 'blur(12px)',
                    fontSize: '0.9rem',
                    lineHeight: 1.65,
                    color: 'var(--color-text-primary)',
                }}>
                    {isUser ? (
                        <span>{message.content}</span>
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

                {/* Timestamp */}
                {message.timestamp && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-faint)', textAlign: isUser ? 'right' : 'left' }}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                )}
            </div>
        </div>
    );
}

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
    // Bold **text**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} style={{ color: 'var(--color-text-heading)', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
        }
        // Inline code `text`
        return part.split(/(`[^`]+`)/g).map((p, j) => {
            if (p.startsWith('`') && p.endsWith('`')) {
                return <code key={j} style={{ background: 'var(--color-sky-dim)', color: 'var(--color-sky)', padding: '1px 5px', borderRadius: 4, fontSize: '0.85em' }}>{p.slice(1, -1)}</code>;
            }
            return p;
        });
    });
}

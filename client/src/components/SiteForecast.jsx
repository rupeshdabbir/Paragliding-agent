import { useState, useEffect } from 'react';
import { Calendar, Clock, Wind, AlertTriangle, ChevronRight, CheckCircle, XCircle, MinusCircle, RefreshCw, Info, Sparkles, Key, Star } from 'lucide-react';
import WindChart from './WindChart.jsx';
import { FlyabilityBadge } from './FlyabilityBadge.jsx';

const RATING_COLOR = { GO: 'var(--color-go)', MARGINAL: 'var(--color-marginal)', NO_GO: 'var(--color-no-go)' };
const RATING_BG = { GO: 'var(--color-rating-go-bg)', MARGINAL: 'var(--color-rating-marginal-bg)', NO_GO: 'var(--color-rating-nogo-bg)' };
const RATING_BORDER = { GO: 'var(--color-rating-go-border)', MARGINAL: 'var(--color-rating-marginal-border)', NO_GO: 'var(--color-rating-nogo-border)' };
const RATING_ICON = {
    GO: <CheckCircle size={15} color="var(--color-go)" />,
    MARGINAL: <MinusCircle size={15} color="var(--color-marginal)" />,
    NO_GO: <XCircle size={15} color="var(--color-no-go)" />,
};

function formatDayLabel(dateStr, index) {
    const date = new Date(dateStr + 'T12:00:00');
    const day = date.toLocaleDateString('en-US', { weekday: 'short' });
    const mon = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (index === 0) return { top: 'Today', bottom: mon };
    if (index === 1) return { top: 'Tomorrow', bottom: `${day}, ${mon}` };
    return { top: day, bottom: mon };
}

function formatTime(isoTime) {
    if (!isoTime) return null;
    return new Date(isoTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ─── Heatmap Week View ────────────────────────────────────────────────────────
function WeekHeatmap({ days, onDayClick, aiVerdicts = {} }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* 7-box heatmap row */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {days.slice(0, 7).map((day, i) => {
                    const label = formatDayLabel(day.date, i);
                    const aiV = aiVerdicts[day.date];
                    const aiPowered = aiV && !aiV._fallback;
                    const displayRating = aiPowered ? aiV.rating : day.dayRating;
                    const color = RATING_COLOR[displayRating] || RATING_COLOR.NO_GO;

                    return (
                        <button key={day.date} onClick={() => onDayClick(i)} style={{
                            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                            padding: '10px 4px', borderRadius: 12,
                            background: `${RATING_BG[displayRating] || 'var(--color-surface-3)'}`,
                            border: `1px solid ${RATING_BORDER[displayRating] || 'var(--color-border-subtle)'}`,
                            cursor: 'pointer', transition: 'all 0.2s ease',
                            boxShadow: `0 2px 12px ${color}22`,
                        }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${color}44`; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 2px 12px ${color}22`; }}
                        >
                            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                {label.top.slice(0, 3)}
                            </div>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
                            <div style={{ fontSize: '0.62rem', color: 'var(--color-text-dim)' }}>
                                {day.avgWindMph}mph
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Week list details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {days.map((day, i) => {
                    const label = formatDayLabel(day.date, i);
                    const aiV = aiVerdicts[day.date];
                    const aiPowered = aiV && !aiV._fallback;
                    const displayRating = aiPowered ? aiV.rating : day.dayRating;
                    const color = RATING_COLOR[displayRating] || RATING_COLOR.NO_GO;
                    const pct = Math.round((day.flyableDaylightHours / Math.max(day.totalDaylightHours, 1)) * 100);

                    return (
                        <button key={day.date} onClick={() => onDayClick(i)} style={{
                            background: 'var(--color-glass-subtle-bg)', borderRadius: 12,
                            border: '1px solid var(--color-border-subtle)',
                            padding: '11px 14px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                            transition: 'all 0.2s ease', color: 'inherit', width: '100%',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-glass-bg)'; e.currentTarget.style.borderColor = `${color}44`; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-glass-subtle-bg)'; e.currentTarget.style.borderColor = 'var(--color-border-subtle)'; }}
                        >
                            <div style={{ width: 66, flexShrink: 0 }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-heading)' }}>{label.top}</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)' }}>{label.bottom}</div>
                            </div>

                            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                {RATING_ICON[displayRating]}
                                {aiPowered && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, background: 'var(--color-sky-dim)', border: '1px solid rgba(0,200,255,0.2)', borderRadius: 100, padding: '1px 4px', fontSize: '0.52rem', fontWeight: 700, color: 'var(--color-sky)' }}>
                                        <Sparkles size={6} /> AI
                                    </span>
                                )}
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                    <span style={{ fontSize: '0.72rem', color, fontWeight: 600 }}>
                                        {aiPowered && aiV.siteModeLabel ? aiV.siteModeLabel : (displayRating === 'GO' ? 'Good flying' : displayRating === 'MARGINAL' ? 'Marginal' : 'Not flyable')}
                                    </span>
                                    {aiPowered && aiV.bestWindow ? (
                                        <span style={{ fontSize: '0.67rem', color: 'var(--color-go)', fontWeight: 600 }}>🕐 {aiV.bestWindow}</span>
                                    ) : (
                                        <span style={{ fontSize: '0.67rem', color: 'var(--color-text-dim)' }}>{pct}%</span>
                                    )}
                                </div>
                                <div style={{ height: 4, background: 'var(--color-border-subtle)', borderRadius: 100, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 100, transition: 'width 0.8s ease' }} />
                                </div>
                            </div>

                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-heading)' }}>{day.avgWindMph}</div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--color-text-faint)' }}>mph</div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function AslTooltip({ altitude, leftOffset = 180 }) {
    const [visible, setVisible] = useState(false);
    return (
        <>
            <div
                onMouseEnter={() => setVisible(true)}
                onMouseLeave={() => setVisible(false)}
                onClick={() => setVisible(v => !v)}
                style={{ cursor: 'help', display: 'flex', alignItems: 'center', color: 'var(--color-text-dim)', marginTop: -2 }}
            >
                <Info size={12} />
            </div>
            {visible && (
                <div style={{ position: 'absolute', left: leftOffset, top: -10, width: 220, background: 'var(--color-surface-overlay)', border: '1px solid var(--color-border-base)', borderRadius: 10, padding: '10px 12px', fontSize: '0.7rem', color: 'var(--color-text-primary)', boxShadow: 'var(--color-elevation-md)', zIndex: 100, lineHeight: 1.4, backdropFilter: 'blur(12px)', pointerEvents: 'none' }}>
                    <strong style={{ color: 'var(--color-sky)' }}>Above Sea Level</strong><br />
                    Wind altitudes are calculated by adding the site's launch altitude ({altitude}ft) to the AGL forecast models.
                </div>
            )}
        </>
    );
}

const SITE_MODE_CONFIG = {
    thermaling: { label: 'Thermaling Day', icon: '☀️' },
    ridgeSoaring: { label: 'Ridge Soaring Day', icon: '🌬️' },
    sledRide: { label: 'Sled Ride Day', icon: '🎿' },
    mixed: { label: 'Mixed Conditions', icon: '⛅' },
    noFly: { label: 'Non-Flyable', icon: '🚫' },
    unknown: { label: 'Analyzing...', icon: '🤖' },
};

// ─── AI Verdict Card — dramatic, glowing ─────────────────────────────────────
function AiVerdictCard({ verdict }) {
    const [expanded, setExpanded] = useState(false);
    if (!verdict) return null;

    const ratingColor = RATING_COLOR[verdict.rating] || RATING_COLOR.NO_GO;
    const ratingBg = RATING_BG[verdict.rating] || 'var(--color-surface-3)';
    const ratingBorder = RATING_BORDER[verdict.rating] || 'var(--color-border-base)';
    const modeConf = SITE_MODE_CONFIG[verdict.siteMode] || SITE_MODE_CONFIG.unknown;

    return (
        <div style={{
            background: ratingBg,
            border: `1px solid ${ratingBorder}`,
            borderRadius: 16, padding: '16px', marginBottom: 4,
            boxShadow: `0 0 32px ${ratingColor}18`,
            position: 'relative', overflow: 'hidden',
        }}>
            {/* Subtle gradient accent */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg, transparent, ${ratingColor}, transparent)`,
                opacity: 0.6,
            }} />

            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: 'var(--color-sky-gradient)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 3px 12px rgba(0,200,255,0.35)',
                    }}>
                        <Sparkles size={15} color="#fff" fill="#fff" />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1 }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                                SkyPilot AI
                            </span>
                            {verdict.usedModel && (
                                <span style={{
                                    fontSize: '0.5rem', padding: '1px 5px', borderRadius: 4,
                                    background: 'var(--color-surface-3)', border: '1px solid var(--color-border-base)',
                                    color: 'var(--color-text-dim)', fontFamily: 'monospace'
                                }}>
                                    {verdict.usedModel}
                                </span>
                            )}
                        </div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text-heading)', marginTop: 3 }}>
                            {verdict.headline}
                        </div>
                    </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                    <FlyabilityBadge rating={verdict.rating} />
                </div>
            </div>

            {/* Mode + window pills */}
            <div style={{ display: 'flex', gap: 7, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: 'var(--color-surface-3)', border: '1px solid var(--color-border-base)',
                    borderRadius: 100, padding: '4px 10px', fontSize: '0.73rem', fontWeight: 600, color: 'var(--color-text-heading)',
                }}>
                    {modeConf.icon} {verdict.siteModeLabel || modeConf.label}
                </span>
                {verdict.bestWindow && (
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: 'var(--color-rating-go-bg)', border: '1px solid var(--color-rating-go-border)',
                        borderRadius: 100, padding: '4px 10px', fontSize: '0.73rem', fontWeight: 600, color: 'var(--color-go)',
                    }}>
                        🕐 Best: {verdict.bestWindow}
                    </span>
                )}
                {verdict.confidence && (
                    <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        background: 'var(--color-surface-3)', border: '1px solid var(--color-border-subtle)',
                        borderRadius: 100, padding: '4px 10px', fontSize: '0.68rem', color: 'var(--color-text-dim)',
                    }}>
                        Confidence: {verdict.confidence}
                    </span>
                )}
            </div>

            {/* Reasoning */}
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: verdict.siteTypeExplanation || verdict.safetyNotes?.length ? 10 : 0 }}>
                {verdict.reasoning}
            </div>

            {/* Expandable details */}
            {(verdict.siteTypeExplanation || verdict.safetyNotes?.length > 0) && (
                <>
                    <button onClick={() => setExpanded(e => !e)} style={{
                        background: 'none', border: 'none', color: 'var(--color-sky)',
                        fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', padding: '4px 0',
                        display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                        {expanded ? '▲ Less' : '▼ More details'}
                    </button>
                    {expanded && (
                        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {verdict.siteTypeExplanation && (
                                <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                                    <strong style={{ color: 'var(--color-text-secondary)' }}>Why this mode today:</strong> {verdict.siteTypeExplanation}
                                </div>
                            )}
                            {verdict.safetyNotes?.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {verdict.safetyNotes.map((note, i) => (
                                        <div key={i} style={{ display: 'flex', gap: 6, fontSize: '0.72rem', color: 'var(--color-warning-text)' }}>
                                            <span style={{ flexShrink: 0 }}>⚠️</span> {note}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ─── Day Summary Card ─────────────────────────────────────────────────────────
function DaySummaryCard({ day, label, active, onClick, aiVerdict }) {
    const displayRating = (aiVerdict && !aiVerdict._fallback) ? aiVerdict.rating : day.dayRating;
    const aiPowered = aiVerdict && !aiVerdict._fallback;
    const color = RATING_COLOR[displayRating] || RATING_COLOR.NO_GO;

    return (
        <button onClick={onClick} style={{
            flex: 1, padding: '13px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
            background: active
                ? `linear-gradient(135deg, ${RATING_BG[displayRating] || 'var(--color-glass-subtle-bg)'}, var(--color-glass-bg))`
                : 'var(--color-glass-subtle-bg)',
            border: `1px solid ${active ? color + '55' : 'var(--color-border-subtle)'}`,
            transition: 'all 0.22s ease',
            boxShadow: active ? `0 0 20px ${color}22` : 'none',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.73rem', fontWeight: 700, color: active ? 'var(--color-text-heading)' : 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {label}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {aiPowered && (
                        <span title="AI-powered verdict" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'var(--color-sky-dim)', border: '1px solid rgba(0,200,255,0.25)', borderRadius: 100, padding: '1px 6px', fontSize: '0.58rem', fontWeight: 700, color: 'var(--color-sky)' }}>
                            <Sparkles size={8} /> AI
                        </span>
                    )}
                    {RATING_ICON[displayRating]}
                </div>
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color, fontFamily: 'var(--font-heading)', marginBottom: 3 }}>
                {displayRating === 'GO' ? '✓ GO' : displayRating === 'MARGINAL' ? '~ MARGINAL' : '✗ NO-GO'}
            </div>
            {aiPowered && aiVerdict.siteModeLabel && (
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    {aiVerdict.siteModeLabel}
                </div>
            )}
            <div style={{ fontSize: '0.67rem', color: 'var(--color-text-dim)', marginTop: 5 }}>
                avg {day.avgWindMph} mph · {day.flyableDaylightHours}/{day.totalDaylightHours} hrs
            </div>
        </button>
    );
}

// ─── Wind altitude bar ────────────────────────────────────────────────────────
function WindAltBar({ hours, baseAlt = 0 }) {
    const daylight = hours.filter(h => h.hour >= 9 && h.hour <= 18);
    if (daylight.length === 0) return null;
    const avg = (arr) => arr.reduce((a, b) => a + (b || 0), 0) / arr.length;
    const alts = [
        { label: `${baseAlt + 33}ft`, values: daylight.map(h => h.windSpeed10m) },
        { label: `${baseAlt + 262}ft`, values: daylight.map(h => h.windSpeed80m) },
        { label: `${baseAlt + 394}ft`, values: daylight.map(h => h.windSpeed120m) },
        { label: `${baseAlt + 591}ft`, values: daylight.map(h => h.windSpeed180m) },
    ].filter(a => a.values.some(v => v != null));
    const maxSpeed = Math.max(...alts.flatMap(a => a.values.filter(Boolean)));

    return (
        <div style={{ display: 'flex', gap: 8 }}>
            {alts.map(({ label, values }, idx) => {
                const avgSpeed = avg(values.filter(Boolean));
                const pct = maxSpeed > 0 ? (avgSpeed / maxSpeed) * 100 : 0;

                const cssColorVar = avgSpeed > 22 ? 'var(--color-no-go)' : avgSpeed > 12 ? 'var(--color-marginal)' : 'var(--color-go)';
                const cssHalfVar = avgSpeed > 22 ? 'var(--color-no-go-half)' : avgSpeed > 12 ? 'var(--color-marginal-half)' : 'var(--color-go-half)';

                return (
                    <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ position: 'relative', height: 64, background: 'var(--color-surface-3)', borderRadius: 8, overflow: 'hidden', marginBottom: 6 }}>
                            <div style={{
                                position: 'absolute', bottom: 0, left: 0, width: '100%', height: `${pct}%`,
                                background: `linear-gradient(to top, ${cssColorVar}, ${cssHalfVar})`,
                                transition: `height 0.8s ease ${idx * 0.08}s`,
                            }} />
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: cssColorVar }}>{Math.round(avgSpeed)}</div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--color-text-faint)', marginTop: 1 }}>mph · {label}</div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Main SiteForecast ────────────────────────────────────────────────────────
export default function SiteForecast({ site, onClose, onVerdictReady, isFavorite = false, onToggleFavorite }) {
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('today');
    const [activeDayIndex, setActiveDayIndex] = useState(0);
    const [weatherModel, setWeatherModel] = useState('best_match');
    const [hasKey, setHasKey] = useState(!!localStorage.getItem('geminiApiKey'));

    useEffect(() => {
        // Poll for key changes since storage events only fire across tabs
        const interval = setInterval(() => {
            setHasKey(!!localStorage.getItem('geminiApiKey'));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const fetchForecast = async () => {
        if (!site?.lat || !site?.lng) return;
        setLoading(true); setError(null);
        try {
            const apiKey = (localStorage.getItem('geminiApiKey') || '').trim();
            const res = await fetch(`/api/forecast?lat=${site.lat}&lng=${site.lng}&models=${weatherModel}`, {
                headers: {
                    'x-gemini-api-key': apiKey
                }
            });
            if (!res.ok) throw new Error('Failed to load forecast');
            const data = await res.json();
            setForecast(data);
            if (data.aiVerdicts || data.aiVerdict) {
                const todayVerdict = data.aiVerdict;
                if (todayVerdict?._fallback) {
                    console.error('[SkyPilot] AI Verdict FALLBACK — reason:', todayVerdict._error || 'unknown');
                }
                if (onVerdictReady) onVerdictReady(data.aiVerdict);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchForecast(); }, [site?.lat, site?.lng, weatherModel]);

    const today = forecast?.days?.[0];
    const tomorrow = forecast?.days?.[1];
    const displayDay = forecast?.days?.[activeDayIndex];

    // Get current AI rating for hero
    const heroRating = forecast?.aiVerdict?.rating || today?.dayRating;
    const heroColor = RATING_COLOR[heroRating] || RATING_COLOR.NO_GO;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

            {/* ── Site Hero Header ── */}
            <div style={{
                padding: '16px 0 14px',
                borderBottom: '1px solid var(--color-border-subtle)',
                position: 'relative',
            }}>
                {/* Glow background */}
                {heroRating && (
                    <div style={{
                        position: 'absolute', top: 0, right: 0, bottom: 0, width: '40%',
                        background: `radial-gradient(ellipse at right, ${heroColor}12 0%, transparent 70%)`,
                        pointerEvents: 'none',
                    }} />
                )}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text-heading)', marginBottom: 5, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {site?.name}
                            {onToggleFavorite && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(site); }}
                                    style={{
                                        background: 'transparent', border: 'none', cursor: 'pointer',
                                        padding: 0, display: 'flex', alignItems: 'center',
                                        color: isFavorite ? 'var(--color-amber)' : 'var(--color-text-dim)',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <Star size={16} fill={isFavorite ? 'var(--color-amber)' : 'none'} />
                                </button>
                            )}
                        </h3>
                        {site?.description && (
                            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)', marginBottom: 8, lineHeight: 1.45, maxWidth: '96%' }}>
                                <strong style={{ color: 'var(--color-text-secondary)' }}>Takeoff:</strong> {site.description}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: '0.71rem', color: 'var(--color-text-dim)', alignItems: 'center' }}>
                            {site?.altitude > 0 && <span>⛰️ {site.altitude}ft</span>}
                            {site?.siteTypes?.paragliding && <span>🪂 Paragliding</span>}
                            <span style={{ color: 'var(--color-border-strong)' }}>·</span>
                            <select
                                value={weatherModel}
                                onChange={(e) => setWeatherModel(e.target.value)}
                                style={{
                                    background: 'var(--color-surface-3)', border: '1px solid var(--color-border-base)',
                                    color: 'var(--color-text-primary)', fontSize: '0.67rem', padding: '2px 8px', borderRadius: 6,
                                    outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
                                }}
                            >
                                <option value="best_match" style={{ color: '#000' }}>Auto (HRRR+GFS)</option>
                                <option value="gfs_seamless" style={{ color: '#000' }}>GFS (Global)</option>
                                <option value="ecmwf_ifs04" style={{ color: '#000' }}>ECMWF</option>
                                <option value="icon_seamless" style={{ color: '#000' }}>ICON</option>
                            </select>
                        </div>
                    </div>
                    {today && (
                        <div style={{ flexShrink: 0 }}>
                            <FlyabilityBadge rating={forecast?.aiVerdict?.rating || today.dayRating} />
                        </div>
                    )}
                </div>
            </div>

            {/* ── AI Verdict Card / Upsell ── */}
            {!loading && forecast && (
                <div style={{ padding: '12px 0 0' }}>
                    {hasKey && forecast.aiVerdict ? (
                        <AiVerdictCard verdict={forecast.aiVerdict} />
                    ) : !hasKey ? (
                        <div style={{
                            background: 'var(--color-glass-subtle-bg)',
                            border: '1px solid var(--color-border-glow)',
                            borderRadius: 16, padding: '16px 20px',
                            boxShadow: '0 4px 20px rgba(0,200,255,0.1)',
                            display: 'flex', flexDirection: 'column', gap: 12,
                            position: 'relative', overflow: 'hidden'
                        }}>
                            <div style={{
                                position: 'absolute', top: -30, right: -30, width: 100, height: 100,
                                background: 'radial-gradient(circle, var(--color-sky-dim) 0%, transparent 70%)',
                                opacity: 0.5, pointerEvents: 'none'
                            }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 32, height: 32, borderRadius: 10,
                                    background: 'var(--color-sky-gradient)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <Sparkles size={16} color="#fff" />
                                </div>
                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-heading)' }}>Unlock AI Verdicts</h4>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                                You are currently viewing basic rule-based forecasts. Connect your API key to unlock precision AI weather intelligence and safety recommendations.
                            </p>
                            <button
                                onClick={() => window.dispatchEvent(new Event('open-settings'))}
                                style={{
                                    alignSelf: 'flex-start',
                                    padding: '8px 16px', borderRadius: 100,
                                    background: 'var(--color-surface-3)', color: 'var(--color-text-primary)',
                                    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    border: '1px solid var(--color-border-strong)',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-border-base)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-surface-3)'; }}
                            >
                                <Key size={14} /> Connect API Key
                            </button>
                        </div>
                    ) : null}
                </div>
            )}
            {/* Skeleton */}
            {loading && (
                <div style={{ padding: '12px 0 0' }}>
                    <div style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border-subtle)', borderRadius: 16, padding: 16, marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--color-sky-dim)' }} className="shimmer" />
                            <div style={{ flex: 1 }}>
                                <div style={{ height: 9, width: '50%', borderRadius: 4, marginBottom: 7 }} className="shimmer" />
                                <div style={{ height: 13, width: '80%', borderRadius: 4 }} className="shimmer" />
                            </div>
                        </div>
                        <div style={{ height: 9, width: '90%', borderRadius: 4, marginBottom: 6 }} className="shimmer" />
                        <div style={{ height: 9, width: '70%', borderRadius: 4, marginBottom: 6 }} className="shimmer" />
                        <div style={{ height: 9, width: '82%', borderRadius: 4 }} className="shimmer" />
                    </div>
                </div>
            )}

            {/* Loading state */}
            {loading && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    <RefreshCw size={16} color="var(--color-sky)" style={{ animation: 'spin 1s linear infinite' }} />
                    Loading 7-day forecast...
                </div>
            )}

            {error && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>
                    <XCircle size={28} color="var(--color-no-go)" />
                    <div>Failed to load forecast<br /><span style={{ fontSize: '0.75rem' }}>{error}</span></div>
                    <button onClick={fetchForecast} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '8px 16px' }}>Retry</button>
                </div>
            )}

            {!loading && !error && forecast && (
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>

                    {/* Safety disclaimer */}
                    <div style={{
                        display: 'flex', gap: 7, padding: '8px 12px', margin: '10px 0 2px',
                        background: 'rgba(245,158,11,0.06)', borderRadius: 10,
                        border: '1px solid rgba(245,158,11,0.14)',
                    }}>
                        <AlertTriangle size={11} color="var(--color-amber)" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span style={{ fontSize: '0.65rem', color: 'var(--color-warning-text)', lineHeight: 1.5 }}>
                            Always verify with local pilots and live sensors before flying.
                        </span>
                    </div>

                    {/* Today / Tomorrow quick cards */}
                    {(today || tomorrow) && (
                        <div style={{ display: 'flex', gap: 8, padding: '12px 0' }}>
                            {today && (
                                <DaySummaryCard
                                    day={today} label="Today"
                                    onClick={() => { setActiveTab('today'); setActiveDayIndex(0); }}
                                    active={activeTab === 'today'}
                                    aiVerdict={forecast?.aiVerdict}
                                />
                            )}
                            {tomorrow && (
                                <DaySummaryCard
                                    day={tomorrow} label="Tomorrow"
                                    onClick={() => { setActiveTab('tomorrow'); setActiveDayIndex(1); }}
                                    active={activeTab === 'tomorrow'}
                                    aiVerdict={forecast?.aiVerdicts?.[tomorrow.date]}
                                />
                            )}
                        </div>
                    )}

                    {/* Tabs — pill style */}
                    <div style={{ display: 'flex', gap: 5, marginBottom: 14, background: 'var(--color-surface-3)', borderRadius: 12, padding: 4 }}>
                        {[
                            { key: 'today', label: '☀️ Today' },
                            { key: 'tomorrow', label: '🌤 Tomorrow' },
                            { key: 'week', label: '📅 This Week' },
                        ].map(t => {
                            const isActive = activeTab === t.key || (activeTab === 'custom' && ((t.key === 'today' && activeDayIndex === 0) || (t.key === 'tomorrow' && activeDayIndex === 1)));
                            return (
                                <button key={t.key} onClick={() => {
                                    setActiveTab(t.key);
                                    if (t.key === 'today') setActiveDayIndex(0);
                                    else if (t.key === 'tomorrow') setActiveDayIndex(1);
                                }} style={{
                                    flex: 1, padding: '8px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
                                    fontSize: '0.78rem', fontWeight: 600,
                                    background: isActive ? 'var(--color-sky-dim)' : 'transparent',
                                    color: isActive ? 'var(--color-sky)' : 'var(--color-text-dim)',
                                    transition: 'all 0.2s ease',
                                    boxShadow: isActive ? 'inset 0 0 0 1px rgba(0,200,255,0.25)' : 'none',
                                }}>
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Detail view: hourly */}
                    {activeTab !== 'week' && displayDay && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {activeTab === 'custom' && activeDayIndex > 1 && (
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-sky)', marginBottom: -8 }}>
                                    Viewing: {formatDayLabel(displayDay.date, activeDayIndex).top} {formatDayLabel(displayDay.date, activeDayIndex).bottom}
                                </div>
                            )}

                            {/* AI Daily status callout */}
                            {(() => {
                                const dayVerdict = forecast?.aiVerdicts?.[displayDay.date] ||
                                    (activeDayIndex === 0 ? forecast?.aiVerdict : null);
                                const aiPowered = dayVerdict && !dayVerdict._fallback;

                                if (aiPowered) {
                                    const ratingColor = RATING_COLOR[dayVerdict.rating] || RATING_COLOR.NO_GO;
                                    const ratingBg = RATING_BG[dayVerdict.rating] || 'var(--color-surface-3)';
                                    const ratingBorder = RATING_BORDER[dayVerdict.rating] || 'var(--color-border-base)';
                                    const Icon = dayVerdict.rating === 'GO' ? CheckCircle : dayVerdict.rating === 'MARGINAL' ? MinusCircle : XCircle;
                                    return (
                                        <div style={{ padding: '12px 14px', borderRadius: 13, background: ratingBg, border: `1px solid ${ratingBorder}`, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                            <Icon size={16} color={ratingColor} style={{ marginTop: 2, flexShrink: 0 }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: ratingColor }}>
                                                        {dayVerdict.rating === 'GO' ? 'Good flying conditions' : dayVerdict.rating === 'MARGINAL' ? 'Marginal conditions' : 'Not recommended'}
                                                    </span>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'var(--color-sky-dim)', border: '1px solid rgba(0,200,255,0.2)', borderRadius: 100, padding: '1px 6px', fontSize: '0.58rem', fontWeight: 700, color: 'var(--color-sky)' }}>
                                                        <Sparkles size={8} /> AI
                                                    </span>
                                                </div>
                                                {dayVerdict.bestWindow && (
                                                    <div style={{ fontSize: '0.74rem', color: 'var(--color-go)', fontWeight: 600, marginBottom: 4 }}>
                                                        🕐 Best window: {dayVerdict.bestWindow}
                                                    </div>
                                                )}
                                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, background: 'var(--color-surface-3)', padding: '6px 8px', borderRadius: 7, marginTop: 4 }}>
                                                    {dayVerdict.reasoning}
                                                </div>
                                                {dayVerdict.safetyNotes?.length > 0 && (
                                                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                        {dayVerdict.safetyNotes.map((note, i) => (
                                                            <div key={i} style={{ fontSize: '0.67rem', color: 'var(--color-warning-text)', display: 'flex', gap: 5 }}>
                                                                <span>⚠️</span> {note}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }

                                // Upsell for no key
                                if (!hasKey) {
                                    return (
                                        <div style={{
                                            padding: '16px 20px', borderRadius: 16,
                                            background: 'var(--color-surface-3)', border: '1px solid var(--color-border-subtle)',
                                            display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', textAlign: 'center',
                                        }}>
                                            <div style={{
                                                width: 40, height: 40, borderRadius: 12,
                                                background: 'var(--color-sky-gradient)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                marginBottom: 4, boxShadow: '0 4px 16px rgba(0,200,255,0.2)'
                                            }}>
                                                <Sparkles size={20} color="#fff" />
                                            </div>
                                            <div>
                                                <h5 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-heading)' }}>
                                                    Get the full picture
                                                </h5>
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, maxWidth: 300 }}>
                                                    Unlock the SkyPilot AI daily breakdown for safety notes, thermaling details, and personalized flight window recommendations.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => window.dispatchEvent(new Event('open-settings'))}
                                                style={{
                                                    padding: '10px 20px', borderRadius: 100,
                                                    background: 'transparent', color: 'var(--color-sky)',
                                                    fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: 6,
                                                    border: '1px solid rgba(0,200,255,0.3)',
                                                    transition: 'all 0.2s ease', marginTop: 4,
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-sky-dim)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                            >
                                                <Key size={14} /> Connect API Key
                                            </button>
                                        </div>
                                    );
                                }

                                // Rule-based fallback (if AI failed but they have a key)
                                return (
                                    <>
                                        {displayDay.bestWindowStart && displayDay.bestWindowHours > 0 && (
                                            <div style={{ padding: '12px 14px', borderRadius: 13, background: 'var(--color-rating-go-bg)', border: '1px solid var(--color-rating-go-border)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                                <CheckCircle size={16} color="var(--color-go)" style={{ marginTop: 2, flexShrink: 0 }} />
                                                <div>
                                                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-go)' }}>
                                                        Best window: {formatTime(displayDay.bestWindowStart)} – {formatTime(displayDay.bestWindowEnd)}
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', marginTop: 3 }}>
                                                        {displayDay.bestWindowHours} consecutive GO hours (rule-based)
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {displayDay.goHours === 0 && (
                                            <div style={{ padding: '12px 14px', borderRadius: 13, background: displayDay.dayRating === 'NO_GO' ? 'var(--color-rating-nogo-bg)' : 'var(--color-rating-marginal-bg)', border: `1px solid ${displayDay.dayRating === 'NO_GO' ? 'var(--color-rating-nogo-border)' : 'var(--color-rating-marginal-border)'}`, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                                {displayDay.dayRating === 'NO_GO'
                                                    ? <XCircle size={16} color="var(--color-no-go)" style={{ marginTop: 2, flexShrink: 0 }} />
                                                    : <MinusCircle size={16} color="var(--color-marginal)" style={{ marginTop: 2, flexShrink: 0 }} />
                                                }
                                                <div>
                                                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: displayDay.dayRating === 'NO_GO' ? 'var(--color-no-go)' : 'var(--color-marginal)' }}>
                                                        {displayDay.dayRating === 'NO_GO' ? 'No flyable windows expected' : 'Marginal conditions expected'}
                                                    </div>
                                                    <div style={{ fontSize: '0.67rem', color: 'var(--color-text-dim)', marginTop: 4 }}>AI analysis unavailable — wind rules only</div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}

                            {/* Wind altitude bars */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, position: 'relative' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-dim)' }}>
                                        Wind by Altitude (ASL)
                                    </div>
                                    <AslTooltip altitude={site?.altitude || 0} leftOffset={160} />
                                </div>
                                <WindAltBar hours={displayDay.hours} baseAlt={site?.altitude || 0} />
                            </div>

                            {/* Wind chart */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, position: 'relative' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-dim)' }}>
                                        Hourly Wind Forecast (ASL)
                                    </div>
                                    <AslTooltip altitude={site?.altitude || 0} leftOffset={200} />
                                </div>
                                <WindChart hours={displayDay.hours} baseAlt={site?.altitude || 0} />
                            </div>
                        </div>
                    )}

                    {/* Week view */}
                    {activeTab === 'week' && forecast.days && (
                        <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-dim)', marginBottom: 14 }}>
                                7-Day Flyability Outlook
                            </div>
                            <WeekHeatmap days={forecast.days} aiVerdicts={forecast.aiVerdicts || {}} onDayClick={(idx) => {
                                setActiveDayIndex(idx);
                                setActiveTab(idx === 0 ? 'today' : idx === 1 ? 'tomorrow' : 'custom');
                            }} />
                            <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--color-sky-dim)', borderRadius: 11, border: '1px solid rgba(0,200,255,0.1)' }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', lineHeight: 1.6 }}>
                                    💡 <strong style={{ color: 'var(--color-text-secondary)' }}>Tip:</strong> Click any day in the heatmap for hourly detail, or ask SkyPilot for personalized advice.
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

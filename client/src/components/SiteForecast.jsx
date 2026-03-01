import { useState, useEffect } from 'react';
import { Calendar, Clock, Wind, AlertTriangle, ChevronRight, CheckCircle, XCircle, MinusCircle, RefreshCw, Info, Sparkles } from 'lucide-react';
import WindChart from './WindChart.jsx';
import { FlyabilityBadge } from './FlyabilityBadge.jsx';

const RATING_COLOR = { GO: 'var(--color-go)', MARGINAL: 'var(--color-marginal)', NO_GO: 'var(--color-no-go)' };
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
    const d = new Date(isoTime);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function DayBadge({ day, index, active, onClick }) {
    const label = formatDayLabel(day.date, index);
    const color = RATING_COLOR[day.dayRating] || RATING_COLOR.NO_GO;

    return (
        <button onClick={onClick} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '10px 12px', borderRadius: 12,
            background: active ? 'rgba(13,21,40,0.9)' : 'rgba(13,21,40,0.4)',
            border: `1px solid ${active ? color : 'rgba(255,255,255,0.05)'}`,
            cursor: 'pointer', transition: 'all 0.2s ease', minWidth: 70,
            boxShadow: active ? `0 0 12px ${color}33` : 'none',
        }}>
            <div style={{ fontSize: '0.73rem', fontWeight: 700, color: active ? '#fff' : 'rgba(232,237,245,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label.top}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(232,237,245,0.35)' }}>{label.bottom}</div>
            {/* Flyability dot */}
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
        </button>
    );
}

function WeekSummary({ days, onDayClick, aiVerdicts = {} }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {days.map((day, i) => {
                const label = formatDayLabel(day.date, i);
                const aiV = aiVerdicts[day.date];
                const aiPowered = aiV && !aiV._fallback;
                // Use AI rating when available, fall back to rule-based
                const displayRating = aiPowered ? aiV.rating : day.dayRating;
                const color = RATING_COLOR[displayRating] || RATING_COLOR.NO_GO;
                const pct = Math.round((day.flyableDaylightHours / Math.max(day.totalDaylightHours, 1)) * 100);
                const ratingText = displayRating === 'GO' ? 'Good flying' : displayRating === 'MARGINAL' ? 'Marginal' : 'Not flyable';

                return (
                    <button key={day.date} onClick={() => onDayClick(i)} style={{
                        background: 'rgba(13,21,40,0.5)', borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.06)',
                        padding: '12px 14px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                        transition: 'all 0.2s ease', color: 'inherit', width: '100%',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(13,21,40,0.8)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(13,21,40,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                    >
                        {/* Day label */}
                        <div style={{ width: 68, flexShrink: 0 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>{label.top}</div>
                            <div style={{ fontSize: '0.68rem', color: 'rgba(232,237,245,0.4)' }}>{label.bottom}</div>
                        </div>

                        {/* Rating icon + AI badge */}
                        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                            {RATING_ICON[displayRating]}
                            {aiPowered && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, background: 'rgba(0,200,255,0.1)', border: '1px solid rgba(0,200,255,0.2)', borderRadius: 100, padding: '1px 4px', fontSize: '0.55rem', fontWeight: 700, color: 'var(--color-sky)' }}>
                                    <Sparkles size={7} /> AI
                                </span>
                            )}
                        </div>

                        {/* Flyability bar + label */}
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                <span style={{ fontSize: '0.72rem', color, fontWeight: 600 }}>
                                    {aiPowered && aiV.siteModeLabel ? aiV.siteModeLabel : ratingText}
                                </span>
                                {aiPowered && aiV.bestWindow ? (
                                    <span style={{ fontSize: '0.68rem', color: 'var(--color-go)', fontWeight: 600 }}>
                                        🕐 {aiV.bestWindow}
                                    </span>
                                ) : (
                                    <span style={{ fontSize: '0.7rem', color: 'rgba(232,237,245,0.4)' }}>{pct}% rule-hrs</span>
                                )}
                            </div>
                            <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 100, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 100, transition: 'width 0.8s ease' }} />
                            </div>
                        </div>

                        {/* Wind */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>{day.avgWindMph} mph</div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(232,237,245,0.35)' }}>avg wind</div>
                        </div>
                    </button>
                );
            })}
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
                style={{ cursor: 'help', display: 'flex', alignItems: 'center', color: 'rgba(232,237,245,0.3)', marginTop: -2 }}
            >
                <Info size={12} />
            </div>
            {visible && (
                <div style={{ position: 'absolute', left: leftOffset, top: -10, width: 220, background: 'rgba(6,10,20,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '10px 12px', fontSize: '0.7rem', color: '#e8edf5', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 100, lineHeight: 1.4, backdropFilter: 'blur(12px)', pointerEvents: 'none' }}>
                    <strong style={{ color: 'var(--color-sky)' }}>Above Sea Level</strong><br />
                    Wind altitudes are calculated by adding the site's launch altitude ({altitude}ft) to the AGL (Above Ground Level) forecast models.
                </div>
            )}
        </>
    );
}

const SITE_MODE_CONFIG = {
    thermaling: { label: 'Thermaling Day', icon: '☀️', desc: 'Thermal conditions expected' },
    ridgeSoaring: { label: 'Ridge Soaring Day', icon: '🌬️', desc: 'Ridge soaring conditions' },
    sledRide: { label: 'Sled Ride Day', icon: '🎿', desc: 'Light conditions — quick flights only' },
    mixed: { label: 'Mixed Conditions', icon: '⛅', desc: 'Conditions may vary during the day' },
    noFly: { label: 'Non-Flyable', icon: '🚫', desc: 'Conditions not suitable for flight' },
    unknown: { label: 'Analyzing...', icon: '🤖', desc: '' },
};

function AiVerdictCard({ verdict }) {
    const [expanded, setExpanded] = useState(false);
    if (!verdict) return null;

    const ratingColor = RATING_COLOR[verdict.rating] || RATING_COLOR.NO_GO;
    const ratingBg = { GO: 'rgba(34,197,94,0.08)', MARGINAL: 'rgba(245,158,11,0.08)', NO_GO: 'rgba(239,68,68,0.08)' }[verdict.rating] || 'rgba(255,255,255,0.04)';
    const ratingBorder = { GO: 'rgba(34,197,94,0.25)', MARGINAL: 'rgba(245,158,11,0.25)', NO_GO: 'rgba(239,68,68,0.25)' }[verdict.rating] || 'rgba(255,255,255,0.1)';
    const modeConf = SITE_MODE_CONFIG[verdict.siteMode] || SITE_MODE_CONFIG.unknown;

    return (
        <div style={{ background: ratingBg, border: `1px solid ${ratingBorder}`, borderRadius: 14, padding: '14px 16px', marginBottom: 4 }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, var(--color-sky), #0055cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,200,255,0.3)' }}>
                        <Sparkles size={14} color="#fff" fill="#fff" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(232,237,245,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1 }}>SkyPilot AI Recommendation</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginTop: 2 }}>{verdict.headline}</div>
                    </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                    <FlyabilityBadge rating={verdict.rating} />
                </div>
            </div>

            {/* Site mode pill */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 100, padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600, color: '#fff' }}>
                    {modeConf.icon} {verdict.siteModeLabel || modeConf.label}
                </span>
                {verdict.bestWindow && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 100, padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-go)' }}>
                        🕐 Best: {verdict.bestWindow}
                    </span>
                )}
                {verdict.confidence && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 100, padding: '4px 10px', fontSize: '0.7rem', color: 'rgba(232,237,245,0.45)' }}>
                        Confidence: {verdict.confidence}
                    </span>
                )}
            </div>

            {/* Reasoning */}
            <div style={{ fontSize: '0.78rem', color: 'rgba(232,237,245,0.75)', lineHeight: 1.55, marginBottom: verdict.siteTypeExplanation || verdict.safetyNotes?.length ? 10 : 0 }}>
                {verdict.reasoning}
            </div>

            {/* Expandable details */}
            {(verdict.siteTypeExplanation || verdict.safetyNotes?.length > 0) && (
                <>
                    <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', color: 'var(--color-sky)', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {expanded ? '▲ Less' : '▼ More details'}
                    </button>
                    {expanded && (
                        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {verdict.siteTypeExplanation && (
                                <div style={{ fontSize: '0.75rem', color: 'rgba(232,237,245,0.6)', lineHeight: 1.5 }}>
                                    <strong style={{ color: 'rgba(232,237,245,0.8)' }}>Why this mode today:</strong> {verdict.siteTypeExplanation}
                                </div>
                            )}
                            {verdict.safetyNotes?.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {verdict.safetyNotes.map((note, i) => (
                                        <div key={i} style={{ display: 'flex', gap: 6, fontSize: '0.73rem', color: 'rgba(253,220,140,0.8)' }}>
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

export default function SiteForecast({ site, onClose, onVerdictReady }) {
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('today'); // today | tomorrow | week | custom
    const [activeDayIndex, setActiveDayIndex] = useState(0);
    const [weatherModel, setWeatherModel] = useState('best_match');

    const fetchForecast = async () => {
        if (!site?.lat || !site?.lng) return;
        setLoading(true); setError(null);
        try {
            const res = await fetch(`/api/forecast?lat=${site.lat}&lng=${site.lng}&models=${weatherModel}`);
            if (!res.ok) throw new Error('Failed to load forecast');
            const data = await res.json();
            setForecast(data);
            // Propagate the AI verdict up to MapView so it can be passed to the chat
            if (data.aiVerdicts || data.aiVerdict) {
                const todayVerdict = data.aiVerdict;
                if (todayVerdict?._fallback) {
                    console.error('[SkyPilot] AI Verdict FALLBACK — reason:', todayVerdict._error || 'unknown');
                } else {
                    console.log('[SkyPilot] AI Verdicts received for', Object.keys(data.aiVerdicts || {}).length, 'days');
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

    // Which day's hours to show for detail view
    const displayDay = forecast?.days?.[activeDayIndex];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

            {/* Site header */}
            <div style={{
                padding: '16px 0 12px',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <div>
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                            {site?.name}
                        </h3>
                        {site?.description && (
                            <div style={{ fontSize: '0.75rem', color: 'rgba(232,237,245,0.7)', marginTop: 4, marginBottom: 8, lineHeight: 1.4, maxWidth: '95%' }}>
                                <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Takeoff Notes:</strong> {site.description}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: '0.72rem', color: 'rgba(232,237,245,0.45)', alignItems: 'center', marginTop: 4 }}>
                            {site?.altitude > 0 && <span>⛰️ {site.altitude}ft altitude</span>}
                            {site?.siteTypes?.paragliding && <span>🪂 Paragliding</span>}
                            <div style={{ margin: '0 4px', width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                            <select
                                value={weatherModel}
                                onChange={(e) => setWeatherModel(e.target.value)}
                                style={{
                                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                                    color: '#fff', fontSize: '0.68rem', padding: '2px 8px', borderRadius: 6,
                                    outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
                                }}
                            >
                                <option value="best_match" style={{ color: '#000' }}>Model: Auto (HRRR+GFS/ECMWF)</option>
                                <option value="gfs_seamless" style={{ color: '#000' }}>Model: GFS (Global)</option>
                                <option value="ecmwf_ifs04" style={{ color: '#000' }}>Model: ECMWF (Global)</option>
                                <option value="icon_seamless" style={{ color: '#000' }}>Model: ICON (Global)</option>
                            </select>
                        </div>
                    </div>
                    {today && (
                        <FlyabilityBadge rating={forecast?.aiVerdict?.rating || today.dayRating} />
                    )}
                </div>

            </div>

            {/* AI SkyPilot Recommendation Card */}
            {!loading && forecast?.aiVerdict && (
                <div style={{ padding: '12px 0 0' }}>
                    <AiVerdictCard verdict={forecast.aiVerdict} />
                </div>
            )}
            {/* AI card loading skeleton */}
            {loading && (
                <div style={{ padding: '12px 0 0' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(0,200,255,0.15)' }} className="shimmer" />
                            <div style={{ flex: 1 }}>
                                <div style={{ height: 9, width: '55%', borderRadius: 4, marginBottom: 6 }} className="shimmer" />
                                <div style={{ height: 12, width: '80%', borderRadius: 4 }} className="shimmer" />
                            </div>
                        </div>
                        <div style={{ height: 9, width: '90%', borderRadius: 4, marginBottom: 6 }} className="shimmer" />
                        <div style={{ height: 9, width: '70%', borderRadius: 4, marginBottom: 6 }} className="shimmer" />
                        <div style={{ height: 9, width: '85%', borderRadius: 4 }} className="shimmer" />
                    </div>
                </div>
            )}

            {/* Loading / Error for hourly data */}
            {loading && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'rgba(232,237,245,0.5)', fontSize: '0.85rem' }}>
                    <RefreshCw size={16} color="var(--color-sky)" style={{ animation: 'spin 1s linear infinite' }} />
                    Loading 7-day forecast...
                </div>
            )}

            {/* Disclaimer — in scrollable area so it doesn't eat header real estate */}


            {error && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'rgba(232,237,245,0.5)', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>
                    <XCircle size={28} color="var(--color-no-go)" />
                    <div>Failed to load forecast<br /><span style={{ fontSize: '0.75rem' }}>{error}</span></div>
                    <button onClick={fetchForecast} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '8px 16px' }}>Retry</button>
                </div>
            )}

            {!loading && !error && forecast && (
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>

                    {/* Disclaimer — scrolls with content */}
                    <div style={{
                        display: 'flex', gap: 7, padding: '8px 12px', marginBottom: 4,
                        background: 'rgba(245,158,11,0.06)', borderRadius: 10,
                        border: '1px solid rgba(245,158,11,0.15)',
                    }}>
                        <AlertTriangle size={12} color="var(--color-amber)" style={{ flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: '0.67rem', color: 'rgba(253,220,140,0.65)', lineHeight: 1.5 }}>
                            Always verify with local pilots and live sensors before flying.
                        </span>
                    </div>

                    {/* Day summary quick-view (Today + Tomorrow) */}
                    {(today || tomorrow) && (
                        <div style={{ display: 'flex', gap: 8, padding: '14px 0' }}>
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

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                        {[
                            { key: 'today', label: '☀️ Today' },
                            { key: 'tomorrow', label: '🌤 Tomorrow' },
                            { key: 'week', label: '📅 This Week' },
                        ].map(t => (
                            <button key={t.key} onClick={() => { setActiveTab(t.key); if (t.key === 'today') setActiveDayIndex(0); else if (t.key === 'tomorrow') setActiveDayIndex(1); }} style={{
                                flex: 1, padding: '8px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                                background: (activeTab === t.key || (activeTab === 'custom' && ((t.key === 'today' && activeDayIndex === 0) || (t.key === 'tomorrow' && activeDayIndex === 1)))) ? 'rgba(0,200,255,0.12)' : 'rgba(255,255,255,0.04)',
                                color: (activeTab === t.key || (activeTab === 'custom' && ((t.key === 'today' && activeDayIndex === 0) || (t.key === 'tomorrow' && activeDayIndex === 1)))) ? 'var(--color-sky)' : 'rgba(232,237,245,0.5)',
                                borderBottom: (activeTab === t.key || (activeTab === 'custom' && ((t.key === 'today' && activeDayIndex === 0) || (t.key === 'tomorrow' && activeDayIndex === 1)))) ? '2px solid var(--color-sky)' : '2px solid transparent',
                                transition: 'all 0.2s ease',
                            }}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Detail View: Hourly timeline + day stats (active for today/tomorrow/custom) */}
                    {activeTab !== 'week' && displayDay && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {activeTab === 'custom' && activeDayIndex > 1 && (
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-sky)', marginBottom: -6 }}>
                                    Viewing Detail: {formatDayLabel(displayDay.date, activeDayIndex).top} {formatDayLabel(displayDay.date, activeDayIndex).bottom}
                                </div>
                            )}
                            {/* ── AI Status Callout (authoritative) ───────────── */}
                            {(() => {
                                // Get the AI verdict for this specific day
                                const dayVerdict = forecast?.aiVerdicts?.[displayDay.date] ||
                                    (activeDayIndex === 0 ? forecast?.aiVerdict : null);
                                const aiPowered = dayVerdict && !dayVerdict._fallback;

                                if (aiPowered) {
                                    // AI-powered callout based on rating
                                    const ratingColor = {
                                        GO: 'var(--color-go)',
                                        MARGINAL: 'var(--color-marginal)',
                                        NO_GO: 'var(--color-no-go)',
                                    }[dayVerdict.rating] || 'var(--color-marginal)';
                                    const ratingBg = {
                                        GO: 'rgba(34,197,94,0.08)',
                                        MARGINAL: 'rgba(245,158,11,0.08)',
                                        NO_GO: 'rgba(239,68,68,0.08)',
                                    }[dayVerdict.rating] || 'rgba(255,255,255,0.04)';
                                    const ratingBorder = {
                                        GO: 'rgba(34,197,94,0.2)',
                                        MARGINAL: 'rgba(245,158,11,0.2)',
                                        NO_GO: 'rgba(239,68,68,0.2)',
                                    }[dayVerdict.rating] || 'rgba(255,255,255,0.1)';
                                    const Icon = dayVerdict.rating === 'GO' ? CheckCircle : dayVerdict.rating === 'MARGINAL' ? MinusCircle : XCircle;

                                    return (
                                        <div style={{ padding: '12px 14px', borderRadius: 12, background: ratingBg, border: `1px solid ${ratingBorder}`, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                            <Icon size={16} color={ratingColor} style={{ marginTop: 2, flexShrink: 0 }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: ratingColor }}>
                                                        {dayVerdict.rating === 'GO' ? 'Good flying conditions' : dayVerdict.rating === 'MARGINAL' ? 'Marginal conditions' : 'Not recommended for flying'}
                                                    </span>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(0,200,255,0.1)', border: '1px solid rgba(0,200,255,0.2)', borderRadius: 100, padding: '1px 6px', fontSize: '0.6rem', fontWeight: 700, color: 'var(--color-sky)' }}>
                                                        <Sparkles size={8} /> AI
                                                    </span>
                                                </div>
                                                {dayVerdict.bestWindow && (
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-go)', fontWeight: 600, marginBottom: 4 }}>
                                                        🕐 Best window: {dayVerdict.bestWindow}
                                                    </div>
                                                )}
                                                {!dayVerdict.bestWindow && dayVerdict.rating !== 'NO_GO' && (
                                                    <div style={{ fontSize: '0.72rem', color: 'rgba(232,237,245,0.45)', marginBottom: 4 }}>
                                                        No ideal flight window identified — sled rides or short flights possible
                                                    </div>
                                                )}
                                                <div style={{ fontSize: '0.72rem', color: 'rgba(232,237,245,0.6)', lineHeight: 1.5, background: 'rgba(255,255,255,0.04)', padding: '6px 8px', borderRadius: 6, marginTop: 4 }}>
                                                    {dayVerdict.reasoning}
                                                </div>
                                                {dayVerdict.safetyNotes?.length > 0 && (
                                                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                        {dayVerdict.safetyNotes.map((note, i) => (
                                                            <div key={i} style={{ fontSize: '0.68rem', color: 'rgba(253,220,140,0.75)', display: 'flex', gap: 5 }}>
                                                                <span>⚠️</span> {note}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }

                                // Fallback: rule-based callouts (only shown when AI is unavailable)
                                return (
                                    <>
                                        {displayDay.bestWindowStart && displayDay.bestWindowHours > 0 && (
                                            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                                <CheckCircle size={16} color="var(--color-go)" style={{ marginTop: 2 }} />
                                                <div>
                                                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-go)' }}>
                                                        Best window: {formatTime(displayDay.bestWindowStart)} – {formatTime(displayDay.bestWindowEnd)}
                                                    </div>
                                                    <div style={{ fontSize: '0.72rem', color: 'rgba(232,237,245,0.45)', marginBottom: 6 }}>
                                                        {displayDay.bestWindowHours} consecutive GO hour{displayDay.bestWindowHours !== 1 ? 's' : ''} (rule-based estimate)
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {displayDay.goHours === 0 && (
                                            <div style={{ padding: '12px 14px', borderRadius: 12, background: `rgba(${displayDay.dayRating === 'NO_GO' ? '239,68,68' : '245,158,11'},0.08)`, border: `1px solid rgba(${displayDay.dayRating === 'NO_GO' ? '239,68,68' : '245,158,11'},0.2)`, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                                {displayDay.dayRating === 'NO_GO'
                                                    ? <XCircle size={16} color="var(--color-no-go)" style={{ marginTop: 2 }} />
                                                    : <MinusCircle size={16} color="var(--color-marginal)" style={{ marginTop: 2 }} />
                                                }
                                                <div>
                                                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: displayDay.dayRating === 'NO_GO' ? 'var(--color-no-go)' : 'var(--color-marginal)' }}>
                                                        {displayDay.dayRating === 'NO_GO' ? 'No flyable windows expected' : 'Marginal conditions expected'} (rule-based)
                                                    </div>
                                                    <div style={{ fontSize: '0.68rem', color: 'rgba(232,237,245,0.4)', marginTop: 4 }}>AI analysis unavailable — conditions assessed using wind rules only</div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}

                            {/* Wind multi-altitude stats */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, position: 'relative' }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(232,237,245,0.4)' }}>
                                        Wind by Altitude (ASL)
                                    </div>
                                    <AslTooltip altitude={site?.altitude || 0} leftOffset={160} />
                                </div>
                                <WindAltBar hours={displayDay.hours} baseAlt={site?.altitude || 0} />
                            </div>

                            {/* Wind chart */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, position: 'relative' }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(232,237,245,0.4)' }}>
                                        Wind Forecast — Hourly (ASL)
                                    </div>
                                    <AslTooltip altitude={site?.altitude || 0} leftOffset={200} />
                                </div>
                                <WindChart hours={displayDay.hours} baseAlt={site?.altitude || 0} />
                            </div>
                        </div>
                    )}

                    {/* This Week view */}
                    {activeTab === 'week' && forecast.days && (
                        <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(232,237,245,0.4)', marginBottom: 12 }}>
                                7-Day Flyability Outlook
                            </div>
                            <WeekSummary days={forecast.days} aiVerdicts={forecast.aiVerdicts || {}} onDayClick={(idx) => {
                                setActiveDayIndex(idx);
                                setActiveTab(idx === 0 ? 'today' : idx === 1 ? 'tomorrow' : 'custom');
                            }} />
                            <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ fontSize: '0.72rem', color: 'rgba(232,237,245,0.4)', lineHeight: 1.6 }}>
                                    💡 <strong style={{ color: 'rgba(232,237,245,0.6)' }}>AI Tip:</strong> Use the "Ask SkyPilot" chat to ask detailed questions about any day this week, get personalized advice, or explore alternate sites nearby.
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Day quick-view card ─────────────────────────────────────────────────────
function DaySummaryCard({ day, label, active, onClick, aiVerdict }) {
    // For "Today", use the AI verdict as the authoritative rating if available.
    // For other days, fall back to the rule-based dayRating.
    const displayRating = (aiVerdict && !aiVerdict._fallback) ? aiVerdict.rating : day.dayRating;
    const aiPowered = aiVerdict && !aiVerdict._fallback;
    const color = RATING_COLOR[displayRating] || RATING_COLOR.NO_GO;
    const ratingLabel = displayRating === 'GO' ? '✓ GO' : displayRating === 'MARGINAL' ? '~ MARGINAL' : '✗ NO-GO';

    return (
        <button onClick={onClick} style={{
            flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
            background: active ? `rgba(13,21,40,0.9)` : 'rgba(13,21,40,0.4)',
            border: `1px solid ${active ? color : 'rgba(255,255,255,0.06)'}`,
            transition: 'all 0.2s ease',
            boxShadow: active ? `0 0 16px ${color}22` : 'none',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: active ? '#fff' : 'rgba(232,237,245,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {aiPowered && (
                        <span title="AI-powered verdict" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(0,200,255,0.12)', border: '1px solid rgba(0,200,255,0.25)', borderRadius: 100, padding: '1px 6px', fontSize: '0.6rem', fontWeight: 700, color: 'var(--color-sky)', letterSpacing: '0.04em' }}>
                            <Sparkles size={8} /> AI
                        </span>
                    )}
                    {RATING_ICON[displayRating]}
                </div>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color, fontFamily: 'var(--font-heading)' }}>
                {ratingLabel}
            </div>
            {aiPowered && aiVerdict.siteModeLabel && (
                <div style={{ fontSize: '0.68rem', color: 'rgba(232,237,245,0.5)', marginTop: 3, fontStyle: 'italic' }}>
                    {aiVerdict.siteModeLabel}
                </div>
            )}
            <div style={{ fontSize: '0.7rem', color: 'rgba(232,237,245,0.35)', marginTop: 4 }}>
                {day.flyableDaylightHours}/{day.totalDaylightHours} rule-hrs · avg {day.avgWindMph} mph
            </div>
        </button>
    );
}

// ─── Wind altitude comparison bar ─────────────────────────────────────────────
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
            {alts.map(({ label, values }) => {
                const avgSpeed = avg(values.filter(Boolean));
                const pct = maxSpeed > 0 ? (avgSpeed / maxSpeed) * 100 : 0;
                const color = avgSpeed > 22 ? 'var(--color-no-go)' : avgSpeed > 12 ? 'var(--color-marginal)' : 'var(--color-go)';

                return (
                    <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ height: 60, background: 'rgba(255,255,255,0.04)', borderRadius: 6, display: 'flex', alignItems: 'flex-end', overflow: 'hidden', marginBottom: 5 }}>
                            <div style={{ width: '100%', height: `${pct}%`, background: color, opacity: 0.8, transition: 'height 0.8s ease 0.1s' }} />
                        </div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color }}>{Math.round(avgSpeed)}</div>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(232,237,245,0.3)' }}>mph · {label}</div>
                    </div>
                );
            })}
        </div>
    );
}

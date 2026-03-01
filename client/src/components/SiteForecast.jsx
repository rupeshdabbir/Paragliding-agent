import { useState, useEffect } from 'react';
import { Calendar, Clock, Wind, AlertTriangle, ChevronRight, CheckCircle, XCircle, MinusCircle, RefreshCw } from 'lucide-react';
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

function WeekSummary({ days }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {days.map((day, i) => {
                const label = formatDayLabel(day.date, i);
                const color = RATING_COLOR[day.dayRating] || RATING_COLOR.NO_GO;
                const pct = Math.round((day.flyableDaylightHours / Math.max(day.totalDaylightHours, 1)) * 100);

                return (
                    <div key={day.date} style={{
                        background: 'rgba(13,21,40,0.5)', borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.06)',
                        padding: '12px 14px',
                        display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                        {/* Day label */}
                        <div style={{ width: 68, flexShrink: 0 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>{label.top}</div>
                            <div style={{ fontSize: '0.68rem', color: 'rgba(232,237,245,0.4)' }}>{label.bottom}</div>
                        </div>

                        {/* Rating icon */}
                        <div style={{ flexShrink: 0 }}>{RATING_ICON[day.dayRating]}</div>

                        {/* Flyability bar */}
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                <span style={{ fontSize: '0.72rem', color, fontWeight: 600 }}>
                                    {day.dayRating === 'GO' ? 'Good flying' : day.dayRating === 'MARGINAL' ? 'Marginal' : 'Not flyable'}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: 'rgba(232,237,245,0.4)' }}>{pct}% flyable hours</span>
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

                        {/* Best window */}
                        {day.bestWindowStart && day.bestWindowHours > 0 && (
                            <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 72 }}>
                                <div style={{ fontSize: '0.68rem', color: 'var(--color-go)', fontWeight: 600 }}>
                                    {formatTime(day.bestWindowStart)}
                                </div>
                                <div style={{ fontSize: '0.62rem', color: 'rgba(232,237,245,0.35)' }}>
                                    {day.bestWindowHours}h window
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function SiteForecast({ site, onClose }) {
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('today'); // today | tomorrow | week
    const [activeDayIndex, setActiveDayIndex] = useState(0);

    const fetchForecast = async () => {
        if (!site?.lat || !site?.lng) return;
        setLoading(true); setError(null);
        try {
            const res = await fetch(`/api/forecast?lat=${site.lat}&lng=${site.lng}`);
            if (!res.ok) throw new Error('Failed to load forecast');
            const data = await res.json();
            setForecast(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchForecast(); }, [site?.lat, site?.lng]);

    const today = forecast?.days?.[0];
    const tomorrow = forecast?.days?.[1];

    // Which day's hours to show for "today" / "tomorrow" tab
    const displayDay = activeTab === 'today' ? today : activeTab === 'tomorrow' ? tomorrow : forecast?.days?.[activeDayIndex];

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
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: '0.72rem', color: 'rgba(232,237,245,0.45)' }}>
                            {site?.altitude > 0 && <span>⛰️ {site.altitude}m altitude</span>}
                            {site?.siteTypes?.paragliding && <span>🪂 Paragliding</span>}
                        </div>
                    </div>
                    {today && (
                        <FlyabilityBadge rating={today.dayRating} />
                    )}
                </div>

                {/* Warning */}
                <div style={{
                    display: 'flex', gap: 8, padding: '8px 12px',
                    background: 'rgba(245,158,11,0.08)', borderRadius: 10,
                    border: '1px solid rgba(245,158,11,0.2)',
                }}>
                    <AlertTriangle size={13} color="var(--color-amber)" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: '0.72rem', color: 'rgba(253,220,140,0.85)', lineHeight: 1.5 }}>
                        Always verify conditions with local pilots, live sensors, and use your own judgement before flying. Forecast data is model-based and may not reflect site-specific nuances.
                    </span>
                </div>
            </div>

            {/* Loading / Error */}
            {loading && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'rgba(232,237,245,0.5)', fontSize: '0.85rem' }}>
                    <RefreshCw size={16} color="var(--color-sky)" style={{ animation: 'spin 1s linear infinite' }} />
                    Loading 7-day forecast...
                </div>
            )}

            {error && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'rgba(232,237,245,0.5)', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>
                    <XCircle size={28} color="var(--color-no-go)" />
                    <div>Failed to load forecast<br /><span style={{ fontSize: '0.75rem' }}>{error}</span></div>
                    <button onClick={fetchForecast} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '8px 16px' }}>Retry</button>
                </div>
            )}

            {!loading && !error && forecast && (
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>

                    {/* Day summary quick-view (Today + Tomorrow) */}
                    {(today || tomorrow) && (
                        <div style={{ display: 'flex', gap: 8, padding: '14px 0' }}>
                            {today && (
                                <DaySummaryCard day={today} label="Today" onClick={() => { setActiveTab('today'); setActiveDayIndex(0); }} active={activeTab === 'today'} />
                            )}
                            {tomorrow && (
                                <DaySummaryCard day={tomorrow} label="Tomorrow" onClick={() => { setActiveTab('tomorrow'); setActiveDayIndex(1); }} active={activeTab === 'tomorrow'} />
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
                            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                                flex: 1, padding: '8px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                                background: activeTab === t.key ? 'rgba(0,200,255,0.12)' : 'rgba(255,255,255,0.04)',
                                color: activeTab === t.key ? 'var(--color-sky)' : 'rgba(232,237,245,0.5)',
                                borderBottom: activeTab === t.key ? '2px solid var(--color-sky)' : '2px solid transparent',
                                transition: 'all 0.2s ease',
                            }}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Today / Tomorrow: Hourly timeline + day stats */}
                    {(activeTab === 'today' || activeTab === 'tomorrow') && displayDay && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {/* Best window callout */}
                            {displayDay.bestWindowStart && displayDay.bestWindowHours > 0 && (
                                <div style={{
                                    padding: '12px 14px', borderRadius: 12,
                                    background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                                    display: 'flex', alignItems: 'center', gap: 10,
                                }}>
                                    <CheckCircle size={16} color="var(--color-go)" />
                                    <div>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-go)' }}>
                                            Best flying window: {formatTime(displayDay.bestWindowStart)} – {formatTime(displayDay.bestWindowEnd)}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'rgba(232,237,245,0.45)' }}>
                                            {displayDay.bestWindowHours} consecutive GO hour{displayDay.bestWindowHours !== 1 ? 's' : ''} · model-based forecast
                                        </div>
                                    </div>
                                </div>
                            )}

                            {displayDay.dayRating === 'NO_GO' && displayDay.goHours === 0 && (
                                <div style={{
                                    padding: '12px 14px', borderRadius: 12,
                                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                                    display: 'flex', alignItems: 'center', gap: 10,
                                }}>
                                    <XCircle size={16} color="var(--color-no-go)" />
                                    <div style={{ fontSize: '0.82rem', color: 'var(--color-no-go)', fontWeight: 600 }}>
                                        No flyable windows expected
                                        <div style={{ fontSize: '0.72rem', color: 'rgba(239,68,68,0.6)', fontWeight: 400 }}>Conditions don't meet minimum requirements</div>
                                    </div>
                                </div>
                            )}

                            {/* Wind multi-altitude stats */}
                            <div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(232,237,245,0.4)', marginBottom: 8 }}>
                                    Wind by Altitude
                                </div>
                                <WindAltBar hours={displayDay.hours} />
                            </div>

                            {/* Wind chart */}
                            <div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(232,237,245,0.4)', marginBottom: 10 }}>
                                    Wind Forecast — Hourly
                                </div>
                                <WindChart hours={displayDay.hours} />
                            </div>
                        </div>
                    )}

                    {/* This Week view */}
                    {activeTab === 'week' && forecast.days && (
                        <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(232,237,245,0.4)', marginBottom: 12 }}>
                                7-Day Flyability Outlook
                            </div>
                            <WeekSummary days={forecast.days} />
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
function DaySummaryCard({ day, label, active, onClick }) {
    const color = RATING_COLOR[day.dayRating] || RATING_COLOR.NO_GO;

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
                {RATING_ICON[day.dayRating]}
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color, fontFamily: 'var(--font-heading)' }}>
                {day.dayRating === 'GO' ? '✓ GO' : day.dayRating === 'MARGINAL' ? '~ MARGINAL' : '✗ NO-GO'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(232,237,245,0.4)', marginTop: 4 }}>
                {day.flyableDaylightHours}/{day.totalDaylightHours} hrs · avg {day.avgWindMph} mph
            </div>
        </button>
    );
}

// ─── Wind altitude comparison bar ─────────────────────────────────────────────
function WindAltBar({ hours }) {
    const daylight = hours.filter(h => h.hour >= 9 && h.hour <= 18);
    if (daylight.length === 0) return null;

    const avg = (arr) => arr.reduce((a, b) => a + (b || 0), 0) / arr.length;

    const alts = [
        { label: '10m', values: daylight.map(h => h.windSpeed10m) },
        { label: '80m', values: daylight.map(h => h.windSpeed80m) },
        { label: '120m', values: daylight.map(h => h.windSpeed120m) },
        { label: '180m', values: daylight.map(h => h.windSpeed180m) },
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

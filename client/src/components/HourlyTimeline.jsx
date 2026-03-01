import { Wind, ArrowUp } from 'lucide-react';

const RATING_COLOR = { GO: 'var(--color-go)', MARGINAL: 'var(--color-marginal)', NO_GO: 'var(--color-no-go)' };
const RATING_BG = { GO: 'rgba(34,197,94,0.18)', MARGINAL: 'rgba(245,158,11,0.15)', NO_GO: 'rgba(239,68,68,0.12)' };

function wmoIcon(code) {
    if (!code && code !== 0) return '🌤';
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code <= 9) return '🌫';
    if (code <= 49) return '🌫';
    if (code <= 67) return '🌧';
    if (code <= 77) return '❄️';
    if (code <= 82) return '🌦';
    if (code <= 84) return '🌦';
    if (code <= 99) return '⛈';
    return '🌤';
}

export default function HourlyTimeline({ hours, selectedDate }) {
    if (!hours || hours.length === 0) return null;

    // Filter to daylight + evening (6am - 9pm)
    const filtered = hours.filter(h => h.hour >= 6 && h.hour <= 21);

    return (
        <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
            <div style={{ display: 'flex', gap: 6, minWidth: 'max-content', padding: '4px 2px' }}>
                {filtered.map((h, i) => {
                    const color = RATING_COLOR[h.rating] || RATING_COLOR.NO_GO;
                    const bg = RATING_BG[h.rating] || RATING_BG.NO_GO;
                    const windDeg = h.windDirection || 0;

                    return (
                        <div key={i} style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                            width: 58, padding: '10px 6px',
                            background: bg,
                            border: `1px solid ${color}33`,
                            borderRadius: 10,
                            transition: 'transform 0.15s ease',
                            cursor: 'default',
                            position: 'relative',
                        }}
                            title={`${h.time} · ${h.windSpeed10m?.toFixed(0)} mph · ${h.windDirectionCardinal}`}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            {/* Hour label */}
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                                {formatHour(h.hour)}
                            </div>

                            {/* Weather icon */}
                            <div style={{ fontSize: '1rem', lineHeight: 1 }}>{wmoIcon(h.weatherCode)}</div>

                            {/* Wind arrow */}
                            <div style={{ transform: `rotate(${windDeg}deg)`, lineHeight: 1 }}>
                                <ArrowUp size={14} color={color} strokeWidth={2.5} />
                            </div>

                            {/* Wind speed */}
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color, textAlign: 'center' }}>
                                {Math.round(h.windSpeed10m ?? 0)}
                                <div style={{ fontSize: '0.6rem', fontWeight: 400, color: 'var(--color-text-dim)' }}>mph</div>
                            </div>

                            {/* Gusts (if significantly higher) */}
                            {h.windGusts > (h.windSpeed10m ?? 0) * 1.2 && (
                                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', textAlign: 'center' }}>
                                    G{Math.round(h.windGusts)}
                                </div>
                            )}

                            {/* Wind direction label */}
                            <div style={{ fontSize: '0.63rem', color: 'var(--color-text-dim)', fontWeight: 600 }}>
                                {h.windDirectionCardinal}
                            </div>

                            {/* Cloud cover bar */}
                            <div style={{ width: '100%', height: 3, background: 'var(--color-border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', borderRadius: 2,
                                    width: `${h.cloudCover ?? 0}%`,
                                    background: h.cloudCover > 85 ? 'var(--color-marginal)' : 'var(--color-border-strong)',
                                }} />
                            </div>

                            {/* Rating dot */}
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 14, marginTop: 10, paddingLeft: 2 }}>
                {[['GO', 'var(--color-go)'], ['MARGINAL', 'var(--color-marginal)'], ['NO-GO', 'var(--color-no-go)']].map(([label, color]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', color: 'var(--color-text-dim)' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                        {label}
                    </div>
                ))}
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-faint)', marginLeft: 'auto' }}>
                    ↑ Wind direction · G = gusts
                </div>
            </div>
        </div>
    );
}

function formatHour(hour) {
    if (hour === 0) return '12am';
    if (hour === 12) return '12pm';
    return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

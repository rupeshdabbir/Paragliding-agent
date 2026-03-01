import { useRef, useState, useCallback, useEffect } from 'react';

// ─── Colour palette ────────────────────────────────────────────────────────────
const ALT_COLORS = {
    '10m': { line: '#00c8ff', area: 'rgba(0,200,255,0.12)', addFt: 33 },
    '80m': { line: '#a78bfa', area: 'rgba(167,139,250,0.10)', addFt: 262 },
    '120m': { line: '#34d399', area: 'rgba(52,211,153,0.10)', addFt: 394 },
    '180m': { line: '#fb923c', area: 'rgba(251,146,60,0.08)', addFt: 591 },
};

const GUST_COLOR = 'rgba(239,68,68,0.55)';

// Flyability speed zones (in mph)
const ZONES = [
    { from: 0, to: 3, label: 'Too calm', color: 'rgba(100,116,139,0.08)' },
    { from: 3, to: 25, label: 'Flyable', color: 'rgba(34,197,94,0.06)' },
    { from: 25, to: 35, label: 'Strong', color: 'rgba(245,158,11,0.10)' },
    { from: 35, to: 999, label: 'Dangerous', color: 'rgba(239,68,68,0.12)' },
];

function degreesToCardinal(d) {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(d / 45) % 8];
}

function formatHour(h) {
    if (h === 0) return '12am';
    if (h === 12) return '12pm';
    return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function wmoDesc(code) {
    if (code == null) return '';
    if (code === 0) return 'Clear';
    if (code <= 3) return 'Cloudy';
    if (code <= 49) return 'Fog';
    if (code <= 67) return 'Rain';
    if (code <= 77) return 'Snow';
    if (code <= 82) return 'Showers';
    if (code <= 99) return 'Storm';
    return '';
}

export default function WindChart({ hours, title = 'Wind Forecast', baseAlt = 0 }) {
    const svgRef = useRef(null);
    const [tooltip, setTooltip] = useState(null); // { x, y, hour }
    const [activeLayers, setActiveLayers] = useState({ '10m': true, '80m': true, '120m': false, '180m': false, gusts: true });

    // Daylight filter (5am–10pm)
    const data = (hours || []).filter(h => h.hour >= 5 && h.hour <= 22);
    if (data.length === 0) return <div style={{ color: 'rgba(232,237,245,0.4)', fontSize: '0.82rem', padding: 20, textAlign: 'center' }}>No data</div>;

    // Chart dimensions
    const W = 900, H = 260;
    const PAD = { top: 20, right: 16, bottom: 80, left: 46 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;

    // Y scale — max is whichever is highest + 20% headroom
    const allSpeeds = data.flatMap(h => [h.windSpeed10m, h.windSpeed80m, h.windSpeed120m, h.windSpeed180m, h.windGusts].filter(Boolean));
    const maxSpeed = Math.max(Math.ceil(Math.max(...allSpeeds) / 5) * 5 + 5, 30);

    const xScale = (i) => PAD.left + (i / (data.length - 1)) * chartW;
    const yScale = (v) => PAD.top + chartH - (v / maxSpeed) * chartH;

    // Build SVG path helpers
    const linePath = (values) => {
        const pts = values.map((v, i) => `${xScale(i)},${yScale(v ?? 0)}`);
        return `M ${pts.join(' L ')}`;
    };

    const areaPath = (values) => {
        const top = values.map((v, i) => `${xScale(i)},${yScale(v ?? 0)}`).join(' L ');
        const bottom = values.map((_, i) => `${xScale(data.length - 1 - i)},${yScale(0)}`).join(' L ');
        return `M ${top} L ${bottom} Z`;
    };

    // Wind layers to draw
    const layers = [
        { key: '180m', values: data.map(h => h.windSpeed180m) },
        { key: '120m', values: data.map(h => h.windSpeed120m) },
        { key: '80m', values: data.map(h => h.windSpeed80m) },
        { key: '10m', values: data.map(h => h.windSpeed10m) },
    ].filter(l => activeLayers[l.key] && l.values.some(Boolean));

    const gustValues = data.map(h => h.windGusts);

    // Y-axis grid lines
    const yGridSteps = [];
    const step = maxSpeed <= 30 ? 5 : 10;
    for (let v = 0; v <= maxSpeed; v += step) yGridSteps.push(v);

    // Hover handling
    const handleMouseMove = useCallback((e) => {
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const scaleX = W / rect.width;
        const mx = (e.clientX - rect.left) * scaleX;
        // Find nearest data point
        let closest = 0, minDist = Infinity;
        data.forEach((_, i) => {
            const dist = Math.abs(xScale(i) - mx);
            if (dist < minDist) { minDist = dist; closest = i; }
        });
        if (minDist < 40) {
            setTooltip({ index: closest, xPx: xScale(closest), svgRect: rect });
        } else {
            setTooltip(null);
        }
    }, [data]);

    const handleMouseLeave = () => setTooltip(null);

    const toggleLayer = (key) => setActiveLayers(prev => ({ ...prev, [key]: !prev[key] }));

    const tooltipHour = tooltip ? data[tooltip.index] : null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Layer toggles */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {Object.entries(ALT_COLORS).map(([key, { line, label }]) => (
                    <button key={key} onClick={() => toggleLayer(key)} style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px', borderRadius: 100, cursor: 'pointer',
                        background: activeLayers[key] ? `${line}22` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${activeLayers[key] ? line : 'rgba(255,255,255,0.1)'}`,
                        color: activeLayers[key] ? line : 'rgba(232,237,245,0.35)',
                        fontSize: '0.73rem', fontWeight: 600, transition: 'all 0.2s ease',
                    }}>
                        <span style={{ width: 16, height: 2, background: activeLayers[key] ? line : 'rgba(255,255,255,0.2)', display: 'inline-block', borderRadius: 1 }} />
                        Wind {baseAlt + ALT_COLORS[key].addFt}ft
                    </button>
                ))}
                <button onClick={() => toggleLayer('gusts')} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 100, cursor: 'pointer',
                    background: activeLayers.gusts ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${activeLayers.gusts ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    color: activeLayers.gusts ? '#f87171' : 'rgba(232,237,245,0.35)',
                    fontSize: '0.73rem', fontWeight: 600, transition: 'all 0.2s ease',
                }}>
                    <span style={{ width: 16, height: '2px', background: activeLayers.gusts ? GUST_COLOR : 'rgba(255,255,255,0.2)', display: 'inline-block', borderRadius: 1, borderTop: '2px dashed currentColor', height: 0 }} />
                    Gusts
                </button>
                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'rgba(232,237,245,0.25)' }}>
                    Open-Meteo · Hover to inspect
                </span>
            </div>

            {/* SVG chart */}
            <div style={{ position: 'relative', width: '100%', cursor: 'crosshair' }}>
                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${W} ${H}`}
                    style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                >
                    <defs>
                        {Object.entries(ALT_COLORS).map(([key, { line }]) => (
                            <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={line} stopOpacity="0.25" />
                                <stop offset="100%" stopColor={line} stopOpacity="0.01" />
                            </linearGradient>
                        ))}
                    </defs>

                    {/* Flyability zone bands */}
                    {ZONES.map(z => {
                        const y1 = Math.max(PAD.top, yScale(z.to));
                        const y2 = Math.min(PAD.top + chartH, yScale(z.from));
                        if (y2 <= y1) return null;
                        return <rect key={z.label} x={PAD.left} y={y1} width={chartW} height={y2 - y1} fill={z.color} />;
                    })}

                    {/* Y grid lines & labels */}
                    {yGridSteps.map(v => (
                        <g key={v}>
                            <line x1={PAD.left} y1={yScale(v)} x2={PAD.left + chartW} y2={yScale(v)}
                                stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray={v === 0 ? '0' : '3 4'} />
                            <text x={PAD.left - 6} y={yScale(v) + 4} textAnchor="end" fill="rgba(232,237,245,0.4)" fontSize="11">
                                {v}
                            </text>
                        </g>
                    ))}

                    {/* Y axis label */}
                    <text x={10} y={PAD.top + chartH / 2} fill="rgba(232,237,245,0.3)" fontSize="11"
                        transform={`rotate(-90, 10, ${PAD.top + chartH / 2})`} textAnchor="middle">mph</text>

                    {/* Area fills */}
                    {layers.map(({ key, values }) => (
                        <path key={`area-${key}`} d={areaPath(values)} fill={`url(#grad-${key})`} />
                    ))}

                    {/* Line paths */}
                    {layers.map(({ key, values }) => (
                        <path key={`line-${key}`} d={linePath(values)}
                            stroke={ALT_COLORS[key].line} strokeWidth="2.5" fill="none"
                            strokeLinejoin="round" strokeLinecap="round" />
                    ))}

                    {/* Gust dashed line */}
                    {activeLayers.gusts && (
                        <path d={linePath(gustValues)} stroke={GUST_COLOR} strokeWidth="1.5"
                            strokeDasharray="4 3" fill="none" strokeLinecap="round" />
                    )}

                    {/* X-axis: time labels every 3 hours */}
                    {data.map((h, i) => {
                        if (h.hour % 3 !== 0) return null;
                        return (
                            <g key={i}>
                                <line x1={xScale(i)} y1={PAD.top + chartH} x2={xScale(i)} y2={PAD.top + chartH + 4}
                                    stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                                <text x={xScale(i)} y={PAD.top + chartH + 14} textAnchor="middle"
                                    fill="rgba(232,237,245,0.45)" fontSize="11">{formatHour(h.hour)}</text>
                            </g>
                        );
                    })}

                    {/* Wind direction arrows along bottom */}
                    {data.map((h, i) => {
                        if (i % 2 !== 0) return null;
                        const cx = xScale(i);
                        const cy = PAD.top + chartH + 38;
                        const dir = (h.windDirection || 0) * Math.PI / 180;
                        const len = 8;
                        const x2 = cx + Math.sin(dir) * len;
                        const y2 = cy - Math.cos(dir) * len;
                        return (
                            <g key={`arr-${i}`}>
                                <line x1={cx} y1={cy} x2={x2} y2={y2}
                                    stroke="rgba(0,200,255,0.5)" strokeWidth="1.5" strokeLinecap="round"
                                    markerEnd="url(#arrowHead)" />
                            </g>
                        );
                    })}

                    {/* Arrow marker def */}
                    <defs>
                        <marker id="arrowHead" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
                            <path d="M0,0 L4,2 L0,4 Z" fill="rgba(0,200,255,0.6)" />
                        </marker>
                    </defs>

                    {/* Wind direction label row header */}
                    <text x={PAD.left - 6} y={PAD.top + chartH + 38 + 4} textAnchor="end"
                        fill="rgba(232,237,245,0.25)" fontSize="10">Dir</text>

                    {/* Hover vertical line */}
                    {tooltip && (
                        <line x1={tooltip.xPx} y1={PAD.top} x2={tooltip.xPx} y2={PAD.top + chartH}
                            stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeDasharray="3 3" />
                    )}

                    {/* Hover dots on each visible line */}
                    {tooltip && layers.map(({ key, values }) => {
                        const v = values[tooltip.index];
                        if (v == null) return null;
                        return <circle key={`dot-${key}`} cx={tooltip.xPx} cy={yScale(v)} r="5"
                            fill={ALT_COLORS[key].line} stroke="#080d1a" strokeWidth="2" />;
                    })}
                    {tooltip && activeLayers.gusts && (
                        <circle cx={tooltip.xPx} cy={yScale(gustValues[tooltip.index] ?? 0)} r="4"
                            fill="#f87171" stroke="#080d1a" strokeWidth="2" />
                    )}
                </svg>

                {/* HTML Tooltip */}
                {tooltipHour && (() => {
                    const svgEl = svgRef.current;
                    if (!svgEl) return null;
                    const rect = svgEl.getBoundingClientRect();
                    const scaleX = rect.width / W;
                    const tooltipX = tooltip.xPx * scaleX;
                    const isRight = tooltipX > rect.width * 0.6;

                    return (
                        <div style={{
                            position: 'absolute', top: 8,
                            left: isRight ? 'auto' : `${tooltipX + 12}px`,
                            right: isRight ? `${rect.width - tooltipX + 12}px` : 'auto',
                            background: 'rgba(6,10,20,0.96)',
                            backdropFilter: 'blur(16px)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 12, padding: '12px 14px',
                            minWidth: 180, pointerEvents: 'none',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                            zIndex: 100,
                        }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff', marginBottom: 8 }}>
                                {formatHour(tooltipHour.hour)}
                                {tooltipHour.weatherCode != null && (
                                    <span style={{ fontSize: '0.7rem', color: 'rgba(232,237,245,0.45)', marginLeft: 8 }}>
                                        {wmoDesc(tooltipHour.weatherCode)}
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {[
                                    { key: '10m', v: tooltipHour.windSpeed10m },
                                    { key: '80m', v: tooltipHour.windSpeed80m },
                                    { key: '120m', v: tooltipHour.windSpeed120m },
                                    { key: '180m', v: tooltipHour.windSpeed180m },
                                ].filter(r => activeLayers[r.key] && r.v != null).map(({ key, v }) => (
                                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ width: 10, height: 2, background: ALT_COLORS[key].line, display: 'inline-block', borderRadius: 1 }} />
                                            <span style={{ fontSize: '0.72rem', color: 'rgba(232,237,245,0.55)' }}>Wind {baseAlt + ALT_COLORS[key].addFt}ft</span>
                                        </div>
                                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: ALT_COLORS[key].line }}>
                                            {Math.round(v)} mph
                                        </span>
                                    </div>
                                ))}
                                {activeLayers.gusts && tooltipHour.windGusts != null && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ width: 10, height: 0, borderTop: '2px dashed #f87171', display: 'inline-block' }} />
                                            <span style={{ fontSize: '0.72rem', color: 'rgba(232,237,245,0.55)' }}>Gusts</span>
                                        </div>
                                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f87171' }}>{Math.round(tooltipHour.windGusts)} mph</span>
                                    </div>
                                )}
                            </div>
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                                <span style={{ color: 'rgba(232,237,245,0.45)' }}>
                                    Direction: <span style={{ color: '#00c8ff' }}>{degreesToCardinal(tooltipHour.windDirection)} ({Math.round(tooltipHour.windDirection)}°)</span>
                                </span>
                                <span style={{
                                    fontWeight: 700,
                                    color: { GO: 'var(--color-go)', MARGINAL: 'var(--color-marginal)', NO_GO: 'var(--color-no-go)' }[tooltipHour.rating] || '#e8edf5',
                                }}>
                                    {tooltipHour.rating === 'GO' ? '✓ GO' : tooltipHour.rating === 'MARGINAL' ? '~ MARG.' : '✗ NO-GO'}
                                </span>
                            </div>
                            {tooltipHour.cloudCover != null && (
                                <div style={{ marginTop: 6, fontSize: '0.7rem', color: 'rgba(232,237,245,0.35)', display: 'flex', gap: 10 }}>
                                    <span>☁ {Math.round(tooltipHour.cloudCover)}%</span>
                                    {tooltipHour.precipitation > 0 && <span>🌧 {tooltipHour.precipitation.toFixed(1)}mm</span>}
                                    {tooltipHour.temperature != null && <span>🌡 {Math.round(tooltipHour.temperature)}°C</span>}
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>

            {/* Footer: zone legend */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingLeft: 46 }}>
                {ZONES.map(z => (
                    <div key={z.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', color: 'rgba(232,237,245,0.35)' }}>
                        <div style={{ width: 10, height: 5, borderRadius: 2, background: z.color.replace('0.06', '0.5').replace('0.08', '0.5').replace('0.10', '0.5').replace('0.12', '0.5') }} />
                        {z.label} {z.to < 999 ? `(${z.from}–${z.to} mph)` : `(>${z.from} mph)`}
                    </div>
                ))}
            </div>
        </div>
    );
}

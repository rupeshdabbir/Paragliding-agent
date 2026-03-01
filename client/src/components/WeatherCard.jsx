import { Wind, Eye, Cloud, Thermometer, Droplets, Gauge } from 'lucide-react';

function degreesToCardinal(deg) {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
}

function wmoDescription(code) {
    if (code === 0) return 'Clear sky';
    if (code <= 3) return 'Partly cloudy';
    if (code <= 9) return 'Haze/Fog';
    if (code <= 19) return 'Light drizzle';
    if (code <= 29) return 'Drizzle';
    if (code <= 39) return 'Fog';
    if (code <= 49) return 'Freezing fog';
    if (code <= 59) return 'Light rain';
    if (code <= 69) return 'Rain';
    if (code <= 79) return 'Snow';
    if (code <= 82) return 'Rain showers';
    if (code <= 84) return 'Heavy showers';
    if (code <= 94) return 'Thunderstorm';
    return 'Thunderstorm + hail';
}

function MetricRow({ icon, label, value, unit, color }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(232,237,245,0.55)', fontSize: '0.82rem' }}>
                {icon}
                {label}
            </div>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: color || '#e8edf5' }}>
                {value}<span style={{ fontSize: '0.75rem', color: 'rgba(232,237,245,0.45)', marginLeft: 2 }}>{unit}</span>
            </span>
        </div>
    );
}

export default function WeatherCard({ weather, expanded = false }) {
    if (!weather) return null;
    const w = weather;

    const windColor = w.windSpeed10m > 22 ? 'var(--color-no-go)' : w.windSpeed10m > 12 ? 'var(--color-marginal)' : 'var(--color-go)';
    const gustColor = w.windGusts > 28 ? 'var(--color-no-go)' : w.windGusts > 19 ? 'var(--color-marginal)' : '#e8edf5';
    const visColor = w.visibility < 2000 ? 'var(--color-no-go)' : w.visibility < 5000 ? 'var(--color-marginal)' : 'var(--color-go)';
    const cloudColor = w.cloudCover > 85 ? 'var(--color-marginal)' : '#e8edf5';
    const precipColor = w.precipitation > 0.5 ? 'var(--color-no-go)' : w.precipitation > 0 ? 'var(--color-marginal)' : 'var(--color-go)';

    return (
        <div style={{
            background: 'rgba(13,21,40,0.6)', borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255,255,255,0.06)', padding: '16px',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(232,237,245,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Current Weather
                </h4>
                {w.weatherCode !== undefined && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-sky)' }}>
                        {wmoDescription(w.weatherCode)}
                    </span>
                )}
            </div>

            {/* Wind speed highlight */}
            <div style={{
                display: 'flex', gap: 8, marginBottom: 12,
            }}>
                <WindAlt label="10m" value={w.windSpeed10m} color={windColor} />
                {w.windSpeed80m !== undefined && <WindAlt label="80m" value={w.windSpeed80m} color={windColor} />}
                {w.windSpeed120m !== undefined && <WindAlt label="120m" value={w.windSpeed120m} color={windColor} />}
                {w.windSpeed180m !== undefined && <WindAlt label="180m" value={w.windSpeed180m} color={windColor} />}
            </div>

            <MetricRow icon={<Wind size={13} />} label="Wind direction"
                value={degreesToCardinal(w.windDirection10m)} unit={`(${Math.round(w.windDirection10m)}°)`} />
            <MetricRow icon={<Wind size={13} />} label="Gusts"
                value={Math.round(w.windGusts)} unit="mph" color={gustColor} />
            <MetricRow icon={<Eye size={13} />} label="Visibility"
                value={(w.visibility / 1000).toFixed(1)} unit="km" color={visColor} />
            <MetricRow icon={<Cloud size={13} />} label="Cloud cover"
                value={Math.round(w.cloudCover)} unit="%" color={cloudColor} />
            <MetricRow icon={<Droplets size={13} />} label="Precipitation"
                value={w.precipitation?.toFixed(2) || '0'} unit="mm/h" color={precipColor} />
            <MetricRow icon={<Thermometer size={13} />} label="Temperature"
                value={w.temperature?.toFixed(1)} unit="°C" />
            <MetricRow icon={<Droplets size={13} />} label="Humidity"
                value={Math.round(w.humidity)} unit="%" />
            <MetricRow icon={<Gauge size={13} />} label="Pressure"
                value={Math.round(w.pressure)} unit="hPa" />
        </div>
    );
}

function WindAlt({ label, value, color }) {
    if (value === undefined || value === null) return null;
    return (
        <div style={{
            flex: 1, textAlign: 'center', padding: '8px 4px',
            background: 'rgba(255,255,255,0.04)', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.06)',
        }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(232,237,245,0.4)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color }}>{Math.round(value)}</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(232,237,245,0.3)' }}>mph</div>
        </div>
    );
}

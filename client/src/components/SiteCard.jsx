import { FlyabilityBadge } from './FlyabilityBadge.jsx';
import WindRose from './WindRose.jsx';
import WeatherCard from './WeatherCard.jsx';
import { MapPin, Mountain, Wind, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export default function SiteCard({ site, analysis, weather, defaultExpanded = false }) {
    const [expanded, setExpanded] = useState(defaultExpanded);

    if (!site) return null;
    const rating = analysis?.rating || 'NO_GO';

    const ratingBorder = {
        GO: '1px solid rgba(34,197,94,0.3)',
        MARGINAL: '1px solid rgba(245,158,11,0.3)',
        NO_GO: '1px solid rgba(239,68,68,0.2)',
    }[rating];

    const ratingGlow = {
        GO: '0 0 24px rgba(34,197,94,0.08)',
        MARGINAL: '0 0 24px rgba(245,158,11,0.06)',
        NO_GO: 'none',
    }[rating];

    return (
        <div style={{
            background: 'rgba(13,21,40,0.8)',
            border: ratingBorder,
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: ratingGlow,
            backdropFilter: 'blur(20px)',
        }}>
            {/* Header */}
            <div style={{ padding: '18px 20px', cursor: 'pointer' }} onClick={() => setExpanded(v => !v)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <FlyabilityBadge rating={rating} />
                            {site.distanceFromSearch > 0 && (
                                <span style={{ fontSize: '0.75rem', color: 'rgba(232,237,245,0.4)' }}>
                                    {(site.distanceFromSearch / 1000).toFixed(1)} km away
                                </span>
                            )}
                        </div>

                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: 6, fontFamily: 'var(--font-heading)' }}>
                            {site.name}
                        </h3>

                        {/* Site type tags */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {site.siteTypes?.paragliding && <SiteTag label="Paragliding" />}
                            {site.siteTypes?.ridgeSoaring && <SiteTag label="Ridge Soaring" />}
                            {site.siteTypes?.thermaling && <SiteTag label="Thermaling" />}
                            {site.siteTypes?.hanggliding && <SiteTag label="Hang Gliding" />}
                            {site.altitude > 0 && <SiteTag label={`${site.altitude}m`} icon={<Mountain size={11} />} />}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                        {/* Wind rose (small) */}
                        <WindRose
                            windDirections={site.windDirections}
                            currentWindDeg={analysis?.windDegrees || weather?.windDirection10m}
                            size={80}
                        />
                        <button className="btn-ghost" style={{
                            background: 'transparent', border: 'none', color: 'rgba(232,237,245,0.4)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', padding: 0,
                        }}>
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {expanded ? 'Less' : 'More'}
                        </button>
                    </div>
                </div>

                {/* Quick summary */}
                {analysis && (
                    <div style={{ marginTop: 10 }}>
                        {/* Issues */}
                        {analysis.issues?.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {analysis.issues.map((issue, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: '0.8rem', color: 'rgba(239,68,68,0.85)' }}>
                                        <span>✗</span><span>{issue}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Positives */}
                        {analysis.positives?.length > 0 && rating !== 'NO_GO' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
                                {analysis.positives.slice(0, 2).map((pos, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: '0.8rem', color: 'rgba(34,197,94,0.85)' }}>
                                        <span>✓</span><span>{pos}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Expanded: full weather + details */}
            {expanded && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ paddingTop: 16 }}>
                        {/* Site description */}
                        {site.description && (
                            <p style={{ fontSize: '0.82rem', color: 'rgba(232,237,245,0.5)', marginBottom: 14, fontStyle: 'italic' }}>
                                {site.description}
                            </p>
                        )}

                        {/* Big wind rose */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                            <WindRose
                                windDirections={site.windDirections}
                                currentWindDeg={analysis?.windDegrees || weather?.windDirection10m}
                                size={150}
                            />
                        </div>

                        {/* Wind direction legend */}
                        <div style={{ textAlign: 'center', marginBottom: 16, fontSize: '0.78rem', color: 'rgba(232,237,245,0.45)' }}>
                            <span style={{ color: 'var(--color-sky)' }}>→</span> Current wind &nbsp;|&nbsp;
                            <span style={{ color: 'var(--color-go)' }}>■</span> Ideal &nbsp;
                            <span style={{ color: 'var(--color-marginal)' }}>■</span> Marginal
                        </div>

                        {/* Full weather card */}
                        {weather && <WeatherCard weather={weather} expanded />}

                        {/* Coordinates */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: '0.75rem', color: 'rgba(232,237,245,0.3)' }}>
                            <MapPin size={12} />
                            {site.lat?.toFixed(4)}, {site.lng?.toFixed(4)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SiteTag({ label, icon }) {
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 100,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: '0.72rem', color: 'rgba(232,237,245,0.45)',
        }}>
            {icon}{label}
        </span>
    );
}

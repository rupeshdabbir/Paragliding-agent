import { Sparkles, Wind, MapPin, TrendingUp, Clock, ChevronRight, AlertCircle, Info, Star } from 'lucide-react';
import { FlyabilityBadge } from './FlyabilityBadge.jsx';
import { NavLink } from 'react-router-dom';

export default function MorningBrief({ data, loading }) {
    if (!data) return null;

    const { regionHeadline, siteOfDay, rankings, overallSafetyNote, usedModel } = data;

    const topSite = rankings.find(r => r.siteName === siteOfDay) || rankings[0];
    const otherRankings = rankings.filter(r => r !== topSite);

    return (
        <div style={{ animation: 'fade-up 0.6s ease' }}>

            {/* Regional Headline */}
            <div className="glass" style={{
                padding: '24px',
                marginBottom: '24px',
                borderLeft: '4px solid var(--color-sky)',
                background: 'var(--color-sky-dim)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}>
                    <Wind size={80} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'var(--color-sky-gradient)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, boxShadow: '0 0 15px var(--color-sky-glow)'
                    }}>
                        <Sparkles size={18} color="#fff" />
                    </div>
                    <div>
                        <h2 style={{
                            fontSize: '1.2rem',
                            fontWeight: 700,
                            color: 'var(--color-text-heading)',
                            marginBottom: '6px',
                            lineHeight: 1.3
                        }}>
                            {regionHeadline}
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
                            <TrendingUp size={12} />
                            <span>AI Regional Synthesis {usedModel && `(via ${usedModel})`}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Site of the Day Hero */}
            {topSite && (
                <div style={{ marginBottom: '30px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '12px' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-sky)',
                            textTransform: 'uppercase', letterSpacing: '0.1em'
                        }}>
                            <TrendingUp size={14} /> Site of the Day
                        </div>
                        {topSite?.isStarred && (
                            <div style={{
                                padding: '4px 10px', background: 'rgba(212,175,55,0.15)',
                                borderRadius: 100, border: '1px solid rgba(212,175,55,0.3)',
                                fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-amber)',
                                display: 'flex', alignItems: 'center', gap: 6
                            }}>
                                <Star size={12} fill="var(--color-amber)" /> Your Favorite
                            </div>
                        )}
                    </div>
                    <div className="glass" style={{
                        padding: '30px',
                        position: 'relative',
                        background: 'linear-gradient(135deg, var(--color-bg-card), var(--color-bg-secondary))',
                        boxShadow: 'var(--elevation-lg)',
                        overflow: 'hidden'
                    }}>
                        {/* Glow effect */}
                        <div style={{
                            position: 'absolute', top: '-20%', right: '-10%',
                            width: '40%', height: '80%',
                            background: 'var(--color-sky-glow)',
                            filter: 'blur(80px)', opacity: 0.2, borderRadius: '50%'
                        }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-heading)', marginBottom: '8px' }}>
                                    {topSite.siteName}
                                </h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                                    <MapPin size={14} />
                                    <span>Optimal conditions detected</span>
                                </div>
                            </div>
                            <FlyabilityBadge rating={topSite.rating} size="lg" />
                        </div>

                        <div className="glass-subtle" style={{ padding: '20px', marginBottom: '25px', background: 'rgba(255,255,255,0.03)' }}>
                            <p style={{ fontSize: '1.05rem', lineHeight: 1.6, color: 'var(--color-text-primary)' }}>
                                {topSite.reasoning}
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: 'var(--color-surface-3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Clock size={16} color="var(--color-sky)" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Best Window</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{topSite.bestWindow || 'Early Day'}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: 'var(--color-surface-3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Wind size={16} color="var(--color-sky)" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Flight Mode</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'capitalize' }}>{topSite.recommendedMode}</div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => window.location.href = `/?search=${encodeURIComponent(topSite.siteName)}`}
                            className="btn btn-primary"
                            style={{ marginTop: '30px', width: '100%', justifyContent: 'center' }}
                        >
                            View on Map <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Other Rankings */}
            {otherRankings.length > 0 && (
                <div style={{ marginBottom: '40px' }}>
                    <h3 style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: 'var(--color-text-dim)',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                    }}>
                        Alternative Sites
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {otherRankings.map((site, i) => (
                            <div
                                key={i}
                                className="glass-subtle"
                                style={{
                                    padding: '16px 20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    borderLeft: `3px solid ${site.rating === 'GO' ? 'var(--color-go)' : site.rating === 'MARGINAL' ? 'var(--color-marginal)' : 'transparent'}`
                                }}
                                onClick={() => window.location.href = `/?search=${encodeURIComponent(site.siteName)}`}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-3)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-glass-subtle-bg)'; e.currentTarget.style.transform = 'translateX(0)'; }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '4px' }}>
                                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-heading)' }}>{site.siteName}</span>
                                        {site.isStarred && <Star size={14} fill="var(--color-amber)" color="var(--color-amber)" />}
                                        <FlyabilityBadge rating={site.rating} size="sm" />
                                    </div>
                                    <p style={{
                                        fontSize: '0.8rem',
                                        color: 'var(--color-text-muted)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {site.reasoning}
                                    </p>
                                </div>
                                <div style={{ marginLeft: '20px', flexShrink: 0 }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 8,
                                        background: 'var(--color-surface-3)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'var(--color-text-dim)'
                                    }}>
                                        <ChevronRight size={16} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Safety Note */}
            {overallSafetyNote && (
                <div style={{
                    padding: '16px 20px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-no-go-dim)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start'
                }}>
                    <AlertCircle size={18} color="var(--color-no-go)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-no-go)', fontWeight: 500, lineHeight: 1.5 }}>
                        <span style={{ fontWeight: 800 }}>Safety Note:</span> {overallSafetyNote}
                    </p>
                </div>
            )}

            {/* Info Footer */}
            <div style={{
                marginTop: '40px',
                textAlign: 'center',
                padding: '20px',
                borderTop: '1px solid var(--color-border-subtle)'
            }}>
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: '0.75rem',
                    color: 'var(--color-text-faint)'
                }}>
                    <Info size={12} />
                    <span>Briefs are automatically generated at sunrise (local time)</span>
                </div>
            </div>
        </div>
    );
}

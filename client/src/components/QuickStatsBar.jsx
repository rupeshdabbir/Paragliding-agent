// QuickStatsBar — floats above the map when sites have loaded
export default function QuickStatsBar({ sites, bestSite }) {
    if (!sites || sites.length === 0) return null;

    const counts = {
        GO: sites.filter(s => s.rating === 'GO').length,
        MARGINAL: sites.filter(s => s.rating === 'MARGINAL').length,
        NO_GO: sites.filter(s => s.rating === 'NO_GO').length,
    };

    const dot = (color) => (
        <span style={{
            display: 'inline-block', width: 7, height: 7,
            borderRadius: '50%', background: color,
            boxShadow: `0 0 6px ${color}`,
            flexShrink: 0,
        }} />
    );

    return (
        <div className="quick-stats-bar" style={{ pointerEvents: 'none' }}>
            {/* Best site — only shown if a GO or MARGINAL site exists */}
            {bestSite && (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {dot(bestSite.rating === 'GO' ? 'var(--color-go)' : 'var(--color-marginal)')}
                        <span style={{ fontSize: '0.73rem', fontWeight: 700, color: '#fff', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {bestSite.name}
                        </span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: bestSite.rating === 'GO' ? 'var(--color-go)' : 'var(--color-marginal)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {bestSite.rating === 'GO' ? '· GO' : '· MARGINAL'}
                        </span>
                    </div>
                    <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)' }} />
                </>
            )}

            {/* Count chips with clear labels */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {counts.GO > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-go)' }}>
                        {dot('var(--color-go)')} {counts.GO} GO
                    </span>
                )}
                {counts.MARGINAL > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-marginal)' }}>
                        {dot('var(--color-marginal)')} {counts.MARGINAL} MARG
                    </span>
                )}
                {counts.NO_GO > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 500, color: 'rgba(239,68,68,0.6)' }}>
                        {dot('var(--color-no-go)')} {counts.NO_GO} NO-GO
                    </span>
                )}
            </div>

            {/* Total count */}
            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)' }} />
            <span style={{ fontSize: '0.68rem', color: 'rgba(232,237,245,0.38)', fontWeight: 500 }}>
                {sites.length} sites
            </span>
        </div>
    );
}

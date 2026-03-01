// FlyabilityBadge component
export function FlyabilityBadge({ rating, size = 'md' }) {
    const config = {
        GO: { className: 'badge badge-go', icon: '✓', label: 'GO' },
        MARGINAL: { className: 'badge badge-marginal', icon: '⚠', label: 'MARGINAL' },
        NO_GO: { className: 'badge badge-no-go', icon: '✗', label: 'NO-GO' },
    };

    const { className, icon, label } = config[rating] || config.NO_GO;
    const fontSize = size === 'lg' ? '0.9rem' : size === 'sm' ? '0.7rem' : '0.78rem';

    return (
        <span className={className} style={{ fontSize }}>
            {icon} {label}
        </span>
    );
}

// Wind score indicator (0, 1, 2)
export function WindScoreIndicator({ score }) {
    const colors = { 0: 'var(--color-no-go)', 1: 'var(--color-marginal)', 2: 'var(--color-go)' };
    const labels = { 0: 'Not suitable', 1: 'Marginal', 2: 'Ideal' };
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: '0.8rem', color: colors[score] || colors[0], fontWeight: 600,
        }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[score] || colors[0] }} />
            {labels[score] || labels[0]}
        </span>
    );
}

import { useState } from 'react';
import { RefreshCw, X, ArrowUpCircle } from 'lucide-react';

export default function UpdateToast({ needRefresh, updateServiceWorker }) {
    const [dismissed, setDismissed] = useState(false);

    if (!needRefresh || dismissed) return null;

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 24,
                right: 20,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: 'var(--color-surface-overlay)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid var(--color-border-glow)',
                borderRadius: 14,
                boxShadow: '0 8px 32px rgba(0,136,204,0.2), 0 2px 8px rgba(0,0,0,0.4)',
                maxWidth: 310,
                animation: 'slide-up-toast 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}
        >
            {/* Icon */}
            <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'var(--color-sky-gradient)',
                boxShadow: '0 4px 12px var(--color-sky-glow)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <ArrowUpCircle size={18} color="#fff" strokeWidth={2.5} />
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: '0.78rem', fontWeight: 700,
                    color: 'var(--color-text-heading)', marginBottom: 2,
                }}>
                    Update Available
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                    A new version of SkyPilot is ready.
                </div>
            </div>

            {/* Refresh button */}
            <button
                onClick={() => updateServiceWorker(true)}
                title="Update now"
                style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 8, flexShrink: 0,
                    background: 'var(--color-sky-gradient)',
                    border: 'none', cursor: 'pointer',
                    color: '#fff', fontSize: '0.73rem', fontWeight: 700,
                    boxShadow: '0 2px 8px var(--color-sky-glow)',
                    transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
                <RefreshCw size={13} strokeWidth={2.5} />
                Update
            </button>

            {/* Dismiss */}
            <button
                onClick={() => setDismissed(true)}
                title="Dismiss"
                style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--color-surface-3)',
                    border: '1px solid var(--color-border-base)',
                    color: 'var(--color-text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-glass-subtle-bg)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-surface-3)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
            >
                <X size={12} strokeWidth={2.5} />
            </button>
        </div>
    );
}

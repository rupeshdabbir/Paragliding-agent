import { useState, useEffect } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';

export default function DisclaimerModal() {
    const [accepted, setAccepted] = useState(true);
    const [showDeclineMsg, setShowDeclineMsg] = useState(false);
    const [liabilityChecked, setLiabilityChecked] = useState(false);

    useEffect(() => {
        const hasAccepted = localStorage.getItem('skypilot_disclaimer_accepted');
        if (!hasAccepted) {
            setAccepted(false);
        }
    }, []);

    if (accepted) return null;

    const handleAccept = () => {
        localStorage.setItem('skypilot_disclaimer_accepted', 'true');
        setAccepted(true);
    };

    const handleDecline = () => {
        setShowDeclineMsg(true);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(2, 6, 15, 0.85)', backdropFilter: 'blur(16px)',
            padding: 20
        }}>
            <div style={{
                background: 'var(--color-sheet-bg)',
                border: '1px solid var(--color-border-base)',
                borderRadius: 20,
                maxWidth: 480,
                width: '100%',
                maxHeight: '90dvh',
                boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Accent line */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #f59e0b, #ef4444)', zIndex: 10 }} />

                <div style={{
                    padding: 'clamp(20px, 5vw, 32px)',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'clamp(16px, 4vw, 24px)',
                }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 14,
                            background: 'rgba(245, 158, 11, 0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <AlertTriangle size={24} color="#f59e0b" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-heading)', margin: 0, letterSpacing: '-0.02em' }}>
                                Educational Purposes Only
                            </h2>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                                Please read carefully before using SkyPilot
                            </div>
                        </div>
                    </div>

                    <div style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                        <p style={{ margin: '0 0 16px 0' }}>
                            SkyPilot relies on algorithmic weather models and AI reasoning which <strong>can and will be wrong.</strong> Airflow near terrain is highly complex and micro-meteorological factors are often missed by these models.
                        </p>
                        <p style={{ margin: '0 0 16px 0' }}>
                            By proceeding, you agree that:
                        </p>
                        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <li>This tool does not replace proper flight instruction, local site orientations, or your own piloting judgment.</li>
                            <li>You must always <strong>do your own homework</strong>—check live weather sensors, wind-socks, and consult with local pilots before launching.</li>
                            <li>The developers of SkyPilot are <strong>not liable</strong> for any injury, loss, or damages resulting from the use of this application.</li>
                        </ul>
                    </div>

                    {showDeclineMsg && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                            padding: '12px 16px', borderRadius: 12, color: '#fca5a5', fontSize: '0.85rem',
                            display: 'flex', alignItems: 'flex-start', gap: 10, animation: 'shake 0.4s ease-in-out'
                        }}>
                            <AlertTriangle size={16} color="#fca5a5" style={{ flexShrink: 0, marginTop: 2 }} />
                            <span>You must accept these terms to use SkyPilot. If you do not agree, please close this tab.</span>
                        </div>
                    )}

                    <label style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer',
                        background: 'var(--color-surface-2)', padding: '16px', borderRadius: 12,
                        border: liabilityChecked ? '1px solid var(--color-go)' : '1px solid var(--color-border-base)',
                        transition: 'all 0.2s'
                    }}>
                        <input
                            type="checkbox"
                            checked={liabilityChecked}
                            onChange={(e) => setLiabilityChecked(e.target.checked)}
                            style={{ marginTop: 2, transform: 'scale(1.2)', accentColor: 'var(--color-go)', cursor: 'pointer' }}
                        />
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                            I understand this is AI-generated advice, it may be fatally incorrect, and the author carries <strong>ZERO</strong> liability for my safety.
                        </div>
                    </label>

                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                        <button
                            onClick={handleDecline}
                            style={{
                                flex: 1, padding: '14px 0', borderRadius: 12,
                                background: 'transparent',
                                border: '1px solid var(--color-border-base)',
                                color: 'var(--color-text-secondary)',
                                fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-3)'; e.currentTarget.style.color = 'var(--color-text-heading)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                        >
                            <X size={18} /> I Decline
                        </button>
                        <button
                            onClick={handleAccept}
                            disabled={!liabilityChecked}
                            style={{
                                flex: 1.5, padding: '14px 0', borderRadius: 12,
                                background: liabilityChecked ? 'linear-gradient(135deg, #00c8ff, #0044bb)' : 'var(--color-surface-4)',
                                border: 'none', color: liabilityChecked ? '#fff' : 'var(--color-text-dim)',
                                fontSize: '0.95rem', fontWeight: 700, cursor: liabilityChecked ? 'pointer' : 'not-allowed',
                                boxShadow: liabilityChecked ? '0 8px 24px rgba(0, 200, 255, 0.25)' : 'none',
                                transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                            }}
                            onMouseEnter={e => { if (liabilityChecked) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 200, 255, 0.4)'; } }}
                            onMouseLeave={e => { if (liabilityChecked) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 200, 255, 0.25)'; } }}
                        >
                            <Check size={18} strokeWidth={3} /> I Understand & Accept
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

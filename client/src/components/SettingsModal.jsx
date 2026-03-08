import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Key, ExternalLink, Sparkles } from 'lucide-react';

export default function SettingsModal({ open, onClose }) {
    const [apiKey, setApiKey] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (open) {
            const stored = localStorage.getItem('geminiApiKey');
            if (stored) setApiKey(stored);
            setSaved(false);
        }
    }, [open]);

    if (!open) return null;

    const hasStoredKey = !!localStorage.getItem('geminiApiKey');

    const handleSave = () => {
        if (apiKey.trim()) {
            localStorage.setItem('geminiApiKey', apiKey.trim());
        } else {
            localStorage.removeItem('geminiApiKey');
        }
        setSaved(true);
        setTimeout(() => {
            setSaved(false);
            onClose();
        }, 1200);
    };

    return createPortal(
        <div
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 99999, padding: 20,
            }}
        >
            <div style={{
                background: 'var(--color-sheet-bg)',
                border: '1px solid var(--color-border-strong)',
                borderRadius: 24, padding: '24px 28px',
                width: '100%', maxWidth: 440,
                boxShadow: 'var(--color-elevation-lg)',
                animation: 'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative',
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute', top: 20, right: 20,
                    background: 'var(--color-surface-3)', border: 'none',
                    borderRadius: '50%', width: 32, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'var(--color-text-secondary)',
                    transition: 'all 0.2s ease',
                }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-border-base)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--color-surface-3)'}
                >
                    <X size={16} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: 'var(--color-sky-gradient)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 16px rgba(0,200,255,0.25)',
                    }}>
                        <Sparkles size={22} color="#fff" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-heading)', margin: 0 }}>API Settings</h2>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', margin: '4px 0 0' }}>Configure your AI resources</p>
                    </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                        Gemini API Key
                    </label>
                    <div style={{ position: 'relative' }}>
                        <Key size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            style={{
                                width: '100%', background: 'var(--color-input-bg)',
                                border: '1px solid var(--color-border-base)',
                                borderRadius: 12, padding: '12px 14px 12px 40px',
                                color: 'var(--color-text-primary)', fontSize: '0.95rem',
                                transition: 'all 0.2s ease', outline: 'none', boxSizing: 'border-box',
                            }}
                            onFocus={e => e.currentTarget.style.borderColor = 'var(--color-border-glow)'}
                            onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border-base)'}
                        />
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: 10, lineHeight: 1.5 }}>
                        This app connects to Gemini to provide flyability forecasts. Provide your own free API key from{' '}
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
                            style={{ color: 'var(--color-sky)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            Google AI Studio <ExternalLink size={10} />
                        </a>{' '}
                        to use the app without limits. Your key is stored only in your browser.
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button
                        onClick={handleSave}
                        style={{
                            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                            background: saved ? 'var(--color-go)' : 'var(--color-sky-gradient)',
                            color: '#fff', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: saved ? '0 4px 16px rgba(16,185,129,0.3)' : '0 4px 16px rgba(0,200,255,0.25)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}
                    >
                        {saved ? '✓ Saved Successfully' : 'Save Settings'}
                    </button>

                    {!hasStoredKey && (
                        <button
                            onClick={onClose}
                            style={{
                                width: '100%', padding: '10px', borderRadius: 12, border: 'none',
                                background: 'transparent',
                                color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-primary)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                        >
                            Ask me later
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Key, ExternalLink, Sparkles, Check, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import { getAIProvider, hasActiveKey } from '../utils/aiHeaders.js';

// ─── Provider configuration ───────────────────────────────────────────────────
const PROVIDERS = [
    {
        id: 'gemini',
        name: 'Gemini',
        company: 'Google',
        badge: 'Free tier',
        badgeColor: '#22c55e',
        accentColor: '#4285f4',
        gradient: 'linear-gradient(135deg, #4285f4, #34a853)',
        placeholder: 'AIzaSy...',
        storageKey: 'geminiApiKey',
        keyUrl: 'https://aistudio.google.com/app/apikey',
        keyLabel: 'Google AI Studio',
        modelHint: 'gemini-3-flash-preview',
        description: 'Recommended — free tier, full tool calling, AI forecasts',
        emoji: '✦',
    },
    {
        id: 'grok',
        name: 'Grok',
        company: 'xAI',
        badge: 'Paid',
        badgeColor: '#a855f7',
        accentColor: '#7c3aed',
        gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)',
        placeholder: 'xai-...',
        storageKey: 'grokApiKey',
        keyUrl: 'https://console.x.ai/',
        keyLabel: 'xAI Console',
        modelHint: 'grok-3-mini',
        description: 'Ultra-fast responses, full tool calling — paid per call',
        emoji: '⚡',
    },
    {
        id: 'anthropic',
        name: 'Claude',
        company: 'Anthropic',
        badge: 'Paid',
        badgeColor: '#f59e0b',
        accentColor: '#d97706',
        gradient: 'linear-gradient(135deg, #d97706, #f59e0b)',
        placeholder: 'sk-ant-...',
        storageKey: 'anthropicApiKey',
        keyUrl: 'https://console.anthropic.com/',
        keyLabel: 'Anthropic Console',
        modelHint: 'claude-3-5-haiku-latest',
        description: 'Exceptional reasoning & safety analysis — paid per call',
        emoji: '◆',
    },
    {
        id: 'openai',
        name: 'GPT',
        company: 'OpenAI',
        badge: 'Paid',
        badgeColor: '#10b981',
        accentColor: '#059669',
        gradient: 'linear-gradient(135deg, #059669, #10b981)',
        placeholder: 'sk-...',
        storageKey: 'openaiApiKey',
        keyUrl: 'https://platform.openai.com/api-keys',
        keyLabel: 'OpenAI Platform',
        modelHint: 'gpt-4.1-mini',
        description: 'Industry standard, reliable tool calling — paid per call',
        emoji: '◎',
    },
];

function ProviderTab({ provider, isSelected, hasKey, onClick }) {
    const color = isSelected ? provider.accentColor : 'var(--color-text-dim)';
    const bg = isSelected
        ? `linear-gradient(135deg, ${provider.accentColor}18, ${provider.accentColor}08)`
        : 'transparent';
    const border = isSelected
        ? `1px solid ${provider.accentColor}44`
        : '1px solid var(--color-border-subtle)';

    return (
        <button
            onClick={onClick}
            style={{
                flex: 1,
                padding: '10px 6px',
                borderRadius: 12,
                border,
                background: bg,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.2s ease',
                position: 'relative',
            }}
            onMouseEnter={e => {
                if (!isSelected) {
                    e.currentTarget.style.background = 'var(--color-surface-3)';
                    e.currentTarget.style.borderColor = 'var(--color-border-base)';
                }
            }}
            onMouseLeave={e => {
                if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'var(--color-border-subtle)';
                }
            }}
        >
            {/* Active dot indicator */}
            {hasKey && (
                <div style={{
                    position: 'absolute', top: 6, right: 6,
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#22c55e',
                    boxShadow: '0 0 6px #22c55e',
                }} />
            )}
            <span style={{
                fontSize: '1.1rem',
                filter: isSelected ? 'none' : 'grayscale(1) opacity(0.5)',
                transition: 'filter 0.2s',
            }}>
                {provider.emoji}
            </span>
            <span style={{
                fontSize: '0.62rem', fontWeight: 700,
                color: isSelected ? provider.accentColor : 'var(--color-text-dim)',
                letterSpacing: '0.03em',
                transition: 'color 0.2s',
            }}>
                {provider.name}
            </span>
            <span style={{
                fontSize: '0.52rem',
                color: isSelected ? provider.accentColor : 'var(--color-text-faint)',
                opacity: 0.8,
            }}>
                {provider.company}
            </span>
        </button>
    );
}

export default function SettingsModal({ open, onClose }) {
    const [selectedProviderId, setSelectedProviderId] = useState('gemini');
    const [keyValues, setKeyValues] = useState({});
    const [saved, setSaved] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [validationError, setValidationError] = useState('');

    useEffect(() => {
        if (open) {
            // Load saved provider + all keys
            const provider = getAIProvider();
            setSelectedProviderId(provider);
            setSaved(false);
            setShowKey(false);
            setValidationError('');

            const loaded = {};
            PROVIDERS.forEach(p => {
                loaded[p.id] = localStorage.getItem(p.storageKey) || '';
            });
            setKeyValues(loaded);
        }
    }, [open]);

    if (!open) return null;

    const selectedProvider = PROVIDERS.find(p => p.id === selectedProviderId);
    const activeProviderId = getAIProvider();
    const activeProvider = PROVIDERS.find(p => p.id === activeProviderId);
    const currentKey = keyValues[selectedProviderId] || '';
    const activeKeyExists = hasActiveKey();

    const handleKeyChange = (val) => {
        setKeyValues(prev => ({ ...prev, [selectedProviderId]: val }));
        setValidationError('');
    };

    const handleSave = async () => {
        const keyToSave = currentKey.trim();
        if (!keyToSave) {
            setValidationError('Please enter an API key to activate.');
            return;
        }

        setIsValidating(true);
        setValidationError('');
        try {
            const res = await fetch('/api/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: selectedProviderId, apiKey: keyToSave })
            });
            const data = await res.json();

            if (!data.valid) {
                setValidationError(data.error || 'Invalid API key');
                setIsValidating(false);
                return;
            }

            // Save the key for the selected provider
            localStorage.setItem(selectedProvider.storageKey, keyToSave);
            // Set this as the active provider
            localStorage.setItem('aiProvider', selectedProviderId);
            setSaved(true);
            setTimeout(() => {
                setSaved(false);
                onClose();
            }, 1300);
        } catch (err) {
            setValidationError('Connection failed. Could not validate key.');
        } finally {
            setIsValidating(false);
        }
    };

    const handleRemoveProvider = (providerId) => {
        const p = PROVIDERS.find(x => x.id === providerId);
        if (!p) return;
        localStorage.removeItem(p.storageKey);
        setKeyValues(prev => ({ ...prev, [providerId]: '' }));
        // If this was active, reset to gemini
        if (localStorage.getItem('aiProvider') === providerId) {
            localStorage.setItem('aiProvider', 'gemini');
        }
    };

    return createPortal(
        <div
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 99999, padding: 20,
            }}
        >
            <div style={{
                background: 'var(--color-sheet-bg)',
                border: '1px solid var(--color-border-strong)',
                borderRadius: 24, padding: '24px',
                width: '100%', maxWidth: 460,
                boxShadow: 'var(--color-elevation-lg)',
                animation: 'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative',
                maxHeight: '90vh',
                overflowY: 'auto',
            }}>
                {/* Close button */}
                <button onClick={onClose} style={{
                    position: 'absolute', top: 18, right: 18,
                    background: 'var(--color-surface-3)', border: 'none',
                    borderRadius: '50%', width: 32, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'var(--color-text-secondary)',
                    transition: 'all 0.2s ease', zIndex: 1,
                }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-border-base)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--color-surface-3)'}
                >
                    <X size={16} />
                </button>

                {/* Header */}
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
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-text-heading)', margin: 0 }}>
                            AI Provider
                        </h2>
                        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)', margin: '3px 0 0' }}>
                            Bring your own key for full AI-powered forecasts
                        </p>
                    </div>
                </div>

                {/* Active provider status banner */}
                {activeKeyExists && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', borderRadius: 12, marginBottom: 16,
                        background: `linear-gradient(135deg, ${activeProvider?.accentColor}15, ${activeProvider?.accentColor}08)`,
                        border: `1px solid ${activeProvider?.accentColor}30`,
                    }}>
                        <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: '#22c55e', boxShadow: '0 0 8px #22c55e',
                            flexShrink: 0, animation: 'pulse-ring 2s ease-out infinite',
                        }} />
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                            Active: {activeProvider?.company} {activeProvider?.name}
                        </span>
                        <span style={{
                            marginLeft: 'auto', fontSize: '0.65rem', fontFamily: 'monospace',
                            background: 'var(--color-surface-3)', padding: '2px 7px', borderRadius: 6,
                            color: 'var(--color-text-dim)', border: '1px solid var(--color-border-base)',
                        }}>
                            {activeProvider?.modelHint}
                        </span>
                    </div>
                )}

                {/* Provider picker */}
                <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Select Provider
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {PROVIDERS.map(p => (
                            <ProviderTab
                                key={p.id}
                                provider={p}
                                isSelected={selectedProviderId === p.id}
                                hasKey={!!(keyValues[p.id]?.trim())}
                                onClick={() => { setSelectedProviderId(p.id); setShowKey(false); setValidationError(''); }}
                            />
                        ))}
                    </div>
                </div>

                {/* Selected provider detail panel */}
                <div style={{
                    background: 'var(--color-surface-2)',
                    border: `1px solid ${selectedProvider.accentColor}28`,
                    borderRadius: 16, padding: '16px',
                    marginBottom: 16,
                    animation: 'fade-up 0.2s ease',
                    transition: 'border-color 0.2s',
                }}>
                    {/* Provider header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 10,
                            background: selectedProvider.gradient,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1rem', boxShadow: `0 3px 10px ${selectedProvider.accentColor}30`,
                        }}>
                            {selectedProvider.emoji}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-heading)' }}>
                                {selectedProvider.company} {selectedProvider.name}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', lineHeight: 1.3 }}>
                                {selectedProvider.description}
                            </div>
                        </div>
                        <span style={{
                            fontSize: '0.62rem', fontWeight: 700,
                            padding: '3px 8px', borderRadius: 100,
                            background: `${selectedProvider.badgeColor}18`,
                            color: selectedProvider.badgeColor,
                            border: `1px solid ${selectedProvider.badgeColor}30`,
                        }}>
                            {selectedProvider.badge}
                        </span>
                    </div>

                    {/* Key input */}
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                        API Key
                    </label>
                    <div style={{ position: 'relative', marginBottom: 10 }}>
                        <Key size={15} color="var(--color-text-muted)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        <input
                            type={showKey ? 'text' : 'password'}
                            value={currentKey}
                            onChange={(e) => handleKeyChange(e.target.value)}
                            placeholder={selectedProvider.placeholder}
                            style={{
                                width: '100%', background: 'var(--color-input-bg)',
                                border: `1px solid ${currentKey ? selectedProvider.accentColor + '44' : 'var(--color-border-base)'}`,
                                borderRadius: 11, padding: '11px 80px 11px 38px',
                                color: 'var(--color-text-primary)', fontSize: '0.88rem',
                                transition: 'all 0.2s ease', outline: 'none', boxSizing: 'border-box',
                                fontFamily: currentKey && !showKey ? 'monospace' : 'inherit',
                            }}
                            onFocus={e => e.currentTarget.style.borderColor = selectedProvider.accentColor}
                            onBlur={e => e.currentTarget.style.borderColor = currentKey ? selectedProvider.accentColor + '44' : 'var(--color-border-base)'}
                        />
                        <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 5, alignItems: 'center' }}>
                            <button
                                onClick={() => setShowKey(v => !v)}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--color-text-dim)', fontSize: '0.68rem', fontWeight: 600,
                                    padding: '3px 6px', borderRadius: 6,
                                }}
                            >
                                {showKey ? 'Hide' : 'Show'}
                            </button>
                            {currentKey && (
                                <button
                                    onClick={() => handleRemoveProvider(selectedProviderId)}
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: 'var(--color-no-go)', fontSize: '0.68rem', fontWeight: 600,
                                        padding: '3px 6px', borderRadius: 6, opacity: 0.7,
                                    }}
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Get key link */}
                    <a
                        href={selectedProvider.keyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: '0.72rem', color: selectedProvider.accentColor,
                            textDecoration: 'none', fontWeight: 600,
                            padding: '5px 10px', borderRadius: 8,
                            background: `${selectedProvider.accentColor}10`,
                            border: `1px solid ${selectedProvider.accentColor}25`,
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = `${selectedProvider.accentColor}20`}
                        onMouseLeave={e => e.currentTarget.style.background = `${selectedProvider.accentColor}10`}
                    >
                        Get key from {selectedProvider.keyLabel}
                        <ExternalLink size={11} />
                    </a>
                </div>

                {/* Feature note */}
                <div style={{
                    fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.5,
                    padding: '12px 14px', borderRadius: 10,
                    background: 'rgba(34, 197, 94, 0.08)',
                    border: '1px solid rgba(34, 197, 94, 0.25)',
                    marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start'
                }}>
                    <span style={{ fontSize: '1.2rem', marginTop: -2 }}>🔒</span>
                    <div>
                        <strong style={{ color: 'var(--color-text-heading)' }}>Privacy first:</strong> Your key is stored <strong>only</strong> in your browser and never sent to our servers.
                        <div style={{ marginTop: 6, color: 'var(--color-text-dim)', fontSize: '0.7rem' }}>
                            All providers include full tool calling (live site lookup, real-time weather, flyability analysis).
                        </div>
                    </div>
                </div>

                {/* Error message */}
                {validationError && (
                    <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: 8,
                        background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)',
                        padding: '10px 14px', borderRadius: 10, color: '#fca5a5',
                        fontSize: '0.78rem', marginBottom: 16, lineHeight: 1.4,
                        animation: 'shake 0.4s ease-in-out',
                    }}>
                        <AlertTriangle size={15} color="#fca5a5" style={{ flexShrink: 0, marginTop: 1 }} />
                        <span>{validationError}</span>
                    </div>
                )}

                {/* Save button */}
                <button
                    onClick={handleSave}
                    disabled={isValidating || !currentKey.trim()}
                    style={{
                        width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                        background: saved
                            ? 'var(--color-go)'
                            : (isValidating || !currentKey.trim())
                                ? 'var(--color-surface-4)'
                                : selectedProvider.gradient,
                        color: (isValidating || !currentKey.trim()) ? 'var(--color-text-dim)' : '#fff',
                        fontSize: '0.95rem', fontWeight: 700,
                        cursor: (isValidating || !currentKey.trim()) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.25s ease',
                        boxShadow: saved
                            ? '0 4px 16px rgba(16,185,129,0.35)'
                            : (isValidating || !currentKey.trim())
                                ? 'none'
                                : `0 4px 20px ${selectedProvider.accentColor}35`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        transform: saved ? 'scale(1.01)' : 'scale(1)',
                    }}
                >
                    {isValidating ? (
                        <><Loader2 size={16} style={{ animation: 'spin 1.5s linear infinite' }} /> Validating...</>
                    ) : saved ? (
                        <><Check size={18} /> Activated!</>
                    ) : (
                        <>Activate {selectedProvider.company} {selectedProvider.name} <ChevronRight size={16} /></>
                    )}
                </button>

                {!activeKeyExists && (
                    <button
                        onClick={onClose}
                        style={{
                            width: '100%', padding: '10px', borderRadius: 12, border: 'none',
                            background: 'transparent',
                            color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                            marginTop: 8,
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-primary)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                    >
                        Set up later
                    </button>
                )}
            </div>
        </div>,
        document.body
    );
}

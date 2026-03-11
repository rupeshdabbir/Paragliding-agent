import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, ShieldCheck, Key, ArrowRight, Wind, Map, Sun, MoveRight, Layers, CloudLightning } from 'lucide-react';
import { getAIProvider, hasActiveKey, PROVIDERS } from '../utils/aiHeaders.jsx';

function ProviderTab({ provider, isSelected, onClick }) {
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
                padding: '12px 8px',
                borderRadius: 14,
                border,
                background: bg,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s ease',
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
            <span style={{
                color: isSelected ? provider.accentColor : 'var(--color-text-dim)',
                filter: isSelected ? 'drop-shadow(0 0 4px currentColor)' : 'none',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                {provider.icon}
            </span>
            <span style={{
                fontSize: '0.75rem', fontWeight: 700,
                color: isSelected ? provider.accentColor : 'var(--color-text-dim)',
                transition: 'color 0.2s',
            }}>
                {provider.name}
            </span>
        </button>
    );
}

export default function OnboardingStepper({ onComplete }) {
    const [step, setStep] = useState(1);
    const [liabilityChecked, setLiabilityChecked] = useState(false);

    // Key state
    const [selectedProviderId, setSelectedProviderId] = useState('gemini');
    const [apiKey, setApiKey] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [validationError, setValidationError] = useState('');
    const [showKey, setShowKey] = useState(false);

    const selectedProvider = PROVIDERS.find(p => p.id === selectedProviderId);

    const handleSaveKey = async () => {
        const keyToSave = apiKey.trim();
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

            localStorage.setItem(selectedProvider.storageKey, keyToSave);
            localStorage.setItem('aiProvider', selectedProviderId);
            onComplete();
        } catch (err) {
            setValidationError('Connection failed. Could not validate key.');
            setIsValidating(false);
        }
    };

    return createPortal(
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--color-bg)',
            backgroundImage: 'radial-gradient(circle at 50% -20%, rgba(0,200,255,0.15), transparent 60%)',
            padding: 20
        }}>
            {/* Animated backdrop elements */}
            <div style={{ position: 'absolute', top: '10%', left: '10%', width: 300, height: 300, background: 'var(--color-sky)', filter: 'blur(120px)', opacity: 0.1, borderRadius: '50%', animation: 'float-gentle 8s infinite alternate' }} />
            <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: 250, height: 250, background: '#a855f7', filter: 'blur(100px)', opacity: 0.08, borderRadius: '50%', animation: 'float-gentle 6s infinite alternate-reverse' }} />

            <div style={{
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid var(--color-border-strong)',
                borderRadius: 28,
                width: '100%', maxWidth: 520,
                maxHeight: '90dvh',
                boxShadow: '0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative',
                animation: 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                {/* Progress bar (fixed border radius) */}
                <div style={{ display: 'flex', height: 4, background: 'var(--color-surface-3)', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }}>
                    <div style={{
                        width: `${(step / 3) * 100}%`,
                        background: 'var(--color-sky-gradient)',
                        transition: 'width 0.4s cubic-bezier(0.34, 1.06, 0.64, 1)'
                    }} />
                </div>

                <div style={{ padding: 'clamp(24px, 5vw, 40px) clamp(20px, 5vw, 32px)', overflowY: 'auto' }}>

                    {/* STEP 1: Intro */}
                    {step === 1 && (
                        <div style={{ animation: 'fade-in 0.4s ease' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                                <div style={{
                                    width: 80, height: 80, borderRadius: 24,
                                    background: 'var(--color-sky-gradient)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 12px 32px var(--color-sky-glow)',
                                    border: '1px solid rgba(255,255,255,0.2)'
                                }}>
                                    <Wind size={40} color="#fff" strokeWidth={2.5} />
                                </div>
                            </div>

                            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: 16, fontFamily: 'var(--font-heading)' }}>
                                Welcome to Sky<span style={{ color: 'var(--color-sky)' }}>Pilot</span>
                            </h1>

                            <p style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', textAlign: 'center', lineHeight: 1.6, marginBottom: 32 }}>
                                Your intelligent paragliding co-pilot. We use advanced LLMs and real-time models to analyze flyability.
                            </p>

                            <div style={{ display: 'grid', gap: 16, marginBottom: 36 }}>
                                {[
                                    { icon: <Map size={20} color="var(--color-sky)" />, title: 'Interactive Map', desc: 'Find sites and see flyability at a glance' },
                                    { icon: <CloudLightning size={20} color="#a855f7" />, title: 'AI Forecasts', desc: 'Deep-dive analysis on conditions and thermals' },
                                    { icon: <ShieldCheck size={20} color="#22c55e" />, title: 'Privacy First', desc: 'Your data and API keys stay on your device' }
                                ].map((feature, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: 16,
                                        background: 'var(--color-surface-2)', padding: 16, borderRadius: 16,
                                        border: '1px solid var(--color-border-subtle)'
                                    }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 12, background: 'var(--color-surface-3)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                        }}>
                                            {feature.icon}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{feature.title}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{feature.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button onClick={() => setStep(2)} style={{
                                width: '100%', padding: 16, borderRadius: 16, border: 'none',
                                background: 'white', color: '#000', fontSize: '1rem', fontWeight: 700,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                boxShadow: '0 4px 14px rgba(255,255,255,0.1)', transition: 'transform 0.2s'
                            }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                Get Started <MoveRight size={18} />
                            </button>
                        </div>
                    )}

                    {/* STEP 2: Disclaimer */}
                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fade-in 0.4s ease' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: 14,
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <ShieldCheck size={24} color="#f59e0b" />
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

                            <button
                                onClick={() => {
                                    localStorage.setItem('skypilot_disclaimer_accepted', 'true');
                                    setStep(3);
                                }}
                                disabled={!liabilityChecked}
                                style={{
                                    width: '100%', padding: '14px 0', borderRadius: 12,
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
                                I Understand & Accept <MoveRight size={18} />
                            </button>
                        </div>
                    )}

                    {/* STEP 3: BYOK */}
                    {step === 3 && (
                        <div style={{ animation: 'fade-in 0.4s ease' }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: 16, marginBottom: 20,
                                background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Key size={28} color="#22c55e" />
                            </div>

                            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text-heading)', marginBottom: 8 }}>
                                Bring Your Own Key
                            </h2>
                            <p style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
                                SkyPilot uses your personal AI API key to generate forecasts.
                            </p>

                            <div style={{
                                display: 'flex', gap: 12, alignItems: 'flex-start',
                                padding: '12px 16px', borderRadius: 12, marginBottom: 24,
                                background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)',
                            }}>
                                <ShieldCheck size={20} color="#22c55e" style={{ flexShrink: 0, marginTop: 2 }} />
                                <div>
                                    <strong style={{ color: '#22c55e', display: 'block', fontSize: '0.9rem', marginBottom: 4 }}>Privacy Guarantee</strong>
                                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', lineHeight: 1.4 }}>
                                        Your key is stored <strong>locally in your browser</strong> and is completely hidden from our servers via secure pass-through headers.
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                                {PROVIDERS.map(p => (
                                    <ProviderTab
                                        key={p.id}
                                        provider={p}
                                        isSelected={selectedProviderId === p.id}
                                        onClick={() => { setSelectedProviderId(p.id); setValidationError(''); }}
                                    />
                                ))}
                            </div>

                            <div style={{ position: 'relative', marginBottom: 12 }}>
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    value={apiKey}
                                    onChange={(e) => { setApiKey(e.target.value); setValidationError(''); }}
                                    placeholder={selectedProvider.placeholder}
                                    style={{
                                        width: '100%', background: 'var(--color-input-bg)',
                                        border: `1px solid ${apiKey ? selectedProvider.accentColor + '66' : 'var(--color-border-base)'}`,
                                        borderRadius: 14, padding: '16px 80px 16px 20px',
                                        color: 'var(--color-text-primary)', fontSize: '1rem',
                                        transition: 'all 0.2s ease', outline: 'none', boxSizing: 'border-box',
                                        fontFamily: apiKey && !showKey ? 'monospace' : 'inherit',
                                    }}
                                    onFocus={e => e.currentTarget.style.borderColor = selectedProvider.accentColor}
                                    onBlur={e => e.currentTarget.style.borderColor = apiKey ? selectedProvider.accentColor + '66' : 'var(--color-border-base)'}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveKey(); }}
                                />
                                <button
                                    onClick={() => setShowKey(v => !v)}
                                    style={{
                                        position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                                        background: 'var(--color-surface-3)', border: 'none', cursor: 'pointer',
                                        color: 'var(--color-text-primary)', fontSize: '0.75rem', fontWeight: 600,
                                        padding: '6px 12px', borderRadius: 8,
                                    }}
                                >
                                    {showKey ? 'Hide' : 'Show'}
                                </button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                <a href={selectedProvider.keyUrl} target="_blank" rel="noopener noreferrer" style={{
                                    fontSize: '0.85rem', color: selectedProvider.accentColor, textDecoration: 'none', fontWeight: 600
                                }}>
                                    Get key from {selectedProvider.keyLabel} ↗
                                </a>
                            </div>

                            {validationError && (
                                <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: 16, padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 10 }}>
                                    {validationError}
                                </div>
                            )}

                            <button onClick={handleSaveKey} disabled={isValidating || !apiKey.trim()} style={{
                                width: '100%', padding: 16, borderRadius: 16, border: 'none',
                                background: (isValidating || !apiKey.trim()) ? 'var(--color-surface-4)' : selectedProvider.gradient,
                                color: (isValidating || !apiKey.trim()) ? 'var(--color-text-dim)' : '#fff',
                                fontSize: '1rem', fontWeight: 700,
                                cursor: (isValidating || !apiKey.trim()) ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                boxShadow: (isValidating || !apiKey.trim()) ? 'none' : `0 8px 24px ${selectedProvider.accentColor}40`
                            }}>
                                {isValidating ? 'Validating...' : 'Activate & Launch'}
                            </button>

                            <button onClick={onComplete} style={{
                                width: '100%', padding: 12, marginTop: 12, background: 'transparent', border: 'none',
                                color: 'var(--color-text-muted)', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600
                            }}>
                                Skip for now
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

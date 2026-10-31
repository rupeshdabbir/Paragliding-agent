import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, Key, Wind, Map, MoveRight, CloudLightning, Cpu, Zap } from 'lucide-react';
import { getAIModel, setAIProviderAndModel, PROVIDERS, PROVIDER_MODELS } from '../utils/aiHeaders.jsx';
import { detectWebAiCapabilities } from '../services/webAiCapabilities.js';

const CLOUD_PROVIDERS = PROVIDERS.filter(p => p.id !== 'webai');

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
                padding: '10px 6px',
                borderRadius: 12,
                border,
                background: bg,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.2s ease',
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
                fontSize: '0.72rem', fontWeight: 700,
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

    // Step 3 state: 'webai' | 'cloud'
    const [aiMode, setAiMode] = useState('webai');
    const [capabilities, setCapabilities] = useState(null);
    const [selectedWebAiModel, setSelectedWebAiModel] = useState('Qwen2.5-3B-Instruct-q4f16_1-MLC');

    // Cloud BYOK state
    const [selectedProviderId, setSelectedProviderId] = useState('gemini');
    const [selectedCloudModel, setSelectedCloudModel] = useState('gemini-3.7-flash');
    const [apiKey, setApiKey] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [validationError, setValidationError] = useState('');
    const [showKey, setShowKey] = useState(false);

    useEffect(() => {
        detectWebAiCapabilities().then(caps => {
            setCapabilities(caps);
            if (caps?.recommendedModelId) {
                setSelectedWebAiModel(caps.recommendedModelId);
            }
            if (!caps?.anySupported) {
                setAiMode('cloud');
            }
        });
    }, []);

    const selectedProvider = CLOUD_PROVIDERS.find(p => p.id === selectedProviderId) || CLOUD_PROVIDERS[0];
    const cloudModels = PROVIDER_MODELS[selectedProviderId] || [];
    const webAiModels = PROVIDER_MODELS.webai || [];

    const handleActivateWebAI = () => {
        setAIProviderAndModel('webai', selectedWebAiModel);
        onComplete();
    };

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
                body: JSON.stringify({
                    provider: selectedProviderId,
                    apiKey: keyToSave,
                    model: selectedCloudModel,
                })
            });
            const data = await res.json();

            if (!data.valid) {
                setValidationError(data.error || 'Invalid API key');
                setIsValidating(false);
                return;
            }

            localStorage.setItem(selectedProvider.storageKey, keyToSave);
            setAIProviderAndModel(selectedProviderId, selectedCloudModel || getAIModel(selectedProviderId));
            onComplete();
        } catch {
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
            <div style={{ position: 'absolute', top: '10%', left: '10%', width: 300, height: 300, background: 'var(--color-sky)', filter: 'blur(120px)', opacity: 0.1, borderRadius: '50%', animation: 'float-gentle 8s infinite alternate' }} />
            <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: 250, height: 250, background: '#a855f7', filter: 'blur(100px)', opacity: 0.08, borderRadius: '50%', animation: 'float-gentle 6s infinite alternate-reverse' }} />

            <div style={{
                background: 'rgba(15, 23, 42, 0.72)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid var(--color-border-strong)',
                borderRadius: 28,
                width: '100%', maxWidth: 530,
                maxHeight: '90dvh',
                boxShadow: '0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative',
                animation: 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                <div style={{ display: 'flex', height: 4, background: 'var(--color-surface-3)', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }}>
                    <div style={{
                        width: `${(step / 3) * 100}%`,
                        background: 'var(--color-sky-gradient)',
                        transition: 'width 0.4s cubic-bezier(0.34, 1.06, 0.64, 1)'
                    }} />
                </div>

                <div style={{ padding: 'clamp(22px, 4vw, 34px) clamp(18px, 4vw, 30px)', overflowY: 'auto' }}>

                    {/* STEP 1: Intro */}
                    {step === 1 && (
                        <div style={{ animation: 'fade-in 0.4s ease' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
                                <div style={{
                                    width: 76, height: 76, borderRadius: 24,
                                    background: 'var(--color-sky-gradient)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 12px 32px var(--color-sky-glow)',
                                    border: '1px solid rgba(255,255,255,0.2)'
                                }}>
                                    <Wind size={38} color="#fff" strokeWidth={2.5} />
                                </div>
                            </div>

                            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: 14, fontFamily: 'var(--font-heading)' }}>
                                Welcome to Sky<span style={{ color: 'var(--color-sky)' }}>Pilot</span>
                            </h1>

                            <p style={{ fontSize: '0.96rem', color: 'var(--color-text-secondary)', textAlign: 'center', lineHeight: 1.6, marginBottom: 28 }}>
                                Your intelligent paragliding co-pilot. Run free on-device open-source AI in your browser or connect your favorite cloud model.
                            </p>

                            <div style={{ display: 'grid', gap: 14, marginBottom: 32 }}>
                                {[
                                    { icon: <Map size={20} color="var(--color-sky)" />, title: 'Interactive Map & Launch Sites', desc: 'Discover launches worldwide with live flyability verdicts' },
                                    { icon: <CloudLightning size={20} color="#a855f7" />, title: 'Next-Gen AI Forecasts', desc: 'Powered by Gemini 3.7 Flash, 3.5 Flash-Lite, or free local WebAI' },
                                    { icon: <ShieldCheck size={20} color="#22c55e" />, title: '100% Private & Local Ready', desc: 'Use zero-key browser AI or store your own cloud API key locally' }
                                ].map((feature, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: 14,
                                        background: 'var(--color-surface-2)', padding: 14, borderRadius: 16,
                                        border: '1px solid var(--color-border-subtle)'
                                    }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 12, background: 'var(--color-surface-3)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                        }}>
                                            {feature.icon}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{feature.title}</div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{feature.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button onClick={() => setStep(2)} style={{
                                width: '100%', padding: 16, borderRadius: 16, border: 'none',
                                background: 'white', color: '#000', fontSize: '1rem', fontWeight: 700,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            }}>
                                Get Started <MoveRight size={18} />
                            </button>
                        </div>
                    )}

                    {/* STEP 2: Disclaimer */}
                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, animation: 'fade-in 0.4s ease' }}>
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
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-heading)', margin: 0 }}>
                                        Educational Purposes Only
                                    </h2>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                                        Please read carefully before using SkyPilot
                                    </div>
                                </div>
                            </div>

                            <div style={{ fontSize: '0.92rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                                <p style={{ margin: '0 0 14px 0' }}>
                                    SkyPilot relies on algorithmic weather models and AI reasoning which <strong>can and will be wrong.</strong> Airflow near terrain is highly complex and micro-meteorological factors are often missed by these models.
                                </p>
                                <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <li>This tool does not replace proper flight instruction, local site orientations, or your own piloting judgment.</li>
                                    <li>You must always <strong>do your own homework</strong>—check live weather sensors, wind-socks, and consult with local pilots before launching.</li>
                                    <li>The developers of SkyPilot are <strong>not liable</strong> for any injury, loss, or damages resulting from the use of this application.</li>
                                </ul>
                            </div>

                            <label style={{
                                display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer',
                                background: 'var(--color-surface-2)', padding: '15px', borderRadius: 12,
                                border: liabilityChecked ? '1px solid var(--color-go)' : '1px solid var(--color-border-base)',
                            }}>
                                <input
                                    type="checkbox"
                                    checked={liabilityChecked}
                                    onChange={(e) => setLiabilityChecked(e.target.checked)}
                                    style={{ marginTop: 2, transform: 'scale(1.2)', accentColor: 'var(--color-go)', cursor: 'pointer' }}
                                />
                                <div style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
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
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                                }}
                            >
                                I Understand & Accept <MoveRight size={18} />
                            </button>
                        </div>
                    )}

                    {/* STEP 3: Choose Free On-Device AI or Cloud API Key */}
                    {step === 3 && (
                        <div style={{ animation: 'fade-in 0.4s ease' }}>
                            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-text-heading)', marginBottom: 6, marginTop: 0 }}>
                                Choose Your AI Engine
                            </h2>
                            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 16, lineHeight: 1.45 }}>
                                Run open-source models 100% free in your browser or connect your own Cloud API key.
                            </p>

                            {/* Switcher */}
                            <div style={{
                                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
                                background: 'var(--color-surface-2)', padding: 5, borderRadius: 14,
                                border: '1px solid var(--color-border-subtle)', marginBottom: 16,
                            }}>
                                <button
                                    onClick={() => { setAiMode('webai'); setValidationError(''); }}
                                    style={{
                                        padding: '10px', borderRadius: 10, border: 'none',
                                        background: aiMode === 'webai'
                                            ? 'linear-gradient(135deg, rgba(16,185,129,0.22), rgba(5,150,105,0.12))'
                                            : 'transparent',
                                        color: aiMode === 'webai' ? '#10b981' : 'var(--color-text-dim)',
                                        fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    }}
                                >
                                    <Cpu size={14} /> Free On-Device AI
                                </button>
                                <button
                                    onClick={() => { setAiMode('cloud'); setValidationError(''); }}
                                    style={{
                                        padding: '10px', borderRadius: 10, border: 'none',
                                        background: aiMode === 'cloud'
                                            ? 'linear-gradient(135deg, rgba(66,133,244,0.22), rgba(14,165,233,0.12))'
                                            : 'transparent',
                                        color: aiMode === 'cloud' ? 'var(--color-sky)' : 'var(--color-text-dim)',
                                        fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    }}
                                >
                                    <Key size={14} /> Cloud API Key
                                </button>
                            </div>

                            {aiMode === 'webai' ? (
                                <div>
                                    <div style={{
                                        padding: '10px 12px', borderRadius: 12, marginBottom: 12,
                                        background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)',
                                        fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.4,
                                        display: 'flex', alignItems: 'flex-start', gap: 8,
                                    }}>
                                        <Zap size={15} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                                        <div>
                                            <strong style={{ color: '#10b981' }}>Zero API key required:</strong>{' '}
                                            {capabilities?.recommendationReason || 'Runs privately inside your browser via WebGPU or Chrome Built-in Gemini Nano.'}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 18 }}>
                                        {webAiModels.slice(0, 3).map(m => {
                                            const isSelected = selectedWebAiModel === m.id;
                                            const isRec = capabilities?.recommendedModelId === m.id;
                                            return (
                                                <div
                                                    key={m.id}
                                                    onClick={() => setSelectedWebAiModel(m.id)}
                                                    style={{
                                                        padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                                                        background: isSelected ? 'rgba(16,185,129,0.14)' : 'var(--color-surface-2)',
                                                        border: isSelected ? '1.5px solid #10b981' : '1px solid var(--color-border-subtle)',
                                                        display: 'flex', alignItems: 'center', gap: 8,
                                                    }}
                                                >
                                                    <div style={{
                                                        width: 14, height: 14, borderRadius: '50%',
                                                        border: isSelected ? '4.5px solid #10b981' : '1.5px solid var(--color-text-dim)',
                                                        flexShrink: 0, boxSizing: 'border-box',
                                                    }} />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-heading)' }}>
                                                                {m.name}
                                                            </span>
                                                            {isRec && (
                                                                <span style={{
                                                                    fontSize: '0.58rem', fontWeight: 800, padding: '1px 6px', borderRadius: 99,
                                                                    background: 'rgba(16,185,129,0.2)', color: '#10b981',
                                                                }}>
                                                                    ★ Recommended
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)' }}>
                                                            {m.description}
                                                        </div>
                                                    </div>
                                                    <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>
                                                        {m.downloadSize}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={handleActivateWebAI}
                                        style={{
                                            width: '100%', padding: 15, borderRadius: 14, border: 'none',
                                            background: 'linear-gradient(135deg, #10b981, #059669)',
                                            color: '#fff', fontSize: '0.96rem', fontWeight: 700, cursor: 'pointer',
                                            boxShadow: '0 8px 24px rgba(16,185,129,0.35)',
                                        }}
                                    >
                                        Launch with Free On-Device AI
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                        {CLOUD_PROVIDERS.map(p => (
                                            <ProviderTab
                                                key={p.id}
                                                provider={p}
                                                isSelected={selectedProviderId === p.id}
                                                onClick={() => {
                                                    setSelectedProviderId(p.id);
                                                    setSelectedCloudModel((PROVIDER_MODELS[p.id]?.[0]?.id) || '');
                                                    setValidationError('');
                                                }}
                                            />
                                        ))}
                                    </div>

                                    {cloudModels.length > 0 && (
                                        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                                            {cloudModels.map(m => {
                                                const active = selectedCloudModel === m.id;
                                                return (
                                                    <button
                                                        key={m.id}
                                                        onClick={() => setSelectedCloudModel(m.id)}
                                                        style={{
                                                            flex: 1, minWidth: 120, padding: '7px 10px', borderRadius: 10,
                                                            cursor: 'pointer', fontSize: '0.73rem', fontWeight: 700,
                                                            background: active ? `${selectedProvider.accentColor}22` : 'var(--color-surface-2)',
                                                            border: active ? `1.5px solid ${selectedProvider.accentColor}` : '1px solid var(--color-border-subtle)',
                                                            color: active ? selectedProvider.accentColor : 'var(--color-text-secondary)',
                                                        }}
                                                    >
                                                        {m.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div style={{ position: 'relative', marginBottom: 10 }}>
                                        <input
                                            type={showKey ? 'text' : 'password'}
                                            value={apiKey}
                                            onChange={(e) => { setApiKey(e.target.value); setValidationError(''); }}
                                            placeholder={selectedProvider.placeholder}
                                            style={{
                                                width: '100%', background: 'var(--color-input-bg)',
                                                border: `1px solid ${apiKey ? selectedProvider.accentColor + '66' : 'var(--color-border-base)'}`,
                                                borderRadius: 14, padding: '14px 80px 14px 16px',
                                                color: 'var(--color-text-primary)', fontSize: '0.95rem',
                                                outline: 'none', boxSizing: 'border-box',
                                                fontFamily: apiKey && !showKey ? 'monospace' : 'inherit',
                                            }}
                                            onKeyDown={e => { if (e.key === 'Enter') handleSaveKey(); }}
                                        />
                                        <button
                                            onClick={() => setShowKey(v => !v)}
                                            style={{
                                                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                                background: 'var(--color-surface-3)', border: 'none', cursor: 'pointer',
                                                color: 'var(--color-text-primary)', fontSize: '0.72rem', fontWeight: 600,
                                                padding: '5px 10px', borderRadius: 8,
                                            }}
                                        >
                                            {showKey ? 'Hide' : 'Show'}
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <a href={selectedProvider.keyUrl} target="_blank" rel="noopener noreferrer" style={{
                                            fontSize: '0.8rem', color: selectedProvider.accentColor, textDecoration: 'none', fontWeight: 600
                                        }}>
                                            Get key from {selectedProvider.keyLabel} ↗
                                        </a>
                                    </div>

                                    {validationError && (
                                        <div style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: 14, padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 10 }}>
                                            {validationError}
                                        </div>
                                    )}

                                    <button onClick={handleSaveKey} disabled={isValidating || !apiKey.trim()} style={{
                                        width: '100%', padding: 15, borderRadius: 14, border: 'none',
                                        background: (isValidating || !apiKey.trim()) ? 'var(--color-surface-4)' : selectedProvider.gradient,
                                        color: (isValidating || !apiKey.trim()) ? 'var(--color-text-dim)' : '#fff',
                                        fontSize: '0.96rem', fontWeight: 700,
                                        cursor: (isValidating || !apiKey.trim()) ? 'not-allowed' : 'pointer',
                                    }}>
                                        {isValidating ? 'Validating...' : 'Activate & Launch'}
                                    </button>
                                </div>
                            )}

                            <button onClick={onComplete} style={{
                                width: '100%', padding: 10, marginTop: 10, background: 'transparent', border: 'none',
                                color: 'var(--color-text-muted)', fontSize: '0.86rem', cursor: 'pointer', fontWeight: 600
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

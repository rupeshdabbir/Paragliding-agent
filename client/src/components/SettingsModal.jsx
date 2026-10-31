import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    X, Key, ExternalLink, Sparkles, Check, ChevronRight,
    Loader2, AlertTriangle, Cpu, Trash2, HardDrive, Zap
} from 'lucide-react';
import {
    getAIProvider, getAIModel, setAIProviderAndModel,
    hasActiveKey, PROVIDERS, PROVIDER_MODELS, getModelMeta
} from '../utils/aiHeaders.jsx';
import { detectWebAiCapabilities } from '../services/webAiCapabilities.js';
import { subscribeWebAiState, ensureModelLoaded, deleteCachedModel } from '../services/webAiEngine.js';

const CLOUD_PROVIDERS = PROVIDERS.filter(p => p.id !== 'webai');
const WEBAI_PROVIDER = PROVIDERS.find(p => p.id === 'webai');

function ProviderTab({ provider, isSelected, hasKey, onClick }) {
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
            {hasKey && (
                <div style={{
                    position: 'absolute', top: 6, right: 6,
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#22c55e',
                    boxShadow: '0 0 6px #22c55e',
                }} />
            )}
            <span style={{
                color: isSelected ? provider.accentColor : 'var(--color-text-dim)',
                filter: isSelected ? 'drop-shadow(0 0 4px currentColor)' : 'none',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                {provider.icon}
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
    const [mode, setMode] = useState('cloud'); // 'webai' | 'cloud'
    const [selectedProviderId, setSelectedProviderId] = useState('gemini');
    const [selectedModels, setSelectedModels] = useState({});
    const [keyValues, setKeyValues] = useState({});
    const [saved, setSaved] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [validationError, setValidationError] = useState('');

    // WebAI hardware capabilities & engine state
    const [capabilities, setCapabilities] = useState(null);
    const [webAiState, setWebAiState] = useState({ status: 'idle', progress: 0, progressText: '', error: null });
    const [deletingModelId, setDeletingModelId] = useState(null);

    useEffect(() => {
        const unsub = subscribeWebAiState(setWebAiState);
        return unsub;
    }, []);

    useEffect(() => {
        if (open) {
            const currentProvider = getAIProvider();
            if (currentProvider === 'webai') {
                setMode('webai');
                setSelectedProviderId('gemini');
            } else {
                setMode('cloud');
                setSelectedProviderId(currentProvider || 'gemini');
            }
            setSaved(false);
            setShowKey(false);
            setValidationError('');

            const loadedKeys = {};
            const loadedModels = {};
            PROVIDERS.forEach(p => {
                if (p.storageKey) {
                    loadedKeys[p.id] = localStorage.getItem(p.storageKey) || '';
                }
                loadedModels[p.id] = getAIModel(p.id);
            });
            setKeyValues(loadedKeys);
            setSelectedModels(loadedModels);

            detectWebAiCapabilities({ forceRefresh: true }).then(caps => {
                setCapabilities(caps);
                // If user hasn't explicitly chosen a webai model yet, preselect the hardware-recommended model
                if (!localStorage.getItem('webaiModel') && caps?.recommendedModelId) {
                    setSelectedModels(prev => ({ ...prev, webai: caps.recommendedModelId }));
                }
            });
        }
    }, [open]);

    if (!open) return null;

    const effectiveProviderId = mode === 'webai' ? 'webai' : selectedProviderId;
    const selectedProvider = PROVIDERS.find(p => p.id === effectiveProviderId) || CLOUD_PROVIDERS[0];
    const activeProviderId = getAIProvider();
    const activeProvider = PROVIDERS.find(p => p.id === activeProviderId);
    const activeModelMeta = getModelMeta(activeProviderId, getAIModel(activeProviderId));
    const currentKey = keyValues[selectedProviderId] || '';
    const activeKeyExists = hasActiveKey();
    const currentSelectedModelId = selectedModels[effectiveProviderId] || getAIModel(effectiveProviderId);

    const handleKeyChange = (val) => {
        setKeyValues(prev => ({ ...prev, [selectedProviderId]: val }));
        setValidationError('');
    };

    const handleModelSelect = (providerId, modelId) => {
        setSelectedModels(prev => ({ ...prev, [providerId]: modelId }));
        setValidationError('');
    };

    const handleActivateWebAI = async () => {
        const modelToUse = selectedModels.webai || capabilities?.recommendedModelId || 'Qwen2.5-3B-Instruct-q4f16_1-MLC';
        setValidationError('');
        setIsValidating(true);

        try {
            // Save WebAI selection immediately so the app switches to local inference
            setAIProviderAndModel('webai', modelToUse);

            // Start loading/warming the model in the background or verify readiness
            ensureModelLoaded(modelToUse).catch(() => {
                // Progress and errors are surfaced via subscribeWebAiState
            });

            setSaved(true);
            setTimeout(() => {
                setSaved(false);
                onClose();
            }, 1100);
        } catch (err) {
            setValidationError(err.message || 'Could not initialize WebAI model.');
        } finally {
            setIsValidating(false);
        }
    };

    const handleDeleteCachedModel = async (e, modelId) => {
        e.stopPropagation();
        setDeletingModelId(modelId);
        try {
            const updatedCaps = await deleteCachedModel(modelId);
            setCapabilities(updatedCaps);
        } finally {
            setDeletingModelId(null);
        }
    };

    const handleSaveCloudKey = async () => {
        const keyToSave = currentKey.trim();
        const modelToSave = selectedModels[selectedProviderId] || getAIModel(selectedProviderId);

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
                    model: modelToSave,
                })
            });
            const data = await res.json();

            if (!data.valid) {
                setValidationError(data.error || 'Invalid API key');
                setIsValidating(false);
                return;
            }

            localStorage.setItem(selectedProvider.storageKey, keyToSave);
            setAIProviderAndModel(selectedProviderId, modelToSave);
            setSaved(true);
            setTimeout(() => {
                setSaved(false);
                onClose();
            }, 1200);
        } catch {
            setValidationError('Connection failed. Could not validate key.');
        } finally {
            setIsValidating(false);
        }
    };

    const handleRemoveProvider = (providerId) => {
        const p = PROVIDERS.find(x => x.id === providerId);
        if (!p || !p.storageKey) return;
        localStorage.removeItem(p.storageKey);
        setKeyValues(prev => ({ ...prev, [providerId]: '' }));
        if (localStorage.getItem('aiProvider') === providerId) {
            setAIProviderAndModel('gemini', getAIModel('gemini'));
        }
    };

    const webAiModels = PROVIDER_MODELS.webai || [];
    const cloudModels = PROVIDER_MODELS[selectedProviderId] || [];

    return createPortal(
        <div
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0, 0, 0, 0.72)', backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 99999, padding: 20,
            }}
        >
            <div style={{
                background: 'var(--color-sheet-bg)',
                border: '1px solid var(--color-border-strong)',
                borderRadius: 24, padding: '24px',
                width: '100%', maxWidth: 510,
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: mode === 'webai'
                            ? 'linear-gradient(135deg, #10b981, #059669)'
                            : 'var(--color-sky-gradient)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: mode === 'webai'
                            ? '0 4px 16px rgba(16,185,129,0.28)'
                            : '0 4px 16px rgba(0,200,255,0.25)',
                        transition: 'all 0.25s ease',
                    }}>
                        {mode === 'webai' ? <Cpu size={22} color="#fff" /> : <Sparkles size={22} color="#fff" />}
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.18rem', fontWeight: 800, color: 'var(--color-text-heading)', margin: 0 }}>
                            AI Model Studio
                        </h2>
                        <p style={{ fontSize: '0.76rem', color: 'var(--color-text-dim)', margin: '2px 0 0' }}>
                            Choose free on-device WebAI or bring your own Cloud API key
                        </p>
                    </div>
                </div>

                {/* Active provider status banner */}
                {activeKeyExists && activeProvider && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 13px', borderRadius: 12, marginBottom: 14,
                        background: `linear-gradient(135deg, ${activeProvider.accentColor}15, ${activeProvider.accentColor}08)`,
                        border: `1px solid ${activeProvider.accentColor}30`,
                    }}>
                        <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: '#22c55e', boxShadow: '0 0 8px #22c55e',
                            flexShrink: 0,
                        }} />
                        <span style={{ fontSize: '0.76rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                            Active: {activeProvider.company} {activeProvider.name}
                        </span>
                        <span style={{
                            marginLeft: 'auto', fontSize: '0.65rem', fontFamily: 'monospace',
                            background: 'var(--color-surface-3)', padding: '2px 8px', borderRadius: 6,
                            color: 'var(--color-text-dim)', border: '1px solid var(--color-border-base)',
                        }}>
                            {activeModelMeta?.name || getAIModel(activeProviderId)}
                        </span>
                    </div>
                )}

                {/* Top Segmented Switcher: Free On-Device AI vs Cloud API Keys */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
                    background: 'var(--color-surface-2)',
                    padding: 5, borderRadius: 14,
                    border: '1px solid var(--color-border-subtle)',
                    marginBottom: 16,
                }}>
                    <button
                        onClick={() => { setMode('webai'); setValidationError(''); }}
                        style={{
                            padding: '10px 12px', borderRadius: 10, border: 'none',
                            background: mode === 'webai'
                                ? 'linear-gradient(135deg, rgba(16,185,129,0.22), rgba(5,150,105,0.12))'
                                : 'transparent',
                            color: mode === 'webai' ? '#10b981' : 'var(--color-text-dim)',
                            fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            boxShadow: mode === 'webai' ? 'inset 0 0 0 1px rgba(16,185,129,0.35)' : 'none',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <Cpu size={14} />
                        Free On-Device (WebAI)
                    </button>
                    <button
                        onClick={() => { setMode('cloud'); setValidationError(''); }}
                        style={{
                            padding: '10px 12px', borderRadius: 10, border: 'none',
                            background: mode === 'cloud'
                                ? 'linear-gradient(135deg, rgba(66,133,244,0.22), rgba(14,165,233,0.12))'
                                : 'transparent',
                            color: mode === 'cloud' ? 'var(--color-sky)' : 'var(--color-text-dim)',
                            fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            boxShadow: mode === 'cloud' ? 'inset 0 0 0 1px rgba(0,200,255,0.35)' : 'none',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <Key size={14} />
                        Cloud API Keys (BYOK)
                    </button>
                </div>

                {/* MODE 1: FREE ON-DEVICE WEBAI */}
                {mode === 'webai' && (
                    <div style={{ animation: 'fade-in 0.2s ease' }}>
                        {/* Hardware & Storage Diagnostic Banner */}
                        <div style={{
                            padding: '12px 14px', borderRadius: 14, marginBottom: 14,
                            background: 'var(--color-surface-2)',
                            border: '1px solid rgba(16, 185, 129, 0.28)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Zap size={13} /> Hardware Compatibility
                                </span>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <span style={{
                                        fontSize: '0.62rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                                        background: capabilities?.webGpuSupported ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                        color: capabilities?.webGpuSupported ? '#10b981' : '#f87171',
                                    }}>
                                        {capabilities?.webGpuSupported ? '✓ WebGPU Ready' : '✕ WebGPU Unavailable'}
                                    </span>
                                    <span style={{
                                        fontSize: '0.62rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                                        background: capabilities?.chromeBuiltInSupported ? 'rgba(59,130,246,0.15)' : 'var(--color-surface-3)',
                                        color: capabilities?.chromeBuiltInSupported ? '#60a5fa' : 'var(--color-text-dim)',
                                    }}>
                                        {capabilities?.chromeBuiltInStatus === 'available'
                                            ? '✓ Chrome Nano (0 MB)'
                                            : capabilities?.chromeBuiltInSupported
                                                ? '↓ Chrome Nano Downloadable'
                                                : 'Chrome Nano: Flag Needed'}
                                    </span>
                                </div>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                                {capabilities?.recommendationReason || 'Runs 100% locally in your browser with zero API keys or subscription costs.'}
                            </div>
                            {capabilities?.storageFreeMB > 0 && (
                                <div style={{
                                    marginTop: 6, fontSize: '0.65rem', color: 'var(--color-text-dim)',
                                    display: 'flex', alignItems: 'center', gap: 5
                                }}>
                                    <HardDrive size={11} />
                                    Browser cache space available: ~{(capabilities.storageFreeMB / 1024).toFixed(1)} GB
                                </div>
                            )}
                        </div>

                        {/* Live WebAI Download / Loading Progress Bar */}
                        {webAiState.status === 'loading' && (
                            <div style={{
                                padding: '12px 14px', borderRadius: 12, marginBottom: 14,
                                background: 'rgba(16, 185, 129, 0.08)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: '#10b981', marginBottom: 6 }}>
                                    <span>Downloading / Warming Model...</span>
                                    <span>{Math.round((webAiState.progress || 0) * 100)}%</span>
                                </div>
                                <div style={{ height: 6, borderRadius: 99, background: 'var(--color-surface-3)', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${Math.max(4, Math.round((webAiState.progress || 0) * 100))}%`,
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #10b981, #34d399)',
                                        transition: 'width 0.3s ease',
                                    }} />
                                </div>
                                <div style={{ fontSize: '0.66rem', color: 'var(--color-text-dim)', marginTop: 6 }}>
                                    {webAiState.progressText}
                                </div>
                            </div>
                        )}

                        {/* Open-Source & Built-in Model Cards */}
                        <div style={{ marginBottom: 14 }}>
                            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Select Local Model
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {webAiModels.map(m => {
                                    const isSelected = currentSelectedModelId === m.id;
                                    const isRecommended = capabilities?.recommendedModelId === m.id;
                                    const isCached = capabilities?.cachedModels?.[m.id];

                                    return (
                                        <div
                                            key={m.id}
                                            onClick={() => handleModelSelect('webai', m.id)}
                                            style={{
                                                padding: '11px 13px',
                                                borderRadius: 13,
                                                cursor: 'pointer',
                                                background: isSelected
                                                    ? 'linear-gradient(135deg, rgba(16,185,129,0.16), rgba(16,185,129,0.05))'
                                                    : 'var(--color-surface-2)',
                                                border: isSelected
                                                    ? '1.5px solid #10b981'
                                                    : '1px solid var(--color-border-subtle)',
                                                transition: 'all 0.18s ease',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 4,
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                                                <div style={{
                                                    width: 15, height: 15, borderRadius: '50%',
                                                    border: isSelected ? '4.5px solid #10b981' : '1.5px solid var(--color-text-dim)',
                                                    flexShrink: 0, boxSizing: 'border-box',
                                                }} />
                                                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--color-text-heading)' }}>
                                                    {m.name}
                                                </span>

                                                {isRecommended && (
                                                    <span style={{
                                                        fontSize: '0.6rem', fontWeight: 800, padding: '2px 7px', borderRadius: 99,
                                                        background: 'rgba(16, 185, 129, 0.2)', color: '#10b981',
                                                        border: '1px solid rgba(16, 185, 129, 0.35)',
                                                    }}>
                                                        ★ Recommended
                                                    </span>
                                                )}

                                                {isCached && (
                                                    <span style={{
                                                        fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                                                        background: 'rgba(34, 197, 94, 0.14)', color: '#22c55e',
                                                    }}>
                                                        ✓ Cached
                                                    </span>
                                                )}

                                                <span style={{
                                                    marginLeft: 'auto', fontSize: '0.64rem', fontFamily: 'monospace',
                                                    padding: '2px 7px', borderRadius: 6,
                                                    background: 'var(--color-surface-3)', color: 'var(--color-text-secondary)',
                                                }}>
                                                    {m.downloadSize}
                                                </span>

                                                {isCached && m.id !== 'chrome-built-in' && (
                                                    <button
                                                        onClick={(e) => handleDeleteCachedModel(e, m.id)}
                                                        disabled={deletingModelId === m.id}
                                                        title="Delete cached model weights from browser storage"
                                                        style={{
                                                            background: 'rgba(239, 68, 68, 0.12)',
                                                            border: '1px solid rgba(239, 68, 68, 0.25)',
                                                            borderRadius: 6, padding: '3px 6px',
                                                            color: '#f87171', cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', gap: 3,
                                                            fontSize: '0.6rem', fontWeight: 600,
                                                        }}
                                                    >
                                                        <Trash2 size={10} />
                                                        {deletingModelId === m.id ? '...' : 'Free'}
                                                    </button>
                                                )}
                                            </div>

                                            <div style={{ paddingLeft: 22, fontSize: '0.72rem', color: 'var(--color-text-dim)', lineHeight: 1.35 }}>
                                                {m.description}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {validationError && (
                            <div style={{
                                display: 'flex', alignItems: 'flex-start', gap: 8,
                                background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)',
                                padding: '10px 14px', borderRadius: 10, color: '#fca5a5',
                                fontSize: '0.78rem', marginBottom: 14,
                            }}>
                                <AlertTriangle size={15} color="#fca5a5" style={{ flexShrink: 0, marginTop: 1 }} />
                                <span>{validationError}</span>
                            </div>
                        )}

                        <button
                            onClick={handleActivateWebAI}
                            disabled={isValidating}
                            style={{
                                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                                background: saved ? 'var(--color-go)' : WEBAI_PROVIDER.gradient,
                                color: '#fff', fontSize: '0.95rem', fontWeight: 700,
                                cursor: 'pointer', transition: 'all 0.25s ease',
                                boxShadow: '0 4px 18px rgba(16,185,129,0.32)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            }}
                        >
                            {saved ? (
                                <><Check size={18} /> On-Device AI Activated!</>
                            ) : (
                                <>Activate {getModelMeta('webai', currentSelectedModelId)?.name || 'On-Device WebAI'} <ChevronRight size={16} /></>
                            )}
                        </button>
                    </div>
                )}

                {/* MODE 2: CLOUD API KEYS (BYOK) */}
                {mode === 'cloud' && (
                    <div style={{ animation: 'fade-in 0.2s ease' }}>
                        {/* Cloud Provider Picker */}
                        <div style={{ marginBottom: 14 }}>
                            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Select Cloud Provider
                            </p>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {CLOUD_PROVIDERS.map(p => (
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

                        {/* Sub-Model Picker for Selected Cloud Provider */}
                        {cloudModels.length > 0 && (
                            <div style={{ marginBottom: 14 }}>
                                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Select {selectedProvider.name} Model
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                    {cloudModels.map(m => {
                                        const isModelSelected = currentSelectedModelId === m.id;
                                        return (
                                            <div
                                                key={m.id}
                                                onClick={() => handleModelSelect(selectedProviderId, m.id)}
                                                style={{
                                                    padding: '10px 12px',
                                                    borderRadius: 12,
                                                    cursor: 'pointer',
                                                    background: isModelSelected
                                                        ? `linear-gradient(135deg, ${selectedProvider.accentColor}20, ${selectedProvider.accentColor}08)`
                                                        : 'var(--color-surface-2)',
                                                    border: isModelSelected
                                                        ? `1.5px solid ${selectedProvider.accentColor}`
                                                        : '1px solid var(--color-border-subtle)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 9,
                                                    transition: 'all 0.18s ease',
                                                }}
                                            >
                                                <div style={{
                                                    width: 14, height: 14, borderRadius: '50%',
                                                    border: isModelSelected
                                                        ? `4.5px solid ${selectedProvider.accentColor}`
                                                        : '1.5px solid var(--color-text-dim)',
                                                    flexShrink: 0, boxSizing: 'border-box',
                                                }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-heading)' }}>
                                                            {m.name}
                                                        </span>
                                                        <span style={{
                                                            fontSize: '0.58rem', fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                                                            background: `${selectedProvider.accentColor}20`,
                                                            color: selectedProvider.accentColor,
                                                        }}>
                                                            {m.badge}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)', marginTop: 2 }}>
                                                        {m.description}
                                                    </div>
                                                </div>
                                                <span style={{
                                                    fontSize: '0.62rem', fontFamily: 'monospace',
                                                    color: 'var(--color-text-faint)', flexShrink: 0,
                                                }}>
                                                    {m.id}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Selected Provider API Key Input Panel */}
                        <div style={{
                            background: 'var(--color-surface-2)',
                            border: `1px solid ${selectedProvider.accentColor}28`,
                            borderRadius: 16, padding: '15px',
                            marginBottom: 14,
                        }}>
                            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                                {selectedProvider.company} API Key
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
                                }}
                            >
                                Get key from {selectedProvider.keyLabel}
                                <ExternalLink size={11} />
                            </a>
                        </div>

                        {validationError && (
                            <div style={{
                                display: 'flex', alignItems: 'flex-start', gap: 8,
                                background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)',
                                padding: '10px 14px', borderRadius: 10, color: '#fca5a5',
                                fontSize: '0.78rem', marginBottom: 14, lineHeight: 1.4,
                            }}>
                                <AlertTriangle size={15} color="#fca5a5" style={{ flexShrink: 0, marginTop: 1 }} />
                                <span>{validationError}</span>
                            </div>
                        )}

                        <button
                            onClick={handleSaveCloudKey}
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
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            }}
                        >
                            {isValidating ? (
                                <><Loader2 size={16} style={{ animation: 'spin 1.5s linear infinite' }} /> Validating...</>
                            ) : saved ? (
                                <><Check size={18} /> Activated!</>
                            ) : (
                                <>Activate {getModelMeta(selectedProviderId, currentSelectedModelId)?.name || selectedProvider.name} <ChevronRight size={16} /></>
                            )}
                        </button>
                    </div>
                )}

                {!activeKeyExists && (
                    <button
                        onClick={onClose}
                        style={{
                            width: '100%', padding: '10px', borderRadius: 12, border: 'none',
                            background: 'transparent',
                            color: 'var(--color-text-muted)', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer',
                            marginTop: 8,
                        }}
                    >
                        Set up later
                    </button>
                )}
            </div>
        </div>,
        document.body
    );
}

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, CheckCircle2 } from 'lucide-react';
import { usePilotProfile, PROFILE_OPTIONS, isProfileComplete, formatProfileSummary } from '../hooks/usePilotProfile.js';

// ── Pill chip selector ─────────────────────────────────────────────────────
function PillChip({ selected, onClick, emoji, label }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '8px 14px', borderRadius: 100,
                background: selected ? 'var(--color-sky-gradient)' : 'var(--color-surface-3)',
                border: `1.5px solid ${selected ? 'var(--color-border-glow)' : 'var(--color-border-base)'}`,
                color: selected ? '#fff' : 'var(--color-text-secondary)',
                fontSize: '0.82rem', fontWeight: selected ? 700 : 500,
                cursor: 'pointer', transition: 'all 0.2s ease',
                boxShadow: selected ? '0 4px 14px rgba(0,200,255,0.3)' : 'none',
                transform: selected ? 'translateY(-1px)' : 'none',
                whiteSpace: 'nowrap', flexShrink: 0,
            }}
        >
            <span style={{ fontSize: '1rem', lineHeight: 1 }}>{emoji}</span>
            {label}
            {selected && <CheckCircle2 size={13} style={{ opacity: 0.9 }} />}
        </button>
    );
}

function ProfileField({ label, options, value, onChange, multiple = false }) {
    return (
        <div style={{ marginBottom: 22 }}>
            <label style={{
                display: 'block', fontSize: '0.72rem', fontWeight: 700,
                color: 'var(--color-text-dim)', marginBottom: 10,
                letterSpacing: '0.08em', textTransform: 'uppercase'
            }}>
                {label}
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {options.map(opt => (
                    <PillChip
                        key={opt.value}
                        selected={multiple ? (Array.isArray(value) && value.includes(opt.value)) : value === opt.value}
                        onClick={() => {
                            if (multiple) {
                                const arr = Array.isArray(value) ? value : [];
                                if (arr.includes(opt.value)) {
                                    onChange(arr.filter(v => v !== opt.value));
                                } else {
                                    onChange([...arr, opt.value]);
                                }
                            } else {
                                onChange(opt.value);
                            }
                        }}
                        emoji={opt.emoji}
                        label={opt.label}
                    />
                ))}
            </div>
        </div>
    );
}

export default function PilotProfileModal({ open, onClose }) {
    const { profile, saveProfile } = usePilotProfile();
    const [localProfile, setLocalProfile] = useState({ ...profile });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (open) {
            setLocalProfile({ ...profile });
            setSaved(false);
        }
    }, [open, profile]);

    if (!open) return null;

    const profileComplete = isProfileComplete(localProfile);
    const profileSummary = profileComplete ? formatProfileSummary(localProfile) : null;
    const setPField = (field, val) => setLocalProfile(prev => ({ ...prev, [field]: val }));

    const handleSave = () => {
        const previousProfile = { ...profile };
        saveProfile(localProfile);
        setSaved(true);

        // Dispatch pilot-profile-saved event so SiteForecast can retrigger
        const profileChanged = JSON.stringify(previousProfile) !== JSON.stringify(localProfile);
        window.dispatchEvent(new CustomEvent('pilot-profile-saved', {
            detail: { profile: localProfile, changed: profileChanged && isProfileComplete(localProfile) }
        }));

        setTimeout(() => {
            setSaved(false);
            onClose();
        }, 1000);
    };

    const handleClear = () => {
        const empty = { certification: '', flyingStyle: [], wingType: '', experience: '' };
        setLocalProfile(empty);
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
                width: '100%', maxWidth: 500,
                boxShadow: 'var(--color-elevation-lg)',
                animation: 'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative',
                maxHeight: '90vh', overflowY: 'auto',
            }}>
                {/* Close */}
                <button onClick={onClose} style={{
                    position: 'absolute', top: 20, right: 20,
                    background: 'var(--color-surface-3)', border: 'none',
                    borderRadius: '50%', width: 32, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'var(--color-text-secondary)',
                    transition: 'all 0.2s ease', zIndex: 2,
                }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-border-base)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--color-surface-3)'}
                >
                    <X size={16} />
                </button>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 16,
                        background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 20px rgba(124,58,237,0.35)', flexShrink: 0,
                    }}>
                        <User size={24} color="#fff" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-heading)', margin: 0 }}>Pilot Profile</h2>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', margin: '4px 0 0', lineHeight: 1.4 }}>
                            Personalizes AI advice to your exact skill level
                        </p>
                    </div>
                </div>

                {/* Profile complete preview */}
                {profileSummary && (
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(79,70,229,0.08))',
                        border: '1px solid rgba(124,58,237,0.25)',
                        borderRadius: 12, padding: '11px 14px', marginBottom: 22,
                        display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                        <span style={{ fontSize: '1.3rem' }}>🧑‍✈️</span>
                        <div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#7c3aed', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>Active Profile</div>
                            <div style={{ fontSize: '0.88rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>{profileSummary}</div>
                        </div>
                    </div>
                )}

                {/* Profile fields */}
                <ProfileField
                    label="Certification"
                    options={PROFILE_OPTIONS.certification}
                    value={localProfile.certification}
                    onChange={val => setPField('certification', val)}
                />
                <ProfileField
                    label="Flying Style"
                    options={PROFILE_OPTIONS.flyingStyle}
                    value={localProfile.flyingStyle}
                    onChange={val => setPField('flyingStyle', val)}
                    multiple={true}
                />
                <ProfileField
                    label="Wing Type"
                    options={PROFILE_OPTIONS.wingType}
                    value={localProfile.wingType}
                    onChange={val => setPField('wingType', val)}
                />
                <ProfileField
                    label="Flight Hours"
                    options={PROFILE_OPTIONS.experience}
                    value={localProfile.experience}
                    onChange={val => setPField('experience', val)}
                />

                {!profileComplete && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)', marginBottom: 16, lineHeight: 1.5, textAlign: 'center' }}>
                        Complete all 4 fields to unlock skill-personalized AI forecasts.
                    </p>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                    <button
                        onClick={handleSave}
                        disabled={!profileComplete && !isProfileComplete(profile)}
                        style={{
                            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                            background: saved
                                ? 'var(--color-go)'
                                : profileComplete
                                    ? 'linear-gradient(135deg, #7c3aed, #4f46e5)'
                                    : 'var(--color-surface-3)',
                            color: profileComplete || saved ? '#fff' : 'var(--color-text-dim)',
                            fontSize: '0.95rem', fontWeight: 700,
                            cursor: profileComplete ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s ease',
                            boxShadow: saved ? '0 4px 16px rgba(16,185,129,0.3)' : profileComplete ? '0 4px 20px rgba(124,58,237,0.35)' : 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}
                    >
                        {saved ? '✓ Profile Saved' : 'Save Pilot Profile'}
                    </button>
                    {isProfileComplete(profile) && (
                        <button
                            onClick={handleClear}
                            style={{
                                width: '100%', padding: '10px', borderRadius: 12, border: 'none',
                                background: 'transparent',
                                color: 'var(--color-text-dim)', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = 'rgba(239,68,68,0.7)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-dim)'}
                        >
                            Clear Profile
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

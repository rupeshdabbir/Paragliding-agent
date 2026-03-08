import { useState, useRef, useEffect } from 'react';
import { Settings, Sun, Moon, Key, SlidersHorizontal, User } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import { isProfileComplete } from '../hooks/usePilotProfile.js';

export default function SettingsDropdown({ onOpenSettings }) {
    const { theme, toggleTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);
    const [hasProfile, setHasProfile] = useState(false);
    const [hasApiKey, setHasApiKey] = useState(!!localStorage.getItem('geminiApiKey'));

    useEffect(() => {
        const check = () => {
            try {
                setHasApiKey(!!localStorage.getItem('geminiApiKey'));
                const stored = localStorage.getItem('skypilot_pilot_profile');
                setHasProfile(stored ? isProfileComplete(JSON.parse(stored)) : false);
            } catch { setHasProfile(false); }
        };
        check();
        // React to profile saves and storage changes
        window.addEventListener('pilot-profile-saved', check);
        window.addEventListener('storage', check);
        return () => {
            window.removeEventListener('pilot-profile-saved', check);
            window.removeEventListener('storage', check);
        };
    }, []);

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                dropdownRef.current && !dropdownRef.current.contains(event.target) &&
                buttonRef.current && !buttonRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        }
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const menuItem = (icon, label, onClick, accent) => (
        <button
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', background: 'transparent', border: 'none',
                borderRadius: 8, cursor: 'pointer',
                color: accent || 'var(--color-text-primary)',
                fontSize: '0.8rem', fontWeight: 500, textAlign: 'left',
                transition: 'all 0.2s ease', width: '100%',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-glass-subtle-bg)'; e.currentTarget.style.color = accent || 'var(--color-sky)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = accent || 'var(--color-text-primary)'; }}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <div style={{ position: 'relative' }}>
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                title="Settings"
                style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: isOpen ? 'var(--color-sky-dim)' : 'var(--color-surface-3)',
                    border: `1px solid ${isOpen ? 'var(--color-border-glow)' : 'var(--color-border-base)'}`,
                    color: isOpen ? 'var(--color-sky)' : 'var(--color-text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0,
                    transition: 'all 0.2s ease', position: 'relative',
                }}
            >
                <Settings size={16} />
                {/* Badge: orange warning if API key missing, purple nudge if only profile missing */}
                {!hasApiKey && (
                    <span style={{
                        position: 'absolute', top: -2, right: -2,
                        width: 10, height: 10, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #f97316, #ef4444)',
                        border: '1.5px solid var(--color-surface-3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '6px', color: '#fff', fontWeight: 900, lineHeight: 1,
                    }}>!</span>
                )}
                {hasApiKey && !hasProfile && (
                    <span style={{
                        position: 'absolute', top: 2, right: 2,
                        width: 7, height: 7, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                        border: '1.5px solid var(--color-surface-3)',
                    }} />
                )}
            </button>

            {isOpen && (
                <div
                    ref={dropdownRef}
                    style={{
                        position: 'absolute', top: '100%', right: 0, marginTop: 8,
                        width: 195, background: 'var(--color-surface-overlay)',
                        backdropFilter: 'blur(16px)', border: '1px solid var(--color-border-strong)',
                        borderRadius: 12, padding: 6, boxShadow: 'var(--color-elevation-lg)',
                        zIndex: 3000, display: 'flex', flexDirection: 'column', gap: 2,
                        animation: 'slide-down 0.15s ease-out forwards', transformOrigin: 'top right',
                    }}
                >
                    {/* Pilot Profile — own dedicated entry */}
                    {menuItem(
                        <User size={14} color="#7c3aed" />,
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                            Pilot Profile
                            {hasProfile && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed', flexShrink: 0 }} />}
                        </span>,
                        () => { setIsOpen(false); window.dispatchEvent(new Event('open-pilot-profile')); },
                        '#7c3aed',
                    )}

                    <div style={{ height: 1, background: 'var(--color-border-subtle)', margin: '4px 0' }} />

                    {menuItem(<Key size={14} />, 'API Key Settings',
                        () => { onOpenSettings(); setIsOpen(false); }
                    )}

                    <div style={{ height: 1, background: 'var(--color-border-subtle)', margin: '4px 0' }} />

                    {menuItem(<SlidersHorizontal size={14} />, 'Search Radius',
                        () => { setIsOpen(false); window.dispatchEvent(new Event('open-filters')); }
                    )}

                    <div style={{ height: 1, background: 'var(--color-border-subtle)', margin: '4px 0' }} />

                    {menuItem(
                        theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />,
                        theme === 'dark' ? 'Light Mode' : 'Dark Mode',
                        () => toggleTheme()
                    )}

                    <div style={{ marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--color-border-subtle)', textAlign: 'center', color: 'var(--color-text-dim)', fontSize: '0.7rem', fontWeight: 500, letterSpacing: '0.02em' }}>
                        v{__APP_VERSION__}
                    </div>
                </div>
            )}
        </div>
    );
}

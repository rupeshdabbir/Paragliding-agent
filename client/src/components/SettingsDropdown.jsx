import { useState, useRef, useEffect } from 'react';
import { Settings, Sun, Moon, Key, SlidersHorizontal } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

export default function SettingsDropdown({ onOpenSettings }) {
    const { theme, toggleTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (
                dropdownRef.current && !dropdownRef.current.contains(event.target) &&
                buttonRef.current && !buttonRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

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
                    transition: 'all 0.2s ease',
                }}
            >
                <Settings size={16} />
            </button>

            {isOpen && (
                <div
                    ref={dropdownRef}
                    style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: 8,
                        width: 180,
                        background: 'var(--color-surface-overlay)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid var(--color-border-strong)',
                        borderRadius: 12,
                        padding: 6,
                        boxShadow: 'var(--color-elevation-lg)',
                        zIndex: 3000,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        animation: 'slide-down 0.15s ease-out forwards',
                        transformOrigin: 'top right'
                    }}
                >
                    <button
                        onClick={() => {
                            onOpenSettings();
                            setIsOpen(false);
                        }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 12px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                            color: 'var(--color-text-primary)',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            textAlign: 'left',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'var(--color-glass-subtle-bg)';
                            e.currentTarget.style.color = 'var(--color-sky)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--color-text-primary)';
                        }}
                    >
                        <Key size={14} />
                        API Key Settings
                    </button>

                    <div style={{ height: 1, background: 'var(--color-border-subtle)', margin: '4px 0' }} />

                    <button
                        onClick={() => {
                            setIsOpen(false);
                            window.dispatchEvent(new Event('open-filters'));
                        }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 12px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                            color: 'var(--color-text-primary)',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            textAlign: 'left',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'var(--color-glass-subtle-bg)';
                            e.currentTarget.style.color = 'var(--color-sky)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--color-text-primary)';
                        }}
                    >
                        <SlidersHorizontal size={14} />
                        Search Radius
                    </button>

                    <div style={{ height: 1, background: 'var(--color-border-subtle)', margin: '4px 0' }} />

                    <button
                        onClick={() => {
                            toggleTheme();
                        }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 12px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                            color: 'var(--color-text-primary)',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            textAlign: 'left',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'var(--color-glass-subtle-bg)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </button>

                    <div style={{ marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--color-border-subtle)', textAlign: 'center', color: 'var(--color-text-dim)', fontSize: '0.7rem', fontWeight: 500, letterSpacing: '0.02em' }}>
                        v{__APP_VERSION__}
                    </div>
                </div>
            )}
        </div>
    );
}

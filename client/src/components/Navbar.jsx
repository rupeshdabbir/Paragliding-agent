import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MessageSquare, Map, Wind, Search, X, Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import SettingsDropdown from './SettingsDropdown.jsx';
import SettingsModal from './SettingsModal.jsx';
import PilotProfileModal from './PilotProfileModal.jsx';

export default function Navbar({ onSearchSelect }) {
    const location = useLocation();
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [themeHover, setThemeHover] = useState(false);
    const searchInputRef = useRef(null);
    const { theme, toggleTheme } = useTheme();
    const [settingsModalOpen, setSettingsModalOpen] = useState(false);
    const [pilotProfileOpen, setPilotProfileOpen] = useState(false);

    // Note: Auto-open Settings logic has been moved to App.jsx -> OnboardingStepper

    useEffect(() => {
        const handleOpenSettings = () => setSettingsModalOpen(true);
        window.addEventListener('open-settings', handleOpenSettings);

        const handleOpenPilotProfile = () => setPilotProfileOpen(true);
        window.addEventListener('open-pilot-profile', handleOpenPilotProfile);

        return () => {
            window.removeEventListener('open-settings', handleOpenSettings);
            window.removeEventListener('open-pilot-profile', handleOpenPilotProfile);
        };
    }, []);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    useEffect(() => {
        if (mobileSearchOpen) setTimeout(() => searchInputRef.current?.focus(), 150);
    }, [mobileSearchOpen]);

    return (
        <nav className="navbar">
            {/* Logo */}
            <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
                <div style={{
                    width: isMobile ? 30 : 34, height: isMobile ? 30 : 34,
                    background: 'var(--color-sky-gradient)',
                    borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 14px var(--color-sky-glow)',
                }}>
                    <Wind size={isMobile ? 16 : 18} color="#fff" strokeWidth={2.5} />
                </div>
                <span style={{
                    fontFamily: 'var(--font-heading)', fontWeight: 700,
                    fontSize: isMobile ? '0.95rem' : '1.05rem',
                    color: 'var(--color-text-heading)', letterSpacing: '-0.02em'
                }}>
                    Sky<span style={{ color: 'var(--color-sky)' }}>Pilot</span>
                </span>
            </a>

            {/* Portal target — desktop search goes here via portal */}
            <div id="navbar-portal-target" style={
                isMobile ? {
                    flex: 1,
                    display: 'flex',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    margin: '0 10px',
                    minWidth: 0,
                } : {
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    justifyContent: 'center',
                    width: 'auto',
                    pointerEvents: 'none',
                }
            } />

            {/* Right side controls */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                <NavLink to="/brief" className="btn btn-secondary" style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: isMobile ? '0.75rem' : '0.8rem',
                    padding: isMobile ? '5px 10px' : '6px 14px',
                    whiteSpace: 'nowrap',
                }}>
                    <Sparkles size={isMobile ? 13 : 15} color="var(--color-sky)" />
                    {!isMobile && 'Morning Brief'}
                    {isMobile && 'Brief'}
                </NavLink>

                {location.pathname === '/chat' && (
                    <NavLink to="/" className="btn btn-primary" style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: isMobile ? '0.75rem' : '0.8rem',
                        padding: isMobile ? '5px 10px' : '6px 14px',
                    }}>
                        <Map size={isMobile ? 13 : 15} />
                        {!isMobile && 'Map'}
                    </NavLink>
                )}

                {/* Settings Dropdown */}
                <SettingsDropdown onOpenSettings={() => setSettingsModalOpen(true)} />
                <SettingsModal open={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} />
                <PilotProfileModal open={pilotProfileOpen} onClose={() => setPilotProfileOpen(false)} />
            </div>
        </nav>
    );
}

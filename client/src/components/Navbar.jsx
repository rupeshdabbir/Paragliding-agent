import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MessageSquare, Map, Wind, Search, X } from 'lucide-react';

export default function Navbar({ onSearchSelect }) {
    const location = useLocation();
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const searchInputRef = useRef(null);

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
            <NavLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
                <div style={{
                    width: isMobile ? 30 : 34, height: isMobile ? 30 : 34,
                    background: 'linear-gradient(135deg, var(--color-sky), #0055cc)',
                    borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(0,200,255,0.4)',
                }}>
                    <Wind size={isMobile ? 16 : 18} color="#fff" strokeWidth={2.5} />
                </div>
                <span style={{
                    fontFamily: 'var(--font-heading)', fontWeight: 700,
                    fontSize: isMobile ? '0.95rem' : '1.05rem',
                    color: '#fff', letterSpacing: '-0.02em'
                }}>
                    Sky<span style={{ color: 'var(--color-sky)' }}>Pilot</span>
                </span>
            </NavLink>

            {/* Portal target — desktop search goes here via portal */}
            <div id="navbar-portal-target" style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                padding: '0 12px',
            }} />

            {/* Right side controls */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
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
            </div>
        </nav>
    );
}

import { NavLink, useLocation } from 'react-router-dom';
import { MessageSquare, Map, Wind } from 'lucide-react';

export default function Navbar() {
    const location = useLocation();
    const isLanding = location.pathname === '/';

    return (
        <nav className="navbar">
            <NavLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                    width: 34, height: 34,
                    background: 'linear-gradient(135deg, var(--color-sky), #0055cc)',
                    borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,200,255,0.35)',
                }}>
                    <Wind size={18} color="#fff" strokeWidth={2.5} />
                </div>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem', color: '#fff', letterSpacing: '-0.02em' }}>
                    Sky<span style={{ color: 'var(--color-sky)' }}>Pilot</span>
                </span>
            </NavLink>

            {!isLanding && (
                <div style={{ display: 'flex', gap: 8 }}>
                    <NavLink to="/chat" className={({ isActive }) => `btn btn-ghost ${isActive ? 'active-nav' : ''}`}
                        style={({ isActive }) => isActive ? { background: 'var(--color-sky-dim)', borderColor: 'var(--color-sky)', color: 'var(--color-sky)' } : {}}>
                        <MessageSquare size={15} />
                        Ask SkyPilot
                    </NavLink>
                    <NavLink to="/map" className={({ isActive }) => `btn btn-ghost ${isActive ? 'active-nav' : ''}`}
                        style={({ isActive }) => isActive ? { background: 'var(--color-sky-dim)', borderColor: 'var(--color-sky)', color: 'var(--color-sky)' } : {}}>
                        <Map size={15} />
                        Map View
                    </NavLink>
                </div>
            )}
        </nav>
    );
}

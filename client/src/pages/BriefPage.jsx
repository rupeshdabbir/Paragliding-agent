import { useState, useEffect } from 'react';
import { useGeolocation } from '../hooks/useGeolocation.js';
import MorningBrief from '../components/MorningBrief.jsx';
import { Wind, Map as MapIcon, RefreshCw, AlertTriangle } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { getAIHeaders } from '../utils/aiHeaders.jsx';

export default function BriefPage() {
    const { location, loading: locLoading, requestLocation } = useGeolocation();
    const [briefData, setBriefData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchBrief = async (loc) => {
        if (!loc) return;
        setLoading(true);
        setError(null);
        try {
            const aiHeaders = getAIHeaders();
            const pilotProfile = localStorage.getItem('skypilot_pilot_profile') || '';
            const favorites = localStorage.getItem('skypilot_favorites') || '[]';
            const headers = {
                ...aiHeaders,
                ...(pilotProfile ? { 'x-pilot-profile': pilotProfile } : {}),
            };

            const res = await fetch(`/api/brief?lat=${loc.lat}&lng=${loc.lng}&favorites=${encodeURIComponent(favorites)}`, { headers });
            if (!res.ok) throw new Error('Failed to fetch morning brief');
            const data = await res.json();
            setBriefData(data);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        if (!location) {
            requestLocation();
        } else {
            fetchBrief(location);
        }
    }, [location]);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--color-bg)',
            paddingTop: 'calc(var(--navbar-height) + 20px)',
            paddingBottom: '40px'
        }}>
            <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>

                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '30px',
                    animation: 'fade-up 0.5s ease'
                }}>
                    <div>
                        <h1 style={{
                            fontFamily: 'var(--font-heading)',
                            fontSize: '1.8rem',
                            fontWeight: 800,
                            color: 'var(--color-text-heading)',
                            marginBottom: '4px'
                        }}>
                            Morning <span style={{ color: 'var(--color-sky)' }}>Brief</span>
                        </h1>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                            Your daily regional flying dashboard
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button
                            onClick={() => fetchBrief(location)}
                            disabled={loading || !location}
                            style={{
                                width: 38, height: 38, borderRadius: 10,
                                background: 'var(--color-surface-3)', border: '1px solid var(--color-border-base)',
                                color: 'var(--color-text-secondary)', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s ease'
                            }}
                            title="Refresh Brief"
                        >
                            <RefreshCw size={18} className={loading ? 'spin' : ''} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                        </button>
                        <NavLink to="/" style={{
                            width: 38, height: 38, borderRadius: 10,
                            background: 'var(--color-sky-gradient)', border: 'none',
                            color: '#fff', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px var(--color-sky-glow)'
                        }} title="Back to Map">
                            <MapIcon size={18} />
                        </NavLink>
                    </div>
                </div>

                {/* Content */}
                {locLoading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                        <div style={{ width: 40, height: 40, border: '3px solid var(--color-sky-dim)', borderTopColor: 'var(--color-sky)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
                        <p style={{ color: 'var(--color-text-muted)' }}>Determining your location...</p>
                    </div>
                ) : !location ? (
                    <div className="glass" style={{ padding: '40px', textAlign: 'center' }}>
                        <AlertTriangle size={48} color="var(--color-amber)" style={{ marginBottom: '20px' }} />
                        <h2 style={{ marginBottom: '12px' }}>Location Access Required</h2>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '30px' }}>
                            We need your location to find the best paragliding sites near you.
                        </p>
                        <button onClick={requestLocation} className="btn btn-primary">
                            Enable Location
                        </button>
                    </div>
                ) : loading && !briefData ? (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                        <div style={{ width: 40, height: 40, border: '3px solid var(--color-sky-dim)', borderTopColor: 'var(--color-sky)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
                        <p style={{ color: 'var(--color-text-muted)' }}>Analyzing regional conditions...</p>
                    </div>
                ) : error ? (
                    <div className="glass" style={{ padding: '40px', textAlign: 'center', borderColor: 'var(--color-no-go-dim)' }}>
                        <AlertTriangle size={48} color="var(--color-no-go)" style={{ marginBottom: '20px' }} />
                        <h2 style={{ marginBottom: '12px' }}>Brief Unavailable</h2>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '30px' }}>
                            {error}
                        </p>
                        <button onClick={() => fetchBrief(location)} className="btn btn-secondary">
                            Try Again
                        </button>
                    </div>
                ) : (
                    <MorningBrief data={briefData} loading={loading} />
                )}
            </div>
        </div>
    );
}

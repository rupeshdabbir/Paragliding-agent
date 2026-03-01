import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
    LocateFixed, SlidersHorizontal, X, AlertCircle,
    MessageSquare, Send, Trash2, ChevronRight, Wind, LocateFixed as LocIcon,
    Minimize2, Maximize2, Columns, Sparkles
} from 'lucide-react';
import SiteCard from '../components/SiteCard.jsx';
import { FlyabilityBadge } from '../components/FlyabilityBadge.jsx';
import ChatMessage, { TypingIndicator } from '../components/ChatMessage.jsx';
import SiteSearch from '../components/SiteSearch.jsx';
import SiteForecast from '../components/SiteForecast.jsx';
import { useGeolocation } from '../hooks/useGeolocation.js';
import { useChat } from '../hooks/useChat.js';

// ─── Suggested prompts for the chat panel ───────────────────────────────────
const SUGGESTED_PROMPTS = [
    'Can I fly here today?',
    'What are the best sites within 30 miles?',
    "What's the wind like at altitude right now?",
    'Is there a better window to fly later today?',
];

// ─── Custom colored pin markers ─────────────────────────────────────────────
function createMarkerIcon(rating) {
    const color = { GO: '#22c55e', MARGINAL: '#f59e0b', NO_GO: '#ef4444' }[rating] || '#ef4444';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
    <defs><filter id="glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <path d="M16 0C9.4 0 4 5.4 4 12c0 8 12 28 12 28S28 20 28 12C28 5.4 22.6 0 16 0z" fill="${color}" filter="url(#glow)" opacity="0.9"/>
    <circle cx="16" cy="12" r="6" fill="white" opacity="0.95"/>
  </svg>`;
    return L.divIcon({ html: svg, className: '', iconSize: [32, 40], iconAnchor: [16, 40], popupAnchor: [0, -40] });
}

// ─── Helper: fly map to new center ──────────────────────────────────────────
function FlyTo({ center, zoom }) {
    const map = useMap();
    useEffect(() => { if (center) map.flyTo(center, zoom, { duration: 1.2 }); }, [center, zoom, map]);
    return null;
}

// ─── User location dot ──────────────────────────────────────────────────────
function UserMarker({ position }) {
    const icon = L.divIcon({
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#00c8ff;border:3px solid white;box-shadow:0 0 12px rgba(0,200,255,0.8)"></div>`,
        className: '', iconSize: [16, 16], iconAnchor: [8, 8],
    });
    return <Marker position={position} icon={icon} />;
}

// ─── Chat drawer panel ───────────────────────────────────────────────────────
function ChatDrawer({ open, onClose, location, contextSite }) {
    const { messages, loading, sendMessage, clearMessages } = useChat();
    const [input, setInput] = useState('');
    const [shareLocation, setShareLocation] = useState(true);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Reset share-location to true whenever contextSite changes (new site selected)
    useEffect(() => { setShareLocation(true); }, [contextSite?.name]);

    // The effective location to pass to AI: site takes precedence over GPS
    // We pass the full contextSite object so Gemini knows altitude, description, etc.
    const effectiveLocation = contextSite ? contextSite : location;

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 300);
    }, [open]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        const text = input.trim();
        setInput('');
        await sendMessage(text, shareLocation && effectiveLocation ? effectiveLocation : null);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const isEmpty = messages.length === 0;

    return (
        <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, zIndex: 2500,
            width: open ? 400 : 0,
            overflow: 'hidden',
            transition: 'width 0.35s cubic-bezier(0.34, 1.06, 0.64, 1)',
            display: 'flex', flexDirection: 'column',
            background: 'rgba(8, 13, 26, 0.97)',
            backdropFilter: 'blur(24px)',
            borderLeft: open ? '1px solid rgba(255,255,255,0.08)' : 'none',
            boxShadow: open ? '-12px 0 48px rgba(0,0,0,0.5)' : 'none',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 9,
                        background: 'linear-gradient(135deg, var(--color-sky), #0055cc)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 3px 10px rgba(0,200,255,0.3)',
                    }}>
                        <Wind size={16} color="#fff" />
                    </div>
                    <div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                            Sky<span style={{ color: 'var(--color-sky)' }}>Pilot</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(232,237,245,0.4)' }}>AI Flight Advisor</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    {messages.length > 0 && (
                        <button onClick={clearMessages} title="Clear chat" style={{
                            background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8, width: 30, height: 30, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'rgba(232,237,245,0.4)', transition: 'all 0.2s ease',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(239,68,68,0.7)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(232,237,245,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                        >
                            <Trash2 size={13} />
                        </button>
                    )}
                    <button onClick={onClose} style={{
                        background: 'rgba(255,255,255,0.06)', border: 'none',
                        borderRadius: 8, width: 30, height: 30, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'rgba(232,237,245,0.6)',
                    }}>
                        <X size={15} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column' }}>
                {isEmpty ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
                        <p style={{ fontSize: '0.82rem', color: 'rgba(232,237,245,0.45)', textAlign: 'center', marginBottom: 12, lineHeight: 1.6 }}>
                            Ask me anything about flying conditions at sites on the map.
                        </p>
                        {SUGGESTED_PROMPTS.map(p => (
                            <button key={p} onClick={() => { setInput(p); inputRef.current?.focus(); }}
                                style={{
                                    background: 'rgba(13,21,40,0.7)', border: '1px solid rgba(255,255,255,0.07)',
                                    borderRadius: 10, padding: '10px 14px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                                    cursor: 'pointer', color: 'rgba(232,237,245,0.65)', fontSize: '0.82rem',
                                    transition: 'all 0.2s ease', textAlign: 'left',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,200,255,0.3)'; e.currentTarget.style.background = 'rgba(0,200,255,0.05)'; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(13,21,40,0.7)'; e.currentTarget.style.color = 'rgba(232,237,245,0.65)'; }}
                            >
                                <span>{p}</span>
                                <ChevronRight size={12} style={{ flexShrink: 0 }} />
                            </button>
                        ))}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {messages.map((msg, i) => <ChatMessage key={i} message={msg} />)}
                        {loading && <TypingIndicator />}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Location toggle + Input */}
            <div style={{
                padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0,
            }}>
                {/* Location pill */}
                <button onClick={() => setShareLocation(v => !v)} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 100, marginBottom: 10,
                    background: shareLocation && effectiveLocation ? 'var(--color-sky-dim)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${shareLocation && effectiveLocation ? 'rgba(0,200,255,0.35)' : 'rgba(255,255,255,0.08)'}`,
                    color: shareLocation && effectiveLocation ? 'var(--color-sky)' : 'rgba(232,237,245,0.4)',
                    fontSize: '0.75rem', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s ease',
                }}>
                    <LocateFixed size={11} />
                    {effectiveLocation && shareLocation
                        ? contextSite
                            ? `📍 ${contextSite.name}`
                            : `Using map location (${effectiveLocation.lat.toFixed(3)}, ${effectiveLocation.lng.toFixed(3)})`
                        : 'Share location with AI'}
                </button>

                {/* Input row */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about conditions, sites, or weather..."
                        rows={1}
                        style={{
                            flex: 1, background: 'rgba(13,21,40,0.8)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 12, padding: '11px 14px',
                            color: '#e8edf5', fontFamily: 'var(--font-body)', fontSize: '0.88rem',
                            resize: 'none', outline: 'none', lineHeight: 1.5,
                            maxHeight: 100, overflowY: 'auto', transition: 'border-color 0.2s ease',
                        }}
                        onFocus={e => e.target.style.borderColor = 'rgba(0,200,255,0.4)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                    <button onClick={handleSend} disabled={!input.trim() || loading} style={{
                        width: 42, height: 42, borderRadius: 11, border: 'none',
                        background: input.trim() && !loading ? 'linear-gradient(135deg, var(--color-sky), #0055cc)' : 'rgba(255,255,255,0.05)',
                        color: input.trim() && !loading ? '#fff' : 'rgba(232,237,245,0.25)',
                        cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s ease', flexShrink: 0,
                        boxShadow: input.trim() && !loading ? '0 3px 12px rgba(0,200,255,0.25)' : 'none',
                    }}>
                        {loading
                            ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            : <Send size={16} />
                        }
                    </button>
                </div>
                <p style={{ fontSize: '0.68rem', color: 'rgba(232,237,245,0.2)', marginTop: 8, textAlign: 'center' }}>
                    Enter to send · Shift+Enter for new line
                </p>
            </div>
        </div>
    );
}

// ─── Main MapView ────────────────────────────────────────────────────────────
export default function MapView() {
    const { location, loading: locLoading, requestLocation } = useGeolocation();
    const [sites, setSites] = useState([]);
    const [loadingSites, setLoadingSites] = useState(false);
    const [selectedSite, setSelectedSite] = useState(null);
    const [distance, setDistance] = useState(30); // in miles
    const [mapCenter, setMapCenter] = useState([37.7749, -122.4194]);
    const [mapZoom, setMapZoom] = useState(10);
    const [filter, setFilter] = useState('all');
    const [chatOpen, setChatOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const filterRef = useRef(null);
    const [portalTarget, setPortalTarget] = useState(null);
    const [panelWidthPx, setPanelWidthPx] = useState(440); // draggable pixel width
    const [chatContextSite, setChatContextSite] = useState(null); // site to pre-load in chat
    const isDragging = useRef(false);
    const dragStartX = useRef(0);
    const dragStartW = useRef(440);

    useEffect(() => {
        requestLocation();
        setPortalTarget(document.getElementById('navbar-portal-target'));
    }, []);

    // Close filter popover on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setShowFilters(false);
            }
        };
        if (showFilters) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showFilters]);

    // When a site is selected from search: fly to it and mark as selected
    const handleSiteSearchSelect = useCallback((site) => {
        if (site?.lat && site?.lng) {
            setMapCenter([site.lat, site.lng]);
            setMapZoom(13);
            setSelectedSite(site);
            setChatOpen(false);
        }
    }, []);

    useEffect(() => {
        if (location) {
            setMapCenter([location.lat, location.lng]);
            setMapZoom(11);
            fetchSites(location, distance);
        }
    }, [location]);

    const fetchSites = useCallback(async (loc, dist) => {
        if (!loc) return;
        setLoadingSites(true); setSites([]); setSelectedSite(null);
        try {
            // The API expects distance in kilometers, so convert miles -> km
            const distKm = (dist * 1.60934).toFixed(1);
            const res = await fetch(`/api/sites?lat=${loc.lat}&lng=${loc.lng}&distance=${distKm}&limit=20`);
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            setSites(data.sites || []);
        } catch (err) { console.error(err); }
        finally { setLoadingSites(false); }
    }, []);

    const handleDistanceChange = (v) => { setDistance(v); if (location) fetchSites(location, v); };

    const filteredSites = filter === 'all' ? sites : sites.filter(s => s.rating === filter);
    const counts = { GO: sites.filter(s => s.rating === 'GO').length, MARGINAL: sites.filter(s => s.rating === 'MARGINAL').length, NO_GO: sites.filter(s => s.rating === 'NO_GO').length };

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#080d1a', paddingTop: 60 }}>
            <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>

                {/* ── MAP ─────────────────────────────────────────────────────── */}
                <div style={{ flex: 1, position: 'relative', transition: 'all 0.35s ease' }}>
                    <MapContainer center={mapCenter} zoom={mapZoom} style={{ width: '100%', height: '100%' }} zoomControl>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
                        <FlyTo center={mapCenter} zoom={mapZoom} />
                        {location && (
                            <>
                                <UserMarker position={[location.lat, location.lng]} />
                                <Circle center={[location.lat, location.lng]} radius={distance * 1000}
                                    pathOptions={{ color: 'rgba(0,200,255,0.4)', fillColor: 'rgba(0,200,255,0.04)', fillOpacity: 1, weight: 1, dashArray: '6 6' }} />
                            </>
                        )}
                        {filteredSites.map((site, i) => site.lat && site.lng && (
                            <Marker key={i} position={[site.lat, site.lng]} icon={createMarkerIcon(site.rating)}
                                eventHandlers={{ click: () => { setSelectedSite(site); setChatOpen(false); } }}>
                                <Popup>
                                    <div style={{ minWidth: 200 }}>
                                        <div style={{ fontWeight: 700, marginBottom: 4, color: '#fff', fontFamily: 'Inter, sans-serif' }}>{site.name}</div>
                                        <div style={{ marginBottom: 6 }}><FlyabilityBadge rating={site.rating} size="sm" /></div>
                                        <div style={{ fontSize: '0.78rem', color: 'rgba(232,237,245,0.6)', marginBottom: 8 }}>{site.altitude}ft</div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedSite(site); setChatOpen(false); }}
                                                style={{ flex: 1, padding: '6px 0', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                            >
                                                Details
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setChatContextSite(site); setChatOpen(true); setSelectedSite(null); }}
                                                style={{ flex: 1, padding: '6px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: 'linear-gradient(135deg, var(--color-sky), #0055cc)', border: 'none', borderRadius: 6, color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s' }}
                                                onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
                                                onMouseLeave={e => e.currentTarget.style.opacity = 1}
                                            >
                                                <Sparkles size={11} />
                                                SkyPilot
                                            </button>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>

                    {/* Loading banner */}
                    {loadingSites && (
                        <div style={{ position: 'absolute', top: 70, left: '50%', transform: 'translateX(-50%)', background: 'rgba(8,13,26,0.88)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, color: '#e8edf5', fontSize: '0.85rem', zIndex: 1000 }}>
                            <div style={{ width: 14, height: 14, border: '2px solid var(--color-sky)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            Fetching paragliding sites...
                        </div>
                    )}

                    {/* No location */}
                    {!location && !locLoading && (
                        <div style={{ position: 'absolute', top: 70, left: '50%', transform: 'translateX(-50%)', background: 'rgba(8,13,26,0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,179,71,0.3)', borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, color: '#e8edf5', fontSize: '0.85rem', zIndex: 1000, whiteSpace: 'nowrap' }}>
                            <AlertCircle size={16} color="var(--color-amber)" />
                            Enable location to see sites near you
                            <button onClick={requestLocation} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>Allow</button>
                        </div>
                    )}

                    {/* Filter chips */}
                    {sites.length > 0 && (
                        <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, zIndex: 1000 }}>
                            {[
                                { key: 'all', label: `All ${sites.length}`, color: 'rgba(255,255,255,0.8)' },
                                { key: 'GO', label: `✓ GO ${counts.GO}`, color: 'var(--color-go)' },
                                { key: 'MARGINAL', label: `⚠ ${counts.MARGINAL}`, color: 'var(--color-marginal)' },
                                { key: 'NO_GO', label: `✗ ${counts.NO_GO}`, color: 'var(--color-no-go)' },
                            ].map(({ key, label, color }) => (
                                <button key={key} onClick={() => setFilter(key)} style={{
                                    background: filter === key ? 'rgba(13,21,40,0.95)' : 'rgba(13,21,40,0.7)',
                                    backdropFilter: 'blur(12px)',
                                    border: `1px solid ${filter === key ? color : 'rgba(255,255,255,0.1)'}`,
                                    borderRadius: 100, padding: '7px 14px',
                                    color: filter === key ? color : 'rgba(232,237,245,0.5)',
                                    fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease',
                                }}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* ── Top Floating Bar (Search + Tools) Rendered to Navbar Portal ──── */}
                    {portalTarget && createPortal(
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            {/* Search Bar */}
                            <div style={{ width: 340 }}>
                                <SiteSearch onSiteSelect={handleSiteSearchSelect} />
                            </div>

                            {/* Detect Location Button */}
                            <button onClick={() => { requestLocation(); if (location) { setMapCenter([location.lat, location.lng]); setMapZoom(11); fetchSites(location, distance); } }}
                                title="Detect my location"
                                style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: location ? 'var(--color-sky-dim)' : 'transparent', border: `1px solid ${location ? 'rgba(0,200,255,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, color: location ? 'var(--color-sky)' : 'rgba(232,237,245,0.7)', cursor: 'pointer', transition: 'all 0.2s ease' }}
                                onMouseEnter={e => e.currentTarget.style.background = location ? 'var(--color-sky-dim)' : 'rgba(255,255,255,0.05)'}
                                onMouseLeave={e => e.currentTarget.style.background = location ? 'var(--color-sky-dim)' : 'transparent'}
                            >
                                {locLoading ? <div style={{ width: 15, height: 15, border: '2px solid var(--color-sky)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : <LocateFixed size={16} />}
                            </button>

                            {/* Filter Button (for Radius) */}
                            <div style={{ position: 'relative' }}>
                                <button onClick={() => setShowFilters(!showFilters)}
                                    title="Adjust search radius"
                                    style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: showFilters ? 'var(--color-sky-dim)' : 'transparent', border: `1px solid ${showFilters ? 'rgba(0,200,255,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, color: showFilters ? 'var(--color-sky)' : 'rgba(232,237,245,0.7)', cursor: 'pointer', transition: 'all 0.2s ease' }}
                                    onMouseEnter={e => e.currentTarget.style.background = showFilters ? 'var(--color-sky-dim)' : 'rgba(255,255,255,0.05)'}
                                    onMouseLeave={e => e.currentTarget.style.background = showFilters ? 'var(--color-sky-dim)' : 'transparent'}
                                >
                                    <SlidersHorizontal size={16} />
                                </button>

                                {/* Filter Popover */}
                                {showFilters && (
                                    <div ref={filterRef} style={{ position: 'absolute', top: 50, right: 0, width: 260, background: 'rgba(8,13,26,0.98)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', zIndex: 10000 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>Search Radius</span>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-sky)', background: 'rgba(0,200,255,0.1)', padding: '2px 8px', borderRadius: 8 }}>{distance} miles</span>
                                            </div>
                                            <button onClick={() => setShowFilters(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(232,237,245,0.5)', cursor: 'pointer', display: 'flex', padding: 4, borderRadius: 6, transition: 'all 0.2s' }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(232,237,245,0.5)'; }}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                        <input type="range" min={5} max={60} step={5} value={distance} onChange={e => handleDistanceChange(parseInt(e.target.value))}
                                            style={{ width: '100%', appearance: 'none', height: 4, background: `linear-gradient(to right, var(--color-sky) ${(distance - 5) / (60 - 5) * 100}%, rgba(255,255,255,0.1) ${(distance - 5) / (60 - 5) * 100}%)`, borderRadius: 100, outline: 'none', cursor: 'pointer', margin: '0 0 20px 0' }} />

                                        {/* Counts */}
                                        {sites.length > 0 && (
                                            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'rgba(232,237,245,0.5)', marginBottom: 12, textAlign: 'center', fontWeight: 500 }}>{sites.length} sites found</div>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    {[['GO', counts.GO, 'var(--color-go)'], ['MARG.', counts.MARGINAL, 'var(--color-marginal)'], ['NO-GO', counts.NO_GO, 'var(--color-no-go)']].map(([label, count, color]) => (
                                                        <div key={label} style={{ textAlign: 'center', flex: 1, background: 'rgba(0,0,0,0.2)', padding: '8px 4px', borderRadius: 8 }}>
                                                            <div style={{ fontSize: '1.05rem', fontWeight: 700, color, fontFamily: 'var(--font-heading)' }}>{count}</div>
                                                            <div style={{ fontSize: '0.62rem', color: 'rgba(232,237,245,0.4)', textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: 2 }}>{label}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>,
                        document.getElementById('navbar-portal-target')
                    )}

                    {/* ── Site detail/forecast panel (draggable + expandable, slide in from left) ── */}
                    {selectedSite && (() => {
                        const handleDragStart = (e) => {
                            isDragging.current = true;
                            dragStartX.current = e.clientX;
                            dragStartW.current = panelWidthPx;
                            document.body.style.cursor = 'col-resize';
                            document.body.style.userSelect = 'none';
                            const onMove = (me) => {
                                if (!isDragging.current) return;
                                const delta = me.clientX - dragStartX.current;
                                setPanelWidthPx(Math.min(1100, Math.max(340, dragStartW.current + delta)));
                            };
                            const onUp = () => {
                                isDragging.current = false;
                                document.body.style.cursor = '';
                                document.body.style.userSelect = '';
                                window.removeEventListener('mousemove', onMove);
                                window.removeEventListener('mouseup', onUp);
                            };
                            window.addEventListener('mousemove', onMove);
                            window.addEventListener('mouseup', onUp);
                        };
                        return (
                            <div style={{ position: 'absolute', left: 12, top: 12, bottom: 12, width: panelWidthPx, background: 'rgba(8,13,26,0.97)', backdropFilter: 'blur(20px)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', overflowY: 'auto', padding: '14px 16px', zIndex: 1000, animation: 'slide-in-right 0.3s ease', display: 'flex', flexDirection: 'column', transition: isDragging.current ? 'none' : 'width 0.3s cubic-bezier(0.34,1.06,0.64,1)' }}>
                                {/* Panel header with resize controls */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexShrink: 0 }}>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--color-sky)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Flyability Forecast</span>
                                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                        {/* Ask SkyPilot CTA */}
                                        <button
                                            onClick={() => {
                                                setChatContextSite(selectedSite);
                                                setChatOpen(true);
                                                // Removed setSelectedSite(null) to keep the Forecast Panel open
                                            }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 5,
                                                padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                                background: 'linear-gradient(135deg, var(--color-sky), #0055cc)',
                                                color: '#fff', fontSize: '0.72rem', fontWeight: 700,
                                                boxShadow: '0 2px 8px rgba(0,200,255,0.3)',
                                                transition: 'all 0.2s ease',
                                                letterSpacing: '0.02em',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,200,255,0.5)'}
                                            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,200,255,0.3)'}
                                        >
                                            <Sparkles size={11} fill="currentColor" />
                                            Ask SkyPilot
                                        </button>
                                        {/* Preset size buttons */}
                                        {[[440, <Minimize2 size={13} />, 'Compact'], [680, <Columns size={13} />, 'Wide'], [940, <Maximize2 size={13} />, 'Expand']].map(([w, icon, label]) => (
                                            <button key={w} onClick={() => setPanelWidthPx(w)} title={label} style={{
                                                background: panelWidthPx === w ? 'rgba(0,200,255,0.15)' : 'rgba(255,255,255,0.05)',
                                                border: `1px solid ${panelWidthPx === w ? 'rgba(0,200,255,0.35)' : 'rgba(255,255,255,0.08)'}`,
                                                borderRadius: 7, width: 26, height: 26, cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: panelWidthPx === w ? 'var(--color-sky)' : 'rgba(232,237,245,0.4)',
                                                transition: 'all 0.18s ease',
                                            }}>{icon}</button>
                                        ))}
                                        <button onClick={() => setSelectedSite(null)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 7, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(232,237,245,0.6)', marginLeft: 2 }}>
                                            <X size={13} />
                                        </button>
                                    </div>
                                </div>
                                <SiteForecast site={selectedSite} onClose={() => setSelectedSite(null)} />
                                {/* Drag resize handle */}
                                <div
                                    onMouseDown={handleDragStart}
                                    style={{
                                        position: 'absolute', right: -4, top: 0, bottom: 0, width: 8,
                                        cursor: 'col-resize', zIndex: 10,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}
                                >
                                    <div style={{
                                        width: 4, height: 40, borderRadius: 2,
                                        background: 'rgba(0,200,255,0.25)',
                                        transition: 'background 0.2s ease, height 0.2s ease',
                                    }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,200,255,0.7)'; e.currentTarget.style.height = '60px'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,200,255,0.25)'; e.currentTarget.style.height = '40px'; }}
                                    />
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* ── CHAT DRAWER (slides in from right) ───────────────────────── */}
                <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} location={location} contextSite={chatContextSite} />

                {/* ── Ask SkyPilot floating tab button ─────────────────────────── */}
                {!chatOpen && (
                    <button
                        onClick={() => { setChatOpen(true); }}
                        style={{
                            position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                            zIndex: 3000,
                            background: 'linear-gradient(135deg, var(--color-sky), #0055cc)',
                            border: 'none',
                            borderRadius: '12px 0 0 12px',
                            padding: '14px 10px',
                            cursor: 'pointer',
                            boxShadow: '-4px 0 20px rgba(0,200,255,0.3)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                            color: '#fff',
                            transition: 'all 0.2s ease',
                            writingMode: 'vertical-rl',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '-6px 0 28px rgba(0,200,255,0.5)'; e.currentTarget.style.paddingLeft = '13px'; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = '-4px 0 20px rgba(0,200,255,0.3)'; e.currentTarget.style.paddingLeft = '10px'; }}
                    >
                        <Sparkles size={16} fill="currentColor" />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            Ask SkyPilot
                        </span>
                    </button>
                )}
            </div>
        </div>
    );
}

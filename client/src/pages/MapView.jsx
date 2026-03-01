import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
    LocateFixed, SlidersHorizontal, X, AlertCircle,
    MessageSquare, Send, Trash2, ChevronRight, Wind, LocateFixed as LocIcon,
    Minimize2, Maximize2, Columns, Sparkles, GripVertical, MapPin, ChevronDown
} from 'lucide-react';
import SiteCard from '../components/SiteCard.jsx';
import { FlyabilityBadge } from '../components/FlyabilityBadge.jsx';
import ChatMessage, { TypingIndicator } from '../components/ChatMessage.jsx';
import SiteSearch from '../components/SiteSearch.jsx';
import SiteForecast from '../components/SiteForecast.jsx';
import QuickStatsBar from '../components/QuickStatsBar.jsx';
import { useGeolocation } from '../hooks/useGeolocation.js';
import { useChat } from '../hooks/useChat.js';

// ─── Suggested prompts ───────────────────────────────────────────────────────
const SUGGESTED_PROMPTS = [
    { text: 'Can I fly here today?', icon: '🪂' },
    { text: 'Best sites within 30 miles?', icon: '🗺️' },
    { text: "Wind at altitude right now?", icon: '💨' },
    { text: 'Better window to fly later?', icon: '⏰' },
];

// ─── useIsMobile ─────────────────────────────────────────────────────────────
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);
    return isMobile;
}

// ─── Colored pin markers ─────────────────────────────────────────────────────
function createMarkerIcon(rating, isGo = false) {
    const colors = {
        GO: '#22c55e',
        MARGINAL: '#f59e0b',
        NO_GO: '#ef4444'
    };
    const color = colors[rating] || '#ef4444';
    const shadow = colors[rating] || '#ef4444';

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
      <defs>
        <filter id="dropshadow${rating}">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.5"/>
          <feOffset dx="0" dy="2"/>
          <feComponentTransfer><feFuncA type="linear" slope="0.4"/></feComponentTransfer>
          <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <path d="M17 1C9.8 1 4 6.8 4 14c0 9 13 28 13 28S30 23 30 14C30 6.8 24.2 1 17 1z"
        fill="${color}" filter="url(#dropshadow${rating})" opacity="0.95"/>
      <circle cx="17" cy="14" r="6.5" fill="white" opacity="0.97"/>
      <circle cx="17" cy="14" r="3.5" fill="${color}" opacity="0.7"/>
    </svg>`;

    return L.divIcon({
        html: svg,
        className: '',
        iconSize: [34, 44],
        iconAnchor: [17, 44],
        popupAnchor: [0, -44]
    });
}

// ─── Paraglider user location marker ─────────────────────────────────────────
function UserMarker({ position }) {
    const icon = L.divIcon({
        html: `<div style="position:relative;width:22px;height:22px">
          <div style="position:absolute;inset:0;border-radius:50%;background:rgba(0,200,255,0.25);animation:pulse-ring 1.8s ease-out infinite;transform-origin:center"></div>
          <div style="position:absolute;inset:0;border-radius:50%;background:rgba(0,200,255,0.12);animation:pulse-ring 1.8s ease-out 0.6s infinite;transform-origin:center"></div>
          <div style="position:absolute;inset:3px;border-radius:50%;background:#00c8ff;border:2.5px solid white;box-shadow:0 0 16px rgba(0,200,255,0.9)"></div>
        </div>`,
        className: '',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
    });
    return <Marker position={position} icon={icon} />;
}

// ─── Helper: fly map to center ────────────────────────────────────────────────
function FlyTo({ center, zoom }) {
    const map = useMap();
    useEffect(() => { if (center) map.flyTo(center, zoom, { duration: 1.2 }); }, [center, zoom, map]);
    return null;
}

// ─── Chat Drawer (slides from right on desktop, full-screen on mobile) ────────
function ChatDrawer({ open, onClose, location, contextSite, isMobile, width, onDragStart }) {
    const { messages, loading, sendMessage, clearMessages } = useChat();
    const [input, setInput] = useState('');
    const [shareLocation, setShareLocation] = useState(true);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => { setShareLocation(true); }, [contextSite?.name]);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);
    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 300);
    }, [open]);

    const effectiveLocation = contextSite ? contextSite : location;

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

    // Chat panel: full-screen on mobile, right-side slide-in panel on desktop
    const containerStyle = isMobile ? {
        position: 'fixed', inset: 0, top: 0,
        zIndex: 6000,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(6, 10, 20, 0.99)',
        backdropFilter: 'blur(24px)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.35s cubic-bezier(0.34, 1.06, 0.64, 1)',
        paddingTop: 'var(--navbar-height)',
    } : {
        // Desktop: fixed right panel, always mounted, slides in/out via transform
        position: 'absolute', right: 0, top: 0, bottom: 0, zIndex: 2500,
        width,
        display: 'flex', flexDirection: 'column',
        background: 'rgba(6, 10, 20, 0.98)',
        backdropFilter: 'blur(24px)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '-20px 0 80px rgba(0,0,0,0.7)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.35s cubic-bezier(0.34, 1.06, 0.64, 1)',
    };

    // Render the panel but keep it in DOM (transform hides it)
    return (
        <div style={containerStyle}>
            {/* Desktop resize handle */}
            {!isMobile && open && (
                <div
                    onMouseDown={onDragStart}
                    style={{
                        position: 'absolute', left: -4, top: 0, bottom: 0, width: 8,
                        cursor: 'col-resize', zIndex: 10,
                    }}
                >
                    <div style={{
                        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
                        width: 4, height: 40, borderRadius: 4, background: 'rgba(255,255,255,0.15)',
                    }} />
                </div>
            )}
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: 'linear-gradient(135deg, var(--color-sky), #0044bb)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: loading ? '0 0 0 0 rgba(0,200,255,0)' : '0 3px 12px rgba(0,200,255,0.35)',
                        animation: loading ? 'thinking-glow 1.4s ease-in-out infinite' : 'none',
                    }}>
                        <Wind size={16} color="#fff" />
                    </div>
                    <div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                            Sky<span style={{ color: 'var(--color-sky)' }}>Pilot</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(232,237,245,0.35)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{loading ? '✦ Thinking...' : 'AI Flight Advisor'}</span>
                            {messages.length > 0 && !loading && (
                                <span style={{
                                    fontSize: '0.55rem', padding: '2px 6px', borderRadius: 4,
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace'
                                }}>
                                    {messages[messages.length - 1]?.usedModel || 'gemini-3-flash-preview'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {/* Context site chip */}
                    {contextSite && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '3px 8px', borderRadius: 100, maxWidth: 130,
                            background: 'rgba(0,200,255,0.08)', border: '1px solid rgba(0,200,255,0.2)',
                            fontSize: '0.65rem', fontWeight: 600, color: 'var(--color-sky)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                            <MapPin size={9} style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{contextSite.name}</span>
                        </div>
                    )}
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
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column' }}>
                {isEmpty ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0, animation: 'fade-up 0.5s ease' }}>
                        {/* Hero icon */}
                        <div style={{
                            width: 60, height: 60, borderRadius: 18, marginBottom: 18,
                            background: 'linear-gradient(145deg, #0a1a40, #0d2060)',
                            border: '1px solid rgba(0,200,255,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 8px 40px rgba(0,200,255,0.2)',
                            animation: 'float-gentle 5s ease-in-out infinite',
                        }}>
                            <Wind size={28} color="var(--color-sky)" strokeWidth={1.8} style={{ filter: 'drop-shadow(0 0 6px rgba(0,200,255,0.6))' }} />
                        </div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.25rem', color: '#fff', marginBottom: 8, textAlign: 'center' }}>
                            {contextSite ? `Flying at ${contextSite.name}` : 'Sky​Pilot AI'}
                        </div>
                        <p style={{ fontSize: '0.82rem', color: 'rgba(232,237,245,0.45)', textAlign: 'center', marginBottom: 28, lineHeight: 1.65, maxWidth: 340 }}>
                            {contextSite
                                ? `Ask me about conditions, best windows, thermals, or safety at this site.`
                                : 'Ask me about flying conditions, nearby sites, wind at altitude, or the best time to fly.'
                            }
                        </p>
                        {/* 2×2 prompt chip grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {SUGGESTED_PROMPTS.map(p => (
                                <button key={p.text} onClick={() => { setInput(p.text); inputRef.current?.focus(); }}
                                    style={{
                                        background: 'rgba(13,21,40,0.7)', border: '1px solid rgba(255,255,255,0.07)',
                                        borderRadius: 12, padding: '10px 12px',
                                        display: 'flex', flexDirection: 'column', gap: 5,
                                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,200,255,0.3)'; e.currentTarget.style.background = 'rgba(0,200,255,0.06)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(13,21,40,0.7)'; }}
                                >
                                    <span style={{ fontSize: '1rem' }}>{p.icon}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'rgba(232,237,245,0.65)', lineHeight: 1.3 }}>{p.text}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {messages.map((msg, i) => <ChatMessage key={i} message={msg} />)}
                        {loading && <TypingIndicator />}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input area */}
            <div style={{
                padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0,
                paddingBottom: isMobile ? 'max(12px, env(safe-area-inset-bottom))' : '12px'
            }}>
                {/* Location pill */}
                <button onClick={() => setShareLocation(v => !v)} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 100, marginBottom: 10,
                    background: shareLocation && effectiveLocation ? 'var(--color-sky-dim)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${shareLocation && effectiveLocation ? 'rgba(0,200,255,0.35)' : 'rgba(255,255,255,0.08)'}`,
                    color: shareLocation && effectiveLocation ? 'var(--color-sky)' : 'rgba(232,237,245,0.4)',
                    fontSize: '0.73rem', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s ease',
                }}>
                    <LocateFixed size={11} />
                    {effectiveLocation && shareLocation
                        ? contextSite
                            ? `📍 ${contextSite.name}`
                            : `${effectiveLocation.lat.toFixed(3)}, ${effectiveLocation.lng.toFixed(3)}`
                        : 'Share location with AI'}
                </button>

                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about conditions, sites, or weather..."
                        rows={1}
                        style={{
                            flex: 1, background: 'rgba(13,21,40,0.85)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 13, padding: '11px 14px',
                            color: '#e8edf5', fontFamily: 'var(--font-body)', fontSize: '0.88rem',
                            resize: 'none', outline: 'none', lineHeight: 1.5,
                            maxHeight: 100, overflowY: 'auto', transition: 'border-color 0.2s ease',
                        }}
                        onFocus={e => e.target.style.borderColor = 'rgba(0,200,255,0.45)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                    <button onClick={handleSend} disabled={!input.trim() || loading} style={{
                        width: 42, height: 42, borderRadius: 11, border: 'none',
                        background: input.trim() && !loading ? 'linear-gradient(135deg, var(--color-sky), #0055cc)' : 'rgba(255,255,255,0.05)',
                        color: input.trim() && !loading ? '#fff' : 'rgba(232,237,245,0.25)',
                        cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s ease', flexShrink: 0,
                        boxShadow: input.trim() && !loading ? '0 3px 14px rgba(0,200,255,0.3)' : 'none',
                    }}>
                        {loading
                            ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            : <Send size={16} />
                        }
                    </button>
                </div>
                <p style={{ fontSize: '0.65rem', color: 'rgba(232,237,245,0.18)', marginTop: 7, textAlign: 'center' }}>
                    Enter to send · Shift+Enter for new line
                </p>
            </div>
        </div>
    );
}

// ─── Mobile Bottom Sheet for Site Forecast ───────────────────────────────────
function MobileForecaseSheet({ site, onClose, chatContextSite, setChatContextSite, setChatOpen, siteAiVerdict, setSiteAiVerdict }) {
    return (
        <>
            {/* backdrop */}
            <div className="bottom-sheet-overlay" onClick={onClose} />
            {/* sheet */}
            <div className="bottom-sheet" style={{ maxHeight: '88vh' }}>
                <div className="bottom-sheet-handle" />
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 16px 12px' }}>
                    <div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--color-sky)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                            Flyability Forecast
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                            onClick={() => { setChatContextSite({ ...site, aiVerdict: siteAiVerdict }); setChatOpen(true); onClose(); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                background: 'linear-gradient(135deg, var(--color-sky), #0055cc)',
                                color: '#fff', fontSize: '0.72rem', fontWeight: 700,
                                boxShadow: '0 2px 8px rgba(0,200,255,0.3)',
                            }}
                        >
                            <Sparkles size={11} fill="currentColor" />
                            Ask SkyPilot
                        </button>
                        <button onClick={onClose} style={{
                            background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8,
                            width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: 'rgba(232,237,245,0.6)',
                        }}>
                            <X size={15} />
                        </button>
                    </div>
                </div>
                {/* Forecast content */}
                <div style={{ padding: '0 16px', maxHeight: 'calc(88vh - 100px)', overflowY: 'auto' }}>
                    <SiteForecast site={site} onClose={onClose} onVerdictReady={setSiteAiVerdict} />
                </div>
            </div>
        </>
    );
}

// ─── Main MapView ─────────────────────────────────────────────────────────────
export default function MapView() {
    const { location, loading: locLoading, requestLocation } = useGeolocation();
    const isMobile = useIsMobile();
    const [sites, setSites] = useState([]);
    const [loadingSites, setLoadingSites] = useState(false);
    const [selectedSite, setSelectedSite] = useState(null);
    const [distance, setDistance] = useState(30);
    const [mapCenter, setMapCenter] = useState([37.7749, -122.4194]);
    const [mapZoom, setMapZoom] = useState(10);
    const [filter, setFilter] = useState('all');
    const [chatOpen, setChatOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const filterRef = useRef(null);
    const [portalTarget, setPortalTarget] = useState(null);
    const [panelWidthPx, setPanelWidthPx] = useState(440);
    const [chatContextSite, setChatContextSite] = useState(null);
    const [siteAiVerdict, setSiteAiVerdict] = useState(null);
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
            if (filterRef.current && !filterRef.current.contains(event.target)) setShowFilters(false);
        };
        if (showFilters) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showFilters]);

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
    const counts = {
        GO: sites.filter(s => s.rating === 'GO').length,
        MARGINAL: sites.filter(s => s.rating === 'MARGINAL').length,
        NO_GO: sites.filter(s => s.rating === 'NO_GO').length
    };

    // Best site = first GO site, or first MARGINAL
    const bestSite = sites.find(s => s.rating === 'GO') || sites.find(s => s.rating === 'MARGINAL');

    // Drag resize handlers (desktop only)
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
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0d1117', paddingTop: 'var(--navbar-height)' }}>
            <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>

                {/* ── MAP ────────────────────────────────────────────────────── */}
                <div style={{ flex: 1, position: 'relative', transition: 'all 0.3s ease' }}>
                    <MapContainer
                        center={mapCenter}
                        zoom={mapZoom}
                        style={{ width: '100%', height: '100%' }}
                        zoomControl={!isMobile}
                    >
                        {/* Stadia ALIDADE_SMOOTH_DARK — Uber-style: blue water, crisp roads */}
                        <TileLayer
                            url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            maxZoom={20}
                        />
                        <FlyTo center={mapCenter} zoom={mapZoom} />
                        {location && (
                            <>
                                <UserMarker position={[location.lat, location.lng]} />
                                <Circle
                                    center={[location.lat, location.lng]}
                                    radius={distance * 1609.34}
                                    pathOptions={{
                                        color: 'rgba(0,200,255,0.35)',
                                        fillColor: 'rgba(0,200,255,0.03)',
                                        fillOpacity: 1,
                                        weight: 1.5,
                                        dashArray: '6 6'
                                    }}
                                />
                            </>
                        )}
                        {filteredSites.map((site, i) => site.lat && site.lng && (
                            <Marker
                                key={i}
                                position={[site.lat, site.lng]}
                                icon={createMarkerIcon(site.rating)}
                                eventHandlers={{ click: () => { setSelectedSite(site); setChatOpen(false); } }}
                            >
                                <Popup>
                                    <div style={{ minWidth: 200, fontFamily: 'var(--font-body)' }}>
                                        <div style={{ fontWeight: 700, marginBottom: 5, color: '#fff', fontSize: '0.9rem' }}>{site.name}</div>
                                        <div style={{ marginBottom: 8 }}><FlyabilityBadge rating={site.rating} size="sm" /></div>
                                        <div style={{ fontSize: '0.75rem', color: 'rgba(232,237,245,0.5)', marginBottom: 10 }}>
                                            ⛰️ {site.altitude}ft altitude
                                        </div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedSite(site); setChatOpen(false); }}
                                                style={{
                                                    flex: 1, padding: '7px 0',
                                                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                                                    borderRadius: 8, color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                                    transition: 'background 0.2s',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                            >
                                                Forecast
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setChatContextSite(site); setChatOpen(true); setSelectedSite(null); }}
                                                style={{
                                                    flex: 1, padding: '7px 0',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                                    background: 'linear-gradient(135deg, var(--color-sky), #0055cc)',
                                                    border: 'none', borderRadius: 8, color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                                }}
                                            >
                                                <Sparkles size={11} /> Ask AI
                                            </button>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>

                    {/* Quick Stats Bar */}
                    {sites.length > 0 && !loadingSites && (
                        <QuickStatsBar sites={sites} bestSite={bestSite} />
                    )}

                    {/* Loading banner */}
                    {loadingSites && (
                        <div style={{
                            position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
                            background: 'rgba(6,10,20,0.9)', backdropFilter: 'blur(16px)',
                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 100,
                            padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 10,
                            color: '#e8edf5', fontSize: '0.82rem', zIndex: 1300,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        }}>
                            <div style={{ width: 13, height: 13, border: '2px solid var(--color-sky)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            Fetching paragliding sites...
                        </div>
                    )}

                    {/* No location prompt */}
                    {!location && !locLoading && (
                        <div style={{
                            position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
                            background: 'rgba(6,10,20,0.92)', backdropFilter: 'blur(16px)',
                            border: '1px solid rgba(255,179,71,0.3)', borderRadius: 16,
                            padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10,
                            color: '#e8edf5', fontSize: '0.85rem', zIndex: 1300, whiteSpace: 'nowrap',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                        }}>
                            <AlertCircle size={16} color="var(--color-amber)" />
                            Enable location to see sites near you
                            <button onClick={requestLocation} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>
                                Allow
                            </button>
                        </div>
                    )}

                    {/* Filter chips — horizontal scroll on mobile */}
                    {sites.length > 0 && (
                        <div style={{
                            position: 'absolute',
                            bottom: isMobile ? 80 : 20,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex', gap: 7, zIndex: 1200,
                            overflowX: 'auto', maxWidth: isMobile ? 'calc(100vw - 100px)' : 'auto',
                        }}>
                            {[
                                { key: 'all', label: `All ${sites.length}`, color: 'rgba(255,255,255,0.8)' },
                                { key: 'GO', label: `✓ GO ${counts.GO}`, color: 'var(--color-go)' },
                                { key: 'MARGINAL', label: `⚠ ${counts.MARGINAL}`, color: 'var(--color-marginal)' },
                                { key: 'NO_GO', label: `✗ ${counts.NO_GO}`, color: 'var(--color-no-go)' },
                            ].map(({ key, label, color }) => (
                                <button key={key} onClick={() => setFilter(key)} style={{
                                    background: filter === key ? 'rgba(8,13,26,0.97)' : 'rgba(8,13,26,0.75)',
                                    backdropFilter: 'blur(14px)',
                                    border: `1px solid ${filter === key ? color : 'rgba(255,255,255,0.1)'}`,
                                    borderRadius: 100, padding: '7px 14px',
                                    color: filter === key ? color : 'rgba(232,237,245,0.5)',
                                    fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                                    transition: 'all 0.2s ease', whiteSpace: 'nowrap', flexShrink: 0,
                                    boxShadow: filter === key ? `0 0 16px ${color}33` : 'none',
                                }}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* ── Navbar portal: search + controls ── */}
                    {portalTarget && createPortal(
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', maxWidth: 520, justifyContent: 'center' }}>
                            {!isMobile && (
                                <div style={{ flex: 1, maxWidth: 340 }}>
                                    <SiteSearch onSiteSelect={handleSiteSearchSelect} center={mapCenter} />
                                </div>
                            )}

                            <button
                                onClick={() => { requestLocation(); if (location) { setMapCenter([location.lat, location.lng]); setMapZoom(11); fetchSites(location, distance); } }}
                                title="Detect my location"
                                style={{
                                    width: 38, height: 38,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: location ? 'var(--color-sky-dim)' : 'transparent',
                                    border: `1px solid ${location ? 'rgba(0,200,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                    borderRadius: 10, color: location ? 'var(--color-sky)' : 'rgba(232,237,245,0.7)',
                                    cursor: 'pointer', transition: 'all 0.2s ease',
                                }}
                            >
                                {locLoading
                                    ? <div style={{ width: 14, height: 14, border: '2px solid var(--color-sky)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                    : <LocateFixed size={15} />
                                }
                            </button>

                            {isMobile && (
                                <div style={{ flex: 1, maxWidth: 200 }}>
                                    <SiteSearch onSiteSelect={handleSiteSearchSelect} center={mapCenter} />
                                </div>
                            )}

                            {/* Filter/radius button */}
                            <div style={{ position: 'relative' }} ref={filterRef}>
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    title="Search radius"
                                    style={{
                                        width: 38, height: 38,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: showFilters ? 'var(--color-sky-dim)' : 'transparent',
                                        border: `1px solid ${showFilters ? 'rgba(0,200,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                        borderRadius: 10, color: showFilters ? 'var(--color-sky)' : 'rgba(232,237,245,0.7)',
                                        cursor: 'pointer', transition: 'all 0.2s ease',
                                    }}
                                >
                                    <SlidersHorizontal size={15} />
                                </button>

                                {showFilters && (
                                    <div style={{
                                        position: 'absolute', top: 48, right: 0,
                                        width: 260,
                                        background: 'rgba(6,10,20,0.98)', backdropFilter: 'blur(24px)',
                                        border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16,
                                        padding: '16px', boxShadow: '0 12px 48px rgba(0,0,0,0.7)',
                                        zIndex: 10000,
                                        animation: 'slide-down 0.2s ease',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>Search Radius</span>
                                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-sky)', background: 'rgba(0,200,255,0.1)', padding: '2px 8px', borderRadius: 8 }}>
                                                    {distance} mi
                                                </span>
                                            </div>
                                            <button onClick={() => setShowFilters(false)} style={{
                                                background: 'transparent', border: 'none', color: 'rgba(232,237,245,0.5)',
                                                cursor: 'pointer', padding: 4, borderRadius: 6,
                                            }}>
                                                <X size={14} />
                                            </button>
                                        </div>

                                        <input type="range" min={5} max={60} step={5} value={distance}
                                            onChange={e => handleDistanceChange(parseInt(e.target.value))}
                                            style={{
                                                width: '100%', appearance: 'none', height: 4,
                                                background: `linear-gradient(to right, var(--color-sky) ${(distance - 5) / (60 - 5) * 100}%, rgba(255,255,255,0.1) ${(distance - 5) / (60 - 5) * 100}%)`,
                                                borderRadius: 100, outline: 'none', cursor: 'pointer', margin: '0 0 20px 0',
                                            }}
                                        />

                                        {sites.length > 0 && (
                                            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                                                <div style={{ fontSize: '0.72rem', color: 'rgba(232,237,245,0.45)', marginBottom: 10, textAlign: 'center', fontWeight: 500 }}>
                                                    {sites.length} sites found
                                                </div>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    {[['GO', counts.GO, 'var(--color-go)'], ['MARG.', counts.MARGINAL, 'var(--color-marginal)'], ['NO-GO', counts.NO_GO, 'var(--color-no-go)']].map(([label, count, color]) => (
                                                        <div key={label} style={{ textAlign: 'center', flex: 1, background: 'rgba(0,0,0,0.2)', padding: '8px 4px', borderRadius: 8 }}>
                                                            <div style={{ fontSize: '1.05rem', fontWeight: 700, color, fontFamily: 'var(--font-heading)' }}>{count}</div>
                                                            <div style={{ fontSize: '0.6rem', color: 'rgba(232,237,245,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{label}</div>
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

                    {/* ── Desktop: Site detail panel (draggable) ── */}
                    {!isMobile && selectedSite && (
                        <div style={{
                            position: 'absolute', left: 12, top: 12, bottom: 12,
                            width: panelWidthPx,
                            background: 'rgba(6, 10, 20, 0.97)',
                            backdropFilter: 'blur(24px)',
                            borderRadius: 18, border: '1px solid rgba(255,255,255,0.09)',
                            overflowY: 'auto', padding: '14px 16px',
                            zIndex: 1000, animation: 'slide-in-right 0.3s ease',
                            display: 'flex', flexDirection: 'column',
                            boxShadow: '0 8px 48px rgba(0,0,0,0.7)',
                            transition: isDragging.current ? 'none' : 'width 0.25s ease',
                        }}>
                            {/* Panel header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexShrink: 0 }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--color-sky)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                    Flyability Forecast
                                </span>
                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                    <button
                                        onClick={() => { setChatContextSite({ ...selectedSite, aiVerdict: siteAiVerdict }); setChatOpen(true); }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 5,
                                            padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                            background: 'linear-gradient(135deg, var(--color-sky), #0055cc)',
                                            color: '#fff', fontSize: '0.72rem', fontWeight: 700,
                                            boxShadow: '0 2px 8px rgba(0,200,255,0.3)',
                                            transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,200,255,0.5)'}
                                        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,200,255,0.3)'}
                                    >
                                        <Sparkles size={11} fill="currentColor" /> Ask SkyPilot
                                    </button>
                                    {[[440, <Minimize2 size={12} />, 'Compact'], [680, <Columns size={12} />, 'Wide'], [940, <Maximize2 size={12} />, 'Expand']].map(([w, icon, label]) => (
                                        <button key={w} onClick={() => setPanelWidthPx(w)} title={label} style={{
                                            background: panelWidthPx === w ? 'rgba(0,200,255,0.15)' : 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${panelWidthPx === w ? 'rgba(0,200,255,0.35)' : 'rgba(255,255,255,0.08)'}`,
                                            borderRadius: 7, width: 26, height: 26, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: panelWidthPx === w ? 'var(--color-sky)' : 'rgba(232,237,245,0.4)',
                                            transition: 'all 0.18s ease',
                                        }}>{icon}</button>
                                    ))}
                                    <button onClick={() => setSelectedSite(null)} style={{
                                        background: 'rgba(255,255,255,0.06)', border: 'none',
                                        borderRadius: 7, width: 26, height: 26, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'rgba(232,237,245,0.6)', marginLeft: 2,
                                    }}>
                                        <X size={13} />
                                    </button>
                                </div>
                            </div>
                            <SiteForecast site={selectedSite} onClose={() => setSelectedSite(null)} onVerdictReady={(v) => setSiteAiVerdict(v)} />
                            {/* Drag handle */}
                            <div
                                onMouseDown={handleDragStart}
                                style={{
                                    position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)',
                                    width: 24, height: 80, cursor: 'col-resize', zIndex: 10,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <div style={{
                                    width: 14, height: 56, borderRadius: 8,
                                    background: 'rgba(0,200,255,0.35)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.2s ease',
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,200,255,0.75)'; e.currentTarget.style.width = '18px'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,200,255,0.35)'; e.currentTarget.style.width = '14px'; }}
                                >
                                    <GripVertical size={11} color="#fff" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Mobile: Bottom Sheet for forecast ── */}
                    {isMobile && selectedSite && (
                        <MobileForecaseSheet
                            site={selectedSite}
                            onClose={() => setSelectedSite(null)}
                            chatContextSite={chatContextSite}
                            setChatContextSite={setChatContextSite}
                            setChatOpen={setChatOpen}
                            siteAiVerdict={siteAiVerdict}
                            setSiteAiVerdict={setSiteAiVerdict}
                        />
                    )}
                </div>

                {/* ── Chat Drawer ───────────────────────────────────────────── */}
                <ChatDrawer
                    open={chatOpen}
                    onClose={() => setChatOpen(false)}
                    location={location}
                    contextSite={chatContextSite}
                    isMobile={isMobile}
                    width={panelWidthPx}
                    onDragStart={handleDragStart}
                />


                {/* ── FAB on mobile / vertical tab on desktop ── */}
                {!chatOpen && (
                    isMobile ? (
                        // Mobile: circular FAB
                        <button
                            className="fab"
                            onClick={() => {
                                if (selectedSite) setChatContextSite({ ...selectedSite, aiVerdict: siteAiVerdict });
                                setChatOpen(true);
                            }}
                            title="Ask SkyPilot"
                        >
                            <Sparkles size={22} fill="currentColor" />
                        </button>
                    ) : (
                        // Desktop: vertical tab
                        <button
                            onClick={() => {
                                if (selectedSite) setChatContextSite({ ...selectedSite, aiVerdict: siteAiVerdict });
                                setChatOpen(true);
                            }}
                            style={{
                                position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                                zIndex: 3000,
                                background: 'linear-gradient(135deg, var(--color-sky), #0055cc)',
                                border: 'none', borderRadius: '12px 0 0 12px',
                                padding: '14px 10px', cursor: 'pointer',
                                boxShadow: '-4px 0 24px rgba(0,200,255,0.35)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                                color: '#fff', transition: 'all 0.2s ease',
                                writingMode: 'vertical-rl',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.boxShadow = '-6px 0 32px rgba(0,200,255,0.55)'; e.currentTarget.style.paddingLeft = '13px'; }}
                            onMouseLeave={e => { e.currentTarget.style.boxShadow = '-4px 0 24px rgba(0,200,255,0.35)'; e.currentTarget.style.paddingLeft = '10px'; }}
                        >
                            <Sparkles size={16} fill="currentColor" />
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                Ask SkyPilot
                            </span>
                        </button>
                    )
                )}
            </div>
        </div>
    );
}

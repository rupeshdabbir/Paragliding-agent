import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, X, Wind, Loader } from 'lucide-react';

export default function SiteSearch({ onSiteSelect, placeholder = 'Search a paragliding site...' }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);

    const doSearch = useCallback(async (q) => {
        if (q.length < 2) { setResults([]); setOpen(false); return; }
        setLoading(true);
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`);
            const data = await res.json();
            setResults(data.results || []);
            setOpen(true);
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(val), 350);
    };

    const handleSelect = (site) => {
        setQuery(site.name);
        setOpen(false);
        onSiteSelect(site);
    };

    const handleClear = () => {
        setQuery('');
        setResults([]);
        setOpen(false);
        inputRef.current?.focus();
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (!inputRef.current?.closest('.site-search-wrapper')?.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="site-search-wrapper" style={{ position: 'relative', width: '100%' }}>
            {/* Input */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(13,21,40,0.9)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: '10px 14px',
                transition: 'border-color 0.2s ease',
                ...(open ? { borderColor: 'rgba(0,200,255,0.4)', boxShadow: '0 0 0 3px rgba(0,200,255,0.08)' } : {}),
            }}>
                {loading
                    ? <Loader size={15} color="var(--color-sky)" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                    : <Search size={15} color="rgba(232,237,245,0.4)" style={{ flexShrink: 0 }} />
                }
                <input
                    ref={inputRef}
                    value={query}
                    onChange={handleChange}
                    onFocus={() => results.length > 0 && setOpen(true)}
                    placeholder={placeholder}
                    style={{
                        flex: 1, background: 'transparent', border: 'none', outline: 'none',
                        color: '#e8edf5', fontFamily: 'var(--font-body)', fontSize: '0.88rem',
                    }}
                />
                {query && (
                    <button onClick={handleClear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,237,245,0.35)', padding: 2, display: 'flex' }}>
                        <X size={13} />
                    </button>
                )}
            </div>

            {/* Dropdown results */}
            {open && results.length > 0 && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 9999,
                    background: 'rgba(10, 16, 30, 0.98)', backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
                    overflow: 'hidden',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                    animation: 'fade-up 0.2s ease',
                }}>
                    {results.map((site, i) => (
                        <button key={i} onClick={() => handleSelect(site)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                width: '100%', padding: '11px 14px', textAlign: 'left',
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                transition: 'background 0.15s ease', color: '#e8edf5',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,200,255,0.07)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{
                                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                                background: 'rgba(0,200,255,0.1)', border: '1px solid rgba(0,200,255,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Wind size={13} color="var(--color-sky)" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.87rem', fontWeight: 600, color: '#fff', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {site.name}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'rgba(232,237,245,0.4)', display: 'flex', gap: 6 }}>
                                    {site.siteTypes?.paragliding && <span>Paragliding</span>}
                                    {site.siteTypes?.ridgeSoaring && <span>· Ridge Soaring</span>}
                                    {site.siteTypes?.thermaling && <span>· Thermals</span>}
                                    {site.altitude > 0 && <span>· {site.altitude}ft alt</span>}
                                </div>
                            </div>
                            <MapPin size={12} color="rgba(232,237,245,0.25)" style={{ flexShrink: 0 }} />
                        </button>
                    ))}
                </div>
            )}

            {/* No results */}
            {open && !loading && results.length === 0 && query.length >= 2 && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 9999,
                    background: 'rgba(10,16,30,0.98)', backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
                    padding: '14px', textAlign: 'center',
                    fontSize: '0.82rem', color: 'rgba(232,237,245,0.4)',
                }}>
                    No sites found for "{query}"
                </div>
            )}
        </div>
    );
}

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, X, Wind, Loader } from 'lucide-react';

export default function SiteSearch({ onSiteSelect, center, placeholder = 'Search PG Site...' }) {
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
            let url = `/api/search?q=${encodeURIComponent(q)}&limit=8`;
            if (center && center.length === 2) {
                url += `&lat=${center[0]}&lng=${center[1]}`;
            }
            const res = await fetch(url);
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
                background: 'var(--color-input-bg)', border: '1px solid var(--color-border-base)',
                borderRadius: 12, padding: '10px 14px',
                transition: 'border-color 0.2s ease',
                ...(open ? { borderColor: 'var(--color-border-glow)', boxShadow: '0 0 0 3px var(--color-sky-dim)' } : {}),
            }}>
                {loading
                    ? <Loader size={15} color="var(--color-sky)" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                    : <Search size={15} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />
                }
                <input
                    ref={inputRef}
                    value={query}
                    onChange={handleChange}
                    onFocus={() => results.length > 0 && setOpen(true)}
                    placeholder={placeholder}
                    style={{
                        flex: 1, background: 'transparent', border: 'none', outline: 'none',
                        color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', fontSize: '0.88rem',
                    }}
                />
                {query && (
                    <button onClick={handleClear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-dim)', padding: 2, display: 'flex' }}>
                        <X size={13} />
                    </button>
                )}
            </div>

            {/* Dropdown results */}
            {open && results.length > 0 && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 9999,
                    background: 'var(--color-surface-overlay)', backdropFilter: 'blur(20px)',
                    border: '1px solid var(--color-border-base)', borderRadius: 12,
                    overflow: 'hidden',
                    boxShadow: 'var(--color-elevation-lg)',
                    animation: 'fade-up 0.2s ease',
                }}>
                    {results.map((site, i) => (
                        <button key={i} onClick={() => handleSelect(site)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                width: '100%', padding: '11px 14px', textAlign: 'left',
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                borderBottom: i < results.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                                transition: 'background 0.15s ease', color: 'var(--color-text-primary)',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-sky-dim)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{
                                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                                background: 'var(--color-sky-dim)', border: '1px solid var(--color-border-glow)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Wind size={13} color="var(--color-sky)" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.87rem', fontWeight: 600, color: 'var(--color-text-heading)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {site.name}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', display: 'flex', gap: 6 }}>
                                    {site.siteTypes?.paragliding && <span>Paragliding</span>}
                                    {site.siteTypes?.ridgeSoaring && <span>· Ridge Soaring</span>}
                                    {site.siteTypes?.thermaling && <span>· Thermals</span>}
                                    {site.altitude > 0 && <span>· {site.altitude}ft alt</span>}
                                </div>
                            </div>
                            <MapPin size={12} color="var(--color-text-faint)" style={{ flexShrink: 0 }} />
                        </button>
                    ))}
                </div>
            )}

            {/* No results */}
            {open && !loading && results.length === 0 && query.length >= 2 && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 9999,
                    background: 'var(--color-surface-overlay)', backdropFilter: 'blur(20px)',
                    border: '1px solid var(--color-border-base)', borderRadius: 12,
                    padding: '14px', textAlign: 'center',
                    fontSize: '0.82rem', color: 'var(--color-text-dim)',
                }}>
                    No sites found for "{query}"
                </div>
            )}
        </div>
    );
}

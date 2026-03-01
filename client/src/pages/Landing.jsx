import { useNavigate } from 'react-router-dom';
import { MessageSquare, Map, Wind, ChevronRight, Cloud, Thermometer, Eye } from 'lucide-react';
import { useEffect, useRef } from 'react';

// Animated wind particles
function WindParticles() {
    return (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} style={{
                    position: 'absolute',
                    top: `${10 + Math.random() * 80}%`,
                    left: '-5%',
                    width: `${30 + Math.random() * 80}px`,
                    height: '1.5px',
                    background: `linear-gradient(90deg, transparent, rgba(0,200,255,${0.1 + Math.random() * 0.25}), transparent)`,
                    borderRadius: '100px',
                    animation: `wind-particle ${4 + Math.random() * 8}s linear ${Math.random() * 8}s infinite`,
                }} />
            ))}
        </div>
    );
}

// Mountain silhouette SVG
function Mountains() {
    return (
        <svg
            viewBox="0 0 1440 400"
            preserveAspectRatio="none"
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', height: '45%', opacity: 0.9 }}
        >
            {/* Back mountains */}
            <polygon points="0,400 0,280 120,180 240,250 380,120 520,200 640,100 760,180 880,90 1000,170 1120,80 1240,160 1360,100 1440,150 1440,400" fill="#0d1528" />
            {/* Mid mountains */}
            <polygon points="0,400 0,320 100,240 200,290 320,200 440,260 560,170 680,230 800,160 920,220 1040,150 1160,210 1280,170 1440,200 1440,400" fill="#111c35" />
            {/* Snow caps */}
            <polygon points="100,240 120,225 140,240" fill="rgba(255,255,255,0.15)" />
            <polygon points="380,120 400,103 420,120" fill="rgba(255,255,255,0.15)" />
            <polygon points="640,100 660,82 680,100" fill="rgba(255,255,255,0.18)" />
            <polygon points="880,90 900,72 920,90" fill="rgba(255,255,255,0.2)" />
            <polygon points="1120,80 1140,62 1160,80" fill="rgba(255,255,255,0.15)" />
            {/* Front dark layer */}
            <polygon points="0,400 0,370 200,330 400,360 600,320 800,350 1000,310 1200,345 1440,320 1440,400" fill="#080d1a" />
        </svg>
    );
}

export default function Landing() {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '100vh',
            background: 'radial-gradient(ellipse at 20% 20%, #0a1e3d 0%, #080d1a 50%, #04080f 100%)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            {/* Sky gradient overlay */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at 50% 5%, rgba(0,100,200,0.18) 0%, transparent 60%)',
                pointerEvents: 'none',
            }} />

            <WindParticles />
            <Mountains />

            {/* Content */}
            <div style={{
                position: 'relative', zIndex: 10,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                textAlign: 'center', padding: '0 24px',
                maxWidth: 720, width: '100%',
                animation: 'fade-up 0.8s ease forwards',
            }}>

                {/* Badge pill */}
                <div style={{
                    marginBottom: 24,
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '6px 16px',
                    borderRadius: 100,
                    background: 'rgba(0, 200, 255, 0.08)',
                    border: '1px solid rgba(0, 200, 255, 0.25)',
                    fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-sky)',
                    letterSpacing: '0.04em', textTransform: 'uppercase',
                    animation: 'float 4s ease-in-out infinite',
                }}>
                    <Wind size={13} />
                    AI-Powered Paragliding Intelligence
                </div>

                {/* Headline */}
                <h1 style={{
                    fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
                    fontWeight: 800, color: '#fff',
                    lineHeight: 1.05, marginBottom: 20,
                    letterSpacing: '-0.04em',
                }}>
                    Know Before<br />
                    <span style={{
                        background: 'linear-gradient(135deg, var(--color-sky) 0%, #60a5fa 50%, #a78bfa 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>
                        You Fly
                    </span>
                </h1>

                {/* Subtitle */}
                <p style={{
                    fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
                    color: 'rgba(232, 237, 245, 0.65)',
                    maxWidth: 520, marginBottom: 48,
                    lineHeight: 1.65,
                }}>
                    Real-time GO / MARGINAL / NO-GO assessments for paragliding sites near you. Powered by live weather data and AI analysis.
                </p>

                {/* CTA Cards */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: 16, width: '100%', maxWidth: 640
                }}>
                    <CTACard
                        icon={<MessageSquare size={28} color="var(--color-sky)" />}
                        title="Ask SkyPilot"
                        description="Chat with our AI agent. Ask anything about conditions, sites, and the best time to fly."
                        accentColor="var(--color-sky)"
                        accentDim="var(--color-sky-dim)"
                        onClick={() => navigate('/chat')}
                    />
                    <CTACard
                        icon={<Map size={28} color="var(--color-amber)" />}
                        title="Explore Map"
                        description="See all paragliding sites near you on an interactive map with real-time flyability indicators."
                        accentColor="var(--color-amber)"
                        accentDim="var(--color-amber-dim)"
                        onClick={() => navigate('/map')}
                    />
                </div>

                {/* Feature pills */}
                <div style={{ display: 'flex', gap: 12, marginTop: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {[
                        { icon: <Wind size={13} />, label: 'Multi-altitude wind data' },
                        { icon: <Cloud size={13} />, label: 'Live cloud & precip' },
                        { icon: <Eye size={13} />, label: 'Visibility forecasts' },
                        { icon: <Thermometer size={13} />, label: 'Thermal analysis' },
                    ].map(({ icon, label }) => (
                        <div key={label} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 14px', borderRadius: 100,
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            fontSize: '0.78rem', color: 'rgba(232,237,245,0.55)',
                        }}>
                            {icon}{label}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function CTACard({ icon, title, description, accentColor, accentDim, onClick }) {
    return (
        <button onClick={onClick} style={{
            background: 'rgba(13, 21, 40, 0.7)',
            backdropFilter: 'blur(20px)',
            border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: 20,
            padding: '28px 24px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.25s ease',
            color: 'inherit',
            display: 'flex', flexDirection: 'column', gap: 12,
            position: 'relative', overflow: 'hidden',
        }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = accentColor + '55';
                e.currentTarget.style.boxShadow = `0 16px 48px rgba(0,0,0,0.4), 0 0 40px ${accentDim}`;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            {/* Accent glow orb */}
            <div style={{
                position: 'absolute', top: -30, right: -30,
                width: 100, height: 100,
                background: `radial-gradient(circle, ${accentDim} 0%, transparent 70%)`,
                pointerEvents: 'none',
            }} />

            <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: accentDim,
                border: `1px solid ${accentColor}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                {icon}
            </div>

            <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', color: '#fff', marginBottom: 6 }}>
                    {title}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(232,237,245,0.55)', lineHeight: 1.55 }}>
                    {description}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: accentColor, fontSize: '0.83rem', fontWeight: 600, marginTop: 4 }}>
                Get started <ChevronRight size={14} />
            </div>
        </button>
    );
}

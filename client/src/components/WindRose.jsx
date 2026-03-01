// WindRose SVG component - shows which directions a site accepts
export default function WindRose({ windDirections = {}, currentWindDeg, size = 120 }) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const cx = size / 2;
    const cy = size / 2;
    const outerR = (size / 2) - 8;
    const innerR = outerR * 0.35;

    const ratingColors = {
        0: 'rgba(255,255,255,0.06)',
        1: 'rgba(245,158,11,0.35)',
        2: 'rgba(34,197,94,0.5)',
    };

    const ratingStroke = {
        0: 'rgba(255,255,255,0.1)',
        1: 'rgba(245,158,11,0.6)',
        2: 'rgba(34,197,94,0.8)',
    };

    // Convert direction index to angle (N=top = -90deg in SVG)
    const dirToAngle = (index) => (index * 45 - 90) * (Math.PI / 180);

    // Build pie slices
    const slices = directions.map((dir, i) => {
        const rating = parseInt(windDirections[dir] || '0', 10);
        const startAngle = dirToAngle(i - 0.5);
        const endAngle = dirToAngle(i + 0.5);

        const x1 = cx + outerR * Math.cos(startAngle);
        const y1 = cy + outerR * Math.sin(startAngle);
        const x2 = cx + outerR * Math.cos(endAngle);
        const y2 = cy + outerR * Math.sin(endAngle);
        const ix1 = cx + innerR * Math.cos(startAngle);
        const iy1 = cy + innerR * Math.sin(startAngle);
        const ix2 = cx + innerR * Math.cos(endAngle);
        const iy2 = cy + innerR * Math.sin(endAngle);

        const d = [
            `M ${ix1} ${iy1}`,
            `L ${x1} ${y1}`,
            `A ${outerR} ${outerR} 0 0 1 ${x2} ${y2}`,
            `L ${ix2} ${iy2}`,
            `A ${innerR} ${innerR} 0 0 0 ${ix1} ${iy1}`,
            'Z'
        ].join(' ');

        return { dir, rating, d };
    });

    // Labels
    const labels = directions.map((dir, i) => {
        const angle = dirToAngle(i);
        const labelR = outerR + 13;
        const x = cx + labelR * Math.cos(angle);
        const y = cy + labelR * Math.sin(angle);
        return { dir, x, y };
    });

    // Current wind arrow
    let windArrow = null;
    if (currentWindDeg !== undefined && currentWindDeg !== null) {
        const rad = (currentWindDeg - 90) * (Math.PI / 180);
        const arrowLen = outerR * 0.75;
        const ax = cx + arrowLen * Math.cos(rad);
        const ay = cy + arrowLen * Math.sin(rad);
        windArrow = { x1: cx, y1: cy, x2: ax, y2: ay };
    }

    return (
        <svg width={size + 30} height={size + 30} style={{ overflow: 'visible', display: 'block' }}>
            <g transform="translate(15, 15)">
                {/* Background circle */}
                <circle cx={cx} cy={cy} r={outerR} fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
                <circle cx={cx} cy={cy} r={innerR} fill="rgba(8,13,26,0.8)" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />

                {/* Slices */}
                {slices.map(({ dir, rating, d }) => (
                    <path key={dir} d={d}
                        fill={ratingColors[rating]}
                        stroke={ratingStroke[rating]}
                        strokeWidth={0.5}
                    />
                ))}

                {/* Direction labels */}
                {labels.map(({ dir, x, y }) => (
                    <text key={dir} x={x} y={y}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize={dir.length === 1 ? 9 : 7}
                        fontWeight={700}
                        fill="rgba(232,237,245,0.5)"
                        fontFamily="var(--font-body)"
                    >
                        {dir}
                    </text>
                ))}

                {/* Current wind arrow */}
                {windArrow && (
                    <>
                        <line
                            x1={windArrow.x1} y1={windArrow.y1}
                            x2={windArrow.x2} y2={windArrow.y2}
                            stroke="var(--color-sky)"
                            strokeWidth={2}
                            strokeLinecap="round"
                            markerEnd="url(#arrowhead)"
                        />
                        <defs>
                            <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                                <polygon points="0 0, 6 3, 0 6" fill="var(--color-sky)" />
                            </marker>
                        </defs>
                    </>
                )}

                {/* Center dot */}
                <circle cx={cx} cy={cy} r={4} fill="rgba(232,237,245,0.3)" />
            </g>
        </svg>
    );
}

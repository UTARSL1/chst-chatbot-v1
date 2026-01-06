import React, { useMemo } from 'react';

interface Grant {
    id: string;
    fundingAmount: number;
    commencementDate?: string;
}

interface RCGrantYearlyBarChartProps {
    grants: Grant[];
}

const RCGrantYearlyBarChart: React.FC<RCGrantYearlyBarChartProps> = ({ grants }) => {

    const chartData = useMemo(() => {
        // Defined buckets as per request
        const buckets: Record<string, number> = {
            'Up to 2021': 0,
            '2022': 0,
            '2023': 0,
            '2024': 0,
            '2025': 0
        };

        let hasData = false;

        grants.forEach(grant => {
            if (!grant.commencementDate) return;

            // Extract year
            const yearMatch = grant.commencementDate.toString().match(/\b(19|20)\d{2}\b/);

            if (yearMatch) {
                const year = parseInt(yearMatch[0], 10);
                const amount = Number(grant.fundingAmount);

                if (year <= 2021) {
                    buckets['Up to 2021'] += amount;
                    hasData = true;
                } else if (year >= 2022 && year <= 2025) {
                    buckets[year.toString()] += amount;
                    hasData = true;
                }
            }
        });

        if (!hasData) return [];

        return Object.entries(buckets).map(([label, amount]) => ({
            label,
            amount
        }));
    }, [grants]);

    // Format currency for tooltip/axis
    const formatCurrency = (val: number) => {
        if (val >= 1000000) return `RM${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `RM${(val / 1000).toFixed(0)}k`;
        return `RM${val}`;
    };

    if (chartData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 h-full w-full">
                <div className="text-gray-500 text-xs text-center">No grant data in range (≤2025)</div>
            </div>
        );
    }

    // Chart dimensions
    const height = 220; // Increased height slightly
    const width = 320;
    const padding = { top: 30, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Scales
    const maxAmount = Math.max(...chartData.map(d => d.amount));
    // Add 15% headroom
    const yMax = maxAmount > 0 ? maxAmount * 1.15 : 1000;

    // Bar properties
    const barWidth = 40; // Fixed width for cleaner look since we have fixed 5 buckets
    const gap = (chartWidth - (barWidth * chartData.length)) / (chartData.length + 1);

    return (
        <div className="flex flex-col items-center w-full">
            <h3 className="text-gray-400 text-xs mb-2 uppercase tracking-wider font-semibold">Funding Distribution</h3>
            <div className="relative">
                <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                    {/* Y Axis Grid Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => {
                        const yVal = yMax * tick;
                        const yPos = padding.top + chartHeight - (chartHeight * tick);
                        return (
                            <g key={i}>
                                <line
                                    x1={padding.left}
                                    y1={yPos}
                                    x2={width - padding.right}
                                    y2={yPos}
                                    stroke="#334155"
                                    strokeWidth="1"
                                    strokeDasharray="4 4"
                                    opacity="0.3"
                                />
                                <text
                                    x={padding.left - 8}
                                    y={yPos}
                                    dy="3"
                                    textAnchor="end"
                                    className="fill-gray-500 text-[9px]"
                                >
                                    {formatCurrency(yVal)}
                                </text>
                            </g>
                        );
                    })}

                    {/* Bars */}
                    {chartData.map((d, i) => {
                        const barHeight = (d.amount / yMax) * chartHeight;
                        const x = padding.left + gap + (i * (barWidth + gap));
                        const y = padding.top + chartHeight - barHeight;

                        return (
                            <g key={d.label} className="group cursor-pointer">
                                <rect
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={barHeight}
                                    className="fill-blue-500/80 hover:fill-blue-400 transition-all duration-300"
                                    rx="3" // Rounded corners
                                />
                                {/* Tooltip Trigger */}
                                <title>{`${d.label}\nAmount: RM ${d.amount.toLocaleString()}`}</title>

                                {/* value Label on top of bar */}
                                {d.amount > 0 && (
                                    <text
                                        x={x + barWidth / 2}
                                        y={y - 6}
                                        textAnchor="middle"
                                        className="fill-blue-300 text-[9px] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        {formatCurrency(d.amount)}
                                    </text>
                                )}

                                {/* X Axis Label */}
                                <text
                                    x={x + barWidth / 2}
                                    y={height - 20}
                                    textAnchor="middle"
                                    className="fill-gray-400 text-[10px] font-medium"
                                >
                                    {/* Simple mapping for labels to be concise */}
                                    {d.label === 'Up to 2021' ? '≤ 2021' : d.label}
                                </text>
                            </g>
                        );
                    })}

                    {/* Axis Lines */}
                    <line
                        x1={padding.left}
                        y1={padding.top}
                        x2={padding.left}
                        y2={height - padding.bottom}
                        stroke="#475569"
                        strokeWidth="1"
                    />
                    <line
                        x1={padding.left}
                        y1={height - padding.bottom}
                        x2={width - padding.right}
                        y2={height - padding.bottom}
                        stroke="#475569"
                        strokeWidth="1"
                    />

                </svg>
            </div>
        </div>
    );
};

export default RCGrantYearlyBarChart;

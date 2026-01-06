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
        // 1. Aggregate funding by year
        const yearlyData: Record<number, number> = {};

        grants.forEach(grant => {
            if (!grant.commencementDate) return;

            // Extract the first 4-digit year found in the string
            // This handles "2021-2024" -> 2021, "15/05/2022" -> 2022
            const yearMatch = grant.commencementDate.toString().match(/\b(19|20)\d{2}\b/);

            if (yearMatch) {
                const year = parseInt(yearMatch[0], 10);
                yearlyData[year] = (yearlyData[year] || 0) + Number(grant.fundingAmount);
            }
        });

        // 2. Convert to array and sort by year
        const years = Object.keys(yearlyData).map(Number).sort((a, b) => a - b);

        if (years.length === 0) return [];

        // Fill in gaps if cleaner chart needed? For now, just show active years.

        const data = years.map(year => ({
            year,
            amount: yearlyData[year]
        }));

        return data;
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
                <div className="text-gray-500 text-xs">No yearly data available</div>
            </div>
        );
    }

    // Chart dimensions
    const height = 200;
    const width = 300;
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Scales
    const maxAmount = Math.max(...chartData.map(d => d.amount));
    // Add 10% headroom
    const yMax = maxAmount * 1.1;

    // Bar properties
    const barWidth = Math.min(40, chartWidth / chartData.length * 0.6);
    const gap = (chartWidth - (barWidth * chartData.length)) / (chartData.length + 1);

    return (
        <div className="flex flex-col items-center w-full">
            <h3 className="text-gray-400 text-xs mb-2 uppercase tracking-wider font-semibold">Funding by Year</h3>
            <div className="relative">
                <svg width="100%" height="200" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
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
                            <g key={d.year} className="group cursor-pointer">
                                <rect
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={barHeight}
                                    className="fill-blue-500/80 hover:fill-blue-400 transition-all duration-300"
                                    rx="2"
                                />
                                {/* Tooltip Trigger */}
                                <title>{`Year: ${d.year}\nAmount: RM ${d.amount.toLocaleString()}`}</title>

                                {/* Label on top of bar if space permits */}
                                {barHeight > 20 && (
                                    <text
                                        x={x + barWidth / 2}
                                        y={y - 5}
                                        textAnchor="middle"
                                        className="fill-white text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        {formatCurrency(d.amount)}
                                    </text>
                                )}

                                {/* X Axis Label (Year) */}
                                <text
                                    x={x + barWidth / 2}
                                    y={height - 10}
                                    textAnchor="middle"
                                    className="fill-gray-400 text-[10px] font-medium"
                                >
                                    {d.year}
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

import React, { useMemo } from 'react';

interface Grant {
    id: string;
    fundingAmount: number;
    grantType: string; // 'INTERNAL' or 'EXTERNAL'
    role: string; // 'PRINCIPAL INVESTIGATOR' or 'CO-RESEARCHER'
}

interface RCGrantDonutChartProps {
    grants: Grant[];
    totalFunding: number;
}

const RCGrantDonutChart: React.FC<RCGrantDonutChartProps> = ({ grants, totalFunding }) => {
    console.log('RCGrantDonutChart rendering with:', { grantsCount: grants?.length, totalFunding });

    // Process data for the chart
    const data = useMemo(() => {
        // Calculate totals
        const formattedTotalFunding = totalFunding;

        // External
        const externalGrants = grants.filter(g => g.grantType !== 'INTERNAL');
        const externalFunding = externalGrants.reduce((sum, g) => sum + Number(g.fundingAmount), 0);
        const externalCount = externalGrants.length;
        const externalPiCount = externalGrants.filter(g => g.role === 'PRINCIPAL INVESTIGATOR').length;

        // Internal
        const internalGrants = grants.filter(g => g.grantType === 'INTERNAL');
        const internalFunding = internalGrants.reduce((sum, g) => sum + Number(g.fundingAmount), 0);
        const internalCount = internalGrants.length;
        const internalPiCount = internalGrants.filter(g => g.role === 'PRINCIPAL INVESTIGATOR').length;

        // Calculate percentages (angles)
        // Ensure we don't divide by zero
        const safeTotalFunding = formattedTotalFunding > 0 ? formattedTotalFunding : 1;

        const externalPercentage = (externalFunding / safeTotalFunding) * 100;
        const internalPercentage = (internalFunding / safeTotalFunding) * 100;

        // Calculate chart geometry
        // Circumference = 2 * PI * r
        // r = 40 (for a 100x100 SVG viewbox with stroke width 20)
        const radius = 40;
        const circumference = 2 * Math.PI * radius;

        // Arc lengths
        const externalArcLength = (externalPercentage / 100) * circumference;
        const internalArcLength = (internalPercentage / 100) * circumference;

        // Starting points (External starts at -90deg / 12 o'clock)
        const externalOffset = circumference - externalArcLength; // Dasharray offset for drawing
        const internalOffset = circumference - internalArcLength;

        // Rotation for internal slice (starts where external ends)
        // 360 * (externalPercentage / 100) - 90
        const internalRotation = (360 * (externalPercentage / 100)) - 90;

        return {
            totalFunding: formattedTotalFunding,
            external: {
                funding: externalFunding,
                percentage: externalPercentage,
                count: externalCount,
                piCount: externalPiCount,
                arcLength: externalArcLength,
                offset: externalOffset,
                rotation: -90 // Starts at top
            },
            internal: {
                funding: internalFunding,
                percentage: internalPercentage,
                count: internalCount,
                piCount: internalPiCount,
                arcLength: internalArcLength,
                offset: internalOffset,
                rotation: internalRotation
            },
            circumference
        };
    }, [grants, totalFunding]);

    const formatCurrency = (val: number) => {
        if (val >= 1000000) return `RM ${(val / 1000000).toFixed(2)}M`;
        if (val >= 1000) return `RM ${(val / 1000).toFixed(0)}k`;
        return `RM ${val.toFixed(0)}`;
    };

    // Helper to calculate label position
    // returns x, y coordinates for placing text inside the arc
    const getLabelPosition = (startAngle: number, percentage: number, radius = 40) => {
        // center angle in radians
        // startAngle is in degrees, 0 is right (3 o'clock). 
        // We adjusted standard svg rotation so -90 is top.

        // Convert percentage to degrees
        const sweepAngle = (percentage / 100) * 360;
        const midAngle = startAngle + (sweepAngle / 2);

        // Convert to radians for Math.cos/sin
        const rad = midAngle * (Math.PI / 180);

        // r is distance from center (50, 50)
        // Use a slightly smaller radius to center text in the donut ring
        const r = radius;

        const x = 50 + r * Math.cos(rad);
        const y = 50 + r * Math.sin(rad);

        return { x, y, midAngle };
    };

    // Calculate label positions
    // External starts at -90 degrees
    const extPos = getLabelPosition(-90, data.external.percentage);

    // Internal starts after external
    const intStartAngle = -90 + (data.external.percentage / 100 * 360);
    const intPos = getLabelPosition(intStartAngle, data.internal.percentage);

    const isExternalSmall = data.external.percentage < 15;
    const isInternalSmall = data.internal.percentage < 15;

    // Defensive check - if no grants or zero funding, show a message
    if (!grants || grants.length === 0 || totalFunding === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8">
                <div className="text-gray-400 text-sm">No grant data available</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <div className="relative w-64 h-64">
                <svg viewBox="0 0 100 100" className="w-full h-full transform">
                    {/* Background Circle (for empty state or border) */}
                    <circle
                        cx="50" cy="50" r="40"
                        fill="transparent"
                        stroke="#1e293b"
                        strokeWidth="20"
                    />

                    {/* External Slice (Blue) */}
                    {data.external.percentage > 0 && (
                        <g className="group">
                            <circle
                                cx="50" cy="50" r="40"
                                fill="transparent"
                                stroke="#3b82f6" // blue-500
                                strokeWidth="20"
                                strokeDasharray={`${data.external.arcLength} ${data.circumference}`}
                                transform="rotate(-90 50 50)"
                                className="transition-all duration-500 hover:stroke-blue-400 cursor-pointer"
                            />
                            <title>{`External Funding: RM ${data.external.funding.toLocaleString()}\nShare: ${data.external.percentage.toFixed(1)}%\nGrants: ${data.external.count}\nPI Grants: ${data.external.piCount}\nPI Rate: ${data.external.count > 0 ? (data.external.piCount / data.external.count * 100).toFixed(0) : 0}%`}</title>
                        </g>
                    )}

                    {/* Internal Slice (Purple/Emerald -> Request said Internal slice, let's use Purple to match badges or Orange for 'Not In UTAR' concept? 
                        Wait, previous prompt said "Slice A: External, Slice B: Internal".
                        Badge colors: Internal is Purple. External is Blue/Sky. 
                        Let's use Purple for Internal.
                    */}
                    {data.internal.percentage > 0 && (
                        <g className="group">
                            <circle
                                cx="50" cy="50" r="40"
                                fill="transparent"
                                stroke="#a855f7" // purple-500
                                strokeWidth="20"
                                strokeDasharray={`${data.internal.arcLength} ${data.circumference}`}
                                transform={`rotate(${data.internal.rotation} 50 50)`}
                                className="transition-all duration-500 hover:stroke-purple-400 cursor-pointer"
                            />
                            <title>{`Internal Funding: RM ${data.internal.funding.toLocaleString()}\nShare: ${data.internal.percentage.toFixed(1)}%\nGrants: ${data.internal.count}\nPI Grants: ${data.internal.piCount}\nPI Rate: ${data.internal.count > 0 ? (data.internal.piCount / data.internal.count * 100).toFixed(0) : 0}%`}</title>
                        </g>
                    )}

                    {/* Labels on Slices */}
                    {/* External Label */}
                    {data.external.percentage > 0 && (
                        <text
                            x={extPos.x}
                            y={extPos.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="fill-white text-[3px] font-bold pointer-events-none drop-shadow-md"
                        >
                            <tspan x={extPos.x} dy="-1.5">External</tspan>
                            <tspan x={extPos.x} dy="3.5">{`PI ${data.external.piCount}/${data.external.count}`}</tspan>
                        </text>
                    )}

                    {/* Internal Label */}
                    {data.internal.percentage > 0 && (
                        <text
                            x={intPos.x}
                            y={intPos.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="fill-white text-[3px] font-bold pointer-events-none drop-shadow-md"
                        >
                            <tspan x={intPos.x} dy="-1.5">Internal</tspan>
                            <tspan x={intPos.x} dy="3.5">{`PI ${data.internal.piCount}/${data.internal.count}`}</tspan>
                        </text>
                    )}

                </svg>

                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="text-xl font-bold text-white tracking-tight">
                        {formatCurrency(totalFunding)}
                    </div>
                    <div className="text-xs text-gray-400 font-medium mt-0.5">
                        Total Funding
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1 flex gap-2">
                        <span className="text-blue-400">Ext {data.external.percentage.toFixed(0)}%</span>
                        <span className="text-purple-400">Int {data.internal.percentage.toFixed(0)}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RCGrantDonutChart;

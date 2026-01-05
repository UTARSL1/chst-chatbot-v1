'use client';

import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Users, FileText } from 'lucide-react';

interface OverviewStats {
    totalPublications: number;
    uniquePapers: number;
    activeMembers: number;
    quartileCounts: {
        q1: number;
        q2: number;
        q3: number;
        q4: number;
    };
    publicationsByYear: Array<{
        year: string | number;
        count: number;
        q1: number;
        q2: number;
        q3: number;
        q4: number;
        isAccumulated?: boolean
    }>;
    topMembersByYear: Array<{
        year: string | number;
        members: Array<{
            name: string;
            staffId: string | null;
            count: number;
            q1Count: number;
        }>;
    }>;
}

interface RCOverviewProps {
    showNames?: boolean;
}

export default function RCOverview({ showNames = false }: RCOverviewProps) {
    const [stats, setStats] = useState<OverviewStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOverview();
    }, []);

    const fetchOverview = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/rc-management/publications/overview');
            const data = await response.json();

            if (data.success) {
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching RC overview:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-center text-gray-400 py-12">
                Failed to load RC overview data
            </div>
        );
    }

    const totalQuartile = stats.quartileCounts.q1 + stats.quartileCounts.q2 + stats.quartileCounts.q3 + stats.quartileCounts.q4;

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-400">Total Journal Publications</div>
                        <FileText className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.totalPublications}</div>
                    <div className="text-xs text-gray-500 mt-1">All member publications</div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-400">Unique Journal Papers</div>
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.uniquePapers}</div>
                    <div className="text-xs text-gray-500 mt-1">After deduplication</div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-400">Q1 Publications</div>
                        <BarChart3 className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="text-3xl font-bold text-emerald-400">{stats.quartileCounts.q1}</div>
                    <div className="text-xs text-gray-500 mt-1">Top quartile papers</div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-400">Active Members</div>
                        <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.activeMembers}</div>
                    <div className="text-xs text-gray-500 mt-1">Contributing researchers</div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Publications by Year (Vertical Stacked Bars) */}
                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg flex flex-col">
                    <h3 className="text-lg font-semibold text-white mb-6">Publications by Year</h3>


                    {/* Added fixed height h-64 to container to ensure percentage heights work */}
                    <div className="flex-1 flex items-end justify-between gap-4 h-64 border-b border-white/10 pb-2 relative mt-4">
                        {/* Grid lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                            {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
                                <div key={tick} className="w-full border-t border-white/30 h-0" style={{ bottom: `${tick * 100}%` }}></div>
                            ))}
                        </div>

                        {stats.publicationsByYear.map(({ year, count, q1, q2, q3, q4, isAccumulated }) => {
                            // Find max count for scaling (ensure we have at least 1 to avoid /0)
                            const maxCount = Math.max(...stats.publicationsByYear.map(y => y.count), 1) * 1.15;
                            const percentage = Math.max((count / maxCount) * 100, 2); // Ensure at least 2% height so bar is visible

                            // Calculate internal percentages
                            const q1Percent = count > 0 ? (q1 / count) * 100 : 0;
                            const q2Percent = count > 0 ? (q2 / count) * 100 : 0;
                            const q3Percent = count > 0 ? (q3 / count) * 100 : 0;
                            const q4Percent = count > 0 ? (q4 / count) * 100 : 0;

                            return (
                                <div key={year} className="flex-1 flex flex-col items-center group relative z-10 h-full justify-end">
                                    {/* Tooltip */}
                                    <div className="mb-2 text-sm font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 px-2 py-0.5 rounded border border-white/10 absolute z-20 whitespace-nowrap" style={{ bottom: `${percentage}%` }}>
                                        Total: {count} (Q1: {q1}, Q2: {q2}, Q3: {q3}, Q4: {q4})
                                    </div>

                                    {/* Stacked Bar Container */}
                                    <div
                                        className={`w-full max-w-[40px] rounded-t-sm relative transition-all duration-500 flex flex-col justify-end
                                            ${percentage === 2 ? 'bg-white/5' : ''}
                                        `}
                                        style={{ height: `${percentage}%` }}
                                    >
                                        <div className={`absolute -top-6 left-1/2 -translate-x-1/2 text-sm font-bold ${isAccumulated ? 'text-orange-200' : 'text-cyan-100'}`}>
                                            {count}
                                        </div>

                                        {/* Q1 Segment (Top) */}
                                        {q1 > 0 && <div style={{ height: `${q1Percent}%` }} className="w-full bg-emerald-500 hover:bg-emerald-400 transition-colors"></div>}

                                        {/* Q2 Segment */}
                                        {q2 > 0 && <div style={{ height: `${q2Percent}%` }} className="w-full bg-blue-500 hover:bg-blue-400 transition-colors"></div>}

                                        {/* Q3 Segment */}
                                        {q3 > 0 && <div style={{ height: `${q3Percent}%` }} className="w-full bg-amber-500 hover:bg-amber-400 transition-colors"></div>}

                                        {/* Q4 Segment (Bottom) */}
                                        {q4 > 0 && <div style={{ height: `${q4Percent}%` }} className="w-full bg-rose-500 hover:bg-rose-400 transition-colors"></div>}
                                    </div>
                                    <div className="mt-3 text-xs md:text-sm text-gray-400 font-medium text-center h-8 flex items-start justify-center">
                                        {year}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Quartile Distribution (Donut Chart) */}
                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg flex flex-col relative overflow-hidden">
                    <h3 className="text-lg font-semibold text-white mb-6 relative z-10">Quartile Distribution</h3>
                    <div className="flex-1 flex items-center justify-center relative z-10">
                        <div className="relative w-64 h-64">
                            {/* Donut Segments */}
                            <div
                                className="w-full h-full rounded-full shadow-2xl"
                                style={{
                                    background: `conic-gradient(
                                        #10b981 0% ${(stats.quartileCounts.q1 / totalQuartile) * 100}%,
                                        #3b82f6 ${(stats.quartileCounts.q1 / totalQuartile) * 100}% ${((stats.quartileCounts.q1 + stats.quartileCounts.q2) / totalQuartile) * 100}%,
                                        #f59e0b ${((stats.quartileCounts.q1 + stats.quartileCounts.q2) / totalQuartile) * 100}% ${((stats.quartileCounts.q1 + stats.quartileCounts.q2 + stats.quartileCounts.q3) / totalQuartile) * 100}%,
                                        #f43f5e ${((stats.quartileCounts.q1 + stats.quartileCounts.q2 + stats.quartileCounts.q3) / totalQuartile) * 100}% 100%
                                    )`
                                }}
                            ></div>

                            {/* Inner Circle (Hole) */}
                            <div className="absolute inset-16 rounded-full bg-[#0f172a] flex items-center justify-center border border-white/5 shadow-inner">
                                <div className="text-center">
                                    <div className="text-4xl font-bold text-white drop-shadow-md">{totalQuartile}</div>
                                    <div className="text-sm text-gray-400 uppercase tracking-widest font-semibold mt-1">Total</div>
                                </div>
                            </div>

                            {/* Labels overlaid on chart */}
                            {[
                                { label: 'Q1', count: stats.quartileCounts.q1, color: 'text-emerald-100' },
                                { label: 'Q2', count: stats.quartileCounts.q2, color: 'text-blue-100' },
                                { label: 'Q3', count: stats.quartileCounts.q3, color: 'text-amber-100' },
                                { label: 'Q4', count: stats.quartileCounts.q4, color: 'text-rose-100' }
                            ].reduce((acc, curr, idx) => {
                                const percentage = totalQuartile > 0 ? (curr.count / totalQuartile) : 0;
                                const prevEnd = idx === 0 ? 0 : acc[idx - 1].end;
                                acc.push({ ...curr, start: prevEnd, end: prevEnd + percentage, percentage });
                                return acc;
                            }, [] as any[]).map((segment: any) => {
                                if (segment.percentage < 0.03) return null; // Hide if tiny (<3%)

                                const midPercent = (segment.start + segment.end) / 2;
                                const angleInRad = (midPercent * 360 - 90) * (Math.PI / 180);
                                const r = 88; // Place label in middle of ring

                                const x = 50 + (r / 128) * 50 * Math.cos(angleInRad);
                                const y = 50 + (r / 128) * 50 * Math.sin(angleInRad);

                                return (
                                    <div
                                        key={segment.label}
                                        className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"
                                        style={{ left: `${x}%`, top: `${y}%` }}
                                    >
                                        <span className={`text-base font-bold ${segment.color} leading-none mb-0.5`}>
                                            {segment.label}
                                        </span>
                                        <span className="text-xs font-bold text-white bg-slate-900/40 px-1 rounded backdrop-blur-sm">
                                            {Math.round(segment.percentage * 100)}%
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Contributing Members by Year - Only for Chairperson */}
            {showNames && (
                <>
                    <h3 className="text-xl font-bold text-white mt-8 mb-4">Top RC Contributors (1st/Corresponding Author Only)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {stats.topMembersByYear.map((yearStat) => (
                            <div key={yearStat.year} className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-5 shadow-lg flex flex-col">
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                                    <h4 className="text-lg font-bold text-blue-400">{yearStat.year}</h4>
                                    <span className="text-xs text-slate-500 uppercase tracking-wider">Leaderboard</span>
                                </div>

                                <div className="space-y-3 flex-1">
                                    {yearStat.members.length > 0 ? (
                                        yearStat.members.map((member, idx) => (
                                            <div key={idx} className="flex items-center justify-between group">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`
                                                        w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                                        ${idx === 0 ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                                                            idx === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' :
                                                                idx === 2 ? 'bg-amber-700/20 text-amber-700 border border-amber-700/30' :
                                                                    'bg-slate-800 text-slate-500'}
                                                    `}>
                                                        {idx + 1}
                                                    </div>
                                                    <div className="truncate">
                                                        <div className="text-sm text-white truncate font-medium group-hover:text-blue-300 transition-colors">
                                                            {member.name}
                                                        </div>
                                                        {member.staffId && (
                                                            <div className="text-[10px] text-slate-500">
                                                                {member.staffId.replace(/^\?\s*/, '')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end shrink-0">
                                                    <span className="text-sm font-bold text-white">{member.count}</span>
                                                    {member.q1Count > 0 && (
                                                        <span className="text-[10px] text-emerald-400 font-medium">
                                                            {member.q1Count} Q1
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-sm text-gray-500 italic py-4 text-center">No data for this year</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

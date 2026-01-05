'use client';

import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Users, GraduationCap } from 'lucide-react';

interface PGOverviewStats {
    totalStudents: number;
    uniqueStudents: number;
    activeSupervisors: number;
    levelCounts: {
        phd: number;
        master: number;
        other: number;
    };
    studentsByYear: Array<{
        year: string | number;
        count: number;
        phd: number;
        master: number;
        isAccumulated?: boolean
    }>;
    topMembersByYear: Array<{
        year: string | number;
        members: Array<{
            name: string;
            staffId: string | null;
            count: number;
        }>;
    }>;
}

interface PGOverviewProps {
    showNames?: boolean;
}

export default function RCPostgraduateOverview({ showNames = false }: PGOverviewProps) {
    const [stats, setStats] = useState<PGOverviewStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOverview();
    }, []);

    const fetchOverview = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/rc-management/postgraduate/overview');
            const data = await response.json();

            if (data.success) {
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching RC PG overview:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-center text-gray-400 py-12">
                Failed to load RC postgraduate overview data
            </div>
        );
    }

    const totalLevels = stats.levelCounts.phd + stats.levelCounts.master;

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-400">Total Students</div>
                        <Users className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.totalStudents}</div>
                    <div className="text-xs text-gray-500 mt-1">Main supervisions only</div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-400">PhD Students</div>
                        <GraduationCap className="w-5 h-5 text-purple-500" />
                    </div>
                    <div className="text-3xl font-bold text-purple-400">{stats.levelCounts.phd}</div>
                    <div className="text-xs text-gray-500 mt-1">Doctoral candidates</div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-400">Master Students</div>
                        <GraduationCap className="w-5 h-5 text-orange-500" />
                    </div>
                    <div className="text-3xl font-bold text-orange-400">{stats.levelCounts.master}</div>
                    <div className="text-xs text-gray-500 mt-1">Master candidates</div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-400">Active Supervisors</div>
                        <TrendingUp className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.activeSupervisors}</div>
                    <div className="text-xs text-gray-500 mt-1">Main supervisors</div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Students by Year (Vertical Stacked Bars) */}
                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg flex flex-col">
                    <h3 className="text-lg font-semibold text-white mb-6">Students by Intake Year</h3>

                    {/* Legend */}
                    <div className="flex items-center justify-end gap-4 mb-2 text-xs">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded bg-purple-500"></div>
                            <span className="text-gray-300">PhD</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded bg-orange-500"></div>
                            <span className="text-gray-300">Master</span>
                        </div>
                    </div>

                    <div className="flex-1 flex items-end justify-between gap-4 h-64 border-b border-white/10 pb-2 relative mt-2">
                        {/* Grid lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                            {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
                                <div key={tick} className="w-full border-t border-white/30 h-0" style={{ bottom: `${tick * 100}%` }}></div>
                            ))}
                        </div>

                        {stats.studentsByYear.map(({ year, count, phd, master, isAccumulated }) => {
                            const maxCount = Math.max(...stats.studentsByYear.map(y => y.count), 1) * 1.15;
                            const percentage = Math.max((count / maxCount) * 100, 2);
                            const phdPercent = count > 0 ? (phd / count) * 100 : 0;
                            const masterPercent = count > 0 ? (master / count) * 100 : 0;

                            return (
                                <div key={year} className="flex-1 flex flex-col items-center group relative z-10 h-full justify-end">
                                    {/* Tooltip */}
                                    <div className="mb-2 text-sm font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 px-2 py-0.5 rounded border border-white/10 absolute z-20 whitespace-nowrap" style={{ bottom: `${percentage}%` }}>
                                        Draft: {count} (PhD: {phd}, Master: {master})
                                    </div>

                                    {/* Stacked Bar Container */}
                                    <div
                                        className={`w-full max-w-[40px] rounded-t-sm relative transition-all duration-500 flex flex-col justify-end
                                            ${percentage === 2 ? 'bg-white/5' : ''}
                                        `}
                                        style={{ height: `${percentage}%` }}
                                    >
                                        {/* Total Label Top */}
                                        <div className={`absolute -top-6 left-1/2 -translate-x-1/2 text-sm font-bold ${isAccumulated ? 'text-gray-300' : 'text-blue-200'}`}>
                                            {count}
                                        </div>

                                        {/* PhD Segment (Top) */}
                                        {phd > 0 && (
                                            <div
                                                style={{ height: `${phdPercent}%` }}
                                                className={`w-full bg-purple-600 hover:bg-purple-500 transition-colors relative group/segment`}
                                            ></div>
                                        )}

                                        {/* Master Segment (Bottom) */}
                                        {master > 0 && (
                                            <div
                                                style={{ height: `${masterPercent}%` }}
                                                className={`w-full bg-orange-500 hover:bg-orange-400 transition-colors relative group/segment`}
                                            ></div>
                                        )}
                                    </div>
                                    <div className="mt-3 text-xs md:text-sm text-gray-400 font-medium text-center h-8 flex items-start justify-center">
                                        {year}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Level Distribution (Donut Chart) */}
                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg flex flex-col relative overflow-hidden">
                    <h3 className="text-lg font-semibold text-white mb-6 relative z-10">Student Level Distribution</h3>
                    <div className="flex-1 flex items-center justify-center relative z-10">
                        <div className="relative w-64 h-64">
                            {/* Donut Segments */}
                            <div
                                className="w-full h-full rounded-full shadow-2xl"
                                style={{
                                    background: `conic-gradient(
                                        #a855f7 0% ${(stats.levelCounts.phd / totalLevels) * 100}%,
                                        #f97316 ${(stats.levelCounts.phd / totalLevels) * 100}% 100%
                                    )`
                                }}
                            ></div>

                            {/* Inner Circle (Hole) */}
                            <div className="absolute inset-16 rounded-full bg-[#0f172a] flex items-center justify-center border border-white/5 shadow-inner">
                                <div className="text-center">
                                    <div className="text-4xl font-bold text-white drop-shadow-md">{totalLevels}</div>
                                    <div className="text-sm text-gray-400 uppercase tracking-widest font-semibold mt-1">Total</div>
                                </div>
                            </div>

                            {/* Labels overlaid on chart */}
                            {[
                                { label: 'PhD', count: stats.levelCounts.phd, color: 'text-purple-100', bg: '#a855f7' },
                                { label: 'Master', count: stats.levelCounts.master, color: 'text-orange-100', bg: 'f97316' }
                            ].reduce((acc, curr, idx) => {
                                const percentage = totalLevels > 0 ? (curr.count / totalLevels) : 0;
                                const prevEnd = idx === 0 ? 0 : acc[idx - 1].end;
                                acc.push({ ...curr, start: prevEnd, end: prevEnd + percentage, percentage });
                                return acc;
                            }, [] as any[]).map((segment: any) => {
                                if (segment.percentage < 0.03) return null;

                                const midPercent = (segment.start + segment.end) / 2;
                                const angleInRad = (midPercent * 360 - 90) * (Math.PI / 180);
                                const r = 88;

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

            {/* Top Supervisors - Only for Chairperson */}
            {showNames && (
                <>
                    <h3 className="text-xl font-bold text-white mt-8 mb-4">Top Supervisors (Main Supervision)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {stats.topMembersByYear.map((yearStat) => (
                            <div key={yearStat.year} className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-5 shadow-lg flex flex-col">
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                                    <h4 className="text-lg font-bold text-purple-400">{yearStat.year}</h4>
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
                                                        <div className="text-sm text-white truncate font-medium group-hover:text-purple-300 transition-colors">
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
                                                    <span className="text-[10px] text-slate-500">students</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-sm text-gray-500 italic py-4 text-center">No intakes</div>
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

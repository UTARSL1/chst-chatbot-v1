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
    publicationsByYear: Array<{ year: number; count: number }>;
    topMembersByYear: Array<{
        year: number;
        members: Array<{
            name: string;
            staffId: string | null;
            count: number;
            q1Count: number;
        }>;
    }>;
}

export default function RCOverview() {
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
                        <div className="text-sm text-gray-400">Total Publications</div>
                        <FileText className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.totalPublications}</div>
                    <div className="text-xs text-gray-500 mt-1">All member publications</div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-400">Unique Papers</div>
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
                {/* Publications by Year */}
                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-white mb-4">Publications by Year</h3>
                    <div className="space-y-3">
                        {stats.publicationsByYear.slice(-5).map(({ year, count }) => {
                            const maxCount = Math.max(...stats.publicationsByYear.map(y => y.count));
                            const percentage = (count / maxCount) * 100;

                            return (
                                <div key={year} className="flex items-center gap-3">
                                    <div className="text-sm text-gray-400 w-12">{year}</div>
                                    <div className="flex-1 bg-slate-800 rounded-full h-8 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-full flex items-center justify-end pr-3 transition-all"
                                            style={{ width: `${percentage}%` }}
                                        >
                                            <span className="text-xs font-bold text-white">{count}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Quartile Distribution */}
                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-white mb-4">Quartile Distribution</h3>
                    <div className="space-y-4">
                        {[
                            { label: 'Q1', count: stats.quartileCounts.q1, color: 'bg-emerald-500' },
                            { label: 'Q2', count: stats.quartileCounts.q2, color: 'bg-blue-500' },
                            { label: 'Q3', count: stats.quartileCounts.q3, color: 'bg-amber-500' },
                            { label: 'Q4', count: stats.quartileCounts.q4, color: 'bg-rose-500' }
                        ].map(({ label, count, color }) => {
                            const percentage = totalQuartile > 0 ? (count / totalQuartile) * 100 : 0;

                            return (
                                <div key={label}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-gray-300">{label}</span>
                                        <span className="text-sm font-bold text-white">{count}</span>
                                    </div>
                                    <div className="bg-slate-800 rounded-full h-3 overflow-hidden">
                                        <div
                                            className={`${color} h-full transition-all`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Top Contributing Members by Year */}
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
        </div>
    );
}

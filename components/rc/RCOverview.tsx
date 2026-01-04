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
    topPapers: Array<{
        title: string;
        year: number | null;
        quartile: string | null;
        contributingMembersCount: number;
        contributingMembers: Array<{ name: string; staffId: string | null; role: string }>;
        roles: string[];
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

            {/* Top Contributing Papers */}
            <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Top Contributing Papers</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left py-3 px-2 text-sm font-medium text-gray-400">Title</th>
                                <th className="text-left py-3 px-2 text-sm font-medium text-gray-400">Year</th>
                                <th className="text-left py-3 px-2 text-sm font-medium text-gray-400">Quartile</th>
                                <th className="text-left py-3 px-2 text-sm font-medium text-gray-400">Members</th>
                                <th className="text-left py-3 px-2 text-sm font-medium text-gray-400">Roles</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.topPapers.map((paper, idx) => (
                                <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                    <td className="py-3 px-2 text-sm text-gray-300 max-w-md truncate">
                                        {paper.title}
                                    </td>
                                    <td className="py-3 px-2 text-sm text-gray-400">
                                        {paper.year || 'N/A'}
                                    </td>
                                    <td className="py-3 px-2">
                                        {paper.quartile ? (
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${paper.quartile === 'Q1' ? 'bg-emerald-500/20 text-emerald-300' :
                                                    paper.quartile === 'Q2' ? 'bg-blue-500/20 text-blue-300' :
                                                        paper.quartile === 'Q3' ? 'bg-amber-500/20 text-amber-300' :
                                                            'bg-rose-500/20 text-rose-300'
                                                }`}>
                                                {paper.quartile}
                                            </span>
                                        ) : (
                                            <span className="text-gray-500 text-xs">N/A</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-2 text-sm text-gray-400">
                                        {paper.contributingMembersCount}
                                    </td>
                                    <td className="py-3 px-2">
                                        <div className="flex gap-1 flex-wrap">
                                            {paper.roles.map((role, i) => (
                                                <span key={i} className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-medium">
                                                    {role}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

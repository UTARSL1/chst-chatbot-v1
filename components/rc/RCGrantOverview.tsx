'use client';

import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Users, Award } from 'lucide-react';

interface GrantOverviewStats {
    totalMembers: number;
    totalGrants: number;
    totalFunding: number;
    totalInternalGrants: number;
    totalExternalGrants: number;
    totalInUtarGrants: number;
    totalNotInUtarGrants: number;
    averageFundingPerMember: number;
    averageGrantsPerMember: number;
    grantsByYear: Array<{
        year: string | number;
        count: number;
        funding: number;
        internal: number;
        external: number;
        international: number;
        national: number;
    }>;
    fundingByType: {
        internal: number;
        externalNational: number;
        externalInternational: number;
    };
    topMembersByFunding: Array<{
        name: string;
        staffId: string | null;
        totalFunding: number;
        totalGrants: number;
        piCount: number;
    }>;
}

interface RCGrantOverviewProps {
    showNames?: boolean;
}

export default function RCGrantOverview({ showNames = false }: RCGrantOverviewProps) {
    const [stats, setStats] = useState<GrantOverviewStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOverview();
    }, []);

    const fetchOverview = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/rc-grant/overview');
            const data = await response.json();

            if (data.statistics) {
                // Transform data for visualization
                setStats({
                    ...data.statistics,
                    grantsByYear: [], // TODO: Calculate from grants
                    fundingByType: {
                        internal: data.members.reduce((sum: number, m: any) =>
                            sum + m.grants.filter((g: any) => g.grantType === 'INTERNAL')
                                .reduce((s: number, g: any) => s + parseFloat(g.fundingAmount), 0), 0),
                        externalNational: data.members.reduce((sum: number, m: any) =>
                            sum + m.grants.filter((g: any) => g.grantType === 'EXTERNAL' && g.grantCategory === 'NATIONAL')
                                .reduce((s: number, g: any) => s + parseFloat(g.fundingAmount), 0), 0),
                        externalInternational: data.members.reduce((sum: number, m: any) =>
                            sum + m.grants.filter((g: any) => g.grantType === 'EXTERNAL' && g.grantCategory === 'INTERNATIONAL')
                                .reduce((s: number, g: any) => s + parseFloat(g.fundingAmount), 0), 0),
                    },
                    topMembersByFunding: data.members
                        .sort((a: any, b: any) => b.totalFunding - a.totalFunding)
                        .slice(0, 10)
                        .map((m: any) => ({
                            name: m.name,
                            staffId: m.staffId,
                            totalFunding: m.totalFunding,
                            totalGrants: m.totalGrants,
                            piCount: m.piCount
                        }))
                });
            }
        } catch (error) {
            console.error('Error fetching RC grant overview:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-MY', {
            style: 'currency',
            currency: 'MYR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatCurrencyShort = (amount: number) => {
        if (amount >= 1000000) {
            return `RM ${(amount / 1000000).toFixed(1)}M`;
        } else if (amount >= 1000) {
            return `RM ${(amount / 1000).toFixed(0)}K`;
        }
        return formatCurrency(amount);
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
                Failed to load RC grant overview data
            </div>
        );
    }

    const totalFundingByType = stats.fundingByType.internal + stats.fundingByType.externalNational + stats.fundingByType.externalInternational;

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-400">Total Grants</div>
                        <Award className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.totalGrants}</div>
                    <div className="text-xs text-gray-500 mt-1">All research projects</div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-400">Total Funding</div>
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="text-3xl font-bold text-emerald-400">{formatCurrencyShort(stats.totalFunding)}</div>
                    <div className="text-xs text-gray-500 mt-1">{formatCurrency(stats.totalFunding)}</div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-400">External Grants</div>
                        <TrendingUp className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="text-3xl font-bold text-amber-400">{stats.totalExternalGrants}</div>
                    <div className="text-xs text-gray-500 mt-1">
                        {stats.totalGrants > 0 ? Math.round((stats.totalExternalGrants / stats.totalGrants) * 100) : 0}% of total
                    </div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-400">Active Members</div>
                        <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.totalMembers}</div>
                    <div className="text-xs text-gray-500 mt-1">Grant recipients</div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Funding by Type (Donut Chart) */}
                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg flex flex-col relative overflow-hidden">
                    <h3 className="text-lg font-semibold text-white mb-6 relative z-10">Funding Distribution by Type</h3>
                    <div className="flex-1 flex items-center justify-center relative z-10">
                        <div className="relative w-64 h-64">
                            {/* Donut Segments */}
                            <div
                                className="w-full h-full rounded-full shadow-2xl"
                                style={{
                                    background: `conic-gradient(
                                        #a855f7 0% ${(stats.fundingByType.internal / totalFundingByType) * 100}%,
                                        #3b82f6 ${(stats.fundingByType.internal / totalFundingByType) * 100}% ${((stats.fundingByType.internal + stats.fundingByType.externalNational) / totalFundingByType) * 100}%,
                                        #f59e0b ${((stats.fundingByType.internal + stats.fundingByType.externalNational) / totalFundingByType) * 100}% 100%
                                    )`
                                }}
                            ></div>

                            {/* Inner Circle (Hole) */}
                            <div className="absolute inset-16 rounded-full bg-[#0f172a] flex items-center justify-center border border-white/5 shadow-inner">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-white drop-shadow-md">{formatCurrencyShort(totalFundingByType)}</div>
                                    <div className="text-xs text-gray-400 uppercase tracking-widest font-semibold mt-1">Total</div>
                                </div>
                            </div>

                            {/* Labels */}
                            {[
                                { label: 'Internal', amount: stats.fundingByType.internal, color: 'text-purple-100' },
                                { label: 'National', amount: stats.fundingByType.externalNational, color: 'text-blue-100' },
                                { label: 'International', amount: stats.fundingByType.externalInternational, color: 'text-amber-100' }
                            ].reduce((acc, curr, idx) => {
                                const percentage = totalFundingByType > 0 ? (curr.amount / totalFundingByType) : 0;
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
                                        <span className={`text-sm font-bold ${segment.color} leading-none mb-0.5`}>
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

                {/* Grant Type Distribution (Horizontal Bars) */}
                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg flex flex-col">
                    <h3 className="text-lg font-semibold text-white mb-6">Grant Statistics</h3>

                    <div className="space-y-6 flex-1">
                        {/* Internal vs External */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-400">Internal Grants</span>
                                <span className="text-sm font-bold text-purple-400">{stats.totalInternalGrants}</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-500"
                                    style={{ width: `${stats.totalGrants > 0 ? (stats.totalInternalGrants / stats.totalGrants) * 100 : 0}%` }}
                                ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {stats.totalGrants > 0 ? Math.round((stats.totalInternalGrants / stats.totalGrants) * 100) : 0}% of total grants
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-400">External Grants</span>
                                <span className="text-sm font-bold text-blue-400">{stats.totalExternalGrants}</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500"
                                    style={{ width: `${stats.totalGrants > 0 ? (stats.totalExternalGrants / stats.totalGrants) * 100 : 0}%` }}
                                ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {stats.totalGrants > 0 ? Math.round((stats.totalExternalGrants / stats.totalGrants) * 100) : 0}% of total grants
                            </div>
                        </div>

                        {/* IN UTAR vs NOT IN UTAR */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-400">Funding IN UTAR</span>
                                <span className="text-sm font-bold text-emerald-400">{stats.totalInUtarGrants}</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
                                    style={{ width: `${stats.totalGrants > 0 ? (stats.totalInUtarGrants / stats.totalGrants) * 100 : 0}%` }}
                                ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {stats.totalGrants > 0 ? Math.round((stats.totalInUtarGrants / stats.totalGrants) * 100) : 0}% of total grants
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-400">Funding NOT IN UTAR</span>
                                <span className="text-sm font-bold text-amber-400">{stats.totalNotInUtarGrants}</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-500"
                                    style={{ width: `${stats.totalGrants > 0 ? (stats.totalNotInUtarGrants / stats.totalGrants) * 100 : 0}%` }}
                                ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {stats.totalGrants > 0 ? Math.round((stats.totalNotInUtarGrants / stats.totalGrants) * 100) : 0}% of total grants
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Members by Funding - Only for Chairperson */}
            {showNames && (
                <>
                    <h3 className="text-xl font-bold text-white mt-8 mb-4">Top RC Grant Recipients</h3>
                    <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg">
                        <div className="space-y-3">
                            {stats.topMembersByFunding.map((member, idx) => (
                                <div key={idx} className="flex items-center justify-between group hover:bg-white/5 p-3 rounded-lg transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`
                                            w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
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
                                        <span className="text-sm font-bold text-emerald-400">{formatCurrencyShort(member.totalFunding)}</span>
                                        <div className="flex gap-2 text-[10px] text-gray-400">
                                            <span>{member.totalGrants} grants</span>
                                            <span className="text-purple-400">{member.piCount} as PI</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

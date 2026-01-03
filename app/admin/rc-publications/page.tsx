'use client';

import { useState, useEffect } from 'react';
import { Upload, Users, BarChart3, Download, Trash2, GripVertical } from 'lucide-react';

interface Member {
    id: string;
    name: string;
    totalPublications: number;
    journalArticles: number;
    conferencePapers: number;
    q1Publications: number;
    q2Publications: number;
    q3Publications: number;
    q4Publications: number;
}

interface Stats {
    totalPublications: number;
    journalArticles: number;
    conferencePapers: number;
    q1Publications: number;
    q2Publications: number;
    q3Publications: number;
    q4Publications: number;
    firstAuthor: number;
    correspondingAuthor: number;
    coAuthor: number;
    q1FirstAuthor: number;
    q1Corresponding: number;
    q1CoAuthor: number;
    q2FirstAuthor: number;
    q2Corresponding: number;
    q2CoAuthor: number;
    q3FirstAuthor: number;
    q3Corresponding: number;
    q3CoAuthor: number;
    q4FirstAuthor: number;
    q4Corresponding: number;
    q4CoAuthor: number;
}

export default function RCPublicationsPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [selectedYear, setSelectedYear] = useState<string>('all');
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [loadingStats, setLoadingStats] = useState(false);

    // Cache for member stats to avoid repeated API calls
    const [statsCache, setStatsCache] = useState<Record<string, Stats>>({});

    // Fetch members on mount
    useEffect(() => {
        fetchMembers();
    }, []);

    // Fetch stats when member or year changes
    useEffect(() => {
        if (selectedMember) {
            const cacheKey = `${selectedMember.id}-${selectedYear}`;

            // Check cache first for instant display
            if (statsCache[cacheKey]) {
                setStats(statsCache[cacheKey]);
                setLoadingStats(false);
            } else {
                setLoadingStats(true);
                fetchMemberStats(selectedMember.id, selectedYear);
            }
        }
    }, [selectedMember, selectedYear]);

    const fetchMembers = async () => {
        try {
            const res = await fetch('/api/admin/rc-publications/members');
            const data = await res.json();
            if (data.success) {
                setMembers(data.members);
                if (data.members.length > 0) {
                    setSelectedMember(data.members[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching members:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMemberStats = async (memberId: string, year: string) => {
        try {
            const res = await fetch(`/api/admin/rc-publications/members/${memberId}?year=${year}`);
            const data = await res.json();
            if (data.success) {
                setStats(data.stats);

                // Cache the stats for instant future access
                const cacheKey = `${memberId}-${year}`;
                setStatsCache(prev => ({
                    ...prev,
                    [cacheKey]: data.stats
                }));
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoadingStats(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/admin/rc-publications/upload', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (data.success) {
                alert(`Successfully uploaded publications for ${data.member.name}`);
                fetchMembers();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Error uploading:', error);
            alert('Failed to upload file');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleDeleteMember = async (memberId: string, memberName: string) => {
        if (!confirm(`Are you sure you want to delete ${memberName} and all their publications? This action cannot be undone.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/rc-publications/members/${memberId}`, {
                method: 'DELETE'
            });

            const data = await res.json();
            if (data.success) {
                alert(`Successfully deleted ${memberName}`);
                // Clear cache for this member
                setStatsCache(prev => {
                    const newCache = { ...prev };
                    Object.keys(newCache).forEach(key => {
                        if (key.startsWith(memberId)) {
                            delete newCache[key];
                        }
                    });
                    return newCache;
                });
                // Refresh member list
                fetchMembers();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Error deleting member:', error);
            alert('Failed to delete member');
        }
    };

    const calculatePercentage = (value: number, total: number) => {
        if (total === 0) return 0;
        return parseFloat(((value / total) * 100).toFixed(1));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900">
                <div className="text-lg text-gray-300">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#818cf8] mb-2">
                        RC Members Publication Analysis
                    </h1>
                    <p className="text-gray-300">
                        Analyze publication quality and quartile distribution for research centre members
                    </p>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Panel - Members List */}
                    <div className="lg:col-span-1">
                        <div
                            className="bg-slate-900/40 backdrop-blur-md rounded-lg border border-white/5 p-4"
                            style={{ boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)' }}
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="w-5 h-5 text-gray-300" />
                                <h3 className="font-semibold text-white">RC Members ({members.length})</h3>
                            </div>

                            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                                {members.map((member) => (
                                    <div
                                        key={member.id}
                                        className={`relative group rounded-md transition-all duration-300 border ${selectedMember?.id === member.id
                                            ? 'bg-blue-900/40 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                                            : 'bg-white/5 border-transparent hover:border-blue-400/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:bg-slate-800/60'
                                            }`}
                                    >
                                        <button
                                            onClick={() => setSelectedMember(member)}
                                            onMouseEnter={() => {
                                                const cacheKey = `${member.id}-${selectedYear}`;
                                                if (!statsCache[cacheKey]) {
                                                    fetchMemberStats(member.id, selectedYear);
                                                }
                                            }}
                                            className="w-full flex items-center gap-3 p-2.5"
                                        >
                                            <div className="text-gray-600 group-hover:text-gray-400 transition-colors">
                                                <GripVertical size={14} />
                                            </div>

                                            <div className="flex-1 font-medium text-sm text-white truncate text-left">{member.name}</div>

                                            <div className="px-2 py-0.5 rounded-full bg-blue-950/50 text-[10px] font-medium text-blue-300 border border-blue-500/20 whitespace-nowrap">
                                                {member.totalPublications} pubs
                                            </div>

                                            {/* Mini Bar Chart */}
                                            <div className="flex items-end gap-1 h-3 w-12">
                                                <div
                                                    className="w-2 rounded-t-[1px] bg-emerald-500/80"
                                                    style={{ height: `${member.journalArticles > 0 ? Math.max((member.q1Publications / member.journalArticles) * 100, 15) : 0}%` }}
                                                />
                                                <div
                                                    className="w-2 rounded-t-[1px] bg-sky-500/80"
                                                    style={{ height: `${member.journalArticles > 0 ? Math.max((member.q2Publications / member.journalArticles) * 100, 15) : 0}%` }}
                                                />
                                                <div
                                                    className="w-2 rounded-t-[1px] bg-amber-500/80"
                                                    style={{ height: `${member.journalArticles > 0 ? Math.max((member.q3Publications / member.journalArticles) * 100, 15) : 0}%` }}
                                                />
                                                <div
                                                    className="w-2 rounded-t-[1px] bg-rose-500/80"
                                                    style={{ height: `${member.journalArticles > 0 ? Math.max((member.q4Publications / member.journalArticles) * 100, 15) : 0}%` }}
                                                />
                                            </div>
                                        </button>

                                        {/* Delete Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteMember(member.id, member.name);
                                            }}
                                            className="absolute top-2 right-2 p-1 rounded bg-red-900/80 hover:bg-red-900 text-red-100 opacity-0 group-hover:opacity-100 transition-all z-20"
                                            title="Delete member"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Upload Section */}
                        <div
                            className="mt-4 bg-slate-900/40 backdrop-blur-md rounded-lg border border-white/5 p-4"
                            style={{ boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)' }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Upload className="w-5 h-5 text-blue-400" />
                                    <div>
                                        <h2 className="text-sm font-semibold text-white">Upload Member Publication</h2>
                                        <p className="text-xs text-gray-400">Upload CSV file containing publication data</p>
                                    </div>
                                </div>
                                <label className="cursor-pointer">
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        disabled={uploading}
                                    />
                                    <div className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition font-medium text-sm shadow-lg">
                                        {uploading ? 'Uploading...' : 'Upload'}
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Analysis */}
                    <div className="lg:col-span-2">
                        {loadingStats && (
                            <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                                    <p className="text-gray-400">Loading statistics...</p>
                                </div>
                            </div>
                        )}
                        {!loadingStats && selectedMember && stats && (
                            <div className="space-y-6">
                                {/* Header with Year Selector */}
                                <div
                                    className="bg-slate-900/40 backdrop-blur-md rounded-lg border border-white/5 p-6"
                                    style={{ boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)' }}
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">{selectedMember.name}</h2>
                                            <p className="text-gray-400">Publication Analysis</p>
                                        </div>
                                        <select
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(e.target.value)}
                                            className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="all">All Years</option>
                                            <option value="2024">2024</option>
                                            <option value="2023">2023</option>
                                            <option value="2022">2022</option>
                                            <option value="2021">2021</option>
                                            <option value="2020">2020</option>
                                        </select>
                                    </div>

                                    {/* Key Metrics */}
                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="bg-slate-800/40 backdrop-blur-md p-4 rounded-lg border border-white/5" style={{ boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)' }}>
                                            <div className="text-3xl font-bold text-white">{stats.totalPublications}</div>
                                            <div className="text-sm text-gray-400 mt-1">Total Publications</div>
                                        </div>
                                        <div className="bg-blue-900/20 backdrop-blur-md p-4 rounded-lg border border-white/5" style={{ boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)' }}>
                                            <div className="text-3xl font-bold text-blue-300">{stats.journalArticles}</div>
                                            <div className="text-sm text-blue-400 mt-1">Journal Articles</div>
                                        </div>
                                        <div className="bg-slate-800/40 backdrop-blur-md p-4 rounded-lg border border-white/5" style={{ boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)' }}>
                                            <div className="text-3xl font-bold text-white">{stats.conferencePapers}</div>
                                            <div className="text-sm text-gray-400 mt-1">Conference Papers</div>
                                        </div>
                                        <div className="bg-emerald-900/20 backdrop-blur-md p-4 rounded-lg border border-white/5" style={{ boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)' }}>
                                            <div className="text-3xl font-bold text-green-300">{stats.q1Publications}</div>
                                            <div className="text-sm text-green-400 mt-1">Q1 Publications</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Quartile Distribution Chart */}
                                <div
                                    className="bg-slate-900/40 backdrop-blur-md rounded-lg border border-white/5 p-6"
                                    style={{ boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)' }}
                                >
                                    <h3 className="text-lg font-semibold text-white mb-4">Journal Quartile Distribution</h3>

                                    <div className="space-y-6">
                                        {/* Q1 Bar */}
                                        <div className="flex items-center gap-4">
                                            <div className="text-xl font-bold text-white w-8">Q1</div>
                                            <div className="flex-1 relative h-14 bg-slate-900/20 backdrop-blur-md rounded-full border border-white/10 shadow-inner overflow-hidden">
                                                {/* Progress Bar */}
                                                <div
                                                    className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                                                    style={{
                                                        width: `${Math.max(calculatePercentage(stats.q1Publications, stats.journalArticles), 0)}%`,
                                                        boxShadow: '0 0 25px 4px rgba(16, 185, 129, 0.6)'
                                                    }}
                                                />
                                                {/* Author Stats Overlay */}
                                                <div className="absolute left-4 top-0 bottom-0 flex items-center gap-3 z-10">
                                                    {stats.q1FirstAuthor > 0 && (
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/5 transition-transform hover:scale-105">
                                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">1st</span>
                                                            <span className="text-sm font-bold text-white">{stats.q1FirstAuthor}</span>
                                                        </div>
                                                    )}
                                                    {stats.q1Corresponding > 0 && (
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/5 transition-transform hover:scale-105">
                                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Corr</span>
                                                            <span className="text-sm font-bold text-white">{stats.q1Corresponding}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Stats Overlay */}
                                                <div className="absolute right-6 top-0 bottom-0 flex flex-col justify-center text-right z-10">
                                                    <div className="text-xl font-bold text-white leading-none mb-1">{calculatePercentage(stats.q1Publications, stats.journalArticles)}%</div>
                                                    <div className="text-xs text-slate-300 font-medium">{stats.q1Publications} publications</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Q2 Bar */}
                                        <div className="flex items-center gap-4">
                                            <div className="text-xl font-bold text-white w-8">Q2</div>
                                            <div className="flex-1 relative h-14 bg-slate-900/20 backdrop-blur-md rounded-full border border-white/10 shadow-inner overflow-hidden">
                                                {/* Progress Bar */}
                                                <div
                                                    className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-sky-500 to-sky-400 rounded-full"
                                                    style={{
                                                        width: `${Math.max(calculatePercentage(stats.q2Publications, stats.journalArticles), 0)}%`,
                                                        boxShadow: '0 0 25px 4px rgba(14, 165, 233, 0.6)'
                                                    }}
                                                />
                                                {/* Author Stats Overlay */}
                                                <div className="absolute left-4 top-0 bottom-0 flex items-center gap-3 z-10">
                                                    {stats.q2FirstAuthor > 0 && (
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/5 transition-transform hover:scale-105">
                                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">1st</span>
                                                            <span className="text-sm font-bold text-white">{stats.q2FirstAuthor}</span>
                                                        </div>
                                                    )}
                                                    {stats.q2Corresponding > 0 && (
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/5 transition-transform hover:scale-105">
                                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Corr</span>
                                                            <span className="text-sm font-bold text-white">{stats.q2Corresponding}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Stats Overlay */}
                                                <div className="absolute right-6 top-0 bottom-0 flex flex-col justify-center text-right z-10">
                                                    <div className="text-xl font-bold text-white leading-none mb-1">{calculatePercentage(stats.q2Publications, stats.journalArticles)}%</div>
                                                    <div className="text-xs text-slate-300 font-medium">{stats.q2Publications} publications</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Q3 Bar */}
                                        <div className="flex items-center gap-4">
                                            <div className="text-xl font-bold text-white w-8">Q3</div>
                                            <div className="flex-1 relative h-14 bg-slate-900/20 backdrop-blur-md rounded-full border border-white/10 shadow-inner overflow-hidden">
                                                {/* Progress Bar */}
                                                <div
                                                    className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                                                    style={{
                                                        width: `${Math.max(calculatePercentage(stats.q3Publications, stats.journalArticles), 0)}%`,
                                                        boxShadow: '0 0 25px 4px rgba(245, 158, 11, 0.6)'
                                                    }}
                                                />
                                                {/* Author Stats Overlay */}
                                                <div className="absolute left-4 top-0 bottom-0 flex items-center gap-3 z-10">
                                                    {stats.q3FirstAuthor > 0 && (
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/5 transition-transform hover:scale-105">
                                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">1st</span>
                                                            <span className="text-sm font-bold text-white">{stats.q3FirstAuthor}</span>
                                                        </div>
                                                    )}
                                                    {stats.q3Corresponding > 0 && (
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/5 transition-transform hover:scale-105">
                                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Corr</span>
                                                            <span className="text-sm font-bold text-white">{stats.q3Corresponding}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Stats Overlay */}
                                                <div className="absolute right-6 top-0 bottom-0 flex flex-col justify-center text-right z-10">
                                                    <div className="text-xl font-bold text-white leading-none mb-1">{calculatePercentage(stats.q3Publications, stats.journalArticles)}%</div>
                                                    <div className="text-xs text-slate-300 font-medium">{stats.q3Publications} publications</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Q4 Bar */}
                                        <div className="flex items-center gap-4">
                                            <div className="text-xl font-bold text-white w-8">Q4</div>
                                            <div className="flex-1 relative h-14 bg-slate-800/40 backdrop-blur-sm rounded-full border border-slate-600 shadow-inner overflow-hidden">
                                                {/* Progress Bar */}
                                                <div
                                                    className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-rose-500 to-rose-400 rounded-full"
                                                    style={{
                                                        width: `${Math.max(calculatePercentage(stats.q4Publications, stats.journalArticles), 0)}%`,
                                                        boxShadow: '0 0 25px 4px rgba(244, 63, 94, 0.6)'
                                                    }}
                                                />
                                                {/* Author Stats Overlay */}
                                                <div className="absolute left-4 top-0 bottom-0 flex items-center gap-3 z-10">
                                                    {stats.q4FirstAuthor > 0 && (
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/5 transition-transform hover:scale-105">
                                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">1st</span>
                                                            <span className="text-sm font-bold text-white">{stats.q4FirstAuthor}</span>
                                                        </div>
                                                    )}
                                                    {stats.q4Corresponding > 0 && (
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/5 transition-transform hover:scale-105">
                                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Corr</span>
                                                            <span className="text-sm font-bold text-white">{stats.q4Corresponding}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Stats Overlay */}
                                                <div className="absolute right-6 top-0 bottom-0 flex flex-col justify-center text-right z-10">
                                                    <div className="text-xl font-bold text-white leading-none mb-1">{calculatePercentage(stats.q4Publications, stats.journalArticles)}%</div>
                                                    <div className="text-xs text-slate-300 font-medium">{stats.q4Publications} publications</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

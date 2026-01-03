'use client';

import { useState, useEffect } from 'react';
import { Upload, Users, BarChart3, Download, Trash2 } from 'lucide-react';

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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
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
                        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="w-5 h-5 text-gray-300" />
                                <h3 className="font-semibold text-white">RC Members ({members.length})</h3>
                            </div>

                            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                {members.map((member) => (
                                    <div
                                        key={member.id}
                                        className={`relative group rounded-lg transition border ${selectedMember?.id === member.id
                                            ? 'bg-blue-900/30 border-blue-500'
                                            : 'bg-gray-700/50 hover:bg-gray-700 border-gray-600'
                                            }`}
                                    >
                                        <button
                                            onClick={() => setSelectedMember(member)}
                                            onMouseEnter={() => {
                                                // Prefetch stats on hover for instant switching
                                                const cacheKey = `${member.id}-${selectedYear}`;
                                                if (!statsCache[cacheKey]) {
                                                    fetchMemberStats(member.id, selectedYear);
                                                }
                                            }}
                                            className="w-full text-left p-3"
                                        >
                                            <div className="font-medium text-sm text-white mb-1">{member.name}</div>
                                            <div className="text-xs text-gray-400 mb-1.5">
                                                {member.totalPublications} publications
                                            </div>
                                            <div className="flex gap-1.5 flex-wrap">
                                                {member.q1Publications > 0 && (
                                                    <span className="px-1.5 py-0.5 bg-green-900/50 text-green-300 text-xs rounded border border-green-700">
                                                        Q1: {member.q1Publications}
                                                    </span>
                                                )}
                                                {member.q2Publications > 0 && (
                                                    <span className="px-1.5 py-0.5 bg-blue-900/50 text-blue-300 text-xs rounded border border-blue-700">
                                                        Q2: {member.q2Publications}
                                                    </span>
                                                )}
                                                {member.q3Publications > 0 && (
                                                    <span className="px-1.5 py-0.5 bg-orange-900/50 text-orange-300 text-xs rounded border border-orange-700">
                                                        Q3: {member.q3Publications}
                                                    </span>
                                                )}
                                                {member.q4Publications > 0 && (
                                                    <span className="px-1.5 py-0.5 bg-red-900/50 text-red-300 text-xs rounded border border-red-700">
                                                        Q4: {member.q4Publications}
                                                    </span>
                                                )}
                                            </div>
                                        </button>

                                        {/* Delete Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteMember(member.id, member.name);
                                            }}
                                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-900/50 hover:bg-red-900 border border-red-700 text-red-300 hover:text-red-100 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Delete member"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
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
                                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">{selectedMember.name}</h2>
                                            <p className="text-gray-400">Publication Analysis</p>
                                        </div>
                                        <select
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(e.target.value)}
                                            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                        <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                                            <div className="text-3xl font-bold text-white">{stats.totalPublications}</div>
                                            <div className="text-sm text-gray-400 mt-1">Total Publications</div>
                                        </div>
                                        <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-700">
                                            <div className="text-3xl font-bold text-blue-300">{stats.journalArticles}</div>
                                            <div className="text-sm text-blue-400 mt-1">Journal Articles</div>
                                        </div>
                                        <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                                            <div className="text-3xl font-bold text-white">{stats.conferencePapers}</div>
                                            <div className="text-sm text-gray-400 mt-1">Conference Papers</div>
                                        </div>
                                        <div className="bg-green-900/30 p-4 rounded-lg border border-green-700">
                                            <div className="text-3xl font-bold text-green-300">{stats.q1Publications}</div>
                                            <div className="text-sm text-green-400 mt-1">Q1 Publications</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Quartile Distribution Chart */}
                                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Journal Quartile Distribution</h3>

                                    <div className="space-y-4">
                                        {/* Q1 Bar */}
                                        <div className="flex items-center gap-4">
                                            <div className="text-lg font-bold text-white w-12">Q1</div>
                                            <div className="flex-1 relative h-8">
                                                <div
                                                    className="absolute left-0 h-8 bg-slate-700/80 rounded-full overflow-hidden flex"
                                                    style={{ width: `${Math.max(calculatePercentage(stats.q1Publications, stats.journalArticles), 20)}%` }}
                                                >
                                                    {stats.q1FirstAuthor > 0 && (
                                                        <div
                                                            className="bg-emerald-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                                                            style={{ minWidth: '60px', width: `${(stats.q1FirstAuthor / stats.q1Publications) * 100}%` }}
                                                        >
                                                            1st: {stats.q1FirstAuthor}
                                                        </div>
                                                    )}
                                                    {stats.q1Corresponding > 0 && (
                                                        <div
                                                            className="bg-emerald-400 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                                                            style={{ minWidth: '70px', width: `${(stats.q1Corresponding / stats.q1Publications) * 100}%` }}
                                                        >
                                                            Corr: {stats.q1Corresponding}
                                                        </div>
                                                    )}
                                                    {stats.q1CoAuthor > 0 && (
                                                        <div
                                                            className="bg-emerald-300 flex items-center justify-center text-emerald-900 text-xs font-semibold flex-shrink-0"
                                                            style={{ minWidth: '60px', width: `${(stats.q1CoAuthor / stats.q1Publications) * 100}%` }}
                                                        >
                                                            Co: {stats.q1CoAuthor}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right min-w-[120px]">
                                                <div className="text-2xl font-bold text-white">{calculatePercentage(stats.q1Publications, stats.journalArticles)}%</div>
                                                <div className="text-xs text-gray-400">{stats.q1Publications} publications</div>
                                            </div>
                                        </div>

                                        {/* Q2 Bar */}
                                        <div className="flex items-center gap-4">
                                            <div className="text-lg font-bold text-white w-12">Q2</div>
                                            <div className="flex-1 relative h-8">
                                                <div
                                                    className="absolute left-0 h-8 bg-slate-700/80 rounded-full overflow-hidden flex"
                                                    style={{ width: `${Math.max(calculatePercentage(stats.q2Publications, stats.journalArticles), 20)}%` }}
                                                >
                                                    {stats.q2FirstAuthor > 0 && (
                                                        <div
                                                            className="bg-sky-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                                                            style={{ minWidth: '60px', width: `${(stats.q2FirstAuthor / stats.q2Publications) * 100}%` }}
                                                        >
                                                            1st: {stats.q2FirstAuthor}
                                                        </div>
                                                    )}
                                                    {stats.q2Corresponding > 0 && (
                                                        <div
                                                            className="bg-sky-400 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                                                            style={{ minWidth: '70px', width: `${(stats.q2Corresponding / stats.q2Publications) * 100}%` }}
                                                        >
                                                            Corr: {stats.q2Corresponding}
                                                        </div>
                                                    )}
                                                    {stats.q2CoAuthor > 0 && (
                                                        <div
                                                            className="bg-sky-300 flex items-center justify-center text-sky-900 text-xs font-semibold flex-shrink-0"
                                                            style={{ minWidth: '60px', width: `${(stats.q2CoAuthor / stats.q2Publications) * 100}%` }}
                                                        >
                                                            Co: {stats.q2CoAuthor}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right min-w-[120px]">
                                                <div className="text-2xl font-bold text-white">{calculatePercentage(stats.q2Publications, stats.journalArticles)}%</div>
                                                <div className="text-xs text-gray-400">{stats.q2Publications} publications</div>
                                            </div>
                                        </div>

                                        {/* Q3 Bar */}
                                        <div className="flex items-center gap-4">
                                            <div className="text-lg font-bold text-white w-12">Q3</div>
                                            <div className="flex-1 relative h-8">
                                                <div
                                                    className="absolute left-0 h-8 bg-slate-700/80 rounded-full overflow-hidden flex"
                                                    style={{ width: `${Math.max(calculatePercentage(stats.q3Publications, stats.journalArticles), 20)}%` }}
                                                >
                                                    {stats.q3FirstAuthor > 0 && (
                                                        <div
                                                            className="bg-amber-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                                                            style={{ minWidth: '60px', width: `${(stats.q3FirstAuthor / stats.q3Publications) * 100}%` }}
                                                        >
                                                            1st: {stats.q3FirstAuthor}
                                                        </div>
                                                    )}
                                                    {stats.q3Corresponding > 0 && (
                                                        <div
                                                            className="bg-amber-400 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                                                            style={{ minWidth: '70px', width: `${(stats.q3Corresponding / stats.q3Publications) * 100}%` }}
                                                        >
                                                            Corr: {stats.q3Corresponding}
                                                        </div>
                                                    )}
                                                    {stats.q3CoAuthor > 0 && (
                                                        <div
                                                            className="bg-amber-300 flex items-center justify-center text-amber-900 text-xs font-semibold flex-shrink-0"
                                                            style={{ minWidth: '60px', width: `${(stats.q3CoAuthor / stats.q3Publications) * 100}%` }}
                                                        >
                                                            Co: {stats.q3CoAuthor}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right min-w-[120px]">
                                                <div className="text-2xl font-bold text-white">{calculatePercentage(stats.q3Publications, stats.journalArticles)}%</div>
                                                <div className="text-xs text-gray-400">{stats.q3Publications} publications</div>
                                            </div>
                                        </div>

                                        {/* Q4 Bar */}
                                        <div className="flex items-center gap-4">
                                            <div className="text-lg font-bold text-white w-12">Q4</div>
                                            <div className="flex-1 relative h-8">
                                                <div
                                                    className="absolute left-0 h-8 bg-slate-700/80 rounded-full overflow-hidden flex"
                                                    style={{ width: `${Math.max(calculatePercentage(stats.q4Publications, stats.journalArticles), 20)}%` }}
                                                >
                                                    {stats.q4FirstAuthor > 0 && (
                                                        <div
                                                            className="bg-rose-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                                                            style={{ minWidth: '60px', width: `${(stats.q4FirstAuthor / stats.q4Publications) * 100}%` }}
                                                        >
                                                            1st: {stats.q4FirstAuthor}
                                                        </div>
                                                    )}
                                                    {stats.q4Corresponding > 0 && (
                                                        <div
                                                            className="bg-rose-400 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                                                            style={{ minWidth: '70px', width: `${(stats.q4Corresponding / stats.q4Publications) * 100}%` }}
                                                        >
                                                            Corr: {stats.q4Corresponding}
                                                        </div>
                                                    )}
                                                    {stats.q4CoAuthor > 0 && (
                                                        <div
                                                            className="bg-rose-300 flex items-center justify-center text-rose-900 text-xs font-semibold flex-shrink-0"
                                                            style={{ minWidth: '60px', width: `${(stats.q4CoAuthor / stats.q4Publications) * 100}%` }}
                                                        >
                                                            Co: {stats.q4CoAuthor}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right min-w-[120px]">
                                                <div className="text-2xl font-bold text-white">{calculatePercentage(stats.q4Publications, stats.journalArticles)}%</div>
                                                <div className="text-xs text-gray-400">{stats.q4Publications} publications</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex gap-6 text-sm text-gray-400">
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-gray-600 rounded"></div>
                                            <span>1st Author</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-gray-500 rounded"></div>
                                            <span>Corresponding</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-gray-400 rounded"></div>
                                            <span>Co-author</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Upload Section - Moved to Bottom */}
            <div className="mt-6 bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
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
                        <div className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm">
                            {uploading ? 'Uploading...' : 'Choose CSV File'}
                        </div>
                    </label>
                </div>
            </div>
        </div>
    );
}

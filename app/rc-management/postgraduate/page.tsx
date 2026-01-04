'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { Upload, Users, Filter, SortAsc, SortDesc, X, Search, GraduationCap, BookOpen, UserCheck, Calendar, ArrowLeft, GripVertical } from 'lucide-react';


// Check if recharts is installed, otherwise fallback to simple visuals
// Assuming it is available based on project nature.

interface PostgradMember {
    id: string;
    name: string;
    totalStudents: number;
    inProgressCount: number;
    completedCount: number;
    phdCount: number;
    masterCount: number;
}

interface Supervision {
    id: string;
    studentName: string;
    level: string;
    status: string;
    role: string;
    institution: string | null;
    programTitle: string | null;
    startDate: string | null;
    completedDate: string | null;
    startYear: number | null;
    completedYear: number | null;
    areaOfStudy: string | null;
}

interface PostgradStats {
    totalStudents: number;
    inProgressCount: number;
    completedCount: number;
    phdCount: number;
    masterCount: number;
    mainSupervisorCount: number;
    coSupervisorCount: number;
}

interface YearGroup {
    inProgress: number;
    completed: number;
}

type SortField = 'name' | 'totalStudents' | 'inProgressCount' | 'completedCount';
type SortDirection = 'asc' | 'desc';

interface FilterState {
    searchQuery: string;
    totalStudentsMin: number;
    totalStudentsMax: number;
}

export default function RCPostgraduatePage() {
    const [members, setMembers] = useState<PostgradMember[]>([]);
    const [selectedMember, setSelectedMember] = useState<PostgradMember | null>(null);
    const [stats, setStats] = useState<PostgradStats | null>(null);
    const [supervisions, setSupervisions] = useState<Supervision[]>([]);
    const [yearGroups, setYearGroups] = useState<Record<number, YearGroup>>({});
    const [availableYears, setAvailableYears] = useState<number[]>([]);

    // Multi-select years filter
    const [selectedYears, setSelectedYears] = useState<number[]>([]);

    const [loading, setLoading] = useState(true);
    const [loadingStats, setLoadingStats] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Sorting
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    // Filters
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        searchQuery: '',
        totalStudentsMin: 0,
        totalStudentsMax: 1000,
    });

    // Fetch members on mount
    useEffect(() => {
        fetchMembers();
    }, []);

    // Fetch stats when member or years filter changes
    useEffect(() => {
        if (selectedMember) {
            setLoadingStats(true); // Don't block UI mostly, but show loading state in right panel
            const yearsParam = selectedYears.length > 0 ? selectedYears.join(',') : 'all';
            fetchMemberStats(selectedMember.id, yearsParam);
        }
    }, [selectedMember, selectedYears]);

    const fetchMembers = async () => {
        try {
            const res = await fetch('/api/rc-management/postgraduate/members');
            const data = await res.json();
            if (data.success) {
                setMembers(data.members);
                if (data.members.length > 0 && !selectedMember) {
                    setSelectedMember(data.members[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching members:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMemberStats = async (memberId: string, yearsArg: string) => {
        try {
            const res = await fetch(`/api/rc-management/postgraduate/stats?memberId=${memberId}&years=${yearsArg}`);
            const data = await res.json();

            if (data.member) { // Check if successful response
                setStats(data.stats);
                setSupervisions(data.supervisions);
                setYearGroups(data.yearGroups);

                // Update available years only if we haven't set them yet (to keep the checkboxes stable)
                // Or maybe we want to always see all years? The API returns all available years for the member.
                if (availableYears.length === 0) {
                    setAvailableYears(data.availableYears);
                }
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
            const res = await fetch('/api/rc-management/postgraduate/upload', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (data.success) {
                alert(`Successfully uploaded supervision data for ${data.member.name}`);
                fetchMembers(); // Refresh list to update counts
                if (selectedMember && selectedMember.id === data.member.id) {
                    // Force refresh stats if we uploaded for current member
                    fetchMemberStats(selectedMember.id, selectedYears.length > 0 ? selectedYears.join(',') : 'all');
                }
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
        if (!confirm(`Are you sure you want to delete ${memberName} and all their supervision record? This action cannot be undone.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/rc-management/postgraduate/members?id=${memberId}`, {
                method: 'DELETE'
            });

            const data = await res.json();
            if (data.success) {
                alert(`Successfully deleted ${memberName}`);
                fetchMembers();
                if (selectedMember?.id === memberId) {
                    setSelectedMember(null);
                    setStats(null);
                }
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Error deleting member:', error);
            alert('Failed to delete member');
        }
    };

    // Filtered and sorted members
    const filteredAndSortedMembers = useMemo(() => {
        let result = [...members];

        if (filters.searchQuery.trim()) {
            const query = filters.searchQuery.toLowerCase();
            result = result.filter(m => m.name.toLowerCase().includes(query));
        }

        result = result.filter(m =>
            m.totalStudents >= filters.totalStudentsMin &&
            m.totalStudents <= filters.totalStudentsMax
        );

        result.sort((a, b) => {
            let aVal: any = a[sortField];
            let bVal: any = b[sortField];

            if (sortField === 'name') {
                return sortDirection === 'asc'
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name);
            }
            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        });

        return result;
    }, [members, filters, sortField, sortDirection]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.searchQuery) count++;
        if (filters.totalStudentsMin > 0 || filters.totalStudentsMax < 1000) count++;
        return count;
    }, [filters]);

    const clearAllFilters = () => {
        setFilters({ searchQuery: '', totalStudentsMin: 0, totalStudentsMax: 1000 });
    };

    const toggleYear = (year: number) => {
        setSelectedYears(prev => {
            if (prev.includes(year)) {
                return prev.filter(y => y !== year);
            } else {
                return [...prev, year].sort((a, b) => b - a);
            }
        });
    };

    // Prepare chart data
    const chartData = useMemo(() => {
        return Object.entries(yearGroups).map(([year, data]) => ({
            year,
            InProgress: data.inProgress,
            Completed: data.completed
        })).sort((a, b) => parseInt(a.year) - parseInt(b.year));
    }, [yearGroups]);

    const pieData = useMemo(() => {
        if (!stats) return [];
        return [
            { name: 'PhD', value: stats.phdCount, color: '#10b981' }, // emerald-500
            { name: 'Master', value: stats.masterCount, color: '#3b82f6' } // blue-500
        ].filter(d => d.value > 0);
    }, [stats]);

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
                {/* Back Link */}
                <div className="mb-6">
                    <Link href="/chat" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                        <span>Back to Chat</span>
                    </Link>
                </div>

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#818cf8] mb-2">
                        RC Postgrad Supervision Analysis
                    </h1>
                    <p className="text-gray-300">
                        Track and analyze postgraduate supervision records for research centre members
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Panel - Members List */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-4 shadow-[0_0_15px_rgba(255,255,255,0.07)]">
                            {/* Header & Sort */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-blue-300" />
                                    <h3 className="font-semibold text-blue-300">Supervisors ({filteredAndSortedMembers.length})</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
                                        className="p-1.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300"
                                    >
                                        {sortDirection === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
                                    </button>
                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        className={`p-1.5 rounded-md border transition-colors relative ${showFilters ? 'bg-blue-500/20 border-blue-400/50 text-blue-300' : 'bg-white/5 border-white/10 text-gray-300'}`}
                                    >
                                        <Filter size={16} />
                                        {activeFilterCount > 0 && (
                                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Search */}
                            <div className="mb-3 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search supervisors..."
                                    value={filters.searchQuery}
                                    onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                                    className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                            </div>

                            {/* Filters Panel */}
                            {showFilters && (
                                <div className="mb-3 p-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg space-y-3">
                                    <div className="flex justify-between">
                                        <h4 className="text-xs font-semibold text-white">Total Students</h4>
                                        <button onClick={clearAllFilters} className="text-xs text-blue-400">Clear</button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            placeholder="Min"
                                            value={filters.totalStudentsMin}
                                            onChange={(e) => setFilters(p => ({ ...p, totalStudentsMin: parseInt(e.target.value) || 0 }))}
                                            className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-white"
                                        />
                                        <span className="text-gray-500">-</span>
                                        <input
                                            type="number"
                                            placeholder="Max"
                                            value={filters.totalStudentsMax}
                                            onChange={(e) => setFilters(p => ({ ...p, totalStudentsMax: parseInt(e.target.value) || 100 }))}
                                            className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-white"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* List */}
                            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {filteredAndSortedMembers.map(member => (
                                    <div
                                        key={member.id}
                                        className={`relative group rounded-md transition-all duration-300 border ${selectedMember?.id === member.id
                                            ? 'bg-blue-900/40 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                                            : 'bg-white/5 border-transparent hover:border-blue-400/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:bg-slate-800/60'
                                            }`}
                                    >
                                        <button
                                            onClick={() => setSelectedMember(member)}
                                            className="w-full flex items-center gap-3 p-2.5"
                                        >
                                            <div className="text-gray-600 group-hover:text-gray-400 transition-colors">
                                                <GripVertical size={14} />
                                            </div>

                                            <div className="flex-1 font-medium text-sm text-white truncate text-left">{member.name}</div>

                                            <div className="px-2 py-0.5 rounded-full bg-blue-950/50 text-[10px] font-medium text-blue-300 border border-blue-500/20 whitespace-nowrap">
                                                {member.totalStudents} students
                                            </div>

                                            {/* Mini Stacked Bar */}
                                            <div className="flex flex-col gap-[2px] w-12 opacity-80">
                                                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden flex">
                                                    <div style={{ width: `${(member.phdCount / member.totalStudents) * 100}%` }} className="bg-purple-500 h-full" />
                                                    <div style={{ width: `${(member.masterCount / member.totalStudents) * 100}%` }} className="bg-indigo-500 h-full" />
                                                </div>
                                                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden flex">
                                                    <div style={{ width: `${(member.inProgressCount / member.totalStudents) * 100}%` }} className="bg-sky-500 h-full" />
                                                    <div style={{ width: `${(member.completedCount / member.totalStudents) * 100}%` }} className="bg-emerald-500 h-full" />
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Upload */}
                        <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-5 shadow-lg">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Upload className="w-5 h-5 text-blue-400" />
                                    <div>
                                        <h2 className="text-sm font-semibold text-white">Upload Statistics</h2>
                                        <p className="text-xs text-gray-400">Upload CSV file containing supervision data</p>
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

                    {/* Right Panel - Dashboard */}
                    <div className="lg:col-span-2 space-y-6">
                        {loadingStats ? (
                            <div className="h-full flex items-center justify-center bg-slate-900/50 rounded-lg border border-white/10">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            </div>
                        ) : selectedMember && stats ? (
                            <>
                                {/* Stats Cards */}
                                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white mb-1">{selectedMember.name}</h2>
                                            <p className="text-slate-400 text-sm">Supervision Dashboard</p>
                                        </div>

                                        {/* Year Filter Dropdown/Checkboxes */}
                                        <div className="relative group">
                                            <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white hover:bg-slate-700">
                                                <Calendar size={14} />
                                                {selectedYears.length === 0 ? 'All Years' : `${selectedYears.length} Years Selected`}
                                            </button>
                                            <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-2 z-50 hidden group-hover:block max-h-60 overflow-y-auto">
                                                <div className="text-xs text-gray-400 mb-2 px-2">Select Years</div>
                                                {availableYears.map(year => (
                                                    <label key={year} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedYears.includes(year)}
                                                            onChange={() => toggleYear(year)}
                                                            className="rounded border-gray-600 bg-slate-700 text-blue-500 text-sm"
                                                        />
                                                        <span className="text-sm text-gray-200">{year}</span>
                                                    </label>
                                                ))}
                                                {availableYears.length === 0 && <div className="text-xs text-gray-500 px-2">No years found</div>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                                            <div className="text-3xl font-bold text-white">{stats.totalStudents}</div>
                                            <div className="text-xs text-gray-400 mt-1 uppercase tracking-wide">Total Students</div>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-lg border border-sky-500/20">
                                            <div className="text-3xl font-bold text-sky-400">{stats.inProgressCount}</div>
                                            <div className="text-xs text-sky-200/50 mt-1 uppercase tracking-wide">In Progress</div>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-lg border border-emerald-500/20">
                                            <div className="text-3xl font-bold text-emerald-400">{stats.completedCount}</div>
                                            <div className="text-xs text-emerald-200/50 mt-1 uppercase tracking-wide">Graduated</div>
                                        </div>
                                        <div className="p-4 flex gap-4 bg-white/5 rounded-lg border border-white/10">
                                            <div>
                                                <div className="text-xl font-bold text-purple-400">{stats.phdCount}</div>
                                                <div className="text-[10px] text-gray-400">PhD</div>
                                            </div>
                                            <div>
                                                <div className="text-xl font-bold text-indigo-400">{stats.masterCount}</div>
                                                <div className="text-[10px] text-gray-400">Master</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Charts Row */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2 bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg min-h-[300px] flex flex-col">
                                        <h3 className="text-sm font-semibold text-white mb-6">Student Intake History</h3>
                                        <div className="flex-1 flex items-end gap-3 pb-6 relative min-h-[200px]">
                                            {/* Y-axis lines (visual only) */}
                                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                                                <div className="border-t border-gray-400 w-full"></div>
                                                <div className="border-t border-gray-400 w-full"></div>
                                                <div className="border-t border-gray-400 w-full"></div>
                                                <div className="border-t border-gray-400 w-full"></div>
                                            </div>

                                            {(() => {
                                                const maxVal = Math.max(...chartData.map(d => d.InProgress + d.Completed), 1);
                                                return chartData.map((data, idx) => {
                                                    const total = data.InProgress + data.Completed;
                                                    const heightPct = (total / maxVal) * 100;
                                                    const ipHeight = (data.InProgress / total) * 100;
                                                    const compHeight = (data.Completed / total) * 100;

                                                    return (
                                                        <div key={data.year} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                                            <div className="w-full max-w-[40px] flex flex-col-reverse rounded overflow-hidden transition-all hover:brightness-110" style={{ height: `${heightPct}%`, minHeight: '4px' }}>
                                                                <div
                                                                    style={{ height: `${ipHeight}%` }}
                                                                    className="w-full bg-sky-500 relative group-hover:bg-sky-400 transition-colors"
                                                                    title={`In Progress: ${data.InProgress}`}
                                                                ></div>
                                                                <div
                                                                    style={{ height: `${compHeight}%` }}
                                                                    className="w-full bg-emerald-500 relative group-hover:bg-emerald-400 transition-colors"
                                                                    title={`Graduated: ${data.Completed}`}
                                                                ></div>
                                                            </div>
                                                            <div className="mt-3 text-xs text-gray-400 rotate-0">{data.year}</div>

                                                            {/* Tooltip on hover */}
                                                            <div className="absolute bottom-full mb-2 bg-slate-800 text-xs text-white p-2 rounded shadow-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none">
                                                                <div className="font-bold mb-1">{data.year}</div>
                                                                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-sky-500"></div> In Progress: {data.InProgress}</div>
                                                                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Graduated: {data.Completed}</div>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                        <div className="flex items-center justify-center gap-6 mt-2">
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <div className="w-3 h-3 rounded bg-sky-500"></div> In Progress
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <div className="w-3 h-3 rounded bg-emerald-500"></div> Graduated
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg flex flex-col items-center justify-center">
                                        <h3 className="text-sm font-semibold text-white mb-6 w-full text-left">Level Distribution</h3>
                                        <div className="relative w-40 h-40">
                                            {/* CSS Donut Chart */}
                                            {/* Calculated conic-gradient */}
                                            {(() => {
                                                const total = stats.totalStudents || 1;
                                                const phdPct = (stats.phdCount / total) * 100;
                                                // Conic gradient: PhD from 0deg to Xdeg, Master from Xdeg to 360deg
                                                return (
                                                    <div
                                                        className="w-full h-full rounded-full relative"
                                                        style={{
                                                            background: `conic-gradient(#a855f7 0% ${phdPct}%, #6366f1 ${phdPct}% 100%)`
                                                        }}
                                                    >
                                                        <div className="absolute inset-4 bg-slate-900/90 rounded-full flex flex-col items-center justify-center">
                                                            <div className="text-3xl font-bold text-white">{stats.totalStudents}</div>
                                                            <div className="text-xs text-gray-400">Students</div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        <div className="mt-6 w-full space-y-3">
                                            <div className="flex justify-between items-center text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                                    <span className="text-gray-300">PhD</span>
                                                </div>
                                                <span className="font-bold text-white">{stats.phdCount}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                                                    <span className="text-gray-300">Master</span>
                                                </div>
                                                <span className="font-bold text-white">{stats.masterCount}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Student List Table */}
                                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-lg">
                                    <h3 className="text-sm font-semibold text-white mb-4">Supervision Details</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left text-gray-400">
                                            <thead className="text-xs text-gray-200 uppercase bg-white/5">
                                                <tr>
                                                    <th className="px-4 py-3 rounded-tl-lg">Student Name</th>
                                                    <th className="px-4 py-3">Level</th>
                                                    <th className="px-4 py-3">Status</th>
                                                    <th className="px-4 py-3">Role</th>
                                                    <th className="px-4 py-3">Start Year</th>
                                                    <th className="px-4 py-3 rounded-tr-lg">Program</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {supervisions.map((student) => (
                                                    <tr key={student.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                        <td className="px-4 py-3 font-medium text-white">{student.studentName}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-1 rounded text-[10px] border ${student.level === 'PHD' ? 'bg-purple-500/10 border-purple-500/20 text-purple-300' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'}`}>
                                                                {student.level}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${student.status === 'COMPLETED'
                                                                ? 'bg-emerald-500/10 text-emerald-400'
                                                                : 'bg-sky-500/10 text-sky-400'
                                                                }`}>
                                                                {student.status === 'COMPLETED' ? 'Graduated' : 'In Progress'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs">{student.role}</td>
                                                        <td className="px-4 py-3">{student.startYear || '-'}</td>
                                                        <td className="px-4 py-3 max-w-xs truncate" title={student.programTitle || ''}>
                                                            {student.programTitle || '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {supervisions.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                                            No records found for selected criteria
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-lg bg-slate-900/30">
                                <div className="text-center">
                                    <UserCheck className="mx-auto h-12 w-12 text-gray-600 mb-3" />
                                    <h3 className="text-lg font-medium text-gray-400">Select a supervisor</h3>
                                    <p className="text-sm text-gray-500">Select a member from the list to view stats</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { Upload, Users, BarChart3, Download, Trash2, GripVertical, Filter, SortAsc, SortDesc, X, ChevronDown, Search, ArrowLeft } from 'lucide-react';
import RCOverview from '@/components/rc/RCOverview';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { hasRCAccess, getStaffIdByEmail } from '@/lib/utils/rc-member-check';

interface Member {
    id: string;
    name: string;
    staffId?: string;
    totalPublications: number;
    journalArticles: number;
    conferencePapers: number;
    q1Publications: number;
    q2Publications: number;
    q3Publications: number;
    q4Publications: number;
    recentActivity?: string; // Most recent publication date
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

type SortField = 'name' | 'totalPublications' | 'q1Publications' | 'q2Publications' | 'q3Publications' | 'q4Publications' | 'recentActivity';
type SortDirection = 'asc' | 'desc';

interface FilterState {
    searchQuery: string;
    totalPubsMin: number;
    totalPubsMax: number;
    selectedYears: string[];
    rollingWindow: 'all' | '1year' | '3years' | '4years' | 'custom';
    customStartYear: string;
    customEndYear: string;
    q1Threshold: number;
    q2Threshold: number;
    q3Threshold: number;
    q4Threshold: number;
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

    // Sorting state
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    // Filter state
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        searchQuery: '',
        totalPubsMin: 0,
        totalPubsMax: 1000,
        selectedYears: [],
        rollingWindow: 'all',
        customStartYear: '',
        customEndYear: '',
        q1Threshold: 0,
        q2Threshold: 0,
        q3Threshold: 0,
        q4Threshold: 0,
    });

    // Tab state
    const [activeTab, setActiveTab] = useState<'members' | 'overview'>('members');

    // Session and access control
    const router = useRouter();
    const { data: session, status } = useSession();
    const userStaffId = session?.user?.email ? getStaffIdByEmail(session.user.email) : null;
    const isChairperson = session?.user?.role === 'chairperson';

    // Access control - redirect if not RC member
    useEffect(() => {
        if (status === 'loading') return;

        if (!session || !hasRCAccess(session.user.email, session.user.role)) {
            router.push('/chat');
        }
    }, [session, status, router]);

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
            const res = await fetch('/api/rc-management/publications/members');
            const data = await res.json();
            if (data.success) {
                setMembers(data.members);
            }
        } catch (error) {
            console.error('Error fetching members:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMemberStats = async (memberId: string, year: string) => {
        try {
            const res = await fetch(`/api/rc-management/publications/members/${memberId}?year=${year}`);
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
            const res = await fetch('/api/rc-management/publications/upload', {
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
            const res = await fetch(`/api/rc-management/publications/members/${memberId}`, {
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

    // Filtered and sorted members
    const filteredAndSortedMembers = useMemo(() => {
        let result = [...members];

        // Filter for RC Members (non-chairperson)
        if (!isChairperson && userStaffId && status === 'authenticated') {
            result = result.filter(m => {
                // Exact match comparison as per user request
                const mId = m.staffId?.trim() || '';
                const uId = userStaffId.trim();
                return mId === uId;
            });
        }

        // Apply search filter
        if (filters.searchQuery.trim()) {
            const query = filters.searchQuery.toLowerCase();
            result = result.filter(m => m.name.toLowerCase().includes(query));
        }

        // Apply total publications range filter
        result = result.filter(m =>
            m.totalPublications >= filters.totalPubsMin &&
            m.totalPublications <= filters.totalPubsMax
        );

        // Apply quartile threshold filters
        if (filters.q1Threshold > 0) {
            result = result.filter(m => m.q1Publications >= filters.q1Threshold);
        }
        if (filters.q2Threshold > 0) {
            result = result.filter(m => m.q2Publications >= filters.q2Threshold);
        }
        if (filters.q3Threshold > 0) {
            result = result.filter(m => m.q3Publications >= filters.q3Threshold);
        }
        if (filters.q4Threshold > 0) {
            result = result.filter(m => m.q4Publications >= filters.q4Threshold);
        }

        // Apply sorting
        result.sort((a, b) => {
            let aVal: any = a[sortField];
            let bVal: any = b[sortField];

            if (sortField === 'name') {
                aVal = a.name.toLowerCase();
                bVal = b.name.toLowerCase();
                return sortDirection === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }

            if (sortField === 'recentActivity') {
                aVal = a.recentActivity || '0000-00-00';
                bVal = b.recentActivity || '0000-00-00';
                return sortDirection === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }

            // Numeric sorting
            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        });

        return result;
    }, [members, filters, sortField, sortDirection, isChairperson, userStaffId, status]);

    // Handle member selection
    const handleMemberSelect = async (member: Member) => {
        if (selectedMember?.id === member.id) return; // distinct check
        setSelectedMember(member);
        // Reset selected year when changing member
        setSelectedYear('all');
        await fetchMemberStats(member.id, 'all');
    };

    // UX: Robust Auto-select logic
    // Handles initial load, filtering changes, and invalid selections
    useEffect(() => {
        if (filteredAndSortedMembers.length > 0) {
            const isSelectedInList = selectedMember && filteredAndSortedMembers.some(m => m.id === selectedMember.id);

            if (!isSelectedInList) {
                handleMemberSelect(filteredAndSortedMembers[0]);
            }
        } else if (filteredAndSortedMembers.length === 0 && selectedMember) {
            // Clear selection if list is empty
            setSelectedMember(null);
        }
    }, [filteredAndSortedMembers, selectedMember]);

    // Get active filter count
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.searchQuery.trim()) count++;
        if (filters.totalPubsMin > 0 || filters.totalPubsMax < 1000) count++;
        if (filters.q1Threshold > 0) count++;
        if (filters.q2Threshold > 0) count++;
        if (filters.q3Threshold > 0) count++;
        if (filters.q4Threshold > 0) count++;
        if (filters.selectedYears.length > 0) count++;
        if (filters.rollingWindow !== 'all') count++;
        return count;
    }, [filters]);

    // Clear all filters
    const clearAllFilters = () => {
        setFilters({
            searchQuery: '',
            totalPubsMin: 0,
            totalPubsMax: 1000,
            selectedYears: [],
            rollingWindow: 'all',
            customStartYear: '',
            customEndYear: '',
            q1Threshold: 0,
            q2Threshold: 0,
            q3Threshold: 0,
            q4Threshold: 0,
        });
    };

    // Remove individual filter
    const removeFilter = (filterKey: keyof FilterState) => {
        setFilters(prev => {
            if (filterKey === 'searchQuery') return { ...prev, searchQuery: '' };
            if (filterKey === 'totalPubsMin') return { ...prev, totalPubsMin: 0 };
            if (filterKey === 'totalPubsMax') return { ...prev, totalPubsMax: 1000 };
            if (filterKey === 'q1Threshold') return { ...prev, q1Threshold: 0 };
            if (filterKey === 'q2Threshold') return { ...prev, q2Threshold: 0 };
            if (filterKey === 'q3Threshold') return { ...prev, q3Threshold: 0 };
            if (filterKey === 'q4Threshold') return { ...prev, q4Threshold: 0 };
            if (filterKey === 'selectedYears') return { ...prev, selectedYears: [] };
            if (filterKey === 'rollingWindow') return { ...prev, rollingWindow: 'all' };
            return prev;
        });
    };

    // Toggle sort direction or change field
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0B0B10]">
                <div className="text-lg text-[#94A3B8] font-['JetBrains_Mono',monospace]">LOADING...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0B0B10] p-6">
            <div className="max-w-7xl mx-auto">
                {/* Back Link */}
                <div className="mb-6">
                    <Link href="/chat" className="inline-flex items-center gap-2 text-[#94A3B8] hover:text-white transition-colors font-['JetBrains_Mono',monospace] text-sm uppercase tracking-wide">
                        <ArrowLeft size={20} />
                        <span>// BACK_TO_CHAT</span>
                    </Link>
                </div>

                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-[#3B82F6] font-['Orbitron',sans-serif] uppercase tracking-[0.1em] mb-2">
                        RC PUBLICATIONS DASHBOARD
                    </h1>
                    <p className="text-[#94A3B8] font-['JetBrains_Mono',monospace] text-sm">
                        // ANALYZE_PUBLICATION_QUALITY_AND_QUARTILE_DISTRIBUTION
                    </p>
                </div>

                {/* Tabs */}
                <div className="mb-8 border-b border-[#334155]">
                    <div className="flex gap-1">
                        <button
                            onClick={() => setActiveTab('members')}
                            className={`px-6 py-3 font-['Orbitron',sans-serif] font-bold text-xs uppercase tracking-[0.1em] transition-all ${activeTab === 'members'
                                ? 'text-white border-b-2 border-white'
                                : 'text-[#64748B] hover:text-[#94A3B8]'
                                }`}
                        >
                            MEMBERS
                        </button>
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-6 py-3 font-['Orbitron',sans-serif] font-bold text-xs uppercase tracking-[0.1em] transition-all ${activeTab === 'overview'
                                ? 'text-white border-b-2 border-white'
                                : 'text-[#64748B] hover:text-[#94A3B8]'
                                }`}
                        >
                            RC_OVERVIEW
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                {activeTab === 'members' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Panel - Members List */}
                        <div className="lg:col-span-1">
                            <div
                                className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-4 shadow-[0_0_15px_rgba(255,255,255,0.07)]"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-5 h-5 text-blue-300" />
                                        <h3 className="font-semibold text-blue-300">RC Members ({filteredAndSortedMembers.length})</h3>
                                    </div>
                                    {isChairperson && (
                                        <div className="flex items-center gap-2">
                                            {/* Sort Dropdown */}
                                            <div className="relative group">
                                                <button className="p-1.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                                                    {sortDirection === 'asc' ? <SortAsc className="w-4 h-4 text-gray-300" /> : <SortDesc className="w-4 h-4 text-gray-300" />}
                                                </button>
                                                <div className="absolute right-0 top-full mt-1 w-56 bg-slate-800/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                                    <div className="p-2 space-y-1">
                                                        <div className="text-xs font-semibold text-gray-400 px-2 py-1">Sort by</div>
                                                        {[
                                                            { field: 'name' as SortField, label: 'Name' },
                                                            { field: 'totalPublications' as SortField, label: 'Total Publications' },
                                                            { field: 'q1Publications' as SortField, label: 'Q1 Publications' },
                                                            { field: 'q2Publications' as SortField, label: 'Q2 Publications' },
                                                            { field: 'q3Publications' as SortField, label: 'Q3 Publications' },
                                                            { field: 'q4Publications' as SortField, label: 'Q4 Publications' },
                                                            { field: 'recentActivity' as SortField, label: 'Recent Activity' },
                                                        ].map(({ field, label }) => (
                                                            <button
                                                                key={field}
                                                                onClick={() => handleSort(field)}
                                                                className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${sortField === field
                                                                    ? 'bg-blue-500/20 text-blue-300'
                                                                    : 'text-gray-300 hover:bg-white/10'
                                                                    }`}
                                                            >
                                                                {label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Filter Toggle */}
                                            <button
                                                onClick={() => setShowFilters(!showFilters)}
                                                className={`p-1.5 rounded-md border transition-colors relative ${showFilters
                                                    ? 'bg-blue-500/20 border-blue-400/50 text-blue-300'
                                                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                                                    }`}
                                            >
                                                <Filter className="w-4 h-4" />
                                                {activeFilterCount > 0 && (
                                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full flex items-center justify-center">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                    </span>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Search Bar */}
                                <div className="mb-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search members..."
                                            value={filters.searchQuery}
                                            onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                                            className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        />
                                    </div>
                                </div>

                                {/* Filter Panel */}
                                {showFilters && (
                                    <div className="mb-3 p-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-semibold text-white">Filters</h4>
                                            <button
                                                onClick={clearAllFilters}
                                                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                            >
                                                Clear all
                                            </button>
                                        </div>

                                        {/* Total Publications Range */}
                                        <div>
                                            <label className="text-xs text-gray-400 mb-1 block">Total Publications</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    placeholder="Min"
                                                    value={filters.totalPubsMin || ''}
                                                    onChange={(e) => setFilters(prev => ({ ...prev, totalPubsMin: parseInt(e.target.value) || 0 }))}
                                                    className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                />
                                                <span className="text-gray-500">-</span>
                                                <input
                                                    type="number"
                                                    placeholder="Max"
                                                    value={filters.totalPubsMax === 1000 ? '' : filters.totalPubsMax}
                                                    onChange={(e) => setFilters(prev => ({ ...prev, totalPubsMax: parseInt(e.target.value) || 1000 }))}
                                                    className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                />
                                            </div>
                                        </div>

                                        {/* Q1-Q4 Thresholds (Unified Grid) */}
                                        <div className="grid grid-cols-4 gap-2">
                                            {[
                                                { key: 'q1Threshold' as keyof FilterState, label: 'Q1 ≥', color: 'emerald' },
                                                { key: 'q2Threshold' as keyof FilterState, label: 'Q2 ≥', color: 'sky' },
                                                { key: 'q3Threshold' as keyof FilterState, label: 'Q3 ≥', color: 'amber' },
                                                { key: 'q4Threshold' as keyof FilterState, label: 'Q4 ≥', color: 'rose' },
                                            ].map(({ key, label }) => (
                                                <div key={key}>
                                                    <label className="text-xs text-gray-400 mb-1 block">{label}</label>
                                                    <input
                                                        type="number"
                                                        placeholder="0"
                                                        value={filters[key] || ''}
                                                        onChange={(e) => setFilters(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                                                        className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Active Filter Chips */}
                                {activeFilterCount > 0 && (
                                    <div className="mb-3 flex flex-wrap gap-1.5">
                                        {filters.searchQuery && (
                                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-xs text-blue-300">
                                                <span>Search: "{filters.searchQuery}"</span>
                                                <button onClick={() => removeFilter('searchQuery')} className="hover:text-blue-100">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                        {(filters.totalPubsMin > 0 || filters.totalPubsMax < 1000) && (
                                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-xs text-blue-300">
                                                <span>Total: {filters.totalPubsMin}-{filters.totalPubsMax}</span>
                                                <button onClick={() => { removeFilter('totalPubsMin'); removeFilter('totalPubsMax'); }} className="hover:text-blue-100">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                        {filters.q1Threshold > 0 && (
                                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-xs text-emerald-300">
                                                <span>Q1 ≥ {filters.q1Threshold}</span>
                                                <button onClick={() => removeFilter('q1Threshold')} className="hover:text-emerald-100">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                        {filters.q2Threshold > 0 && (
                                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-sky-500/20 border border-sky-400/30 rounded-full text-xs text-sky-300">
                                                <span>Q2 ≥ {filters.q2Threshold}</span>
                                                <button onClick={() => removeFilter('q2Threshold')} className="hover:text-sky-100">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                        {filters.q3Threshold > 0 && (
                                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 border border-amber-400/30 rounded-full text-xs text-amber-300">
                                                <span>Q3 ≥ {filters.q3Threshold}</span>
                                                <button onClick={() => removeFilter('q3Threshold')} className="hover:text-amber-100">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                        {filters.q4Threshold > 0 && (
                                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-rose-500/20 border border-rose-400/30 rounded-full text-xs text-rose-300">
                                                <span>Q4 ≥ {filters.q4Threshold}</span>
                                                <button onClick={() => removeFilter('q4Threshold')} className="hover:text-rose-100">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Members List */}
                                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                                    {filteredAndSortedMembers.length === 0 ? (
                                        <div className="text-center py-8">
                                            <p className="text-gray-400 text-sm mb-3">No members match your filters</p>
                                            <button
                                                onClick={clearAllFilters}
                                                className="px-4 py-2 bg-blue-500/20 border border-blue-400/30 rounded-lg text-sm text-blue-300 hover:bg-blue-500/30 transition-colors"
                                            >
                                                Reset filters
                                            </button>
                                        </div>
                                    ) : (
                                        filteredAndSortedMembers.map((member) => (
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

                                                    <div className="w-48 flex items-center gap-2">
                                                        <div className="font-medium text-sm text-white truncate">{member.name}</div>
                                                        {member.staffId && (
                                                            <div className="px-1.5 py-0.5 rounded bg-slate-700/50 text-[9px] font-medium text-slate-400 border border-slate-600/30 flex-shrink-0">
                                                                {member.staffId.replace(/^\?\s*/, '')}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="px-2 py-0.5 rounded-full bg-blue-950/50 text-[10px] font-medium text-blue-300 border border-blue-500/20 whitespace-nowrap">
                                                        {member.totalPublications} pubs
                                                    </div>

                                                    {/* Mini Bar Chart */}
                                                    <div className="flex items-end gap-1 h-5 w-14">
                                                        <div className="flex flex-col items-center gap-[1px] w-2.5">
                                                            <div className="text-[8px] text-gray-500 leading-none mb-0.5">{member.q1Publications}</div>
                                                            <div
                                                                className="w-full rounded-t-[1px] bg-emerald-500/80"
                                                                style={{ height: `${member.journalArticles > 0 ? Math.max((member.q1Publications / member.journalArticles) * 100, 20) : 0}%`, minHeight: '4px' }}
                                                            />
                                                        </div>
                                                        <div className="flex flex-col items-center gap-[1px] w-2.5">
                                                            <div className="text-[8px] text-gray-500 leading-none mb-0.5">{member.q2Publications}</div>
                                                            <div
                                                                className="w-full rounded-t-[1px] bg-sky-500/80"
                                                                style={{ height: `${member.journalArticles > 0 ? Math.max((member.q2Publications / member.journalArticles) * 100, 20) : 0}%`, minHeight: '4px' }}
                                                            />
                                                        </div>
                                                        <div className="flex flex-col items-center gap-[1px] w-2.5">
                                                            <div className="text-[8px] text-gray-500 leading-none mb-0.5">{member.q3Publications}</div>
                                                            <div
                                                                className="w-full rounded-t-[1px] bg-amber-500/80"
                                                                style={{ height: `${member.journalArticles > 0 ? Math.max((member.q3Publications / member.journalArticles) * 100, 20) : 0}%`, minHeight: '4px' }}
                                                            />
                                                        </div>
                                                        <div className="flex flex-col items-center gap-[1px] w-2.5">
                                                            <div className="text-[8px] text-gray-500 leading-none mb-0.5">{member.q4Publications}</div>
                                                            <div
                                                                className="w-full rounded-t-[1px] bg-rose-500/80"
                                                                style={{ height: `${member.journalArticles > 0 ? Math.max((member.q4Publications / member.journalArticles) * 100, 20) : 0}%`, minHeight: '4px' }}
                                                            />
                                                        </div>
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
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Upload Section */}
                            {isChairperson && (
                                <div
                                    className="mt-4 bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-4 shadow-[0_0_15px_rgba(255,255,255,0.07)]"
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
                                            <div className="px-6 py-2 bg-[#1E293B] border-2 border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6] hover:text-white transition-all font-['JetBrains_Mono',monospace] text-sm uppercase tracking-wider font-bold shadow-[0_0_10px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.6)]">
                                                {uploading ? '[UPLOADING...]' : '[ UPLOAD ]'}
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            )}
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
                                        className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)]"
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
                                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg border border-white/20 hover:bg-white/20 transition-colors shadow-lg">
                                                <div className="text-3xl font-bold text-white">{stats.totalPublications}</div>
                                                <div className="text-sm text-slate-400 mt-1">Total Publications</div>
                                            </div>
                                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg border border-white/20 hover:bg-white/20 transition-colors shadow-lg">
                                                <div className="text-3xl font-bold text-blue-400">{stats.journalArticles}</div>
                                                <div className="text-sm text-slate-400 mt-1">Journal Articles</div>
                                            </div>
                                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg border border-white/20 hover:bg-white/20 transition-colors shadow-lg">
                                                <div className="text-3xl font-bold text-white">{stats.conferencePapers}</div>
                                                <div className="text-sm text-slate-400 mt-1">Conference Papers</div>
                                            </div>
                                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg border border-white/20 hover:bg-white/20 transition-colors shadow-lg">
                                                <div className="text-3xl font-bold text-emerald-400">{stats.q1Publications}</div>
                                                <div className="text-sm text-slate-400 mt-1">Q1 Publications</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quartile Distribution Chart */}
                                    <div
                                        className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)]"
                                    >
                                        <h3 className="text-lg font-semibold text-white mb-1">Journal Quartile Distribution</h3>
                                        <p className="text-[10px] text-gray-500 mb-4 italic">* Percentages based on journal articles only</p>

                                        <div className="space-y-6">
                                            {/* Q1 Bar */}
                                            <div className="flex items-center gap-4">
                                                <div className="text-xl font-bold text-white w-8">Q1</div>
                                                <div className="flex-1 relative h-14 bg-slate-800/40 backdrop-blur-sm rounded-full border border-slate-600 shadow-inner overflow-hidden">
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
                                                        <div className="text-2xl font-bold text-white leading-none mb-1 drop-shadow-md">{calculatePercentage(stats.q1Publications, stats.journalArticles)}%</div>
                                                        <div className="text-sm font-medium text-slate-400 drop-shadow-sm">{stats.q1Publications} publications</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Q2 Bar */}
                                            <div className="flex items-center gap-4">
                                                <div className="text-xl font-bold text-white w-8">Q2</div>
                                                <div className="flex-1 relative h-14 bg-slate-800/40 backdrop-blur-sm rounded-full border border-slate-600 shadow-inner overflow-hidden">
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
                                                        <div className="text-2xl font-bold text-white leading-none mb-1 drop-shadow-md">{calculatePercentage(stats.q2Publications, stats.journalArticles)}%</div>
                                                        <div className="text-sm font-medium text-slate-400 drop-shadow-sm">{stats.q2Publications} publications</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Q3 Bar */}
                                            <div className="flex items-center gap-4">
                                                <div className="text-xl font-bold text-white w-8">Q3</div>
                                                <div className="flex-1 relative h-14 bg-slate-800/40 backdrop-blur-sm rounded-full border border-slate-600 shadow-inner overflow-hidden">
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
                                                        <div className="text-2xl font-bold text-white leading-none mb-1 drop-shadow-md">{calculatePercentage(stats.q3Publications, stats.journalArticles)}%</div>
                                                        <div className="text-sm font-medium text-slate-400 drop-shadow-sm">{stats.q3Publications} publications</div>
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
                                                        <div className="text-2xl font-bold text-white leading-none mb-1 drop-shadow-md">{calculatePercentage(stats.q4Publications, stats.journalArticles)}%</div>
                                                        <div className="text-sm font-medium text-slate-400 drop-shadow-sm">{stats.q4Publications} publications</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <RCOverview showNames={isChairperson} />
                )}
            </div>
        </div>
    );
}

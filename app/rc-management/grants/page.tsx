'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { Upload, Users, DollarSign, ArrowLeft, Trash2, GripVertical, Filter, SortAsc, SortDesc, X, Search, RefreshCw } from 'lucide-react';
import RCGrantOverview from '@/components/rc/RCGrantOverview';
import RCGrantDonutChart from '@/components/rc/RCGrantDonutChart';
import RCGrantYearlyBarChart from '@/components/rc/RCGrantYearlyBarChart';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { hasRCAccess, getStaffIdByEmail } from '@/lib/utils/rc-member-check';

interface Member {
    id: string;
    name: string;
    staffId?: string;
    faculty?: string;
    totalGrants: number;
    totalFunding: number;
    inUtarGrants: number;
    notInUtarGrants: number;
    internalGrants: number;
    externalGrants: number;
    piCount: number;
    coResearcherCount: number;
}

interface Grant {
    id: string;
    title: string;
    fundingBody: string;
    fundingLocation: string;
    role: string;
    grantType: string;
    grantCategory?: string;
    fundingAmount: number;
    commencementDate?: string;
    endDate?: string;
    projectStatus: string;
    keywords: string[];
    collaborators: any[];
}

type SortField = 'name' | 'totalGrants' | 'totalFunding' | 'piCount' | 'externalGrants';
type SortDirection = 'asc' | 'desc';

export default function RCGrantPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [grants, setGrants] = useState<Grant[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadingStates, setUploadingStates] = useState({ inUtar: false, notInUtar: false });
    const [loadingGrants, setLoadingGrants] = useState(false);

    // Sorting state
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    // Filter state
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Tab state
    const [activeTab, setActiveTab] = useState<'members' | 'overview'>('members');

    // Session and access control
    const router = useRouter();
    const { data: session, status } = useSession();
    const userStaffId = session?.user?.email ? getStaffIdByEmail(session.user.email) : null;
    const isChairperson = session?.user?.role === 'chairperson';

    // Access control
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

    // Fetch grants when member changes
    useEffect(() => {
        if (selectedMember) {
            fetchMemberGrants(selectedMember.staffId || '');
        }
    }, [selectedMember]);

    // Sync selectedMember with members list updates to reflect new stats immediately
    useEffect(() => {
        if (selectedMember) {
            const updatedMember = members.find(m => m.id === selectedMember.id);
            // Only update if the object reference has changed (implies data update from fetchMembers)
            if (updatedMember && updatedMember !== selectedMember) {
                setSelectedMember(updatedMember);
            }
        }
    }, [members]);

    const fetchMembers = async () => {
        try {
            const res = await fetch('/api/rc-grant/overview');
            const data = await res.json();
            if (data.members) {
                setMembers(data.members);
            }
        } catch (error) {
            console.error('Error fetching members:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMemberGrants = async (staffId: string) => {
        setLoadingGrants(true);
        try {
            const res = await fetch(`/api/rc-grant/${staffId}`);
            const data = await res.json();
            if (data.member) {
                setGrants(data.member.grants);
            }
        } catch (error) {
            console.error('Error fetching grants:', error);
        } finally {
            setLoadingGrants(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'inUtar' | 'notInUtar') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingStates(prev => ({ ...prev, [fileType]: true }));
        const formData = new FormData();

        if (fileType === 'inUtar') {
            formData.append('inUtarFile', file);
        } else {
            formData.append('notInUtarFile', file);
        }

        try {
            const res = await fetch('/api/rc-grant/upload', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (data.success) {
                alert(`Successfully processed ${data.membersProcessed} members with ${data.totalGrantsFound} grants.`);
                await fetchMembers();
                // If a member is currently selected, refresh their grants too (auto-refresh logic)
                // Note: fetchMembers usage of useEffect might trigger this already via selectedMember update,
                // but calling it explicitly ensures the latest list is fetched if the selectedMember object identity doesn't change enough to trigger useEffect
                if (data.member && data.member.staffId) {
                    // If the response returns a specific member context
                    await fetchMemberGrants(data.member.staffId);
                } else if (selectedMember && selectedMember.staffId) {
                    // Fallback to refreshing currently selected member
                    await fetchMemberGrants(selectedMember.staffId);
                }
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Error uploading:', error);
            alert('Failed to upload file');
        } finally {
            setUploadingStates(prev => ({ ...prev, [fileType]: false }));
            e.target.value = '';
        }
    };

    const handleDeleteMember = async (staffId: string, memberName: string) => {
        if (!confirm(`Are you sure you want to delete ${memberName} and all their grants? This action cannot be undone.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/rc-grant/${staffId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setMembers(prev => prev.filter(m => m.staffId !== staffId));
                if (selectedMember?.staffId === staffId) {
                    setSelectedMember(null);
                }
            } else {
                const data = await res.json();
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

        // Filter for RC Members (non-chairperson)
        if (!isChairperson && userStaffId && status === 'authenticated') {
            result = result.filter(m => {
                const mId = m.staffId?.trim() || '';
                const uId = userStaffId.trim();
                return mId === uId;
            });
        }

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(m => m.name.toLowerCase().includes(query));
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

            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        });

        return result;
    }, [members, searchQuery, sortField, sortDirection, isChairperson, userStaffId, status]);

    // Auto-select first member
    useEffect(() => {
        if (filteredAndSortedMembers.length > 0) {
            const isSelectedInList = selectedMember && filteredAndSortedMembers.some(m => m.id === selectedMember.id);
            if (!isSelectedInList) {
                setSelectedMember(filteredAndSortedMembers[0]);
            }
        } else if (filteredAndSortedMembers.length === 0 && selectedMember) {
            setSelectedMember(null);
        }
    }, [filteredAndSortedMembers]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
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
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-[#818cf8] mb-2">
                        RC Members Grant Analysis
                    </h1>
                    <p className="text-gray-300">
                        Track research grants, funding amounts, and project roles for research centre members
                    </p>
                </div>

                {/* Tabs */}
                <div className="mb-8 border-b border-white/10">
                    <div className="flex gap-1">
                        <button
                            onClick={() => setActiveTab('members')}
                            className={`px-6 py-3 font-medium transition-all ${activeTab === 'members'
                                ? 'text-blue-400 border-b-2 border-blue-400'
                                : 'text-gray-400 hover:text-gray-300'
                                }`}
                        >
                            Members
                        </button>
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-6 py-3 font-medium transition-all ${activeTab === 'overview'
                                ? 'text-blue-400 border-b-2 border-blue-400'
                                : 'text-gray-400 hover:text-gray-300'
                                }`}
                        >
                            RC Overview
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                {activeTab === 'members' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Panel - Members List */}
                        <div className="lg:col-span-1">
                            <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-4 shadow-[0_0_15px_rgba(255,255,255,0.07)]">
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
                                                            { field: 'totalGrants' as SortField, label: 'Total Grants' },
                                                            { field: 'totalFunding' as SortField, label: 'Total Funding' },
                                                            { field: 'piCount' as SortField, label: 'PI Count' },
                                                            { field: 'externalGrants' as SortField, label: 'External Grants' },
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
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        />
                                    </div>
                                </div>

                                {/* Members List */}
                                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                                    {filteredAndSortedMembers.length === 0 ? (
                                        <div className="text-center py-8">
                                            <p className="text-gray-400 text-sm">No members found</p>
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
                                                    className="w-full flex items-center gap-3 p-2.5 text-left"
                                                >
                                                    <div className="text-gray-600 group-hover:text-gray-400 transition-colors">
                                                        <GripVertical size={14} />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-sm text-white truncate">{member.name}</div>
                                                        {member.staffId && (
                                                            <div className="text-[10px] text-gray-500 truncate mt-0.5">{member.staffId}</div>
                                                        )}
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="text-xs text-gray-400">
                                                                {member.totalGrants} grants • {formatCurrency(member.totalFunding)}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Mini Stats */}
                                                    <div className="flex flex-col gap-1 text-[10px]">
                                                        <div className="px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-300 border border-emerald-500/20">
                                                            PI: {member.piCount}
                                                        </div>
                                                        <div className="px-1.5 py-0.5 rounded bg-blue-950/50 text-blue-300 border border-blue-500/20">
                                                            Ext: {member.externalGrants}
                                                        </div>
                                                    </div>
                                                </button>

                                                {/* Delete Button (Only for Chairperson) */}
                                                {isChairperson && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteMember(member.staffId || '', member.name);
                                                        }}
                                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all p-1.5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-md"
                                                        title="Delete Member"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Upload Section */}
                            {isChairperson && (
                                <div className="mt-4 bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-4 shadow-[0_0_15px_rgba(255,255,255,0.07)]">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Upload className="w-5 h-5 text-blue-400" />
                                        <div>
                                            <h2 className="text-sm font-semibold text-white">Upload Grant Data</h2>
                                            <p className="text-xs text-gray-400">Upload CSV files for grant tracking</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-row gap-2">
                                        {/* IN UTAR Upload */}
                                        <label className="cursor-pointer flex-1">
                                            <input
                                                type="file"
                                                accept=".csv"
                                                onChange={(e) => handleFileUpload(e, 'inUtar')}
                                                className="hidden"
                                                disabled={uploadingStates.inUtar || uploadingStates.notInUtar}
                                            />
                                            <div className={`px-4 py-2 rounded-lg transition font-medium text-sm text-center ${uploadingStates.inUtar
                                                ? 'bg-emerald-800/50 text-emerald-300 cursor-wait'
                                                : 'bg-emerald-600/80 text-white hover:bg-emerald-700'
                                                }`}>
                                                {uploadingStates.inUtar ? 'Processing...' : 'Upload IN UTAR Grants'}
                                            </div>
                                        </label>

                                        {/* NOT IN UTAR Upload */}
                                        <label className="cursor-pointer flex-1">
                                            <input
                                                type="file"
                                                accept=".csv"
                                                onChange={(e) => handleFileUpload(e, 'notInUtar')}
                                                className="hidden"
                                                disabled={uploadingStates.inUtar || uploadingStates.notInUtar}
                                            />
                                            <div className={`px-4 py-2 rounded-lg transition font-medium text-sm text-center ${uploadingStates.notInUtar
                                                ? 'bg-amber-800/50 text-amber-300 cursor-wait'
                                                : 'bg-amber-600/80 text-white hover:bg-amber-700'
                                                }`}>
                                                {uploadingStates.notInUtar ? 'Processing...' : 'Upload NOT IN UTAR Grants'}
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Panel - Grant Details */}
                        <div className="lg:col-span-2">
                            {loadingGrants && (
                                <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                                        <p className="text-gray-400">Loading grants...</p>
                                    </div>
                                </div>
                            )}
                            {!loadingGrants && selectedMember && (
                                <div className="space-y-6">
                                    {/* Member Header */}
                                    <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)]">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h2 className="text-2xl font-bold text-white mb-1">{selectedMember.name}</h2>
                                                <p className="text-gray-400">Grant Portfolio Analysis</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    fetchMembers();
                                                    if (selectedMember?.staffId) fetchMemberGrants(selectedMember.staffId);
                                                }}
                                                className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                                title="Refresh Data"
                                            >
                                                <RefreshCw size={18} />
                                            </button>
                                        </div>

                                        {/* Key Metrics (Scoreboard) */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                                <div className="text-2xl font-bold text-blue-400">{selectedMember.totalGrants}</div>
                                                <div className="text-xs text-gray-400">Total Grants</div>
                                            </div>
                                            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                                <div className="text-2xl font-bold text-emerald-400">{formatCurrency(selectedMember.totalFunding)}</div>
                                                <div className="text-xs text-gray-400">Total Funding</div>
                                            </div>
                                            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                                <div className="text-2xl font-bold text-purple-400">{selectedMember.piCount}</div>
                                                <div className="text-xs text-gray-400">As PI</div>
                                            </div>
                                            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                                <div className="text-2xl font-bold text-amber-400">{selectedMember.externalGrants}</div>
                                                <div className="text-xs text-gray-400">External</div>
                                            </div>
                                        </div>

                                        {/* Charts: Yearly Bar (Left) + Donut (Right) */}
                                        <div className="flex flex-col md:flex-row border-t border-white/5">
                                            {/* Left: Yearly Funding Bar Chart */}
                                            <div className="flex-1 py-4 border-b md:border-b-0 md:border-r border-white/5 flex justify-center items-center">
                                                <RCGrantYearlyBarChart grants={grants} />
                                            </div>

                                            {/* Right: Funding Distribution Donut */}
                                            <div className="flex-1 py-4 flex justify-center items-center">
                                                <RCGrantDonutChart
                                                    grants={grants}
                                                    totalFunding={Number(selectedMember.totalFunding)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Grant List */}
                                    <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)]">
                                        <h3 className="text-lg font-semibold text-white mb-4">Grants ({grants.length})</h3>

                                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                            {grants.map((grant) => (
                                                <div
                                                    key={grant.id}
                                                    className={`bg-white/5 rounded-lg p-4 border transition-colors ${grant.fundingLocation === 'IN_UTAR'
                                                        ? 'border-emerald-500/20 hover:border-emerald-500/40' // Green for IN_UTAR
                                                        : grant.fundingLocation === 'NOT_IN_UTAR'
                                                            ? 'border-amber-500/20 hover:border-amber-500/40' // Orange/Amber for NOT_IN_UTAR
                                                            : 'border-white/10 hover:border-blue-400/30'
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <h4 className="font-medium text-white text-sm flex-1 mr-4">{grant.title}</h4>
                                                        <div className="flex flex-col gap-1 items-end shrink-0">
                                                            {/* Row 1: Role */}
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium tracking-wide ${grant.role === 'PRINCIPAL INVESTIGATOR'
                                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                                                }`}>
                                                                {grant.role === 'PRINCIPAL INVESTIGATOR' ? 'PI' : 'Co-R'}
                                                            </span>

                                                            {/* Row 2: Type & Category */}
                                                            <div className="flex gap-1 items-center">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium tracking-wide ${grant.grantType === 'INTERNAL'
                                                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                                                    : 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                                                                    }`}>
                                                                    {grant.grantType === 'INTERNAL' ? 'Internal' : 'External'}
                                                                </span>

                                                                {/* Category Label (e.g. NATIONAL) for External Grants */}
                                                                {grant.grantType !== 'INTERNAL' && (
                                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider ${grant.grantCategory === 'INTERNATIONAL'
                                                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                                                        }`}>
                                                                        {grant.grantCategory || 'NATIONAL'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3 text-xs text-gray-400 mb-2">
                                                        <div>
                                                            <span className="font-medium text-gray-300">Funding Body:</span> {grant.fundingBody}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium text-gray-300">Amount:</span> {formatCurrency(grant.fundingAmount)}
                                                        </div>
                                                        {grant.commencementDate && (
                                                            <div>
                                                                <span className="font-medium text-gray-300">Period:</span> {grant.commencementDate} - {grant.endDate}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <span className="font-medium text-gray-300">Status:</span> {grant.projectStatus}
                                                        </div>
                                                    </div>

                                                    {grant.keywords && grant.keywords.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {grant.keywords.slice(0, 5).map((keyword, idx) => (
                                                                <span key={idx} className="px-2 py-0.5 bg-slate-700/50 text-slate-300 rounded text-[10px]">
                                                                    {keyword}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'overview' && (
                    <RCGrantOverview showNames={isChairperson} />
                )}
            </div>
        </div>
    );
}

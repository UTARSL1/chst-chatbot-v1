'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Database,
    Search,
    Trash2,
    FileText,
    Filter,
    Package,
    ChevronUp,
    ChevronDown,
    Eye,
    Download
} from 'lucide-react';

interface DocumentLibraryEntry {
    id: string;
    documentTitle: string | null;
    title: string;
    content: string;
    department: string | null;
    documentType: string | null;
    tags: string[];
    priority: string;
    sourceFile: string | null;
    sectionIndex: number | null;
    createdAt: string;
}

interface Batch {
    id: string;
    batchName: string;
    totalDocuments: number;
    totalSections: number;
    importedCount: number;
    status: string;
    createdAt: string;
}

export default function DocumentLibraryPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'entries' | 'batches'>('entries');

    // Entries state
    const [entries, setEntries] = useState<DocumentLibraryEntry[]>([]);
    const [filteredEntries, setFilteredEntries] = useState<DocumentLibraryEntry[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [sortField, setSortField] = useState<'createdAt' | 'documentTitle' | 'department'>('createdAt');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);

    // Batches state
    const [batches, setBatches] = useState<Batch[]>([]);
    const [filteredBatches, setFilteredBatches] = useState<Batch[]>([]);
    const [batchSearchQuery, setBatchSearchQuery] = useState('');

    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    // Auth check
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        } else if (status === 'authenticated' && session?.user?.role !== 'chairperson') {
            router.push('/');
        }
    }, [status, session, router]);

    // Fetch data
    useEffect(() => {
        if (status === 'authenticated' && session?.user?.role === 'chairperson') {
            fetchData();
        }
    }, [status, session, activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'entries') {
                const res = await fetch('/api/admin/document-library/entries');
                const data = await res.json();
                setEntries(data);
                setFilteredEntries(data);
            } else {
                const res = await fetch('/api/admin/document-library/batches');
                const data = await res.json();
                setBatches(data);
                setFilteredBatches(data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter and sort entries
    useEffect(() => {
        let filtered = entries.filter(entry => {
            const matchesSearch =
                entry.documentTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                entry.content.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesDepartment = departmentFilter === 'all' || entry.department === departmentFilter;
            const matchesType = typeFilter === 'all' || entry.documentType === typeFilter;

            return matchesSearch && matchesDepartment && matchesType;
        });

        // Sort
        filtered.sort((a, b) => {
            let aVal, bVal;

            if (sortField === 'createdAt') {
                aVal = new Date(a.createdAt).getTime();
                bVal = new Date(b.createdAt).getTime();
            } else if (sortField === 'documentTitle') {
                aVal = (a.documentTitle || a.title).toLowerCase();
                bVal = (b.documentTitle || b.title).toLowerCase();
            } else {
                aVal = (a.department || '').toLowerCase();
                bVal = (b.department || '').toLowerCase();
            }

            if (sortDirection === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        setFilteredEntries(filtered);
        setCurrentPage(1);
    }, [entries, searchQuery, departmentFilter, typeFilter, sortField, sortDirection]);

    // Filter batches
    useEffect(() => {
        const filtered = batches.filter(batch =>
            batch.batchName.toLowerCase().includes(batchSearchQuery.toLowerCase())
        );
        setFilteredBatches(filtered);
    }, [batches, batchSearchQuery]);

    // Pagination
    const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
    const paginatedEntries = filteredEntries.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Get unique values for filters
    const departments = Array.from(new Set(entries.map(e => e.department).filter(Boolean))) as string[];
    const documentTypes = Array.from(new Set(entries.map(e => e.documentType).filter(Boolean))) as string[];

    const handleSort = (field: typeof sortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const handleDeleteEntry = async (id: string) => {
        if (!confirm('Delete this entry? This cannot be undone.')) return;

        setDeleting(id);
        try {
            const res = await fetch(`/api/admin/document-library/entries/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setEntries(entries.filter(e => e.id !== id));
            } else {
                alert('Failed to delete entry');
            }
        } catch (error) {
            console.error('Error deleting entry:', error);
            alert('Error deleting entry');
        } finally {
            setDeleting(null);
        }
    };

    const handleDeleteBatch = async (id: string) => {
        if (!confirm('Delete this batch and ALL its entries? This cannot be undone.')) return;

        setDeleting(id);
        try {
            const res = await fetch(`/api/admin/document-library/batches/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setBatches(batches.filter(b => b.id !== id));
                fetchData(); // Refresh entries too
            } else {
                alert('Failed to delete batch');
            }
        } catch (error) {
            console.error('Error deleting batch:', error);
            alert('Error deleting batch');
        } finally {
            setDeleting(null);
        }
    };

    const SortIcon = ({ field }: { field: typeof sortField }) => {
        if (sortField !== field) return null;
        return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center">
                <div className="text-[#3B82F6] font-['JetBrains_Mono',monospace]">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0E1A] text-[#E2E8F0] font-['JetBrains_Mono',monospace] p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Database className="w-8 h-8 text-[#3B82F6]" />
                    <h1 className="text-3xl font-bold text-[#3B82F6]">DOCUMENT LIBRARY</h1>
                </div>
                <p className="text-[#64748B] text-sm">// SKILL-BASED AUTOMATED DOCUMENT PARSING SYSTEM</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-[#1E293B]">
                <button
                    onClick={() => setActiveTab('entries')}
                    className={`px-6 py-3 font-medium transition-all ${activeTab === 'entries'
                        ? 'text-[#3B82F6] border-b-2 border-[#3B82F6]'
                        : 'text-[#64748B] hover:text-[#E2E8F0]'
                        }`}
                >
                    <FileText className="w-4 h-4 inline mr-2" />
                    ENTRIES ({entries.length})
                </button>
                <button
                    onClick={() => setActiveTab('batches')}
                    className={`px-6 py-3 font-medium transition-all ${activeTab === 'batches'
                        ? 'text-[#3B82F6] border-b-2 border-[#3B82F6]'
                        : 'text-[#64748B] hover:text-[#E2E8F0]'
                        }`}
                >
                    <Package className="w-4 h-4 inline mr-2" />
                    BATCHES ({batches.length})
                </button>
            </div>

            {/* Entries Tab */}
            {activeTab === 'entries' && (
                <div>
                    {/* Filters */}
                    <div className="bg-[#1E293B] border border-[#334155] rounded p-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Search */}
                            <div className="md:col-span-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                                    <input
                                        type="text"
                                        placeholder="Search entries..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-[#0F172A] border border-[#334155] rounded px-10 py-2 text-sm focus:outline-none focus:border-[#3B82F6]"
                                    />
                                </div>
                            </div>

                            {/* Department Filter */}
                            <select
                                value={departmentFilter}
                                onChange={(e) => setDepartmentFilter(e.target.value)}
                                className="bg-[#0F172A] border border-[#334155] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#3B82F6]"
                            >
                                <option value="all">All Departments</option>
                                {departments.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>

                            {/* Type Filter */}
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="bg-[#0F172A] border border-[#334155] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#3B82F6]"
                            >
                                <option value="all">All Types</option>
                                {documentTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        {/* Results count */}
                        <div className="mt-3 text-xs text-[#64748B]">
                            Showing {paginatedEntries.length} of {filteredEntries.length} entries
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-[#1E293B] border border-[#334155] rounded overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-[#0F172A] border-b border-[#334155]">
                                    <tr>
                                        <th
                                            className="px-4 py-3 text-left cursor-pointer hover:bg-[#1E293B] transition-colors"
                                            onClick={() => handleSort('documentTitle')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Document Title
                                                <SortIcon field="documentTitle" />
                                            </div>
                                        </th>
                                        <th
                                            className="px-4 py-3 text-left cursor-pointer hover:bg-[#1E293B] transition-colors"
                                            onClick={() => handleSort('department')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Department
                                                <SortIcon field="department" />
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-left">Type</th>
                                        <th className="px-4 py-3 text-left">Batch</th>
                                        <th
                                            className="px-4 py-3 text-left cursor-pointer hover:bg-[#1E293B] transition-colors"
                                            onClick={() => handleSort('createdAt')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Created
                                                <SortIcon field="createdAt" />
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedEntries.map((entry) => (
                                        <tr
                                            key={entry.id}
                                            className="border-b border-[#334155] hover:bg-[#0F172A] transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-[#E2E8F0]">
                                                    {entry.documentTitle || entry.title}
                                                </div>
                                                {entry.documentTitle && (
                                                    <div className="text-xs text-[#64748B] mt-1">
                                                        Section: {entry.title}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-[#94A3B8]">
                                                {entry.department || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {entry.documentType && (
                                                    <span className="px-2 py-1 bg-[#0F172A] border border-[#334155] rounded text-xs">
                                                        {entry.documentType}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-4 py-3 text-[#94A3B8] text-xs">
                                                {new Date(entry.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    {entry.sourceFile && (
                                                        <button
                                                            className="p-2 hover:bg-[#334155] rounded transition-colors"
                                                            title="Download PDF"
                                                        >
                                                            <Download className="w-4 h-4 text-[#3B82F6]" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteEntry(entry.id)}
                                                        disabled={deleting === entry.id}
                                                        className="p-2 hover:bg-[#334155] rounded transition-colors disabled:opacity-50"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-400" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-[#334155] bg-[#0F172A]">
                                <div className="text-xs text-[#64748B]">
                                    Page {currentPage} of {totalPages}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1 bg-[#1E293B] border border-[#334155] rounded text-xs hover:bg-[#334155] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1 bg-[#1E293B] border border-[#334155] rounded text-xs hover:bg-[#334155] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Batches Tab */}
            {activeTab === 'batches' && (
                <div>
                    {/* Search */}
                    <div className="bg-[#1E293B] border border-[#334155] rounded p-4 mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                            <input
                                type="text"
                                placeholder="Search batches..."
                                value={batchSearchQuery}
                                onChange={(e) => setBatchSearchQuery(e.target.value)}
                                className="w-full bg-[#0F172A] border border-[#334155] rounded px-10 py-2 text-sm focus:outline-none focus:border-[#3B82F6]"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-[#1E293B] border border-[#334155] rounded overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-[#0F172A] border-b border-[#334155]">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Batch Name</th>
                                        <th className="px-4 py-3 text-left">Documents</th>
                                        <th className="px-4 py-3 text-left">Sections</th>
                                        <th className="px-4 py-3 text-left">Imported</th>
                                        <th className="px-4 py-3 text-left">Status</th>
                                        <th className="px-4 py-3 text-left">Created</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredBatches.map((batch) => (
                                        <tr
                                            key={batch.id}
                                            className="border-b border-[#334155] hover:bg-[#0F172A] transition-colors"
                                        >
                                            <td className="px-4 py-3 font-medium text-[#E2E8F0]">
                                                {batch.batchName}
                                            </td>
                                            <td className="px-4 py-3 text-[#94A3B8]">
                                                {batch.totalDocuments}
                                            </td>
                                            <td className="px-4 py-3 text-[#94A3B8]">
                                                {batch.totalSections}
                                            </td>
                                            <td className="px-4 py-3 text-[#94A3B8]">
                                                {batch.importedCount}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs ${batch.status === 'completed'
                                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                    : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                                    }`}>
                                                    {batch.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-[#94A3B8] text-xs">
                                                {new Date(batch.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end">
                                                    <button
                                                        onClick={() => handleDeleteBatch(batch.id)}
                                                        disabled={deleting === batch.id}
                                                        className="p-2 hover:bg-[#334155] rounded transition-colors disabled:opacity-50"
                                                        title="Delete batch and all entries"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-400" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

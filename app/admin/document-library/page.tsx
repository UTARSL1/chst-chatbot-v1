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
    Calendar,
    CheckCircle,
    XCircle,
    AlertCircle
} from 'lucide-react';

interface DocumentLibraryEntry {
    id: string;
    title: string;
    content: string;
    department: string | null;
    documentType: string | null;
    tags: string[];
    priority: string;
    sourceFile: string | null;
    sectionIndex: number | null;
    createdAt: string;
    creator: {
        name: string;
        email: string;
    };
}

interface Batch {
    id: string;
    batchName: string;
    totalDocuments: number;
    totalSections: number;
    importedCount: number;
    skippedCount: number;
    errorCount: number;
    status: string;
    createdAt: string;
    completedAt: string | null;
    creator: {
        name: string;
        email: string;
    };
}

export default function DocumentLibraryPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [entries, setEntries] = useState<DocumentLibraryEntry[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDepartment, setFilterDepartment] = useState<string>('');
    const [filterType, setFilterType] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'entries' | 'batches'>('entries');

    // Redirect if not chairperson
    useEffect(() => {
        if (status === 'unauthenticated' || (session && session.user.role !== 'chairperson')) {
            router.push('/');
        }
    }, [session, status, router]);

    // Fetch data
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [entriesRes, batchesRes] = await Promise.all([
                fetch('/api/admin/document-library/entries'),
                fetch('/api/admin/document-library/batches')
            ]);

            if (entriesRes.ok) {
                const data = await entriesRes.json();
                setEntries(data);
            }

            if (batchesRes.ok) {
                const data = await batchesRes.json();
                setBatches(data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteEntry = async (id: string) => {
        if (!confirm('Are you sure you want to delete this entry?')) return;

        try {
            const res = await fetch(`/api/admin/document-library/entries/${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setEntries(entries.filter(e => e.id !== id));
            }
        } catch (error) {
            console.error('Error deleting entry:', error);
        }
    };

    const deleteBatch = async (id: string) => {
        if (!confirm('Are you sure you want to delete this entire batch? This will delete all associated entries.')) return;

        try {
            const res = await fetch(`/api/admin/document-library/batches/${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setBatches(batches.filter(b => b.id !== id));
                fetchData(); // Refresh entries too
            }
        } catch (error) {
            console.error('Error deleting batch:', error);
        }
    };

    // Filter entries
    const filteredEntries = entries.filter(entry => {
        const matchesSearch = entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.sourceFile?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDepartment = !filterDepartment || entry.department === filterDepartment;
        const matchesType = !filterType || entry.documentType === filterType;

        return matchesSearch && matchesDepartment && matchesType;
    });

    // Get unique departments and types
    const departments = Array.from(new Set(entries.map(e => e.department).filter(Boolean))) as string[];
    const documentTypes = Array.from(new Set(entries.map(e => e.documentType).filter(Boolean))) as string[];

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-[#3B82F6] mb-2 font-['Orbitron',sans-serif] uppercase tracking-[0.1em] flex items-center gap-3">
                        <Database className="w-7 h-7" />
                        DOCUMENT LIBRARY
                    </h1>
                    <p className="text-[#94A3B8] font-['JetBrains_Mono',monospace] text-sm">
                        // SKILL-BASED_AUTOMATED_DOCUMENT_PARSING_SYSTEM
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-slate-700">
                    <button
                        onClick={() => setActiveTab('entries')}
                        className={`px-6 py-3 font-['Orbitron',sans-serif] uppercase tracking-wide text-sm transition-all ${activeTab === 'entries'
                            ? 'text-[#3B82F6] border-b-2 border-[#3B82F6]'
                            : 'text-slate-400 hover:text-slate-300'
                            }`}
                    >
                        <FileText className="w-4 h-4 inline mr-2" />
                        Entries ({entries.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('batches')}
                        className={`px-6 py-3 font-['Orbitron',sans-serif] uppercase tracking-wide text-sm transition-all ${activeTab === 'batches'
                            ? 'text-[#3B82F6] border-b-2 border-[#3B82F6]'
                            : 'text-slate-400 hover:text-slate-300'
                            }`}
                    >
                        <Package className="w-4 h-4 inline mr-2" />
                        Batches ({batches.length})
                    </button>
                </div>

                {/* Entries Tab */}
                {activeTab === 'entries' && (
                    <>
                        {/* Search and Filters */}
                        <div className="mb-6 flex gap-4 flex-wrap">
                            <div className="flex-1 min-w-[300px]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search entries..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <select
                                value={filterDepartment}
                                onChange={(e) => setFilterDepartment(e.target.value)}
                                className="px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="">All Departments</option>
                                {departments.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>

                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="">All Types</option>
                                {documentTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                                <div className="text-slate-400 text-sm mb-1 font-['Orbitron',sans-serif] uppercase tracking-wide">Total Entries</div>
                                <div className="text-2xl font-bold text-white font-['JetBrains_Mono',monospace]">{entries.length}</div>
                            </div>
                            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                                <div className="text-slate-400 text-sm mb-1 font-['Orbitron',sans-serif] uppercase tracking-wide">Departments</div>
                                <div className="text-2xl font-bold text-blue-400 font-['JetBrains_Mono',monospace]">{departments.length}</div>
                            </div>
                            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                                <div className="text-slate-400 text-sm mb-1 font-['Orbitron',sans-serif] uppercase tracking-wide">Document Types</div>
                                <div className="text-2xl font-bold text-purple-400 font-['JetBrains_Mono',monospace]">{documentTypes.length}</div>
                            </div>
                            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                                <div className="text-slate-400 text-sm mb-1 font-['Orbitron',sans-serif] uppercase tracking-wide">Source Files</div>
                                <div className="text-2xl font-bold text-green-400 font-['JetBrains_Mono',monospace]">
                                    {new Set(entries.map(e => e.sourceFile).filter(Boolean)).size}
                                </div>
                            </div>
                        </div>

                        {/* Entries Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredEntries.map(entry => (
                                <div
                                    key={entry.id}
                                    className="bg-slate-800/50 border border-slate-700 rounded-lg p-5 hover:border-blue-500/50 transition-all group"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="text-lg font-semibold text-white flex-1 line-clamp-2 font-['Orbitron',sans-serif]">
                                            {entry.title}
                                        </h3>
                                        <button
                                            onClick={() => deleteEntry(entry.id)}
                                            className="p-1.5 hover:bg-slate-700 rounded text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {entry.department && (
                                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                                                {entry.department}
                                            </span>
                                        )}
                                        {entry.documentType && (
                                            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">
                                                {entry.documentType}
                                            </span>
                                        )}
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${entry.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                                            entry.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                                'bg-slate-500/20 text-slate-400'
                                            }`}>
                                            {entry.priority}
                                        </span>
                                    </div>

                                    <p className="text-slate-400 text-sm line-clamp-2 mb-3">
                                        {entry.content.substring(0, 100)}...
                                    </p>

                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span className="truncate">{entry.sourceFile}</span>
                                        <span>§{entry.sectionIndex}</span>
                                    </div>

                                    {entry.tags.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {entry.tags.slice(0, 3).map(tag => (
                                                <span key={tag} className="px-1.5 py-0.5 bg-slate-700/50 text-slate-400 rounded text-xs">
                                                    #{tag}
                                                </span>
                                            ))}
                                            {entry.tags.length > 3 && (
                                                <span className="px-1.5 py-0.5 text-slate-500 text-xs">
                                                    +{entry.tags.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {filteredEntries.length === 0 && (
                            <div className="text-center py-12 text-slate-400">
                                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p className="text-lg">No entries found</p>
                                <p className="text-sm">Run the import script to add documents</p>
                            </div>
                        )}
                    </>
                )}

                {/* Batches Tab */}
                {activeTab === 'batches' && (
                    <div className="space-y-4">
                        {batches.map(batch => (
                            <div
                                key={batch.id}
                                className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-blue-500/50 transition-all"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-xl font-semibold text-white font-['Orbitron',sans-serif] mb-1">
                                            {batch.batchName}
                                        </h3>
                                        <p className="text-sm text-slate-400">
                                            by {batch.creator.name} • {new Date(batch.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${batch.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                            batch.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-red-500/20 text-red-400'
                                            }`}>
                                            {batch.status}
                                        </span>
                                        <button
                                            onClick={() => deleteBatch(batch.id)}
                                            className="p-2 hover:bg-slate-700 rounded text-red-400 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    <div className="bg-slate-900/50 rounded-lg p-3">
                                        <div className="text-xs text-slate-400 mb-1">Documents</div>
                                        <div className="text-lg font-bold text-white font-['JetBrains_Mono',monospace]">
                                            {batch.totalDocuments}
                                        </div>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-lg p-3">
                                        <div className="text-xs text-slate-400 mb-1">Sections</div>
                                        <div className="text-lg font-bold text-white font-['JetBrains_Mono',monospace]">
                                            {batch.totalSections}
                                        </div>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-lg p-3">
                                        <div className="text-xs text-green-400 mb-1 flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" />
                                            Imported
                                        </div>
                                        <div className="text-lg font-bold text-green-400 font-['JetBrains_Mono',monospace]">
                                            {batch.importedCount}
                                        </div>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-lg p-3">
                                        <div className="text-xs text-yellow-400 mb-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            Skipped
                                        </div>
                                        <div className="text-lg font-bold text-yellow-400 font-['JetBrains_Mono',monospace]">
                                            {batch.skippedCount}
                                        </div>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-lg p-3">
                                        <div className="text-xs text-red-400 mb-1 flex items-center gap-1">
                                            <XCircle className="w-3 h-3" />
                                            Errors
                                        </div>
                                        <div className="text-lg font-bold text-red-400 font-['JetBrains_Mono',monospace]">
                                            {batch.errorCount}
                                        </div>
                                    </div>
                                </div>

                                {batch.completedAt && (
                                    <div className="mt-3 text-xs text-slate-500 flex items-center gap-2">
                                        <Calendar className="w-3 h-3" />
                                        Completed: {new Date(batch.completedAt).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        ))}

                        {batches.length === 0 && (
                            <div className="text-center py-12 text-slate-400">
                                <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p className="text-lg">No batches found</p>
                                <p className="text-sm">Import batches will appear here</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    FileText,
    Filter,
    X
} from 'lucide-react';
import {
    parseMetadata,
    getDepartmentColor,
    getDepartmentIcon,
    getDocumentTypeColor,
    getDocumentTypeIcon,
    DEFAULT_DEPARTMENTS,
    DEFAULT_DOCUMENT_TYPES,
    type KnowledgeNoteMetadata
} from '@/lib/types/knowledge-base';
import KnowledgeNoteModal from '@/components/admin/KnowledgeNoteModal';

interface KnowledgeNote {
    id: string;
    title: string;
    content: string;
    category: string | null;
    priority: string;
    formatType: string;
    accessLevel: string[];
    status: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    creator: {
        name: string;
        email: string;
    };
    linkedDocuments: Array<{
        id: string;
        filename: string;
        originalName: string;
    }>;
}

export default function KnowledgeBasePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [notes, setNotes] = useState<KnowledgeNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDepartment, setFilterDepartment] = useState<string>('');
    const [filterType, setFilterType] = useState<string>('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedNoteId, setSelectedNoteId] = useState<string | undefined>(undefined);

    // Redirect if not chairperson
    useEffect(() => {
        if (status === 'unauthenticated' || (session && session.user.role !== 'chairperson')) {
            router.push('/');
        }
    }, [session, status, router]);

    // Fetch notes
    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        try {
            const res = await fetch('/api/admin/knowledge');
            if (res.ok) {
                const data = await res.json();
                setNotes(data);
            }
        } catch (error) {
            console.error('Error fetching notes:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteNote = async (id: string) => {
        if (!confirm('Are you sure you want to delete this knowledge note?')) return;

        try {
            const res = await fetch(`/api/admin/knowledge/${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setNotes(notes.filter(n => n.id !== id));
            }
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    };

    // Filter notes
    const filteredNotes = notes.filter(note => {
        const metadata = parseMetadata(note.category);
        const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            note.content.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDepartment = !filterDepartment || metadata.department === filterDepartment;
        const matchesType = !filterType || metadata.documentType === filterType;

        return matchesSearch && matchesDepartment && matchesType;
    });

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
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                        Knowledge Base
                    </h1>
                    <p className="text-slate-400">
                        Curate authoritative answers with direct document links
                    </p>
                </div>

                {/* Search and Filters */}
                <div className="mb-6 flex gap-4 flex-wrap">
                    {/* Search */}
                    <div className="flex-1 min-w-[300px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search knowledge notes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Department Filter */}
                    <select
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        className="px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                        <option value="">All Departments</option>
                        {DEFAULT_DEPARTMENTS.map(dept => (
                            <option key={dept.name} value={dept.name}>
                                {dept.icon} {dept.name}
                            </option>
                        ))}
                    </select>

                    {/* Type Filter */}
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                        <option value="">All Types</option>
                        {DEFAULT_DOCUMENT_TYPES.map(type => (
                            <option key={type.name} value={type.name}>
                                {type.icon} {type.name}
                            </option>
                        ))}
                    </select>

                    {/* Create Button */}
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-medium flex items-center gap-2 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Create New Note
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                        <div className="text-slate-400 text-sm mb-1">Total Notes</div>
                        <div className="text-2xl font-bold text-white">{notes.length}</div>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                        <div className="text-slate-400 text-sm mb-1">Active</div>
                        <div className="text-2xl font-bold text-green-400">
                            {notes.filter(n => n.isActive).length}
                        </div>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                        <div className="text-slate-400 text-sm mb-1">Departments</div>
                        <div className="text-2xl font-bold text-blue-400">
                            {new Set(notes.map(n => parseMetadata(n.category).department).filter(Boolean)).size}
                        </div>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                        <div className="text-slate-400 text-sm mb-1">Document Types</div>
                        <div className="text-2xl font-bold text-purple-400">
                            {new Set(notes.map(n => parseMetadata(n.category).documentType).filter(Boolean)).size}
                        </div>
                    </div>
                </div>

                {/* Notes Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredNotes.map(note => {
                        const metadata = parseMetadata(note.category);
                        return (
                            <div
                                key={note.id}
                                className="bg-slate-800/50 border border-slate-700 rounded-lg p-5 hover:border-blue-500/50 transition-all group"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="text-lg font-semibold text-white flex-1 line-clamp-2">
                                        {note.title}
                                    </h3>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => {
                                                setSelectedNoteId(note.id);
                                                setShowCreateModal(true);
                                            }}
                                            className="p-1.5 hover:bg-slate-700 rounded text-blue-400"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => deleteNote(note.id)}
                                            className="p-1.5 hover:bg-slate-700 rounded text-red-400"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Badges */}
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {metadata.department && (
                                        <span
                                            className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
                                            style={{
                                                backgroundColor: getDepartmentColor(metadata.department) + '20',
                                                color: getDepartmentColor(metadata.department)
                                            }}
                                        >
                                            {getDepartmentIcon(metadata.department)} {metadata.department}
                                        </span>
                                    )}
                                    {metadata.documentType && (
                                        <span
                                            className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
                                            style={{
                                                backgroundColor: getDocumentTypeColor(metadata.documentType) + '20',
                                                color: getDocumentTypeColor(metadata.documentType)
                                            }}
                                        >
                                            {getDocumentTypeIcon(metadata.documentType)} {metadata.documentType}
                                        </span>
                                    )}
                                </div>

                                {/* Content Preview */}
                                <p className="text-slate-400 text-sm line-clamp-2 mb-3">
                                    {note.content.substring(0, 100)}...
                                </p>

                                {/* Footer */}
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span className="capitalize">{note.formatType}</span>
                                    <span>{note.linkedDocuments?.length || 0} docs</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredNotes.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">No knowledge notes found</p>
                        <p className="text-sm">Create your first note to get started</p>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            <KnowledgeNoteModal
                isOpen={showCreateModal}
                onClose={() => {
                    setShowCreateModal(false);
                    setSelectedNoteId(undefined);
                }}
                onSave={() => {
                    fetchNotes();
                    setShowCreateModal(false);
                    setSelectedNoteId(undefined);
                }}
                noteId={selectedNoteId}
            />
        </div>
    );
}

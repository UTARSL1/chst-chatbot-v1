'use client';

import { useState, useEffect } from 'react';
import { X, Upload, Search, FileText, Tag, Plus } from 'lucide-react';
import {
    DEFAULT_DEPARTMENTS,
    DEFAULT_DOCUMENT_TYPES,
    stringifyMetadata,
    parseMetadata,
    type KnowledgeNoteMetadata
} from '@/lib/types/knowledge-base';

interface Document {
    id: string;
    originalName: string;
    fileSize: number;
}

interface KnowledgeNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    noteId?: string;
}

export default function KnowledgeNoteModal({ isOpen, onClose, onSave, noteId }: KnowledgeNoteModalProps) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [department, setDepartment] = useState('');
    const [documentType, setDocumentType] = useState('');
    const [formatType, setFormatType] = useState('auto');
    const [accessLevel, setAccessLevel] = useState<string[]>(['public', 'student', 'member', 'chairperson']);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [linkedDocIds, setLinkedDocIds] = useState<string[]>([]);
    const [searchDocQuery, setSearchDocQuery] = useState('');
    const [availableDocs, setAvailableDocs] = useState<Document[]>([]);
    const [showDocSearch, setShowDocSearch] = useState(false);
    const [saving, setSaving] = useState(false);

    // Load note if editing
    useEffect(() => {
        if (noteId) {
            loadNote();
        }
    }, [noteId]);

    // Load available documents
    useEffect(() => {
        loadDocuments();
    }, []);

    const loadNote = async () => {
        try {
            const res = await fetch(`/api/admin/knowledge/${noteId}`);
            if (res.ok) {
                const note = await res.json();
                const metadata = parseMetadata(note.category);

                setTitle(note.title);
                setContent(note.content);
                setDepartment(metadata.department || '');
                setDocumentType(metadata.documentType || '');
                setFormatType(note.formatType);
                setAccessLevel(note.accessLevel);
                setTags(metadata.tags || []);
                setLinkedDocIds(metadata.linkedDocIds || []);
            }
        } catch (error) {
            console.error('Error loading note:', error);
        }
    };

    const loadDocuments = async () => {
        try {
            const res = await fetch('/api/admin/documents');
            if (res.ok) {
                const docs = await res.json();
                setAvailableDocs(docs);
            }
        } catch (error) {
            console.error('Error loading documents:', error);
        }
    };

    const handleSave = async () => {
        if (!title || !content) {
            alert('Please fill in title and content');
            return;
        }

        setSaving(true);
        try {
            const url = noteId ? `/api/admin/knowledge/${noteId}` : '/api/admin/knowledge';
            const method = noteId ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    content,
                    department,
                    documentType,
                    tags,
                    linkedDocIds,
                    formatType,
                    accessLevel,
                }),
            });

            if (res.ok) {
                onSave();
                onClose();
            } else {
                alert('Error saving note');
            }
        } catch (error) {
            console.error('Error saving note:', error);
            alert('Error saving note');
        } finally {
            setSaving(false);
        }
    };

    const addTag = () => {
        if (tagInput && !tags.includes(tagInput)) {
            setTags([...tags, tagInput]);
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        setTags(tags.filter(t => t !== tag));
    };

    const toggleDocument = (docId: string) => {
        if (linkedDocIds.includes(docId)) {
            setLinkedDocIds(linkedDocIds.filter(id => id !== docId));
        } else {
            setLinkedDocIds([...linkedDocIds, docId]);
        }
    };

    const toggleAccessLevel = (level: string) => {
        if (accessLevel.includes(level)) {
            setAccessLevel(accessLevel.filter(l => l !== level));
        } else {
            setAccessLevel([...accessLevel, level]);
        }
    };

    const filteredDocs = availableDocs.filter(doc =>
        doc.originalName.toLowerCase().includes(searchDocQuery.toLowerCase())
    );

    const linkedDocs = availableDocs.filter(doc => linkedDocIds.includes(doc.id));

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-4xl w-full my-8">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            {noteId ? 'Edit' : 'Create'} Knowledge Note
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            Curate authoritative answers with direct document links
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded text-slate-400 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Title <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Service Bond for Overseas Conference Sponsorship"
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* Department and Document Type */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Department
                            </label>
                            <select
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="">Select Department</option>
                                {DEFAULT_DEPARTMENTS.map(dept => (
                                    <option key={dept.name} value={dept.name}>
                                        {dept.icon} {dept.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Document Type
                            </label>
                            <select
                                value={documentType}
                                onChange={(e) => setDocumentType(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="">Select Type</option>
                                {DEFAULT_DOCUMENT_TYPES.map(type => (
                                    <option key={type.name} value={type.name}>
                                        {type.icon} {type.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Content */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Content <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Enter the full rule, policy update, or knowledge here..."
                            rows={8}
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                        />
                    </div>

                    {/* Format Type */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Format Type
                        </label>
                        <select
                            value={formatType}
                            onChange={(e) => setFormatType(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="auto">Auto-detect</option>
                            <option value="table">Table (for tiered data)</option>
                            <option value="list">List (for steps)</option>
                            <option value="prose">Prose (plain text)</option>
                            <option value="quote">Quote (block quote)</option>
                            <option value="code">Code (monospace)</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-1">
                            Use "Table" for tiered/structured data like service bonds
                        </p>
                    </div>

                    {/* Linked Documents */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Linked Documents
                        </label>

                        {/* Search Documents */}
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchDocQuery}
                                onChange={(e) => setSearchDocQuery(e.target.value)}
                                onFocus={() => setShowDocSearch(true)}
                                placeholder="Search existing documents..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Document Search Results */}
                        {showDocSearch && searchDocQuery && (
                            <div className="mb-3 max-h-40 overflow-y-auto bg-slate-800/50 border border-slate-700 rounded-lg">
                                {filteredDocs.map(doc => (
                                    <button
                                        key={doc.id}
                                        onClick={() => {
                                            toggleDocument(doc.id);
                                            setSearchDocQuery('');
                                            setShowDocSearch(false);
                                        }}
                                        className="w-full px-4 py-2 text-left hover:bg-slate-700/50 flex items-center gap-2 text-sm"
                                    >
                                        <FileText className="w-4 h-4 text-slate-400" />
                                        <span className="text-white flex-1">{doc.originalName}</span>
                                        <span className="text-slate-500 text-xs">
                                            {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                                        </span>
                                    </button>
                                ))}
                                {filteredDocs.length === 0 && (
                                    <div className="px-4 py-3 text-sm text-slate-500">
                                        No documents found
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Linked Documents Chips */}
                        <div className="flex flex-wrap gap-2">
                            {linkedDocs.map(doc => (
                                <div
                                    key={doc.id}
                                    className="px-3 py-1.5 bg-blue-500/20 border border-blue-500/50 rounded-lg flex items-center gap-2 text-sm"
                                >
                                    <FileText className="w-3 h-3 text-blue-400" />
                                    <span className="text-blue-300">{doc.originalName}</span>
                                    <button
                                        onClick={() => toggleDocument(doc.id)}
                                        className="text-blue-400 hover:text-blue-300"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            {linkedDocs.length === 0 && (
                                <p className="text-sm text-slate-500">No documents linked yet</p>
                            )}
                        </div>
                    </div>

                    {/* Access Control */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Who can see this note?
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { value: 'public', label: 'Public', icon: '🌐', color: 'blue' },
                                { value: 'student', label: 'Student', icon: '🎓', color: 'green' },
                                { value: 'member', label: 'Member', icon: '👤', color: 'orange' },
                                { value: 'chairperson', label: 'Chairperson', icon: '⭐', color: 'purple' },
                            ].map(({ value, label, icon, color }) => (
                                <button
                                    key={value}
                                    onClick={() => toggleAccessLevel(value)}
                                    className={`px-4 py-3 rounded-lg border-2 transition-all ${accessLevel.includes(value)
                                            ? `border-${color}-500 bg-${color}-500/20`
                                            : 'border-slate-700 bg-slate-800/50'
                                        }`}
                                >
                                    <span className="text-lg mr-2">{icon}</span>
                                    <span className="text-white font-medium">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Tags <span className="text-slate-500">(Optional)</span>
                        </label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                placeholder="Add a tag..."
                                className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                            />
                            <button
                                onClick={addTag}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {tags.map(tag => (
                                <div
                                    key={tag}
                                    className="px-3 py-1 bg-purple-500/20 border border-purple-500/50 rounded-full flex items-center gap-2 text-sm"
                                >
                                    <Tag className="w-3 h-3 text-purple-400" />
                                    <span className="text-purple-300">{tag}</span>
                                    <button
                                        onClick={() => removeTag(tag)}
                                        className="text-purple-400 hover:text-purple-300"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-slate-700">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-slate-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !title || !content}
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
                    >
                        {saving ? 'Saving...' : noteId ? 'Update Note' : 'Create Note'}
                    </button>
                </div>
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { X, Upload, Search, FileText, Tag, Plus } from 'lucide-react';

interface Document {
    id: string;
    originalName: string;
    fileSize: number;
    category?: string;
}

interface Department {
    id: string;
    name: string;
    abbreviation?: string;
    icon?: string;
    color?: string;
}

interface DocumentType {
    id: string;
    name: string;
    icon?: string;
    color?: string;
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
    const [departmentId, setDepartmentId] = useState('');
    const [documentTypeId, setDocumentTypeId] = useState('');
    const [formatType, setFormatType] = useState('auto');
    const [accessLevel, setAccessLevel] = useState<string[]>(['public', 'student', 'member', 'chairperson']);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [linkedDocIds, setLinkedDocIds] = useState<string[]>([]);
    const [searchDocQuery, setSearchDocQuery] = useState('');
    const [availableDocs, setAvailableDocs] = useState<Document[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
    const [showDocSearch, setShowDocSearch] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pendingPolicyFile, setPendingPolicyFile] = useState<File | null>(null);
    const [pendingFormFile, setPendingFormFile] = useState<File | null>(null);

    // Load note if editing
    useEffect(() => {
        if (noteId) {
            loadNote();
        }
    }, [noteId]);

    // Load data
    useEffect(() => {
        if (isOpen) {
            loadDocuments();
            loadDepartments();
            loadDocumentTypes();
        }
    }, [isOpen]);

    const loadNote = async () => {
        try {
            const res = await fetch(`/api/admin/knowledge/${noteId}`);
            if (res.ok) {
                const note = await res.json();
                setTitle(note.title);
                setContent(note.content);
                setDepartmentId(note.departmentId || '');
                setDocumentTypeId(note.documentTypeId || '');
                setFormatType(note.formatType);
                setAccessLevel(note.accessLevel);
                setTags(note.tags || []);
                setLinkedDocIds(note.linkedDocuments?.map((d: any) => d.id) || []);
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

    const loadDepartments = async () => {
        try {
            const res = await fetch('/api/admin/departments');
            if (res.ok) {
                const data = await res.json();
                setDepartments(data);
            }
        } catch (error) {
            console.error('Error loading departments:', error);
        }
    };

    const loadDocumentTypes = async () => {
        try {
            const res = await fetch('/api/admin/document-types');
            if (res.ok) {
                const data = await res.json();
                setDocumentTypes(data);
            }
        } catch (error) {
            console.error('Error loading document types:', error);
        }
    };

    const handleSave = async () => {
        if (!title || !content) {
            alert('Please fill in title and content');
            return;
        }

        setSaving(true);
        try {
            // Upload pending files first
            const uploadedDocIds = [...linkedDocIds];

            // Determine access level for documents (use least restrictive)
            // Priority: public > student > member > chairperson
            let documentAccessLevel = 'chairperson'; // Default to most restrictive
            if (accessLevel.includes('public')) {
                documentAccessLevel = 'student'; // Public maps to student-level access
            } else if (accessLevel.includes('student')) {
                documentAccessLevel = 'student';
            } else if (accessLevel.includes('member')) {
                documentAccessLevel = 'member';
            } else if (accessLevel.includes('chairperson')) {
                documentAccessLevel = 'chairperson';
            }

            // Upload policy file if selected
            if (pendingPolicyFile) {
                const formData = new FormData();
                formData.append('file', pendingPolicyFile);
                formData.append('category', 'policy');
                formData.append('department', 'General');
                formData.append('accessLevel', documentAccessLevel);

                const uploadRes = await fetch('/api/admin/documents', {
                    method: 'POST',
                    body: formData,
                });

                if (uploadRes.ok) {
                    const newDoc = await uploadRes.json();
                    uploadedDocIds.push(newDoc.id);
                } else {
                    throw new Error('Failed to upload policy document');
                }
            }

            // Upload form file if selected
            if (pendingFormFile) {
                const formData = new FormData();
                formData.append('file', pendingFormFile);
                formData.append('category', 'form');
                formData.append('department', 'General');
                formData.append('accessLevel', documentAccessLevel);

                const uploadRes = await fetch('/api/admin/documents', {
                    method: 'POST',
                    body: formData,
                });

                if (uploadRes.ok) {
                    const newDoc = await uploadRes.json();
                    uploadedDocIds.push(newDoc.id);
                } else {
                    throw new Error('Failed to upload form document');
                }
            }

            // Save the knowledge note with all linked documents
            const url = noteId ? `/api/admin/knowledge/${noteId}` : '/api/admin/knowledge';
            const method = noteId ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    content,
                    departmentId: departmentId || null,
                    documentTypeId: documentTypeId || null,
                    tags,
                    linkedDocIds: uploadedDocIds,
                    formatType,
                    accessLevel,
                }),
            });

            if (res.ok) {
                onSave();
                onClose();
                // Clear pending files
                setPendingPolicyFile(null);
                setPendingFormFile(null);
            } else {
                alert('Error saving note');
            }
        } catch (error) {
            console.error('Error saving note:', error);
            alert(error instanceof Error ? error.message : 'Error saving note');
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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, category: 'policy' | 'form') => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Store file in state, don't upload yet
        if (category === 'policy') {
            setPendingPolicyFile(file);
        } else {
            setPendingFormFile(file);
        }
    };

    const removePendingFile = (category: 'policy' | 'form') => {
        if (category === 'policy') {
            setPendingPolicyFile(null);
        } else {
            setPendingFormFile(null);
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
                                value={departmentId}
                                onChange={(e) => setDepartmentId(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="">Select Department</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>
                                        {dept.icon} {dept.name}
                                    </option>
                                ))}
                            </select>
                            {departments.length === 0 && (
                                <p className="text-xs text-slate-500 mt-1">
                                    No departments yet. Add one in settings.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Document Type
                            </label>
                            <select
                                value={documentTypeId}
                                onChange={(e) => setDocumentTypeId(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="">Select Type</option>
                                {documentTypes.map(type => (
                                    <option key={type.id} value={type.id}>
                                        {type.icon} {type.name}
                                    </option>
                                ))}
                            </select>
                            {documentTypes.length === 0 && (
                                <p className="text-xs text-slate-500 mt-1">
                                    No document types yet. Add one in settings.
                                </p>
                            )}
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
                        <label className="block text-sm font-medium text-slate-300 mb-3">
                            Linked Documents
                        </label>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Policy Section */}
                            <div className="border border-slate-700 rounded-lg p-4 bg-slate-800/30">
                                <div className="flex items-center gap-2 mb-3">
                                    <FileText className="w-4 h-4 text-blue-400" />
                                    <span className="text-sm font-semibold text-blue-400">Policy Document</span>
                                </div>

                                {/* Upload Policy */}
                                <div className="mb-3">
                                    {!pendingPolicyFile ? (
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            onChange={(e) => handleFileSelect(e, 'policy')}
                                            className="w-full text-xs text-slate-400 file:mr-2 file:py-2 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 file:cursor-pointer"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-between p-2 bg-blue-500/10 border border-blue-500/30 rounded">
                                            <span className="text-xs text-blue-400 truncate">{pendingPolicyFile.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => removePendingFile('policy')}
                                                className="ml-2 text-red-400 hover:text-red-300"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* OR Divider */}
                                <div className="relative mb-3">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-600"></div>
                                    </div>
                                    <div className="relative flex justify-center text-xs">
                                        <span className="px-2 bg-slate-800/30 text-slate-500">OR LINK</span>
                                    </div>
                                </div>

                                {/* Search Existing Policies */}
                                <div className="relative mb-2">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchDocQuery}
                                        onChange={(e) => setSearchDocQuery(e.target.value)}
                                        onFocus={() => setShowDocSearch(true)}
                                        placeholder="Search policies..."
                                        className="w-full pl-7 pr-2 py-1.5 bg-slate-700/50 border border-slate-600 rounded text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                {/* Policy Search Results */}
                                {showDocSearch && searchDocQuery && (
                                    <div className="mb-2 max-h-32 overflow-y-auto bg-slate-700/50 border border-slate-600 rounded">
                                        {availableDocs
                                            .filter(doc => doc.category === 'policy' && doc.originalName.toLowerCase().includes(searchDocQuery.toLowerCase()))
                                            .map(doc => (
                                                <button
                                                    key={doc.id}
                                                    onClick={() => {
                                                        toggleDocument(doc.id);
                                                        setSearchDocQuery('');
                                                        setShowDocSearch(false);
                                                    }}
                                                    className="w-full px-2 py-1.5 text-left hover:bg-slate-600/50 flex items-center gap-2 text-xs"
                                                >
                                                    <FileText className="w-3 h-3 text-blue-400" />
                                                    <span className="text-white flex-1 truncate">{doc.originalName}</span>
                                                </button>
                                            ))}
                                    </div>
                                )}

                                {/* Linked Policy */}
                                <div className="space-y-1">
                                    {linkedDocs
                                        .filter(doc => doc.category === 'policy')
                                        .map(doc => (
                                            <div
                                                key={doc.id}
                                                className="px-2 py-1.5 bg-blue-500/20 border border-blue-500/50 rounded flex items-center gap-2 text-xs"
                                            >
                                                <FileText className="w-3 h-3 text-blue-400 flex-shrink-0" />
                                                <span className="text-blue-300 flex-1 truncate">{doc.originalName}</span>
                                                <button
                                                    onClick={() => toggleDocument(doc.id)}
                                                    className="text-blue-400 hover:text-blue-300 flex-shrink-0"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    {linkedDocs.filter(doc => doc.category === 'policy').length === 0 && (
                                        <p className="text-xs text-slate-500">No policy linked</p>
                                    )}
                                </div>
                            </div>

                            {/* Form Section */}
                            <div className="border border-slate-700 rounded-lg p-4 bg-slate-800/30">
                                <div className="flex items-center gap-2 mb-3">
                                    <FileText className="w-4 h-4 text-green-400" />
                                    <span className="text-sm font-semibold text-green-400">Form Document</span>
                                </div>

                                {/* Upload Form */}
                                <div className="mb-3">
                                    {!pendingFormFile ? (
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            onChange={(e) => handleFileSelect(e, 'form')}
                                            className="w-full text-xs text-slate-400 file:mr-2 file:py-2 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-green-500 file:text-white hover:file:bg-green-600 file:cursor-pointer"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-between p-2 bg-green-500/10 border border-green-500/30 rounded">
                                            <span className="text-xs text-green-400 truncate">{pendingFormFile.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => removePendingFile('form')}
                                                className="ml-2 text-red-400 hover:text-red-300"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* OR Divider */}
                                <div className="relative mb-3">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-600"></div>
                                    </div>
                                    <div className="relative flex justify-center text-xs">
                                        <span className="px-2 bg-slate-800/30 text-slate-500">OR LINK</span>
                                    </div>
                                </div>

                                {/* Search Existing Forms */}
                                <div className="relative mb-2">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchDocQuery}
                                        onChange={(e) => setSearchDocQuery(e.target.value)}
                                        onFocus={() => setShowDocSearch(true)}
                                        placeholder="Search forms..."
                                        className="w-full pl-7 pr-2 py-1.5 bg-slate-700/50 border border-slate-600 rounded text-white placeholder-slate-500 text-xs focus:outline-none focus:border-green-500"
                                    />
                                </div>

                                {/* Form Search Results */}
                                {showDocSearch && searchDocQuery && (
                                    <div className="mb-2 max-h-32 overflow-y-auto bg-slate-700/50 border border-slate-600 rounded">
                                        {availableDocs
                                            .filter(doc => doc.category === 'form' && doc.originalName.toLowerCase().includes(searchDocQuery.toLowerCase()))
                                            .map(doc => (
                                                <button
                                                    key={doc.id}
                                                    onClick={() => {
                                                        toggleDocument(doc.id);
                                                        setSearchDocQuery('');
                                                        setShowDocSearch(false);
                                                    }}
                                                    className="w-full px-2 py-1.5 text-left hover:bg-slate-600/50 flex items-center gap-2 text-xs"
                                                >
                                                    <FileText className="w-3 h-3 text-green-400" />
                                                    <span className="text-white flex-1 truncate">{doc.originalName}</span>
                                                </button>
                                            ))}
                                    </div>
                                )}

                                {/* Linked Form */}
                                <div className="space-y-1">
                                    {linkedDocs
                                        .filter(doc => doc.category === 'form')
                                        .map(doc => (
                                            <div
                                                key={doc.id}
                                                className="px-2 py-1.5 bg-green-500/20 border border-green-500/50 rounded flex items-center gap-2 text-xs"
                                            >
                                                <FileText className="w-3 h-3 text-green-400 flex-shrink-0" />
                                                <span className="text-green-300 flex-1 truncate">{doc.originalName}</span>
                                                <button
                                                    onClick={() => toggleDocument(doc.id)}
                                                    className="text-green-400 hover:text-green-300 flex-shrink-0"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    {linkedDocs.filter(doc => doc.category === 'form').length === 0 && (
                                        <p className="text-xs text-slate-500">No form linked</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Access Control */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Who can see this note?
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { value: 'student', label: 'Student' },
                                { value: 'member', label: 'Member' },
                                { value: 'public', label: 'Public' },
                                { value: 'chairperson', label: 'Chairperson' },
                            ].map(({ value, label }) => (
                                <label
                                    key={value}
                                    className="flex items-center gap-2 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={accessLevel.includes(value)}
                                        onChange={() => toggleAccessLevel(value)}
                                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-2 focus:ring-blue-500"
                                    />
                                    <span className="text-slate-300">{label}</span>
                                </label>
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

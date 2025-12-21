'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface KnowledgeNote {
    id: string;
    title: string;
    content: string;
    category?: string;
    priority: 'standard' | 'high' | 'critical';
    formatType?: 'auto' | 'table' | 'prose' | 'list' | 'quote' | 'code';
    accessLevel: string[];
    status: 'processing' | 'active' | 'failed';
    isActive: boolean;
    createdAt: string;
    creator: {
        name: string;
        email: string;
    };
}

const ROLES = [
    { id: 'public', label: 'Public' },
    { id: 'student', label: 'Student' },
    { id: 'member', label: 'Member' },
    { id: 'chairperson', label: 'Chairperson' },
];

export default function KnowledgeBasePage() {
    const [notes, setNotes] = useState<KnowledgeNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentNote, setCurrentNote] = useState<Partial<KnowledgeNote>>({
        priority: 'standard',
        formatType: 'auto',
        accessLevel: ['public', 'student', 'member', 'chairperson'],
        isActive: true,
        status: 'active',
    });

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        try {
            // Add timestamp to prevent caching
            const response = await fetch(`/api/admin/knowledge?t=${Date.now()}`, {
                cache: 'no-store'
            });
            if (response.ok) {
                const data = await response.json();
                setNotes(data);
            }
        } catch (error) {
            console.error('Error fetching notes:', error);
        } finally {
            setLoading(false);
        }
    };

    // ... handleSubmit ...
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = isEditing && currentNote.id
                ? `/api/admin/knowledge/${currentNote.id}`
                : '/api/admin/knowledge';

            const method = isEditing ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentNote),
            });

            if (response.ok) {
                await fetchNotes();
                resetForm();
            } else {
                const errorData = await response.json().catch(() => ({}));
                alert(`Failed to save note: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error saving note:', error);
            alert('Error saving note. Please check console for details.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this note?')) return;

        // Optimistic update: Remove from UI immediately
        const previousNotes = [...notes];
        setNotes(notes.filter(n => n.id !== id));

        try {
            const response = await fetch(`/api/admin/knowledge/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                // Revert if failed
                setNotes(previousNotes);
                alert('Failed to delete note');
            }
            // No need to fetchNotes() if successful, we already updated UI
        } catch (error) {
            console.error('Error deleting note:', error);
            setNotes(previousNotes);
            alert('Error deleting note');
        }
    };

    const handleToggleActive = async (note: KnowledgeNote) => {
        try {
            const response = await fetch(`/api/admin/knowledge/${note.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !note.isActive }),
            });

            if (response.ok) {
                fetchNotes();
            }
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    const resetForm = () => {
        setIsEditing(false);
        setCurrentNote({
            priority: 'standard',
            formatType: 'auto',
            accessLevel: ['public', 'student', 'member', 'chairperson'],
            isActive: true,
            status: 'active'
        });
    };

    const handleEdit = (note: KnowledgeNote) => {
        setIsEditing(true);
        setCurrentNote(note);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleRoleChange = (roleId: string, checked: boolean) => {
        const currentRoles = currentNote.accessLevel || [];
        if (checked) {
            setCurrentNote({ ...currentNote, accessLevel: [...currentRoles, roleId] });
        } else {
            setCurrentNote({ ...currentNote, accessLevel: currentRoles.filter(r => r !== roleId) });
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
            default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Priority Knowledge Base</h1>
                    <p className="text-muted-foreground">
                        Manage high-priority notes that override document policies.
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Form Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>{isEditing ? 'Edit Note' : 'Add New Note'}</CardTitle>
                        <CardDescription>
                            These notes will be given highest priority in RAG responses.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    value={currentNote.title || ''}
                                    onChange={(e) => setCurrentNote({ ...currentNote, title: e.target.value })}
                                    placeholder="e.g., Sabbatical Leave Update 2024"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Input
                                        id="category"
                                        value={currentNote.category || ''}
                                        onChange={(e) => setCurrentNote({ ...currentNote, category: e.target.value })}
                                        placeholder="e.g., HR Policy"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="priority">Override Level</Label>
                                    <Select
                                        value={currentNote.priority as string}
                                        onValueChange={(val) => setCurrentNote({ ...currentNote, priority: val as any })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select priority" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="standard">Standard (Equal to Docs)</SelectItem>
                                            <SelectItem value="high">High (Overrides Docs)</SelectItem>
                                            <SelectItem value="critical">Critical (Absolute Truth)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="formatType">Format Type</Label>
                                <Select
                                    value={currentNote.formatType || 'auto'}
                                    onValueChange={(val) => setCurrentNote({ ...currentNote, formatType: val as any })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select format" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto">Auto-detect</SelectItem>
                                        <SelectItem value="table">Table (for tiered data)</SelectItem>
                                        <SelectItem value="prose">Prose (plain text)</SelectItem>
                                        <SelectItem value="list">Bullet List</SelectItem>
                                        <SelectItem value="quote">Block Quote</SelectItem>
                                        <SelectItem value="code">Code Block</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Controls how this note is presented to the AI. Use "Table" for tiered/structured data.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Applies To (Access Level)</Label>
                                <div className="grid grid-cols-2 gap-2 border rounded-md p-3">
                                    {ROLES.map((role) => (
                                        <div key={role.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`role-${role.id}`}
                                                checked={currentNote.accessLevel?.includes(role.id)}
                                                onCheckedChange={(checked) => handleRoleChange(role.id, checked as boolean)}
                                            />
                                            <Label htmlFor={`role-${role.id}`} className="font-normal cursor-pointer">
                                                {role.label}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="content">Content</Label>
                                <Textarea
                                    id="content"
                                    value={currentNote.content || ''}
                                    onChange={(e) => setCurrentNote({ ...currentNote, content: e.target.value })}
                                    placeholder="Enter the full rule, policy update, or knowledge here..."
                                    className="min-h-[200px]"
                                    required
                                />
                            </div>

                            <div className="flex gap-2">
                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Saving...' : (isEditing ? 'Update Note' : 'Create Note')}
                                </Button>
                                {isEditing && (
                                    <Button type="button" variant="outline" onClick={resetForm}>
                                        Cancel
                                    </Button>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* List Section */}
                <div className="space-y-4">
                    {notes.map((note) => (
                        <Card key={note.id} className={!note.isActive ? 'opacity-60' : ''}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            {note.title}
                                            {!note.isActive && <Badge variant="secondary">Inactive</Badge>}
                                        </CardTitle>
                                        <div className="flex gap-2">
                                            <Badge variant="outline" className={getPriorityColor(note.priority)}>
                                                {note.priority.toUpperCase()}
                                            </Badge>
                                            <Badge variant="outline">
                                                {note.status.toUpperCase()}
                                            </Badge>
                                            {note.category && <Badge variant="secondary">{note.category}</Badge>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleToggleActive(note)}
                                        >
                                            {note.isActive ? 'Deactivate' : 'Activate'}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(note)}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-600"
                                            onClick={() => handleDelete(note.id)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap mb-2">
                                    {note.content}
                                </p>
                                <div className="flex justify-between items-center text-xs text-muted-foreground mt-4 border-t pt-2">
                                    <span>Created by {note.creator.name}</span>
                                    <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {notes.length === 0 && !loading && (
                        <div className="text-center p-8 text-muted-foreground">
                            No knowledge notes found. Create one to get started.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

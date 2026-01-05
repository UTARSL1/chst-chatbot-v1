'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Trash2, ExternalLink } from 'lucide-react';

interface QuickAccessLink {
    id: string;
    name: string;
    url: string;
    section: string;
    icon?: string;
    roles: string[];
    order: number;
    isSystem: boolean;
}

export default function AdminQuickAccessPage() {
    const [links, setLinks] = useState<QuickAccessLink[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingLink, setEditingLink] = useState<QuickAccessLink | null>(null);
    const [activeTab, setActiveTab] = useState<'others' | 'rc'>('others');
    const [newLink, setNewLink] = useState({
        name: '',
        url: '',
        section: 'others' as 'others' | 'rc',
        roles: ['public', 'student', 'member', 'chairperson'],
        isSystem: true
    });

    useEffect(() => {
        loadLinks();
    }, []);

    const loadLinks = async () => {
        try {
            const response = await fetch('/api/quick-access');
            if (response.ok) {
                const data = await response.json();
                // Filter only system links for admin view
                setLinks(data.links.filter((l: QuickAccessLink) => l.isSystem));
            }
        } catch (error) {
            console.error('Error loading links:', error);
        }
    };

    const handleAddLink = async () => {
        if (!newLink.name || !newLink.url) {
            alert('Please provide both name and URL');
            return;
        }

        try {
            const response = await fetch('/api/quick-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newLink, section: activeTab })
            });

            if (response.ok) {
                setShowAddModal(false);
                setNewLink({
                    name: '',
                    url: '',
                    section: activeTab,
                    roles: ['public', 'student', 'member', 'chairperson'],
                    isSystem: true
                });
                loadLinks();
            } else {
                alert('Failed to add link');
            }
        } catch (error) {
            console.error('Error adding link:', error);
            alert('Error adding link');
        }
    };

    const handleEditLink = async () => {
        if (!editingLink || !editingLink.name || !editingLink.url) {
            alert('Please provide both name and URL');
            return;
        }

        try {
            const response = await fetch(`/api/quick-access/${editingLink.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingLink)
            });

            if (response.ok) {
                setEditingLink(null);
                loadLinks();
            } else {
                alert('Failed to update link');
            }
        } catch (error) {
            console.error('Error updating link:', error);
            alert('Error updating link');
        }
    };

    const handleDeleteLink = async (id: string) => {
        if (!confirm('Are you sure you want to delete this link?')) return;

        try {
            const response = await fetch(`/api/quick-access/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                loadLinks();
            } else {
                alert('Failed to delete link');
            }
        } catch (error) {
            console.error('Error deleting link:', error);
            alert('Error deleting link');
        }
    };

    const toggleRole = (role: string, isEditing: boolean) => {
        if (isEditing && editingLink) {
            const newRoles = editingLink.roles.includes(role)
                ? editingLink.roles.filter(r => r !== role)
                : [...editingLink.roles, role];
            setEditingLink({ ...editingLink, roles: newRoles });
        } else {
            const newRoles = newLink.roles.includes(role)
                ? newLink.roles.filter(r => r !== role)
                : [...newLink.roles, role];
            setNewLink({ ...newLink, roles: newRoles });
        }
    };

    const filteredLinks = links.filter(link => link.section === activeTab);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white">Quick Access Management</h1>
                <Button onClick={() => setShowAddModal(true)} variant="gradient">
                    + Add Link
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10">
                <button
                    onClick={() => setActiveTab('others')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'others'
                            ? 'text-violet-400 border-b-2 border-violet-400'
                            : 'text-gray-400 hover:text-gray-300'
                        }`}
                >
                    Quick Access (Others)
                </button>
                <button
                    onClick={() => setActiveTab('rc')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'rc'
                            ? 'text-violet-400 border-b-2 border-violet-400'
                            : 'text-gray-400 hover:text-gray-300'
                        }`}
                >
                    Quick Access (RC)
                </button>
            </div>

            <Card className="bg-gray-900/50 border-white/10 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-white">
                        {activeTab === 'others' ? 'Other Links' : 'RC Links'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {filteredLinks.length === 0 ? (
                            <p className="text-gray-400 text-center py-4">No links found.</p>
                        ) : (
                            filteredLinks.map((link) => (
                                <div key={link.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-full bg-violet-500/20 text-violet-400">
                                            <ExternalLink className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-white">{link.name}</h3>
                                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-violet-400">
                                                {link.url}
                                            </a>
                                            <div className="flex gap-2 mt-2">
                                                {link.roles.map(role => (
                                                    <span key={role} className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 capitalize">
                                                        {role}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => setEditingLink(link)}>
                                            <Pencil className="w-4 h-4 text-amber-400" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteLink(link.id)}>
                                            <Trash2 className="w-4 h-4 text-red-400" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold text-white mb-4">
                            Add Link to {activeTab === 'others' ? 'Others' : 'RC'}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Link Name</label>
                                <Input
                                    value={newLink.name}
                                    onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
                                    placeholder="e.g., External Grant Opportunities"
                                    className="bg-gray-800 border-gray-700 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">URL</label>
                                <Input
                                    value={newLink.url}
                                    onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                                    placeholder="https://example.com"
                                    className="bg-gray-800 border-gray-700 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Visible to Roles</label>
                                <div className="space-y-2">
                                    {['public', 'student', 'member', 'chairperson'].map((role) => (
                                        <label key={role} className="flex items-center gap-2 text-gray-300 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={newLink.roles.includes(role)}
                                                onChange={() => toggleRole(role, false)}
                                                className="rounded bg-gray-800 border-gray-700 text-violet-600 focus:ring-violet-600"
                                            />
                                            <span className="capitalize">{role}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2 mt-6">
                                <Button onClick={handleAddLink} className="flex-1 bg-violet-600 hover:bg-violet-700">
                                    Add Link
                                </Button>
                                <Button onClick={() => setShowAddModal(false)} variant="outline" className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800">
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingLink && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold text-white mb-4">Edit Link</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Link Name</label>
                                <Input
                                    value={editingLink.name}
                                    onChange={(e) => setEditingLink({ ...editingLink, name: e.target.value })}
                                    className="bg-gray-800 border-gray-700 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">URL</label>
                                <Input
                                    value={editingLink.url}
                                    onChange={(e) => setEditingLink({ ...editingLink, url: e.target.value })}
                                    className="bg-gray-800 border-gray-700 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Visible to Roles</label>
                                <div className="space-y-2">
                                    {['public', 'student', 'member', 'chairperson'].map((role) => (
                                        <label key={role} className="flex items-center gap-2 text-gray-300 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={editingLink.roles.includes(role)}
                                                onChange={() => toggleRole(role, true)}
                                                className="rounded bg-gray-800 border-gray-700 text-violet-600 focus:ring-violet-600"
                                            />
                                            <span className="capitalize">{role}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2 mt-6">
                                <Button onClick={handleEditLink} className="flex-1 bg-violet-600 hover:bg-violet-700">
                                    Save Changes
                                </Button>
                                <Button onClick={() => setEditingLink(null)} variant="outline" className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800">
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

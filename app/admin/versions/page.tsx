'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Pencil, Trash2, Check, X, GitCommit } from 'lucide-react';

interface Version {
    id: string;
    versionNumber: string;
    commitHash: string;
    description: string;
    isCurrent: boolean;
    createdAt: string;
}

export default function VersionManagementPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [versions, setVersions] = useState<Version[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);

    const [formData, setFormData] = useState({
        versionNumber: '',
        commitHash: '',
        description: '',
        isCurrent: false
    });

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        } else if (session?.user.role !== 'chairperson') {
            router.push('/');
        } else {
            fetchVersions();
        }
    }, [session, status, router]);

    const fetchVersions = async () => {
        try {
            const response = await fetch('/api/admin/versions');
            const data = await response.json();
            setVersions(data.versions || []);
        } catch (error) {
            console.error('Error fetching versions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.versionNumber || !formData.commitHash || !formData.description) {
            alert('Please fill in all fields');
            return;
        }

        try {
            const url = editingId
                ? `/api/admin/versions/${editingId}`
                : '/api/admin/versions';

            const method = editingId ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setFormData({ versionNumber: '', commitHash: '', description: '', isCurrent: false });
                setEditingId(null);
                setShowAddForm(false);
                fetchVersions();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to save version');
            }
        } catch (error) {
            console.error('Error saving version:', error);
            alert('Failed to save version');
        }
    };

    const handleEdit = (version: Version) => {
        setFormData({
            versionNumber: version.versionNumber,
            commitHash: version.commitHash,
            description: version.description,
            isCurrent: version.isCurrent
        });
        setEditingId(version.id);
        setShowAddForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this version?')) return;

        try {
            const response = await fetch(`/api/admin/versions/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                fetchVersions();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to delete version');
            }
        } catch (error) {
            console.error('Error deleting version:', error);
            alert('Failed to delete version');
        }
    };

    const handleSetCurrent = async (id: string) => {
        const version = versions.find(v => v.id === id);
        if (!version) return;

        try {
            const response = await fetch(`/api/admin/versions/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...version, isCurrent: true })
            });

            if (response.ok) {
                fetchVersions();
            }
        } catch (error) {
            console.error('Error setting current version:', error);
        }
    };

    const cancelEdit = () => {
        setFormData({ versionNumber: '', commitHash: '', description: '', isCurrent: false });
        setEditingId(null);
        setShowAddForm(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <p className="text-white">Loading...</p>
            </div>
        );
    }

    if (!session) return null;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#3B82F6] mb-2 font-['Orbitron',sans-serif] uppercase tracking-[0.1em]">VERSION MANAGEMENT</h1>
                    <p className="text-[#94A3B8] font-['JetBrains_Mono',monospace] text-sm">// MANAGE_APPLICATION_VERSIONS_AND_COMMIT_HISTORY</p>
                </div>
            </div>

            {/* Add Version Button */}
            {!showAddForm && (
                <Button
                    onClick={() => setShowAddForm(true)}
                    className="mb-6 bg-[#3B82F6] hover:bg-[#2563EB] font-['Orbitron',sans-serif] uppercase tracking-wide text-sm"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    ADD VERSION
                </Button>
            )}

            {/* Add/Edit Form */}
            {showAddForm && (
                <Card className="mb-6 p-6 bg-gray-900/50 border-white/10 backdrop-blur-xl">
                    <h3 className="text-xl font-semibold text-[#3B82F6] mb-4 font-['Orbitron',sans-serif] uppercase tracking-wide">
                        {editingId ? 'EDIT VERSION' : 'ADD NEW VERSION'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Version Number *
                            </label>
                            <Input
                                value={formData.versionNumber}
                                onChange={(e) => setFormData({ ...formData, versionNumber: e.target.value })}
                                placeholder="e.g., v1.5, v2.0"
                                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Commit Hash *
                            </label>
                            <Input
                                value={formData.commitHash}
                                onChange={(e) => setFormData({ ...formData, commitHash: e.target.value })}
                                placeholder="e.g., a5654f9, 2c59253"
                                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Description *
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="What's new in this version..."
                                rows={4}
                                className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isCurrent"
                                checked={formData.isCurrent}
                                onChange={(e) => setFormData({ ...formData, isCurrent: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-600 bg-gray-700 checked:bg-violet-600"
                            />
                            <label htmlFor="isCurrent" className="text-sm text-gray-300 cursor-pointer">
                                Set as current version
                            </label>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                type="submit"
                                className="bg-[#3B82F6] hover:bg-[#2563EB] font-['Orbitron',sans-serif] uppercase tracking-wide text-sm"
                            >
                                {editingId ? 'UPDATE' : 'CREATE'}
                            </Button>
                            <Button
                                type="button"
                                onClick={cancelEdit}
                                variant="outline"
                                className="border-gray-700 text-gray-300 hover:bg-gray-800"
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Versions Table */}
            <Card className="bg-gray-900/50 border-white/10 backdrop-blur-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white/90 uppercase tracking-wider font-['Orbitron',sans-serif]">
                                    Version
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white/90 uppercase tracking-wider font-['Orbitron',sans-serif]">
                                    Commit
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white/90 uppercase tracking-wider font-['Orbitron',sans-serif]">
                                    Description
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white/90 uppercase tracking-wider font-['Orbitron',sans-serif]">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white/90 uppercase tracking-wider font-['Orbitron',sans-serif]">
                                    Created
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-white/90 uppercase tracking-wider font-['Orbitron',sans-serif]">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {versions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-white/60">
                                        No versions found. Create your first version!
                                    </td>
                                </tr>
                            ) : (
                                versions.map((version) => (
                                    <tr key={version.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-white">
                                                    {version.versionNumber}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-sm text-white/80">
                                                <GitCommit className="w-4 h-4" />
                                                <code className="bg-white/10 px-2 py-0.5 rounded text-xs">
                                                    {version.commitHash}
                                                </code>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-white/80 line-clamp-2">
                                                {version.description}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {version.isCurrent ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                                                    <Check className="w-3 h-3 mr-1" />
                                                    Current
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleSetCurrent(version.id)}
                                                    className="text-xs text-white/60 hover:text-white transition-colors underline"
                                                >
                                                    Set as current
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
                                            {new Date(version.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(version)}
                                                    className="text-white/60 hover:text-white transition-colors p-1"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(version.id)}
                                                    disabled={version.isCurrent}
                                                    className="text-white/60 hover:text-red-400 transition-colors p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                                                    title={version.isCurrent ? "Cannot delete current version" : "Delete"}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

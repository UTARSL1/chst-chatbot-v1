'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import FileUpload from '@/components/admin/FileUpload';

interface Department {
    id: string;
    name: string;
    description?: string;
    abbreviation?: string;
    icon?: string;
    color?: string;
    iconUrl?: string;
    imageUrl?: string;
    createdAt: Date;
}

export default function DepartmentsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDept, setEditingDept] = useState<Department | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '', abbreviation: '', icon: '', color: '' });
    const [iconFile, setIconFile] = useState<File | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        } else if (session?.user?.role !== 'chairperson') {
            router.push('/chat');
        } else {
            loadDepartments();
        }
    }, [status, session, router]);

    const loadDepartments = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/departments');
            const data = await response.json();
            setDepartments(data);
        } catch (error) {
            console.error('Error loading departments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('name', formData.name);
            formDataToSend.append('description', formData.description);
            formDataToSend.append('abbreviation', formData.abbreviation);
            formDataToSend.append('icon', formData.icon);
            formDataToSend.append('color', formData.color);

            if (iconFile) {
                formDataToSend.append('iconFile', iconFile);
            }
            if (imageFile) {
                formDataToSend.append('imageFile', imageFile);
            }

            if (editingDept) {
                // Update
                const response = await fetch(`/api/admin/departments/${editingDept.id}`, {
                    method: 'PATCH',
                    body: formDataToSend,
                });

                if (response.ok) {
                    alert('Department updated successfully!');
                }
            } else {
                // Create
                const response = await fetch('/api/admin/departments', {
                    method: 'POST',
                    body: formDataToSend,
                });

                if (response.ok) {
                    alert('Department created successfully!');
                }
            }

            setShowModal(false);
            setFormData({ name: '', description: '', abbreviation: '', icon: '', color: '' });
            setIconFile(null);
            setImageFile(null);
            setEditingDept(null);
            loadDepartments();
        } catch (error) {
            console.error('Error saving department:', error);
            alert('Failed to save department');
        }
    };

    const handleEdit = (dept: Department) => {
        setEditingDept(dept);
        setFormData({
            name: dept.name,
            description: dept.description || '',
            abbreviation: dept.abbreviation || '',
            icon: dept.icon || '',
            color: dept.color || '',
        });
        setIconFile(null);
        setImageFile(null);
        setShowModal(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

        try {
            const response = await fetch(`/api/admin/departments/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                alert('Department deleted successfully!');
                loadDepartments();
            } else {
                alert('Failed to delete department');
            }
        } catch (error) {
            console.error('Error deleting department:', error);
            alert('Failed to delete department');
        }
    };

    if (loading) return <div className="flex items-center justify-center h-full"><p>Loading...</p></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Department Management</h1>
                    <p className="text-muted-foreground mt-1">Manage departments for knowledge base categorization</p>
                </div>
                <Button
                    onClick={() => {
                        setEditingDept(null);
                        setFormData({ name: '', description: '', abbreviation: '', icon: '', color: '' });
                        setIconFile(null);
                        setImageFile(null);
                        setShowModal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Department
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs uppercase bg-muted/50 border-b">
                                <tr>
                                    <th className="px-6 py-3 text-left">Icon</th>
                                    <th className="px-6 py-3 text-left">Name</th>
                                    <th className="px-6 py-3 text-left">Abbreviation</th>
                                    <th className="px-6 py-3 text-left">Description</th>
                                    <th className="px-6 py-3 text-left">Created</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {departments.map((dept) => (
                                    <tr key={dept.id} className="border-b hover:bg-muted/50">
                                        <td className="px-6 py-4">
                                            {dept.iconUrl ? (
                                                <img src={dept.iconUrl} alt={dept.name} className="w-8 h-8 object-cover rounded" />
                                            ) : dept.imageUrl ? (
                                                <img src={dept.imageUrl} alt={dept.name} className="w-8 h-8 object-cover rounded" />
                                            ) : dept.icon ? (
                                                <span className="text-2xl">{dept.icon}</span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium">{dept.name}</td>
                                        <td className="px-6 py-4 text-muted-foreground">{dept.abbreviation || '-'}</td>
                                        <td className="px-6 py-4 text-muted-foreground">{dept.description || '-'}</td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {new Date(dept.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    onClick={() => handleEdit(dept)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-blue-500 hover:text-blue-700"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    onClick={() => handleDelete(dept.id, dept.name)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {departments.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                                            No departments found. Click "Add Department" to create one.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
                    <div className="bg-slate-900 rounded-lg p-6 w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">
                            {editingDept ? 'Edit Department' : 'Add Department'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Name *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Abbreviation</label>
                                    <input
                                        type="text"
                                        value={formData.abbreviation}
                                        onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Emoji Icon (fallback)</label>
                                    <input
                                        type="text"
                                        value={formData.icon}
                                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                                        placeholder="🏢"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Color (hex)</label>
                                    <input
                                        type="text"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                                        placeholder="#3B82F6"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FileUpload
                                    label="Icon Upload"
                                    onFileSelect={setIconFile}
                                    currentUrl={editingDept?.iconUrl}
                                />
                                <FileUpload
                                    label="Image Upload"
                                    onFileSelect={setImageFile}
                                    currentUrl={editingDept?.imageUrl}
                                />
                            </div>

                            <div className="flex gap-3 justify-end pt-4 border-t border-slate-700">
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingDept(null);
                                        setFormData({ name: '', description: '', abbreviation: '', icon: '', color: '' });
                                        setIconFile(null);
                                        setImageFile(null);
                                    }}
                                    variant="outline"
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                                    {editingDept ? 'Update' : 'Create'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

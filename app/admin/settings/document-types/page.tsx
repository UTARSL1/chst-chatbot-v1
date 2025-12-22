'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import FileUpload from '@/components/admin/FileUpload';

interface DocumentType {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    iconUrl?: string;
    imageUrl?: string;
    createdAt: Date;
}

export default function DocumentTypesPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingType, setEditingType] = useState<DocumentType | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '', icon: '', color: '' });
    const [iconFile, setIconFile] = useState<File | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        } else if (session?.user?.role !== 'chairperson') {
            router.push('/chat');
        } else {
            loadDocumentTypes();
        }
    }, [status, session, router]);

    const loadDocumentTypes = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/document-types');
            const data = await response.json();
            setDocumentTypes(data);
        } catch (error) {
            console.error('Error loading document types:', error);
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
            formDataToSend.append('icon', formData.icon);
            formDataToSend.append('color', formData.color);

            if (iconFile) {
                formDataToSend.append('iconFile', iconFile);
            }
            if (imageFile) {
                formDataToSend.append('imageFile', imageFile);
            }

            if (editingType) {
                const response = await fetch(`/api/admin/document-types/${editingType.id}`, {
                    method: 'PATCH',
                    body: formDataToSend,
                });

                if (response.ok) {
                    alert('Document type updated successfully!');
                }
            } else {
                const response = await fetch('/api/admin/document-types', {
                    method: 'POST',
                    body: formDataToSend,
                });

                if (response.ok) {
                    alert('Document type created successfully!');
                }
            }

            setShowModal(false);
            setFormData({ name: '', description: '', icon: '', color: '' });
            setIconFile(null);
            setImageFile(null);
            setEditingType(null);
            loadDocumentTypes();
        } catch (error) {
            console.error('Error saving document type:', error);
            alert('Failed to save document type');
        }
    };

    const handleEdit = (type: DocumentType) => {
        setEditingType(type);
        setFormData({
            name: type.name,
            description: type.description || '',
            icon: type.icon || '',
            color: type.color || '',
        });
        setIconFile(null);
        setImageFile(null);
        setShowModal(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

        try {
            const response = await fetch(`/api/admin/document-types/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                alert('Document type deleted successfully!');
                loadDocumentTypes();
            } else {
                alert('Failed to delete document type');
            }
        } catch (error) {
            console.error('Error deleting document type:', error);
            alert('Failed to delete document type');
        }
    };

    if (loading) return <div className="flex items-center justify-center h-full"><p>Loading...</p></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Document Type Management</h1>
                    <p className="text-muted-foreground mt-1">Manage document types for knowledge base categorization</p>
                </div>
                <Button
                    onClick={() => {
                        setEditingType(null);
                        setFormData({ name: '', description: '', icon: '', color: '' });
                        setIconFile(null);
                        setImageFile(null);
                        setShowModal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Document Type
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
                                    <th className="px-6 py-3 text-left">Description</th>
                                    <th className="px-6 py-3 text-left">Created</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documentTypes.map((type) => (
                                    <tr key={type.id} className="border-b hover:bg-muted/50">
                                        <td className="px-6 py-4">
                                            {type.iconUrl ? (
                                                <img src={type.iconUrl} alt={type.name} className="w-8 h-8 object-cover rounded" />
                                            ) : type.imageUrl ? (
                                                <img src={type.imageUrl} alt={type.name} className="w-8 h-8 object-cover rounded" />
                                            ) : type.icon ? (
                                                <span className="text-2xl">{type.icon}</span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium">{type.name}</td>
                                        <td className="px-6 py-4 text-muted-foreground">{type.description || '-'}</td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {new Date(type.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    onClick={() => handleEdit(type)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-blue-500 hover:text-blue-700"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    onClick={() => handleDelete(type.id, type.name)}
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
                                {documentTypes.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                            No document types found. Click "Add Document Type" to create one.
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
                            {editingType ? 'Edit Document Type' : 'Add Document Type'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
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
                                        placeholder="📄"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Color (hex)</label>
                                    <input
                                        type="text"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                                        placeholder="#10B981"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FileUpload
                                    label="Icon Upload"
                                    onFileSelect={setIconFile}
                                    currentUrl={editingType?.iconUrl}
                                />
                                <FileUpload
                                    label="Image Upload"
                                    onFileSelect={setImageFile}
                                    currentUrl={editingType?.imageUrl}
                                />
                            </div>

                            <div className="flex gap-3 justify-end pt-4 border-t border-slate-700">
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingType(null);
                                        setFormData({ name: '', description: '', icon: '', color: '' });
                                        setIconFile(null);
                                        setImageFile(null);
                                    }}
                                    variant="outline"
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                                    {editingType ? 'Update' : 'Create'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

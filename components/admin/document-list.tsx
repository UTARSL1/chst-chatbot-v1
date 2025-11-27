'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatFileSize, formatRelativeTime } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface Document {
    id: string;
    filename: string;
    originalName: string;
    accessLevel: string;
    category?: string;
    department?: string;
    fileSize: number;
    status: string;
    uploadedAt: string;
    uploadedBy: {
        name: string;
        email: string;
    };
}

export function DocumentList() {
    const router = useRouter();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const response = await fetch('/api/documents');
            const text = await response.text();

            try {
                const data = JSON.parse(text);
                if (response.ok) {
                    setDocuments(data.documents);
                } else {
                    console.error('Fetch documents failed:', data.error);
                }
            } catch (e) {
                console.error('Failed to parse documents response:', text);
            }
        } catch (error) {
            console.error('Error fetching documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        // Removed confirmation as requested
        // if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
        //     return;
        // }

        setDeleting(id);
        try {
            const response = await fetch(`/api/documents?id=${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setDocuments(documents.filter((doc) => doc.id !== id));
                router.refresh();
            } else {
                alert('Failed to delete document');
            }
        } catch (error) {
            console.error('Error deleting document:', error);
            alert('An error occurred while deleting the document');
        } finally {
            setDeleting(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
            </div>
        );
    }

    return (
        <Card className="bg-gray-900/50 border-white/10 backdrop-blur-xl">
            <CardHeader>
                <CardTitle className="text-white">Uploaded Documents</CardTitle>
            </CardHeader>
            <CardContent>
                {documents.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        No documents uploaded yet.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="text-xs uppercase bg-gray-800/50 text-gray-300">
                                <tr>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Dept</th>
                                    <th className="px-6 py-3">Type</th>
                                    <th className="px-6 py-3">Access</th>
                                    <th className="px-6 py-3">Size</th>
                                    <th className="px-6 py-3">Uploaded By</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documents.map((doc) => (
                                    <tr key={doc.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                                        <td className="px-6 py-4 font-medium text-white">
                                            {doc.originalName}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                                                {doc.department || 'Gen'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${doc.category === 'Policy' ? 'bg-blue-500/20 text-blue-300' : 'bg-orange-500/20 text-orange-300'
                                                }`}>
                                                {doc.category || 'Policy'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${doc.accessLevel === 'chairperson' ? 'bg-purple-500/20 text-purple-300' :
                                                doc.accessLevel === 'member' ? 'bg-blue-500/20 text-blue-300' :
                                                    'bg-green-500/20 text-green-300'
                                                }`}>
                                                {doc.accessLevel.charAt(0).toUpperCase() + doc.accessLevel.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {formatFileSize(doc.fileSize)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {doc.uploadedBy.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            {formatRelativeTime(new Date(doc.uploadedAt))}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${doc.status === 'processed' ? 'bg-green-500/10 text-green-400' :
                                                doc.status === 'processing' ? 'bg-yellow-500/10 text-yellow-400' :
                                                    'bg-red-500/10 text-red-400'
                                                }`}>
                                                {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDelete(doc.id)}
                                                disabled={deleting === doc.id}
                                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20"
                                            >
                                                {deleting === doc.id ? 'Deleting...' : 'Delete'}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

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

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'uploadedAt', direction: 'desc' });

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

    const handleSort = (key: string) => {
        setSortConfig((current) => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
        }));
    };

    const sortedDocuments = [...documents].sort((a: any, b: any) => {
        const { key, direction } = sortConfig;
        let aValue = a[key];
        let bValue = b[key];

        // Handle nested properties
        if (key.includes('.')) {
            const keys = key.split('.');
            aValue = keys.reduce((obj: any, k: string) => obj?.[k], a);
            bValue = keys.reduce((obj: any, k: string) => obj?.[k], b);
        }

        // Handle special cases
        if (key === 'fileSize') {
            aValue = Number(aValue);
            bValue = Number(bValue);
        }

        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (sortConfig.key !== columnKey) return <span className="ml-1 text-gray-600">↕</span>;
        return <span className="ml-1 text-violet-400">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
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
                                    <th className="px-6 py-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('originalName')}>
                                        Name <SortIcon columnKey="originalName" />
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('department')}>
                                        Dept <SortIcon columnKey="department" />
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('category')}>
                                        Type <SortIcon columnKey="category" />
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('status')}>
                                        Status <SortIcon columnKey="status" />
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('fileSize')}>
                                        Size <SortIcon columnKey="fileSize" />
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('uploadedBy.name')}>
                                        Uploaded By <SortIcon columnKey="uploadedBy.name" />
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('uploadedAt')}>
                                        Date <SortIcon columnKey="uploadedAt" />
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('accessLevel')}>
                                        Access <SortIcon columnKey="accessLevel" />
                                    </th>
                                    <th className="px-6 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedDocuments.map((doc) => (
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
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${doc.category === 'Policy' ? 'bg-blue-500/20 text-blue-300' :
                                                doc.category === 'Meeting Minute' ? 'bg-green-500/20 text-green-300' :
                                                    'bg-orange-500/20 text-orange-300'
                                                }`}>
                                                {doc.category || 'Policy'}
                                            </span>
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
                                            {formatFileSize(doc.fileSize)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {doc.uploadedBy.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            {formatRelativeTime(new Date(doc.uploadedAt))}
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

'use client';

import { useState } from 'react';
import { DocumentUpload } from '@/components/admin/document-upload';
import { DocumentList } from '@/components/admin/document-list';

export default function DocumentsPage() {
    const [refreshKey, setRefreshKey] = useState(0);

    const handleUploadSuccess = () => {
        // Trigger DocumentList to refresh by changing the key
        setRefreshKey(prev => prev + 1);
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Document Management</h1>
                <p className="text-gray-400">Upload and manage knowledge base documents.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <DocumentUpload onUploadSuccess={handleUploadSuccess} />
                </div>
                <div className="lg:col-span-2">
                    <DocumentList key={refreshKey} />
                </div>
            </div>
        </div>
    );
}

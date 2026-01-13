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
                <h1 className="text-2xl font-bold text-[#3B82F6] mb-2 font-['Orbitron',sans-serif] uppercase tracking-[0.1em]">DOCUMENT MANAGEMENT</h1>
                <p className="text-[#94A3B8] font-['JetBrains_Mono',monospace] text-sm">// UPLOAD_AND_MANAGE_KNOWLEDGE_BASE_DOCUMENTS</p>
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

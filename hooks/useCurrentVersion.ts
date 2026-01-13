'use client';

import { useEffect, useState } from 'react';

const VERSION_CACHE_KEY = 'chst_current_version';

export function useCurrentVersion(updateTitle = false) {
    // Initialize with cached version or fallback
    const [version, setVersion] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(VERSION_CACHE_KEY) || 'V1.5';
        }
        return 'V1.5';
    });

    useEffect(() => {
        const fetchVersion = async () => {
            try {
                const res = await fetch('/api/admin/versions?current=true');
                const data = await res.json();
                if (data.version) {
                    setVersion(data.version);

                    // Cache the version
                    if (typeof window !== 'undefined') {
                        localStorage.setItem(VERSION_CACHE_KEY, data.version);
                    }

                    // Update document title if requested
                    if (updateTitle && typeof window !== 'undefined') {
                        document.title = `CHST-Chatbot ${data.version}`;
                    }
                }
            } catch (error) {
                console.error('Error fetching version:', error);
            }
        };

        fetchVersion();
    }, [updateTitle]);

    return version;
}

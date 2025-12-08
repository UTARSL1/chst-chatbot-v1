'use client';

import { useEffect, useState } from 'react';

export function useCurrentVersion() {
    const [version, setVersion] = useState('v2.0'); // fallback

    useEffect(() => {
        const fetchVersion = async () => {
            try {
                const res = await fetch('/api/admin/versions?current=true');
                const data = await res.json();
                if (data.version) {
                    setVersion(data.version);
                }
            } catch (error) {
                console.error('Error fetching version:', error);
            }
        };

        fetchVersion();
    }, []);

    return version;
}

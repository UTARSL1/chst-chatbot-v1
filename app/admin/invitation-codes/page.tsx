'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

interface InvitationCode {
    id: string;
    code: string;
    isActive: boolean;
    createdBy: string;
    createdAt: string;
    expiresAt: string | null;
    usageCount: number;
    _count: {
        users: number;
    };
}

export default function InvitationCodesPage() {
    const [codes, setCodes] = useState<InvitationCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchCodes();
    }, []);

    const fetchCodes = async () => {
        try {
            const response = await fetch('/api/admin/invitation-codes');
            if (response.ok) {
                const data = await response.json();
                setCodes(data);
            }
        } catch (error) {
            console.error('Error fetching codes:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateCode = async () => {
        setGenerating(true);
        try {
            const response = await fetch('/api/admin/invitation-codes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            if (response.ok) {
                await fetchCodes();
            }
        } catch (error) {
            console.error('Error generating code:', error);
        } finally {
            setGenerating(false);
        }
    };

    const toggleActive = async (id: string, currentStatus: boolean) => {
        try {
            const response = await fetch(`/api/admin/invitation-codes/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus }),
            });

            if (response.ok) {
                await fetchCodes();
            }
        } catch (error) {
            console.error('Error toggling code:', error);
        }
    };

    const deleteCode = async (id: string) => {
        if (!confirm('Are you sure you want to delete this invitation code?')) return;

        try {
            const response = await fetch(`/api/admin/invitation-codes/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                await fetchCodes();
            }
        } catch (error) {
            console.error('Error deleting code:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Invitation Codes</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage invitation codes for UTAR staff and student signups
                    </p>
                </div>
                <Button onClick={generateCode} disabled={generating} variant="gradient">
                    {generating ? 'Generating...' : '+ Generate Code'}
                </Button>
            </div>

            {codes.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <p className="text-muted-foreground">No invitation codes yet. Generate one to get started!</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {codes.map((code) => (
                        <Card key={code.id}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-2xl font-mono">{code.code}</CardTitle>
                                        <CardDescription>
                                            Created {new Date(code.createdAt).toLocaleDateString()}
                                            {code.expiresAt && ` • Expires ${new Date(code.expiresAt).toLocaleDateString()}`}
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => toggleActive(code.id, code.isActive)}
                                            variant={code.isActive ? 'default' : 'outline'}
                                            size="sm"
                                        >
                                            {code.isActive ? '🟢 Active' : '🔴 Inactive'}
                                        </Button>
                                        <Button
                                            onClick={() => deleteCode(code.id)}
                                            variant="destructive"
                                            size="sm"
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-8 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Total Signups:</span>
                                        <span className="ml-2 font-semibold">{code._count.users}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Usage Count:</span>
                                        <span className="ml-2 font-semibold">{code.usageCount}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

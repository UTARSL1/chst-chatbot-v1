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
    remark: string | null;
    _count: {
        users: number;
    };
}

export default function InvitationCodesPage() {
    const [codes, setCodes] = useState<InvitationCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [newRemark, setNewRemark] = useState('');
    const [editingRemark, setEditingRemark] = useState<{ id: string, remark: string } | null>(null);

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
                body: JSON.stringify({ remark: newRemark || null }),
            });

            if (response.ok) {
                setNewRemark('');
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

    const updateRemark = async (id: string, remark: string) => {
        try {
            const response = await fetch(`/api/admin/invitation-codes/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ remark: remark || null }),
            });

            if (response.ok) {
                setEditingRemark(null);
                await fetchCodes();
            }
        } catch (error) {
            console.error('Error updating remark:', error);
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
            <div>
                <h1 className="text-3xl font-bold">Invitation Codes</h1>
                <p className="text-muted-foreground mt-1">
                    Manage invitation codes for UTAR staff and student signups
                </p>
            </div>

            {/* Generate Code Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Generate New Code</CardTitle>
                    <CardDescription>Create a new invitation code with an optional remark</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-2 block">
                            Remark (Optional)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., Cohort 2025, Research Team, etc."
                            value={newRemark}
                            onChange={(e) => setNewRemark(e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Add a note to identify which group or cohort this code is for
                        </p>
                    </div>
                    <Button onClick={generateCode} disabled={generating} variant="gradient" className="w-full">
                        {generating ? 'Generating...' : '+ Generate Code'}
                    </Button>
                </CardContent>
            </Card>

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
                                        {code.isActive && (
                                            <Button
                                                onClick={() => toggleActive(code.id, true)}
                                                variant="outline"
                                                size="sm"
                                            >
                                                Deactivate
                                            </Button>
                                        )}
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
                                {/* Remark Section */}
                                <div className="mb-4 pb-4 border-b border-border">
                                    {editingRemark?.id === code.id ? (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Remark</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={editingRemark.remark}
                                                    onChange={(e) => setEditingRemark({ id: code.id, remark: e.target.value })}
                                                    className="flex-1 px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                                                    placeholder="e.g., Cohort 2025, Research Team"
                                                    autoFocus
                                                />
                                                <Button
                                                    onClick={() => updateRemark(code.id, editingRemark.remark)}
                                                    size="sm"
                                                    variant="default"
                                                >
                                                    Save
                                                </Button>
                                                <Button
                                                    onClick={() => setEditingRemark(null)}
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="text-sm font-medium text-muted-foreground">Remark:</span>
                                                <p className="text-sm mt-1">
                                                    {code.remark || <span className="italic text-muted-foreground">No remark</span>}
                                                </p>
                                            </div>
                                            <Button
                                                onClick={() => setEditingRemark({ id: code.id, remark: code.remark || '' })}
                                                size="sm"
                                                variant="ghost"
                                            >
                                                ✏️ Edit
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Stats Section */}
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

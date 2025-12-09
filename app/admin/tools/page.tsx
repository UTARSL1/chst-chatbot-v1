
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, ShieldAlert, Wrench } from 'lucide-react';

interface ToolPermission {
    id: string;
    toolName: string;
    description: string;
    allowedRoles: string[];
    updatedAt: string;
}

const ROLES = ['public', 'student', 'member', 'chairperson'];

export default function ToolManagementPage() {
    const router = useRouter();
    const [tools, setTools] = useState<ToolPermission[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        fetchTools();
    }, []);

    const fetchTools = async () => {
        try {
            const res = await fetch('/api/admin/tools');
            if (res.ok) {
                const data = await res.json();
                setTools(data.tools);
            }
        } catch (error) {
            console.error('Failed to load tools', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleRole = async (toolName: string, role: string, currentRoles: string[]) => {
        const isAllowed = currentRoles.includes(role);
        let newRoles: string[];

        if (isAllowed) {
            newRoles = currentRoles.filter(r => r !== role);
        } else {
            newRoles = [...currentRoles, role];
        }

        // Optimistic update
        setTools(prev => prev.map(t =>
            t.toolName === toolName ? { ...t, allowedRoles: newRoles } : t
        ));

        setSaving(toolName);
        try {
            const res = await fetch('/api/admin/tools', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toolName, allowedRoles: newRoles })
            });

            if (!res.ok) {
                throw new Error('Failed to update');
            }
        } catch (error) {
            alert('Failed to update permission. Reverting...');
            fetchTools(); // Revert on failure
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return <div className="p-8 text-center">Loading tool settings...</div>;
    }

    return (
        <div className="min-h-screen bg-background p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Wrench className="w-6 h-6 text-primary" />
                        Tool Management
                    </h1>
                    <p className="text-muted-foreground">Control which user roles can access specific AI capabilities.</p>
                </div>
            </div>

            <div className="grid gap-6">
                {tools.map((tool) => (
                    <Card key={tool.id} className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <div>
                                <h3 className="text-lg font-semibold font-mono text-primary">{tool.toolName}</h3>
                                <p className="text-sm text-muted-foreground">{tool.description}</p>
                            </div>
                            {saving === tool.toolName && (
                                <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-lg">
                            {ROLES.map((role) => {
                                const isAllowed = tool.allowedRoles.includes(role);
                                return (
                                    <label key={role} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-muted rounded transition-colors">
                                        <Checkbox
                                            checked={isAllowed}
                                            onCheckedChange={() => handleToggleRole(tool.toolName, role, tool.allowedRoles)}
                                        />
                                        <span className="capitalize text-sm font-medium">
                                            {role === 'chairperson' ? 'Admin (Chairperson)' : role}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </Card>
                ))}
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                    <h4 className="font-semibold text-yellow-500 text-sm">Security Note</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                        Disabling a tool for a role will prevent the AI from ever calling that tool for users with that role.
                        The AI will not even "know" the tool exists for them during the conversation.
                    </p>
                </div>
            </div>
        </div>
    );
}

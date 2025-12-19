'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, ShieldAlert, Wrench, RefreshCw, Database, Calendar, Users } from 'lucide-react';

interface ToolPermission {
    id: string;
    toolName: string;
    description: string;
    allowedRoles: string[];
    updatedAt: string;
}

interface StaffSyncStatus {
    status: 'not_initialized' | 'initialized';
    data?: {
        lastUpdated: string;
        daysSinceSync: number;
        syncDuration: string;
        totalStaff: number;
        uniqueStaff: number;
        facultiesCount: number;
        departmentsCount: number;
        healthStatus: 'fresh' | 'warning' | 'stale';
    };
}

const ROLES = ['public', 'student', 'member', 'chairperson'];

export default function ToolManagementPage() {
    const router = useRouter();
    const [tools, setTools] = useState<ToolPermission[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [staffSyncStatus, setStaffSyncStatus] = useState<StaffSyncStatus | null>(null);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        fetchTools();
        fetchStaffSyncStatus();
    }, []);

    const fetchStaffSyncStatus = async () => {
        try {
            const res = await fetch('/api/admin/sync-staff');
            if (res.ok) {
                const data = await res.json();
                setStaffSyncStatus(data);
            }
        } catch (error) {
            console.error('Failed to load staff sync status', error);
        }
    };

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

    const handleSyncStaff = async () => {
        if (!confirm('This will sync staff data from UTAR website. This may take 5-10 minutes. Continue?')) {
            return;
        }

        setSyncing(true);
        try {
            const res = await fetch('/api/admin/sync-staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ faculties: ['LKC FES'] }) // TODO: Add UI to select faculties
            });

            if (!res.ok) {
                throw new Error('Sync failed');
            }

            const result = await res.json();
            alert(`Sync completed!\nDuration: ${result.result.duration}\nTotal Staff: ${result.result.totalStaff}\nChanges: +${result.result.changes.added}, ~${result.result.changes.updated}, -${result.result.changes.deleted}`);

            // Refresh status
            await fetchStaffSyncStatus();
        } catch (error: any) {
            alert(`Sync failed: ${error.message}`);
        } finally {
            setSyncing(false);
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

            {/* Staff Directory Sync Section */}
            <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Database className="w-5 h-5 text-blue-400" />
                            Staff Directory Sync
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Sync staff data from UTAR website to enable fast lookup queries
                        </p>
                    </div>
                    <Button
                        onClick={handleSyncStaff}
                        disabled={syncing}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync Now'}
                    </Button>
                </div>

                {staffSyncStatus?.status === 'initialized' && staffSyncStatus.data && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="bg-background/50 p-4 rounded-lg">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                <Calendar className="w-4 h-4" />
                                Last Synced
                            </div>
                            <div className="text-lg font-semibold">
                                {staffSyncStatus.data.daysSinceSync} days ago
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {new Date(staffSyncStatus.data.lastUpdated).toLocaleString()}
                            </div>
                            <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${staffSyncStatus.data.healthStatus === 'fresh'
                                    ? 'bg-green-500/20 text-green-400'
                                    : staffSyncStatus.data.healthStatus === 'warning'
                                        ? 'bg-yellow-500/20 text-yellow-400'
                                        : 'bg-red-500/20 text-red-400'
                                }`}>
                                {staffSyncStatus.data.healthStatus === 'fresh' && '✓ Fresh'}
                                {staffSyncStatus.data.healthStatus === 'warning' && '⚠ Due Soon'}
                                {staffSyncStatus.data.healthStatus === 'stale' && '⚠ Stale'}
                            </div>
                        </div>

                        <div className="bg-background/50 p-4 rounded-lg">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                <Users className="w-4 h-4" />
                                Staff Count
                            </div>
                            <div className="text-lg font-semibold">
                                {staffSyncStatus.data.uniqueStaff} unique staff
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {staffSyncStatus.data.totalStaff} total positions
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {staffSyncStatus.data.departmentsCount} departments
                            </div>
                        </div>

                        <div className="bg-background/50 p-4 rounded-lg">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                <RefreshCw className="w-4 h-4" />
                                Sync Duration
                            </div>
                            <div className="text-lg font-semibold">
                                {staffSyncStatus.data.syncDuration}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Last sync time
                            </div>
                        </div>
                    </div>
                )}

                {staffSyncStatus?.status === 'not_initialized' && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mt-4">
                        <p className="text-sm text-yellow-400">
                            ⚠ Staff directory has not been synced yet. Click "Sync Now" to initialize.
                        </p>
                    </div>
                )}
            </Card>

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

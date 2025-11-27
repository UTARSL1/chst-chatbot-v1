'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PendingUser {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: Date;
}

export default function AdminUsersPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        } else if (session?.user?.role !== 'chairperson') {
            router.push('/chat');
        } else {
            loadPendingUsers();
        }
    }, [status, session, router]);

    const loadPendingUsers = async () => {
        try {
            const response = await fetch('/api/admin/users');
            const data = await response.json();
            setPendingUsers(data.users || []);
        } catch (error) {
            console.error('Error loading pending users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (userId: string) => {
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'POST',
            });

            if (response.ok) {
                setPendingUsers(prev => prev.filter(u => u.id !== userId));
                alert('User approved successfully!');
            } else {
                alert('Failed to approve user');
            }
        } catch (error) {
            console.error('Error approving user:', error);
            alert('Failed to approve user');
        }
    };

    const handleReject = async (userId: string) => {
        if (!confirm('Are you sure you want to reject this user? Their account will be deleted.')) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setPendingUsers(prev => prev.filter(u => u.id !== userId));
                alert('User rejected and account deleted');
            } else {
                alert('Failed to reject user');
            }
        } catch (error) {
            console.error('Error rejecting user:', error);
            alert('Failed to reject user');
        }
    };

    const getRoleBadge = (role: string) => {
        const colors: any = {
            public: 'bg-gray-100 text-gray-800',
            student: 'bg-blue-100 text-blue-800',
            member: 'bg-green-100 text-green-800',
            chairperson: 'bg-purple-100 text-purple-800',
        };
        return colors[role] || colors.public;
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">User Approvals</h1>
                <Button variant="outline" onClick={() => router.push('/admin')}>
                    Back to Dashboard
                </Button>
            </div>

            {pendingUsers.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center text-muted-foreground">
                        <p className="text-lg">No pending user approvals</p>
                        <p className="text-sm mt-2">All signup requests have been processed</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {pendingUsers.map((user) => (
                        <Card key={user.id}>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold">{user.name}</h3>
                                            <span className={`text-xs px-2 py-1 rounded ${getRoleBadge(user.role)}`}>
                                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Signed up: {new Date(user.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button
                                            onClick={() => handleApprove(user.id)}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            ✓ Approve
                                        </Button>
                                        <Button
                                            onClick={() => handleReject(user.id)}
                                            variant="outline"
                                            className="border-red-500 text-red-500 hover:bg-red-50"
                                        >
                                            ✕ Reject
                                        </Button>
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

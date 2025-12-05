'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { ChatHistoryModal } from '@/components/admin/chat-history-modal';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: Date;
    isApproved: boolean;
    isVerified: boolean;
    recoveryEmail?: string;
    verificationTokenExpiry?: Date;
    invitationCode?: {
        code: string;
        createdAt: Date;
    };
}

export default function AdminUsersPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
    const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);
    const [showChatHistory, setShowChatHistory] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        } else if (session?.user?.role !== 'chairperson') {
            router.push('/chat');
        } else {
            loadUsers();
        }
    }, [status, session, router, activeTab]);

    const loadUsers = async () => {
        setLoading(true);
        try {
            // Fetch based on active tab
            const url = activeTab === 'all' ? '/api/admin/users?view=all' : '/api/admin/users';
            const response = await fetch(url);
            const data = await response.json();
            setUsers(data.users || []);
        } catch (error) {
            console.error('Error loading users:', error);
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
                setUsers(prev => prev.filter(u => u.id !== userId));
                alert('User approved successfully!');
            } else {
                alert('Failed to approve user');
            }
        } catch (error) {
            console.error('Error approving user:', error);
            alert('Failed to approve user');
        }
    };

    const handleDelete = async (userId: string, userName: string) => {
        if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setUsers(prev => prev.filter(u => u.id !== userId));
                alert('User deleted successfully');
            } else {
                alert('Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user');
        }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role: newRole }),
            });

            if (response.ok) {
                // Update the local state
                setUsers(prev => prev.map(u =>
                    u.id === userId ? { ...u, role: newRole } : u
                ));
                alert('User role updated successfully');
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to update user role');
            }
        } catch (error) {
            console.error('Error updating user role:', error);
            alert('Failed to update user role');
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

    if (loading && users.length === 0) return (
        <div className="flex items-center justify-center h-full">
            <p>Loading...</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">User Management</h1>
                    <p className="text-muted-foreground mt-1">Manage user approvals and accounts</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'pending'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Pending Approvals
                </button>
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'all'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    All Users
                </button>
            </div>

            {activeTab === 'pending' ? (
                /* Pending Approvals View */
                users.length === 0 ? (
                    <Card>
                        <CardContent className="p-12 text-center text-muted-foreground">
                            <p className="text-lg">No pending user approvals</p>
                            <p className="text-sm mt-2">All signup requests have been processed</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {users.map((user) => (
                            <Card key={user.id}>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-semibold">{user.name}</h3>
                                                <span className={`text-xs px-2 py-1 rounded ${getRoleBadge(user.role)}`}>
                                                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                                </span>
                                                {!user.isVerified && (
                                                    <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                                                        Unverified Email
                                                    </span>
                                                )}
                                                {user.verificationTokenExpiry && new Date() > new Date(user.verificationTokenExpiry) && (
                                                    <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800 font-semibold">
                                                        EXPIRED
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">{user.email}</p>
                                            {user.recoveryEmail && (
                                                <p className="text-xs text-blue-400 mt-1">
                                                    Recovery: {user.recoveryEmail}
                                                </p>
                                            )}
                                            {user.invitationCode && (
                                                <p className="text-xs text-purple-400 mt-1">
                                                    📨 Code: {user.invitationCode.code}
                                                </p>
                                            )}
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Signed up: {new Date(user.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex gap-3">
                                            <Button
                                                onClick={() => handleApprove(user.id)}
                                                disabled={!user.isVerified}
                                                className={`bg-green-600 hover:bg-green-700 ${!user.isVerified ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                title={!user.isVerified ? "User must verify email before approval" : "Approve User"}
                                            >
                                                ✓ Approve
                                            </Button>
                                            <Button
                                                onClick={() => handleDelete(user.id, user.name)}
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
                )
            ) : (
                /* All Users Table View */
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                                    <tr>
                                        <th className="px-6 py-3">User Name / Role</th>
                                        <th className="px-6 py-3">Recovery Email</th>
                                        <th className="px-6 py-3">Registration Date</th>
                                        <th className="px-6 py-3">Invitation Code</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.id} className="border-b hover:bg-muted/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium">{user.name}</div>
                                                <div className="text-xs text-muted-foreground mb-1">{user.email}</div>
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={user.role}
                                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                        className={`text-[10px] px-1.5 py-0.5 rounded border-0 font-semibold cursor-pointer ${getRoleBadge(user.role)}`}
                                                    >
                                                        <option value="public">PUBLIC</option>
                                                        <option value="student">STUDENT</option>
                                                        <option value="member">MEMBER</option>
                                                        <option value="chairperson">CHAIRPERSON</option>
                                                    </select>
                                                    {!user.isApproved && (
                                                        <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                                                            PENDING
                                                        </span>
                                                    )}
                                                    {!user.isVerified && (
                                                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 ml-1">
                                                            UNVERIFIED
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground">
                                                {user.recoveryEmail || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                                <div className="text-xs opacity-70">
                                                    {new Date(user.createdAt).toLocaleTimeString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {user.invitationCode ? (
                                                    <span className="font-mono text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                                        {user.invitationCode.code}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex gap-2 justify-end">
                                                    <Button
                                                        onClick={() => {
                                                            setSelectedUser({ id: user.id, name: user.name });
                                                            setShowChatHistory(true);
                                                        }}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                    >
                                                        View History
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleDelete(user.id, user.name)}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                                No users found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
            {selectedUser && (
                <ChatHistoryModal
                    userId={selectedUser.id}
                    userName={selectedUser.name}
                    open={showChatHistory}
                    onOpenChange={setShowChatHistory}
                />
            )}
        </div>
    );
}

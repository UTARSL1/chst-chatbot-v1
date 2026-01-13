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
    lastLogin?: Date;
    invitationCode?: {
        code: string;
        createdAt: Date;
    };
    quickAccessLinks?: Array<{
        id: string;
        name: string;
        url: string;
        section: string;
        isSystem: boolean;
    }>;
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
                    <h1 className="text-2xl font-bold text-[#3B82F6] font-['Orbitron',sans-serif] uppercase tracking-[0.1em]">USER MANAGEMENT</h1>
                    <p className="text-[#94A3B8] font-['JetBrains_Mono',monospace] text-sm mt-1">// MANAGE_USER_APPROVALS_AND_ACCOUNTS</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors font-['Orbitron',sans-serif] uppercase tracking-wide ${activeTab === 'pending'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    PENDING
                </button>
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors font-['Orbitron',sans-serif] uppercase tracking-wide ${activeTab === 'all'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    ALL USERS
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
                                                <h3 className="text-lg font-semibold font-['Orbitron',sans-serif]">{user.name}</h3>
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
                                            <div className="relative group">
                                                <button
                                                    onClick={() => handleApprove(user.id)}
                                                    disabled={!user.isVerified}
                                                    className={`px-4 py-2 font-['Orbitron',sans-serif] font-bold text-xs uppercase tracking-wide transition-all ${user.isVerified
                                                        ? 'bg-white text-black hover:shadow-[0_0_20px_rgba(255,255,255,0.6)] hover:scale-[1.02]'
                                                        : 'bg-[#334155] text-[#64748B] cursor-not-allowed opacity-50'
                                                        }`}
                                                >
                                                    ✓ Approve
                                                </button>
                                                {!user.isVerified && (
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#3B82F6] text-white text-xs font-['JetBrains_Mono',monospace] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                                        Waiting for user to verify their email
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#3B82F6]"></div>
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleDelete(user.id, user.name)}
                                                className="px-4 py-2 border border-white/20 text-white font-['Orbitron',sans-serif] font-bold text-xs uppercase tracking-wide hover:bg-white/10 hover:border-[#EF4444] hover:text-[#EF4444] transition-all"
                                            >
                                                ✕ Reject
                                            </button>
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
                                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b font-['Orbitron',sans-serif]">
                                    <tr>
                                        <th className="px-6 py-3">User Name / Role</th>
                                        <th className="px-6 py-3">Recovery Email</th>
                                        <th className="px-6 py-3">Registration Date</th>
                                        <th className="px-6 py-3">Last Login</th>
                                        <th className="px-6 py-3">Invitation Code</th>
                                        <th className="px-6 py-3">Quick Links</th>
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
                                            <td className="px-6 py-4 text-muted-foreground">
                                                {user.lastLogin ? (
                                                    <>
                                                        {new Date(user.lastLogin).toLocaleDateString()}
                                                        <div className="text-xs opacity-70">
                                                            {new Date(user.lastLogin).toLocaleTimeString()}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <span className="text-xs italic opacity-50">Never</span>
                                                )}
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
                                            <td className="px-6 py-4">
                                                {user.quickAccessLinks && user.quickAccessLinks.length > 0 ? (
                                                    <div className="relative group">
                                                        <span className="font-mono text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded cursor-help">
                                                            {user.quickAccessLinks.length} link{user.quickAccessLinks.length !== 1 ? 's' : ''}
                                                        </span>
                                                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64 bg-slate-800 text-white text-xs rounded-lg shadow-xl p-3 border border-white/10">
                                                            <div className="font-semibold mb-2">Quick Access Links:</div>
                                                            <div className="space-y-1 max-h-48 overflow-y-auto">
                                                                {user.quickAccessLinks.map((link) => (
                                                                    <div key={link.id} className="flex items-start gap-2 py-1">
                                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${link.section === 'rc' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                                                                            {link.section.toUpperCase()}
                                                                        </span>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="truncate">{link.name}</div>
                                                                            <div className="text-[10px] text-gray-400 truncate">{link.url}</div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">None</span>
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
                                            <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
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
                    onHistoryChange={() => {
                        // Refresh can be triggered here if needed
                        console.log('Chat history changed for user:', selectedUser.id);
                    }}
                />
            )}
        </div>
    );
}

'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChatSession {
    id: string;
    title: string;
    updatedAt: Date;
    createdAt: Date;
    deletedAt: Date | null;
    deletedBy: string | null;
    user: {
        name: string;
        email: string;
        role: string;
    };
    messages: {
        content: string;
        role: string;
        createdAt: Date;
    }[];
}

export default function AdminChatHistoryPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        } else if (session?.user?.role !== 'chairperson') {
            router.push('/chat');
        } else {
            loadAllSessions();
        }
    }, [status, session, router]);

    const loadAllSessions = async () => {
        try {
            const response = await fetch('/api/chat');
            const data = await response.json();
            setSessions(data.sessions || []);
        } catch (error) {
            console.error('Error loading sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadSessionDetails = async (sessionId: string) => {
        try {
            const response = await fetch(`/api/chat?sessionId=${sessionId}`);
            const data = await response.json();
            // Find the session in our list to get metadata, then add messages
            const sessionMeta = sessions.find(s => s.id === sessionId);
            if (sessionMeta) {
                setSelectedSession({
                    ...sessionMeta,
                    messages: data.messages || []
                });
            }
        } catch (error) {
            console.error('Error loading session details:', error);
        }
    };

    const filteredSessions = sessions.filter(s =>
        s.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Chat History Oversight</h1>
                <Button variant="outline" onClick={() => router.push('/admin')}>
                    Back to Dashboard
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
                {/* Session List */}
                <Card className="md:col-span-1 flex flex-col">
                    <CardHeader>
                        <CardTitle>All Conversations</CardTitle>
                        <Input
                            placeholder="Search user or topic..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto space-y-2">
                        {filteredSessions.map((s) => (
                            <div
                                key={s.id}
                                onClick={() => loadSessionDetails(s.id)}
                                className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${selectedSession?.id === s.id ? 'bg-accent border-primary' : ''
                                    } ${s.deletedAt ? 'opacity-70 bg-red-50 dark:bg-red-900/10' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium truncate flex-1">{s.title || 'Untitled Chat'}</span>
                                    {s.deletedAt && (
                                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded ml-2">
                                            Deleted
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground flex justify-between">
                                    <span>{s.user.name}</span>
                                    <span>{new Date(s.updatedAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Chat View */}
                <Card className="md:col-span-2 flex flex-col">
                    <CardHeader className="border-b">
                        <CardTitle>
                            {selectedSession ? (
                                <div className="flex justify-between items-center">
                                    <span>{selectedSession.title}</span>
                                    <div className="text-sm font-normal text-muted-foreground text-right">
                                        <div>User: {selectedSession.user.name} ({selectedSession.user.email})</div>
                                        {selectedSession.deletedAt && (
                                            <div className="text-red-500">
                                                Deleted on {new Date(selectedSession.deletedAt).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                'Select a conversation'
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                        {selectedSession ? (
                            selectedSession.messages?.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-muted'
                                            }`}
                                    >
                                        <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                                        <p className="text-[10px] opacity-70 mt-1">
                                            {new Date(msg.createdAt).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                Select a chat session from the left to view details
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

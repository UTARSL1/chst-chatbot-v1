'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: any[];
    createdAt: Date;
}

interface ChatSession {
    id: string;
    title: string;
    updatedAt: Date;
}

export default function ChatPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Redirect if not authenticated
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        }
    }, [status, router]);

    // Load chat sessions
    useEffect(() => {
        if (session) {
            loadChatSessions();
        }
    }, [session]);

    const loadChatSessions = async () => {
        try {
            const response = await fetch('/api/chat');
            const data = await response.json();
            setChatSessions(data.sessions || []);
        } catch (error) {
            console.error('Error loading chat sessions:', error);
        }
    };

    const loadMessages = async (sid: string) => {
        try {
            const response = await fetch(`/api/chat?sessionId=${sid}`);
            const data = await response.json();
            setMessages(data.messages || []);
            setSessionId(sid);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');
        setLoading(true);

        // Add user message to UI immediately
        const tempUserMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: userMessage,
            createdAt: new Date(),
        };
        setMessages((prev) => [...prev, tempUserMessage]);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    sessionId,
                }),
            });

            const data = await response.json();

            if (data.success) {
                // Add assistant message
                const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: data.answer,
                    sources: data.sources,
                    createdAt: new Date(),
                };
                setMessages((prev) => [...prev, assistantMessage]);
                setSessionId(data.sessionId);

                // Reload chat sessions
                loadChatSessions();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
        } finally {
            setLoading(false);
        }
    };

    const handleNewChat = () => {
        setMessages([]);
        setSessionId(null);
    };

    const getRoleBadgeClass = (role: string) => {
        switch (role) {
            case 'student': return 'role-badge-student';
            case 'member': return 'role-badge-member';
            case 'chairperson': return 'role-badge-chairperson';
            default: return 'role-badge-public';
        }
    };

    const sampleQuestions = [
        "How to apply for sabbatical leave?",
        "Conference funding for students?",
        "Internal grant deadlines?",
        "Research ethics approval process?",
    ];

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <div className="flex h-screen bg-background">
            {/* Sidebar */}
            {sidebarOpen && (
                <div className="w-64 border-r border-border bg-card p-4 flex flex-col">
                    <Button
                        onClick={handleNewChat}
                        variant="gradient"
                        className="mb-4"
                    >
                        + New Chat
                    </Button>

                    <div className="flex-1 overflow-y-auto space-y-2">
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Chat History</h3>
                        {chatSessions.map((session) => (
                            <button
                                key={session.id}
                                onClick={() => loadMessages(session.id)}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors ${sessionId === session.id ? 'bg-accent' : ''
                                    }`}
                            >
                                <p className="truncate">{session.title}</p>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(session.updatedAt).toLocaleDateString()}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <h1 className="text-xl font-bold">CHST-Chatbot V1</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className={`text-xs px-3 py-1 rounded-full ${getRoleBadgeClass(session.user.role)}`}>
                            {session.user.role === 'member' ? 'Staff' : session.user.role.charAt(0).toUpperCase() + session.user.role.slice(1)}
                        </span>
                        {session.user.role === 'chairperson' && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push('/admin')}
                                className="border-violet-500 text-violet-400 hover:bg-violet-500/10"
                            >
                                Admin Dashboard
                            </Button>
                        )}
                        <span className="text-sm text-muted-foreground">{session.user.name}</span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push('/api/auth/signout')}
                        >
                            Logout
                        </Button>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.length === 0 ? (
                        <div className="max-w-3xl mx-auto text-center space-y-6 mt-12">
                            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-3xl font-bold text-white">C</span>
                            </div>
                            <h2 className="text-2xl font-bold">Welcome to CHST-Chatbot V1</h2>
                            <p className="text-muted-foreground">
                                Ask me anything about CHST research centre policies and forms
                            </p>

                            <div className="grid grid-cols-2 gap-3 mt-8">
                                {sampleQuestions.map((question, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setInput(question)}
                                        className="p-4 text-left border border-border rounded-lg hover:bg-accent transition-colors"
                                    >
                                        <p className="text-sm">{question}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <Card
                                    className={`max-w-[70%] p-4 ${message.role === 'user'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-card'
                                        }`}
                                >
                                    <p className="whitespace-pre-wrap">{message.content}</p>
                                    {message.sources && message.sources.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-border">
                                            <p className="text-xs text-muted-foreground mb-2">Sources:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {message.sources.map((source, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="text-xs px-2 py-1 bg-accent rounded"
                                                    >
                                                        {source.filename}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            </div>
                        ))
                    )}
                    {loading && (
                        <div className="flex justify-start">
                            <Card className="p-4 bg-card">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100" />
                                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200" />
                                </div>
                            </Card>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="border-t border-border bg-card p-6">
                    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-4">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask a question about policies and forms..."
                            className="flex-1"
                            disabled={loading}
                        />
                        <Button
                            type="submit"
                            variant="gradient"
                            disabled={loading || !input.trim()}
                        >
                            Send
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}

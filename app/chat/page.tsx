'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: any[];
    suggestions?: any[];
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

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        }
    }, [status, router]);

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
                const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: data.answer,
                    sources: data.sources,
                    suggestions: data.suggestions,
                    createdAt: new Date(),
                };
                setMessages((prev) => [...prev, assistantMessage]);
                setSessionId(data.sessionId);
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

    const handleDeleteSession = async (sid: string) => {
        if (!confirm('Delete this chat?')) return;

        try {
            const response = await fetch(`/api/chat-sessions/${sid}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setChatSessions(prev => prev.filter(s => s.id !== sid));
                if (sessionId === sid) {
                    setMessages([]);
                    setSessionId(null);
                }
            } else {
                alert('Failed to delete');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to delete');
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
                        {chatSessions.map((s) => (
                            <div key={s.id} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors ${sessionId === s.id ? 'bg-accent' : ''}`}>
                                <button
                                    onClick={() => loadMessages(s.id)}
                                    className="flex-1 text-left min-w-0 pointer-events-auto"
                                >
                                    <p className="truncate">{s.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(s.updatedAt).toLocaleDateString()}
                                    </p>
                                </button>
                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteSession(s.id); }}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xl font-bold px-2 py-1 rounded pointer-events-auto"
                                    title="Delete chat"
                                    type="button"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col">
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
                        <h1 className="text-xl font-bold">CHST-Chatbot V1.7</h1>
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
                            onClick={() => router.push('/auth/signout')}
                        >
                            Logout
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.length === 0 ? (
                        <div className="max-w-3xl mx-auto text-center space-y-6 mt-12">
                            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center gap-1">
                                <span className="text-base font-bold text-white tracking-tight">CHST</span>
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold">Welcome to CHST-Chatbot V1.7</h2>
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
                                    <div className="markdown-content">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                a: ({ node, ...props }) => (
                                                    <a
                                                        {...props}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-400 hover:underline font-medium break-all"
                                                    />
                                                ),
                                                p: ({ node, ...props }) => (
                                                    <p {...props} className="mb-2 last:mb-0 leading-relaxed" />
                                                ),
                                                ul: ({ node, ...props }) => (
                                                    <ul {...props} className="list-disc pl-5 mb-2 space-y-1" />
                                                ),
                                                ol: ({ node, ...props }) => (
                                                    <ol {...props} className="list-decimal pl-5 mb-2 space-y-1" />
                                                ),
                                                li: ({ node, ...props }) => (
                                                    <li {...props} className="pl-1" />
                                                ),
                                                code: ({ node, className, children, ...props }: any) => {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    return !match ? (
                                                        <code {...props} className="bg-slate-800/50 px-1.5 py-0.5 rounded text-sm font-mono text-pink-300">
                                                            {children}
                                                        </code>
                                                    ) : (
                                                        <code {...props} className={className}>
                                                            {children}
                                                        </code>
                                                    );
                                                },
                                                table: ({ node, ...props }) => (
                                                    <div className="overflow-x-auto my-4 rounded-lg border border-slate-700">
                                                        <table {...props} className="w-full text-sm text-left" />
                                                    </div>
                                                ),
                                                thead: ({ node, ...props }) => (
                                                    <thead {...props} className="bg-slate-800/50 text-xs uppercase text-slate-400" />
                                                ),
                                                th: ({ node, ...props }) => (
                                                    <th {...props} className="px-4 py-3 font-medium" />
                                                ),
                                                td: ({ node, ...props }) => (
                                                    <td {...props} className="px-4 py-3 border-t border-slate-700" />
                                                ),
                                            }}
                                        >
                                            {message.content}
                                        </ReactMarkdown>
                                    </div>
                                    {message.sources && message.sources.length > 0 && (() => {
                                        // Get unique documents based on documentId
                                        const uniqueDocs = message.sources.filter((source, index, self) =>
                                            source.documentId && index === self.findIndex(s => s.documentId === source.documentId)
                                        );

                                        // Filter documents to only show those explicitly mentioned in the content
                                        // We check if the filename or original name appears in the message (case-insensitive)
                                        const relevantDocs = uniqueDocs.filter(doc => {
                                            const content = message.content.toLowerCase();
                                            const filename = (doc.filename || '').toLowerCase();
                                            const originalName = (doc.originalName || '').toLowerCase();

                                            // Check for exact filename match or significant part of original name
                                            // Also check for "meeting minute" if it's a meeting minute doc
                                            const isMeetingMinute = doc.category === 'Meeting Minute' || originalName.includes('meeting minute');

                                            if (isMeetingMinute && content.includes('meeting minute')) {
                                                return true;
                                            }

                                            return content.includes(filename) || content.includes(originalName);
                                        });

                                        return relevantDocs.length > 0 && (
                                            <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                                <p className="text-sm font-semibold text-slate-300 mb-2">
                                                    📎 Referenced Documents:
                                                </p>
                                                <div className="space-y-2">
                                                    {relevantDocs.map((doc, idx) => (
                                                        <a
                                                            key={idx}
                                                            href={`/api/documents/download?id=${doc.documentId}`}
                                                            download
                                                            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                                                        >
                                                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                            <span className="flex-1">{doc.originalName || doc.filename}</span>
                                                            {doc.category && (
                                                                <span className="text-xs text-slate-500 px-2 py-0.5 bg-slate-700 rounded">
                                                                    {doc.category}
                                                                </span>
                                                            )}
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Suggestions Section */}
                                    {message.suggestions && message.suggestions.length > 0 && (
                                        <div className="mt-3 p-3 bg-purple-900/20 rounded-lg border border-purple-700">
                                            <p className="text-sm font-semibold text-purple-300 mb-2">
                                                💡 You might also need:
                                            </p>
                                            <div className="space-y-2">
                                                {message.suggestions.map((doc: any, idx: number) => (
                                                    <a
                                                        key={idx}
                                                        href={`/api/documents/download?id=${doc.documentId}`}
                                                        download
                                                        className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 hover:underline transition-colors"
                                                    >
                                                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        <span className="flex-1">{doc.originalName || doc.filename}</span>
                                                        {doc.category && (
                                                            <span className="text-xs text-purple-500 px-2 py-0.5 bg-purple-800/50 rounded">
                                                                {doc.category}
                                                            </span>
                                                        )}
                                                    </a>
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

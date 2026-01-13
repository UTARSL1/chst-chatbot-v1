'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { TermsOfUseModal } from '@/components/TermsOfUseModal';
import { CopyButton } from '@/components/CopyButton';
import UserManualButton from '@/components/UserManualButton';
import { FileText, MessageSquare } from 'lucide-react';
import { useCurrentVersion } from '@/hooks/useCurrentVersion';
import { hasRCAccess } from '@/lib/utils/rc-member-check';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChstLogo } from '@/components/ChstLogo';

interface QuickAccessLink {
    id: string;
    name: string;
    url: string;
    section: string;
    icon?: string;
    roles: string[];
    order: number;
    createdBy: string;
    isSystem: boolean;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: any[];
    suggestions?: any[];
    logs?: string[];
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
    const [termsModalOpen, setTermsModalOpen] = useState(false);
    const [customLinks, setCustomLinks] = useState<QuickAccessLink[]>([]);
    const [showAddLinkModal, setShowAddLinkModal] = useState(false);
    const [editingLink, setEditingLink] = useState<QuickAccessLink | null>(null);
    const [newLink, setNewLink] = useState({ name: '', url: '', section: 'others', roles: [] });

    // Streaming & UI Refs
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const [isAutoScroll, setIsAutoScroll] = useState(true);

    // Auto-scroll logic
    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
            setIsAutoScroll(isNearBottom);
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (isAutoScroll && chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages, isAutoScroll]);

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setLoading(false);
        }
    };

    // Admin notification state
    const [pendingUsersCount, setPendingUsersCount] = useState(0);

    // Feedback State

    // Feedback State
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [feedbackContent, setFeedbackContent] = useState('');
    const [sendingFeedback, setSendingFeedback] = useState(false);

    // Get current version
    const currentVersion = useCurrentVersion(true); // Enable title updates

    const handleSendFeedback = async () => {
        if (!feedbackContent.trim()) return;

        setSendingFeedback(true);
        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: feedbackContent })
            });

            if (res.ok) {
                alert('Message sent successfully!');
                setFeedbackContent('');
                setFeedbackModalOpen(false);
            } else {
                alert('Failed to send message.');
            }
        } catch (error) {
            console.error('Error sending feedback:', error);
            alert('Error sending message');
        } finally {
            setSendingFeedback(false);
        }
    };


    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        }
    }, [status, router]);

    useEffect(() => {
        if (session) {
            loadChatSessions();
            loadCustomLinks();

            // Load admin stats if chairperson
            if (session.user.role === 'chairperson') {
                fetch('/api/admin/stats')
                    .then(res => res.json())
                    .then(data => {
                        if (data.pendingUsers) {
                            setPendingUsersCount(data.pendingUsers);
                        }
                    })
                    .catch(e => console.error('Failed to load stats', e));
            }
        }
    }, [session]);

    const loadCustomLinks = async () => {
        try {
            const response = await fetch('/api/quick-access');
            if (response.ok) {
                const data = await response.json();
                setCustomLinks(data.links || []);
            }
        } catch (error) {
            console.error('Error loading custom links:', error);
        }
    };

    const loadChatSessions = async () => {
        try {
            const response = await fetch('/api/chat');
            const data = await response.json();
            setChatSessions(data.sessions || []);
        } catch (error) {
            console.error('Error loading chat sessions:', error);
        }
    };

    const handleAddLink = async () => {
        if (!newLink.name || !newLink.url) {
            alert('Please provide both name and URL');
            return;
        }

        try {
            const response = await fetch('/api/quick-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newLink.name,
                    url: newLink.url,
                    section: 'others',
                    roles: [],
                    isSystem: false
                })
            });

            if (response.ok) {
                setShowAddLinkModal(false);
                setNewLink({ name: '', url: '', section: 'others', roles: [] });
                loadCustomLinks(); // Reload links
            } else {
                alert('Failed to add link');
            }
        } catch (error) {
            console.error('Error adding link:', error);
            alert('Error adding link');
        }
    };

    const handleEditLink = async () => {
        if (!editingLink || !editingLink.name || !editingLink.url) {
            alert('Please provide both name and URL');
            return;
        }

        try {
            const response = await fetch(`/api/quick-access/${editingLink.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editingLink.name,
                    url: editingLink.url
                })
            });

            if (response.ok) {
                setEditingLink(null);
                loadCustomLinks();
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to update link');
            }
        } catch (error) {
            console.error('Error updating link:', error);
            alert('Error updating link');
        }
    };

    const handleDeleteLink = async (linkId: string) => {
        if (!confirm('Are you sure you want to delete this link?')) {
            return;
        }

        try {
            const response = await fetch(`/api/quick-access/${linkId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                loadCustomLinks();
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to delete link');
            }
        } catch (error) {
            console.error('Error deleting link:', error);
            alert('Error deleting link');
        }
    };

    const handleDownload = async (documentId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            console.log('[Frontend] Requesting download for document:', documentId);
            const response = await fetch(`/api/documents/download?id=${documentId}`);
            const data = await response.json();

            console.log('[Frontend] Download API response:', data);

            if (data.success && data.downloadUrl) {
                // For Supabase public URLs, we need to fetch the blob to force the filename
                console.log('[Frontend] Fetching blob to force filename:', data.filename);

                try {
                    const fileResponse = await fetch(data.downloadUrl);
                    const blob = await fileResponse.blob();
                    const url = window.URL.createObjectURL(blob);

                    const link = document.createElement('a');
                    link.href = url;
                    link.download = data.filename || 'document.pdf'; // Force the original filename
                    document.body.appendChild(link);
                    link.click();

                    // Cleanup
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(link);
                } catch (blobError) {
                    console.error('[Frontend] Blob fetch failed, falling back to direct link:', blobError);
                    // Fallback: Open in new tab (filename might be UUID)
                    window.open(data.downloadUrl, '_blank');
                }
            } else {
                const errorMsg = data.error || 'Failed to download document';
                console.error('[Frontend] Download failed:', data);
                alert(errorMsg);
            }
        } catch (error) {
            console.error('[Frontend] Download error:', error);
            alert('Failed to download document.');
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

        // Create temporary IDs
        const userMsgId = Date.now().toString();
        const assistantMsgId = (Date.now() + 1).toString();

        const tempUserMessage: Message = {
            id: userMsgId,
            role: 'user',
            content: userMessage,
            createdAt: new Date(),
        };

        // Initialize empty assistant message
        const tempAssistantMessage: Message = {
            id: assistantMsgId,
            role: 'assistant',
            content: '', // Start empty
            createdAt: new Date(),
        };

        setMessages((prev) => [...prev, tempUserMessage, tempAssistantMessage]);

        // Setup AbortController
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    sessionId,
                    stream: true, // Request streaming
                }),
                signal: abortController.signal,
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to send message');
            }

            if (!response.body) {
                throw new Error('No response body');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = '';
            let rawBuffer = '';

            // Delimiter for metadata (must match backend)
            const METADATA_DELIMITER = '___METADATA_JSON___';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                rawBuffer += chunk;

                // Check for metadata delimiter
                if (rawBuffer.includes(METADATA_DELIMITER)) {
                    const parts = rawBuffer.split(METADATA_DELIMITER);

                    // The first part is the final chunk of text
                    if (parts[0]) {
                        accumulatedContent = parts[0]; // Note: rawBuffer split might be safer if we accumulate rawBuffer then split. 
                        // Actually rawBuffer is the whole stream so far.
                        // So parts[0] is the whole content.

                        // Update message content immediately
                        setMessages((prev) =>
                            prev.map(m => m.id === assistantMsgId
                                ? { ...m, content: parts[0] }
                                : m
                            )
                        );
                    }

                    // The second part is the JSON metadata
                    if (parts[1]) {
                        try {
                            const metadata = JSON.parse(parts[1]);
                            // Update message with metadata
                            setMessages((prev) =>
                                prev.map(m => m.id === assistantMsgId
                                    ? {
                                        ...m,
                                        content: parts[0], // Ensure content is synced
                                        sources: metadata.sources,
                                        suggestions: metadata.suggestions,
                                        logs: metadata.logs
                                    }
                                    : m
                                )
                            );

                            if (metadata.sessionId) {
                                setSessionId(metadata.sessionId);
                                // Refresh session list to show updated title/time
                                loadChatSessions();
                            }

                            // Stop processing only if we successfully parsed the metadata
                            break;
                        } catch (e) {
                            // JSON might be incomplete, wait for more chunks
                            // console.log('Waiting for complete metadata...');
                        }
                    }
                } else {
                    // Normal text chunk (no delimiter yet)
                    accumulatedContent = rawBuffer;

                    setMessages((prev) =>
                        prev.map(m => m.id === assistantMsgId
                            ? { ...m, content: accumulatedContent }
                            : m
                        )
                    );
                }
            }

        } catch (error: any) {
            console.error('Error sending message:', error);
            // Update error state in UI
            setMessages((prev) =>
                prev.map(m => m.id === assistantMsgId
                    ? { ...m, content: "Sorry, an error occurred while generating the response: " + error.message }
                    : m
                )
            );
        } finally {
            setLoading(false);
        }
    };

    const handleRenameSession = async (sid: string, newTitle: string) => {
        if (!newTitle.trim()) return;

        try {
            const res = await fetch(`/api/chat-sessions/${sid}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle.trim() })
            });

            if (res.ok) {
                setChatSessions((prev) => prev.map((s) => s.id === sid ? { ...s, title: newTitle.trim() } : s));
            } else {
                alert('Failed to rename session');
            }
        } catch (error) {
            console.error('Error renaming session:', error);
            alert('Error renaming session');
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

    const handleClearAllChatHistory = async () => {
        if (!confirm('Clear all chat history? (This will hide all your chat sessions from the sidebar)')) {
            return;
        }

        try {
            const response = await fetch('/api/chat-sessions/clear-all', {
                method: 'POST',
            });

            if (response.ok) {
                // Clear client-side state
                setChatSessions([]);
                setMessages([]);
                setSessionId(null);
            } else {
                alert('Failed to clear chat history');
            }
        } catch (error) {
            console.error('Error clearing chat history:', error);
            alert('Error clearing chat history');
        }
    };

    const getRoleBadgeClass = (role: string) => {
        switch (role) {
            case 'student': return 'role-badge-student';
            case 'member': return 'role-badge-member';
            case 'chairperson': return 'role-badge-chairperson';
            default: return 'role-badge-public';
        }
    };

    const [popularQuestions, setPopularQuestions] = useState<string[]>([]);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);

    useEffect(() => {
        const fetchPopularQuestions = async () => {
            // 1. Try Cache First to show instantly
            if (typeof window !== 'undefined') {
                const cached = sessionStorage.getItem('popular_questions_cache');
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            setPopularQuestions(parsed);
                            setIsLoadingQuestions(false);
                        }
                    } catch (e) {
                        // Ignore cache error
                    }
                }
            }

            try {
                const res = await fetch('/api/popular-questions');
                if (res.ok) {
                    const data = await res.json();
                    if (data.questions && Array.isArray(data.questions)) {
                        const questions = data.questions.map((q: any) => q.question);
                        setPopularQuestions(questions);
                        // Update cache
                        if (typeof window !== 'undefined') {
                            sessionStorage.setItem('popular_questions_cache', JSON.stringify(questions));
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to fetch popular questions');
            } finally {
                setIsLoadingQuestions(false);
            }
        };

        if (session) {
            fetchPopularQuestions();
        }
    }, [session]);

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
                <ChatSidebar
                    sessions={chatSessions}
                    currentSessionId={sessionId}
                    customLinks={customLinks}
                    onNewChat={handleNewChat}
                    onSelectSession={loadMessages}
                    onRenameSession={handleRenameSession}
                    onDeleteSession={handleDeleteSession}
                    onClearAllHistory={handleClearAllChatHistory}
                    onAddLink={() => setShowAddLinkModal(true)}
                    onEditLink={setEditingLink}
                    onDeleteLink={handleDeleteLink}
                    onOpenFeedback={() => setFeedbackModalOpen(true)}
                />
            )}

            <div className="flex-1 flex flex-col">
                {/* Terminal Header */}
                <div className="bg-[#1A1A1F] border-b border-[#1E293B]">
                    {/* Top Status Bar */}
                    <div className="flex items-center justify-between px-6 py-2 border-b border-[#1E293B] font-['JetBrains_Mono',monospace] text-[10px] text-[#94A3B8]">
                        <div className="flex items-center gap-4">
                            <span>SYSTEM: CHST_AI_PORTAL</span>
                            <span className="text-[#10B981]">STATUS: ONLINE</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span suppressHydrationWarning>VERSION: {currentVersion}</span>
                            <span>USER: {session.user.name}</span>
                        </div>
                    </div>

                    {/* Main Header Bar */}
                    <div className="px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="text-[#94A3B8] hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            <ChstLogo className="w-7 h-7 text-white" />
                            <h1 className="text-[#3B82F6] font-['Orbitron',sans-serif] text-sm font-bold tracking-[0.1em] uppercase">
                                CHST AI PORTAL
                            </h1>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className={`text-[10px] px-2.5 py-1 font-['JetBrains_Mono',monospace] uppercase tracking-wide border ${session.user.role === 'chairperson' ? 'border-white text-white' :
                                session.user.role === 'member' ? 'border-[#94A3B8] text-[#94A3B8]' :
                                    session.user.role === 'student' ? 'border-[#64748B] text-[#64748B]' :
                                        'border-[#64748B] text-[#64748B]'
                                }`}>
                                {session.user.role === 'member' ? 'MEMBER' : session.user.role.toUpperCase()}
                            </span>
                            {session.user.role === 'chairperson' && (
                                <div className="relative">
                                    <button
                                        onClick={() => router.push('/admin')}
                                        className="bg-white text-black px-3 py-1 text-[10px] font-['Orbitron',sans-serif] font-bold uppercase tracking-wider hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.6)] hover:scale-[1.05] transition-all duration-200"
                                    >
                                        [ADMIN]
                                    </button>
                                    {pendingUsersCount > 0 && (
                                        <div className="absolute -bottom-2 -right-2 flex items-center justify-center">
                                            <div className="relative w-5 h-5">
                                                <svg
                                                    viewBox="0 0 24 24"
                                                    className="w-full h-full text-amber-500"
                                                    fill="currentColor"
                                                >
                                                    <path d="M12 2L1 21h22L12 2zm0 3.5l8.5 15.5H3.5L12 5.5z" fillOpacity="0.2" />
                                                    <path d="M12 2L1 21h22L12 2z" />
                                                </svg>
                                                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-black pt-1">
                                                    {pendingUsersCount}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            <button
                                onClick={() => router.push('/auth/signout')}
                                className="text-[#94A3B8] hover:text-white text-xs font-['JetBrains_Mono',monospace] transition-colors"
                            >
                                [LOGOUT]
                            </button>
                        </div>
                    </div>
                </div>

                <div
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
                >
                    {messages.length === 0 ? (
                        <div className="max-w-3xl mx-auto text-center space-y-6 mt-12">
                            {/* Terminal Icon */}
                            <div className="mx-auto flex items-center justify-center">
                                <ChstLogo className="w-20 h-20 text-white" />
                            </div>
                            <h2 className="text-white font-['Orbitron',sans-serif] text-2xl font-bold tracking-[0.1em] uppercase">
                                CHST AI PORTAL
                            </h2>
                            <p className="text-[#94A3B8] text-sm font-['JetBrains_Mono',monospace] tracking-wide">
                                INTELLIGENT ASSISTANT // RESEARCH // ADMINISTRATION // KNOWLEDGE DISCOVERY
                            </p>

                            <div className="mt-8">
                                <h3 className="text-[#F8FAFC] font-['Orbitron',sans-serif] text-xs uppercase tracking-[0.1em] font-semibold mb-4">
                                    // QUICK START QUERIES
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {popularQuestions.length > 0 ? (
                                        popularQuestions.map((question, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setInput(question)}
                                                className="p-4 text-left bg-[#1A1A1F] border border-[#334155] hover:border-white transition-colors"
                                            >
                                                <p className="text-xs text-[#94A3B8] font-['JetBrains_Mono',monospace] leading-relaxed">{question}</p>
                                            </button>
                                        ))
                                    ) : !isLoadingQuestions ? (
                                        <div className="col-span-2 text-center text-xs text-[#64748B] font-['JetBrains_Mono',monospace]">
                                            [NO_QUERIES_AVAILABLE]
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ) : (
                        messages.map((message, index) => (
                            <div
                                key={message.id}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <Card
                                    className={`max-w-[70%] p-4 ${message.role === 'user'
                                        ? 'bg-white text-black border-2 border-white'
                                        : 'bg-[#1A1A1F] border border-[#334155]'
                                        }`}
                                >
                                    <div className="markdown-content">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            rehypePlugins={[rehypeRaw]}
                                            urlTransform={(uri) => {
                                                if (uri.startsWith('download:')) return uri;
                                                return uri;
                                            }}
                                            components={{
                                                a: ({ node, href, children, ...props }) => {
                                                    // Handle special download protocol
                                                    if (href?.startsWith('download:')) {
                                                        const rawDocName = href.replace('download:', '').trim();
                                                        console.log('[Download Link] Looking for document:', rawDocName);

                                                        // Helper to normalize strings
                                                        const normalizeForMatch = (str: string) => {
                                                            return str.toLowerCase()
                                                                .replace(/\.[^/.]+$/, "") // Remove extension
                                                                .replace(/[^a-z0-9]/g, "") // Remove non-alphanumeric
                                                                .trim();
                                                        };

                                                        // Extract meaningful keywords (words >= 4 chars)
                                                        const extractKeywords = (str: string) => {
                                                            // First, split camelCase: "SabbaticalLeavePolicy" -> "Sabbatical Leave Policy"
                                                            const withSpaces = str.replace(/([a-z])([A-Z])/g, '$1 $2');

                                                            return withSpaces.toLowerCase()
                                                                .replace(/\.[^/.]+$/, "") // Remove extension
                                                                .split(/[^a-z0-9]+/) // Split on non-alphanumeric
                                                                .filter(word => word.length >= 4); // Only meaningful words
                                                        };

                                                        const targetNormalized = normalizeForMatch(rawDocName);
                                                        const targetKeywords = extractKeywords(rawDocName);

                                                        console.log('[Download Link] Target keywords:', targetKeywords);

                                                        // Find matching document with intelligent scoring
                                                        const doc = message.sources?.find((s: any) => {
                                                            const sourceOriginal = normalizeForMatch(s.originalName || '');
                                                            const sourceFilename = normalizeForMatch(s.filename || '');
                                                            const sourceKeywords = extractKeywords(s.originalName || '');

                                                            // 1. Exact match (best)
                                                            if (sourceOriginal === targetNormalized || sourceFilename === targetNormalized) {
                                                                console.log('[Download Link] ✅ Exact match:', s.originalName);
                                                                return true;
                                                            }

                                                            // 2. Contains match
                                                            if (sourceOriginal.includes(targetNormalized) || targetNormalized.includes(sourceOriginal)) {
                                                                console.log('[Download Link] ✅ Contains match:', s.originalName);
                                                                return true;
                                                            }

                                                            // 3. Keyword-based matching (Relaxed)
                                                            // Instead of requiring 100% of keywords, we check for a high percentage match
                                                            const matchCount = targetKeywords.filter(keyword => sourceOriginal.includes(keyword)).length;
                                                            const matchRatio = targetKeywords.length > 0 ? matchCount / targetKeywords.length : 0;

                                                            // If we have multiple keywords, allow a partial match (e.g., 60% match)
                                                            // This helps when LLM adds extra words like "Form" or "SL01" that aren't in the file name
                                                            if (targetKeywords.length >= 3 && matchRatio >= 0.6) {
                                                                console.log(`[Download Link] ✅ Fuzzy match (${(matchRatio * 100).toFixed(0)}%):`, s.originalName);
                                                                return true;
                                                            }

                                                            // For short queries (1-2 keywords), still strictly require all of them
                                                            if (targetKeywords.length < 3 && matchCount === targetKeywords.length && targetKeywords.length > 0) {
                                                                console.log('[Download Link] ✅ Strict match (short query):', s.originalName);
                                                                return true;
                                                            }

                                                            return false;
                                                        });

                                                        console.log(`[Download Link] Match result for '${targetNormalized}':`, doc ? 'Found' : 'Not Found');

                                                        if (doc && doc.documentId) {
                                                            return (
                                                                <button
                                                                    onClick={(e) => handleDownload(doc.documentId, e)}
                                                                    className="text-blue-400 hover:underline font-medium inline-flex items-center gap-1"
                                                                    title={`Download ${doc.originalName}`}
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                    </svg>
                                                                    {children}
                                                                </button>
                                                            );
                                                        }

                                                        // If no document found, return text with warning
                                                        return (
                                                            <span className="text-gray-400 cursor-not-allowed inline-flex items-center gap-1" title="Document not found">
                                                                {children}
                                                                <span className="text-xs italic">(Document not available)</span>
                                                            </span>
                                                        );
                                                    }

                                                    return (
                                                        <a
                                                            href={href}
                                                            {...props}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-400 hover:underline font-medium break-all"
                                                        >
                                                            {children}
                                                        </a>
                                                    );
                                                },
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
                                                    const codeContent = String(children).replace(/\n$/, '');

                                                    return !match ? (
                                                        <code {...props} className="bg-slate-800/50 px-1.5 py-0.5 rounded text-sm font-mono text-pink-300">
                                                            {children}
                                                        </code>
                                                    ) : (
                                                        <div className="relative group my-4">
                                                            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                                <CopyButton content={codeContent} />
                                                            </div>
                                                            <pre className="bg-slate-900/50 rounded-lg p-4 overflow-x-auto border border-slate-700">
                                                                <code {...props} className={className}>
                                                                    {children}
                                                                </code>
                                                            </pre>
                                                        </div>
                                                    );
                                                },
                                                table: ({ node, children, ...props }) => {
                                                    // Extract table content for copying
                                                    const extractTableText = (node: any): string => {
                                                        if (!node) return '';

                                                        const rows: string[] = [];
                                                        const processNode = (n: any) => {
                                                            if (n.type === 'element') {
                                                                if (n.tagName === 'tr') {
                                                                    const cells: string[] = [];
                                                                    n.children?.forEach((child: any) => {
                                                                        if (child.type === 'element' && (child.tagName === 'th' || child.tagName === 'td')) {
                                                                            const text = child.children?.map((c: any) =>
                                                                                c.type === 'text' ? c.value : ''
                                                                            ).join('').trim() || '';
                                                                            cells.push(text);
                                                                        }
                                                                    });
                                                                    if (cells.length > 0) {
                                                                        rows.push(cells.join('\t'));
                                                                    }
                                                                }
                                                                n.children?.forEach(processNode);
                                                            }
                                                        };
                                                        processNode(node);
                                                        return rows.join('\n');
                                                    };

                                                    const tableText = extractTableText(node);

                                                    return (
                                                        <div className="relative group my-4">
                                                            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                                <CopyButton content={tableText} />
                                                            </div>
                                                            <div className="overflow-x-auto rounded-lg border border-slate-700">
                                                                <table {...props} className="w-full text-sm text-left">
                                                                    {children}
                                                                </table>
                                                            </div>
                                                        </div>
                                                    );
                                                },
                                                thead: ({ node, ...props }) => (
                                                    <thead {...props} className="bg-slate-800/50 text-xs uppercase text-slate-400" />
                                                ),
                                                th: ({ node, ...props }) => (
                                                    <th {...props} className="px-4 py-3 font-medium" />
                                                ),
                                                td: ({ node, ...props }) => (
                                                    <td {...props} className="px-4 py-3 border-t border-slate-700" />
                                                ),
                                                hr: ({ node, ...props }) => (
                                                    <hr {...props} className="my-4 border-t-2 border-slate-600" />
                                                ),
                                                strong: ({ node, ...props }) => (
                                                    <strong {...props} className="font-bold text-white" />
                                                ),
                                                em: ({ node, ...props }) => (
                                                    <em {...props} className="italic" />
                                                ),
                                                span: ({ node, ...props }: any) => {
                                                    // Support inline color styles
                                                    const style = props.style || {};
                                                    return <span {...props} style={style} />;
                                                },
                                            }}
                                        >
                                            {/* Remove backticks around download links for backward compatibility */}
                                            {message.content.replace(/`(\[Download[^\]]+\]\(download:[^\)]+\))`/g, '$1')}
                                        </ReactMarkdown>
                                        {loading && index === messages.length - 1 && (
                                            <span className="inline-block w-2 h-4 ml-1 bg-violet-400 animate-pulse align-middle" />
                                        )}
                                    </div>
                                    {message.sources && message.sources.length > 0 && (() => {
                                        // Get unique documents based on documentId
                                        const uniqueDocs = message.sources.filter((source, index, self) =>
                                            source.documentId && index === self.findIndex(s => s.documentId === source.documentId)
                                        );

                                        // Filter documents intelligently:
                                        // 1. Always show documents with high relevance score (0.9+) - these are from knowledge notes
                                        // 2. For other documents, only show if mentioned in the content
                                        const relevantDocs = uniqueDocs.filter(doc => {
                                            // Knowledge note documents have relevanceScore of 0.9
                                            if (doc.relevanceScore && doc.relevanceScore >= 0.9) {
                                                return true; // Always show knowledge note documents
                                            }

                                            // For regular document chunks, check if mentioned in content
                                            const content = message.content.toLowerCase();
                                            const filename = (doc.filename || '').toLowerCase();
                                            const originalName = (doc.originalName || '').toLowerCase();
                                            const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
                                            return content.includes(filename) || content.includes(originalName) || content.includes(nameWithoutExt);
                                        }).sort((a, b) => {
                                            // Sort: policy documents first, then form documents
                                            const aCategory = a.category || 'policy';
                                            const bCategory = b.category || 'policy';

                                            if (aCategory === bCategory) return 0;
                                            return aCategory === 'policy' ? -1 : 1;
                                        });

                                        return relevantDocs.length > 0 && (
                                            <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                                <p className="text-sm font-semibold text-slate-300 mb-2">
                                                    Referenced Documents:
                                                </p>
                                                <div className="space-y-2">
                                                    {relevantDocs.map((doc, idx) => {
                                                        // Determine styling based on category
                                                        const isForm = doc.category === 'form';

                                                        const linkColor = isForm
                                                            ? 'text-green-400 hover:text-green-300'
                                                            : 'text-blue-400 hover:text-blue-300';

                                                        const badgeStyle = isForm
                                                            ? 'text-xs text-green-300 px-2 py-0.5 bg-green-900/30 border border-green-700/50 rounded'
                                                            : 'text-xs text-blue-300 px-2 py-0.5 bg-blue-900/30 border border-blue-700/50 rounded';

                                                        return (
                                                            <a
                                                                key={idx}
                                                                href="javascript:void(0)"
                                                                onClick={(e) => handleDownload(doc.documentId, e)}
                                                                className={`flex items-center gap-2 text-sm ${linkColor} hover:underline transition-colors cursor-pointer`}
                                                            >
                                                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                                <span className="flex-1">{doc.originalName || doc.filename}</span>
                                                                {doc.category && (
                                                                    <span className={badgeStyle}>
                                                                        {doc.category}
                                                                    </span>
                                                                )}
                                                            </a>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Suggestions Section */}
                                    {message.suggestions && message.suggestions.length > 0 && (() => {
                                        // Sort suggestions: policy first, then form
                                        const sortedSuggestions = [...message.suggestions].sort((a, b) => {
                                            const aCategory = a.category || 'policy';
                                            const bCategory = b.category || 'policy';

                                            if (aCategory === bCategory) return 0;
                                            return aCategory === 'policy' ? -1 : 1;
                                        });

                                        return (
                                            <div className="mt-3 p-3 bg-purple-900/20 rounded-lg border border-purple-700">
                                                <p className="text-sm font-semibold text-purple-300 mb-2">
                                                    You might also need:
                                                </p>
                                                <div className="space-y-2">
                                                    {sortedSuggestions.map((doc: any, idx: number) => {
                                                        // Determine styling based on category
                                                        const isForm = doc.category === 'form';

                                                        const linkColor = isForm
                                                            ? 'text-green-400 hover:text-green-300'
                                                            : 'text-purple-400 hover:text-purple-300';

                                                        const badgeStyle = isForm
                                                            ? 'text-xs text-green-300 px-2 py-0.5 bg-green-900/30 border border-green-700/50 rounded'
                                                            : 'text-xs text-purple-300 px-2 py-0.5 bg-purple-900/30 border border-purple-700/50 rounded';

                                                        return (
                                                            <a
                                                                key={idx}
                                                                href="javascript:void(0)"
                                                                onClick={(e) => handleDownload(doc.documentId, e)}
                                                                className={`flex items-center gap-2 text-sm ${linkColor} hover:underline transition-colors cursor-pointer`}
                                                            >
                                                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                                <span className="flex-1">{doc.originalName || doc.filename}</span>
                                                                {doc.category && (
                                                                    <span className={badgeStyle}>
                                                                        {doc.category}
                                                                    </span>
                                                                )}
                                                            </a>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Debug Logs Section - Only for Chairperson */}
                                    {session?.user?.role === 'chairperson' && message.logs && message.logs.length > 0 && (
                                        <details className="mt-3 group">
                                            <summary className="cursor-pointer text-xs font-mono text-slate-500 hover:text-slate-300 flex items-center gap-1 select-none">
                                                <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                                Debug Logs ({message.logs.length} entries)
                                            </summary>
                                            <div className="mt-2 p-3 bg-black/50 rounded border border-slate-800 font-mono text-[10px] text-slate-400 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                                                {message.logs.join('\n')}
                                            </div>
                                        </details>
                                    )}
                                </Card>
                            </div>
                        ))
                    )}
                    {loading && (
                        <div className="flex justify-center mt-4 mb-2">
                            <Button
                                onClick={handleStop}
                                variant="outline"
                                className="flex items-center gap-2 bg-background/80 backdrop-blur border-[#3B82F6]/30 text-[#3B82F6] hover:text-[#60A5FA] hover:bg-[#3B82F6]/10 hover:border-[#3B82F6]/50 transition-all shadow-sm font-['JetBrains_Mono',monospace] text-xs"
                            >
                                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span className="uppercase tracking-wide">// GENERATING_RESPONSE</span>
                                <span className="text-xs opacity-70 border-l border-[#3B82F6]/30 pl-2 ml-1 uppercase">STOP</span>
                            </Button>
                        </div>
                    )}
                </div>

                <div className="border-t border-[#1E293B] bg-[#1A1A1F] p-6">
                    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-4">
                        <div className="relative flex-1">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                className="w-full bg-[#0B0B10] border border-[#334155] text-white px-4 py-3 font-['JetBrains_Mono',monospace] text-sm focus:outline-none focus:border-white transition-colors placeholder:text-[#64748B]"
                                disabled={loading}
                                placeholder="// ENTER_QUERY"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="bg-white text-black px-6 py-3 font-['Orbitron',sans-serif] font-bold text-xs uppercase tracking-[0.15em] hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.6)] hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:scale-100"
                        >
                            &gt; SEND
                        </button>
                    </form>
                </div>
            </div >

            {/* Floating Terms of Use Button */}
            <button
                onClick={() => setTermsModalOpen(true)}
                className="fixed bottom-6 right-6 p-2 bg-background/50 hover:bg-accent border border-border/50 text-muted-foreground hover:text-foreground text-xs rounded-full shadow-sm transition-all duration-200 flex items-center gap-2 z-40 opacity-70 hover:opacity-100"
                title="View Terms of Use"
            >
                <FileText className="w-3 h-3" />
                <span className="hidden sm:inline">Terms</span>
            </button>

            <TermsOfUseModal
                open={termsModalOpen}
                onOpenChange={setTermsModalOpen}
            />

            {/* User Manual Button - Next to Terms */}
            <UserManualButton />

            {/* Add Quick Access Link Modal */}
            {
                showAddLinkModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                            <h2 className="text-xl font-bold mb-4">Add Quick Access Link</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Link Name</label>
                                    <Input
                                        value={newLink.name}
                                        onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
                                        placeholder="e.g., External Grant Opportunities"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">URL</label>
                                    <Input
                                        value={newLink.url}
                                        onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                                        placeholder="https://example.com"
                                    />
                                </div>
                                <div className="flex gap-2 mt-6">
                                    <Button onClick={handleAddLink} variant="gradient" className="flex-1">
                                        Add Link
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setShowAddLinkModal(false);
                                            setNewLink({ name: '', url: '', section: 'others', roles: [] });
                                        }}
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Edit Quick Access Link Modal */}
            {
                editingLink && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                            <h2 className="text-xl font-bold mb-4">Edit Quick Access Link</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Link Name</label>
                                    <Input
                                        value={editingLink.name}
                                        onChange={(e) => setEditingLink({ ...editingLink, name: e.target.value })}
                                        placeholder="e.g., External Grant Opportunities"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">URL</label>
                                    <Input
                                        value={editingLink.url}
                                        onChange={(e) => setEditingLink({ ...editingLink, url: e.target.value })}
                                        placeholder="https://example.com"
                                    />
                                </div>
                                <div className="flex gap-2 mt-6">
                                    <Button onClick={handleEditLink} variant="gradient" className="flex-1">
                                        Save Changes
                                    </Button>
                                    <Button
                                        onClick={() => setEditingLink(null)}
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Feedback Modal */}
            {feedbackModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-md bg-gray-900 border-white/10">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4 text-white">Message to Admin</h2>
                            <p className="text-sm text-gray-400 mb-4">
                                Have a suggestion, request, or question? Send a direct message to the admin team.
                            </p>
                            <div className="space-y-4">
                                <textarea
                                    className="w-full h-32 bg-gray-950 border border-white/10 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-white placeholder:text-gray-500"
                                    placeholder="Type your message here..."
                                    value={feedbackContent}
                                    onChange={(e) => setFeedbackContent(e.target.value)}
                                />
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setFeedbackModalOpen(false)}
                                        disabled={sendingFeedback}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSendFeedback}
                                        variant="gradient"
                                        disabled={!feedbackContent.trim() || sendingFeedback}
                                    >
                                        {sendingFeedback ? 'Sending...' : 'Send Message'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}

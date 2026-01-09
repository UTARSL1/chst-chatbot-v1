import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
    MessageSquare,
    MoreVertical,
    Trash2,
    Pencil,
    Check,
    X,
    Plus,
    ExternalLink,
    MoreHorizontal,
    Users,
    Linkedin,
    Globe,
    FolderOpen,
    Rocket,
    LayoutGrid,
    MessageCircle,
    ChevronRight,
    ChevronDown,
    Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { hasRCAccess } from '@/lib/utils/rc-member-check';
import { useSession } from 'next-auth/react';

// Interfaces (Copied from page.tsx for now to avoid circular deps or complex exports)
export interface QuickAccessLink {
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

export interface ChatSession {
    id: string;
    title: string;
    updatedAt: Date;
}

interface ChatSidebarProps {
    sessions: ChatSession[];
    currentSessionId: string | null;
    customLinks: QuickAccessLink[];
    onNewChat: () => void;
    onSelectSession: (id: string) => void;
    onRenameSession: (id: string, newTitle: string) => void;
    onDeleteSession: (id: string) => void;
    onClearAllHistory: () => void;
    onAddLink: () => void;
    onEditLink: (link: QuickAccessLink) => void;
    onDeleteLink: (id: string) => void;
    onOpenFeedback: () => void;
}

export function ChatSidebar({
    sessions,
    currentSessionId,
    customLinks,
    onNewChat,
    onSelectSession,
    onRenameSession,
    onDeleteSession,
    onClearAllHistory,
    onAddLink,
    onEditLink,
    onDeleteLink,
    onOpenFeedback
}: ChatSidebarProps) {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<'chats' | 'tools'>('chats');

    // Session Edit State
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [chatHistoryMenuOpen, setChatHistoryMenuOpen] = useState(false);

    // Link Menu State
    const [linkMenuOpenId, setLinkMenuOpenId] = useState<string | null>(null);

    // Collapsible Sections State
    const [rcManagementOpen, setRcManagementOpen] = useState(true);
    const [facultyDashboardOpen, setFacultyDashboardOpen] = useState(true);
    const [quickAccessRcOpen, setQuickAccessRcOpen] = useState(true);
    const [quickAccessOthersOpen, setQuickAccessOthersOpen] = useState(true);

    // Helpers
    const startRename = (s: ChatSession) => {
        setEditingSessionId(s.id);
        setEditTitle(s.title);
        setMenuOpenId(null);
    };

    const handleRenameSubmit = (id: string) => {
        onRenameSession(id, editTitle);
        setEditingSessionId(null);
    };

    if (!session) return null;

    return (
        <div className="w-80 border-r border-border bg-card flex flex-col h-full shadow-xl z-20">
            {/* Header / Tabs */}
            <div className="p-4 border-b border-border bg-gradient-to-b from-card to-background/50">
                <Button
                    onClick={onNewChat}
                    variant="gradient"
                    className="w-full mb-4 shadow-lg shadow-violet-500/20"
                >
                    <Plus className="w-4 h-4 mr-2" /> New Chat
                </Button>

                <div className="relative grid grid-cols-2 p-1 bg-muted/50 rounded-xl border border-border/50">
                    {/* Sliding Background */}
                    <div
                        className={cn(
                            "absolute inset-y-1 rounded-lg bg-background shadow-md shadow-black/10 ring-1 ring-white/10 transition-all duration-300 ease-out",
                            activeTab === 'chats' ? "left-1 right-[50%]" : "left-[50%] right-1"
                        )}
                    />

                    <button
                        onClick={() => setActiveTab('chats')}
                        className={cn(
                            "relative z-10 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200",
                            activeTab === 'chats'
                                ? "text-foreground font-semibold"
                                : "text-muted-foreground hover:text-foreground/80"
                        )}
                    >
                        <MessageCircle className={cn("w-4 h-4 transition-transform duration-300", activeTab === 'chats' ? "text-violet-400 scale-110" : "scale-100")} />
                        Chats
                    </button>
                    <button
                        onClick={() => setActiveTab('tools')}
                        className={cn(
                            "relative z-10 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200",
                            activeTab === 'tools'
                                ? "text-foreground font-semibold"
                                : "text-muted-foreground hover:text-foreground/80"
                        )}
                    >
                        <LayoutGrid className={cn("w-4 h-4 transition-transform duration-300", activeTab === 'tools' ? "text-violet-400 scale-110" : "scale-100")} />
                        Workspace
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeTab === 'chats' ? (
                    /* --- CHATS TAB --- */
                    <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between px-2 py-1">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Chat History</h3>
                            <div className="relative">
                                <button
                                    onClick={() => setChatHistoryMenuOpen(!chatHistoryMenuOpen)}
                                    className="p-1 rounded-md hover:bg-accent text-muted-foreground transition-colors"
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                                {chatHistoryMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-30" onClick={() => setChatHistoryMenuOpen(false)} />
                                        <div className="absolute right-0 top-6 w-48 bg-popover border border-border rounded-lg shadow-lg z-40 py-1 animate-in fade-in zoom-in-95 duration-100">
                                            <button
                                                onClick={() => {
                                                    setChatHistoryMenuOpen(false);
                                                    onClearAllHistory();
                                                }}
                                                className="w-full text-left px-3 py-2.5 text-xs hover:bg-red-500/10 text-red-400 flex items-center gap-2"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Clear all History
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {sessions.length === 0 ? (
                            <div className="text-center py-8 px-4">
                                <p className="text-sm text-muted-foreground mb-2">No active chats.</p>
                                <p className="text-xs text-muted-foreground/60">Start a new conversation to get help with your research.</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {sessions.map((s) => (
                                    <div key={s.id} className={cn(
                                        "group relative flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 border border-transparent",
                                        currentSessionId === s.id
                                            ? "bg-accent/50 border-border/50 shadow-sm"
                                            : "hover:bg-accent/30 hover:border-border/30"
                                    )}>
                                        {editingSessionId === s.id ? (
                                            <div className="flex items-center w-full gap-1">
                                                <input
                                                    value={editTitle}
                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                    className="flex-1 bg-background border border-input rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleRenameSubmit(s.id);
                                                        if (e.key === 'Escape') setEditingSessionId(null);
                                                    }}
                                                />
                                                <button onClick={() => handleRenameSubmit(s.id)} className="p-1 text-green-500 hover:bg-green-500/10 rounded"><Check className="w-3 h-3" /></button>
                                                <button onClick={() => setEditingSessionId(null)} className="p-1 text-red-500 hover:bg-red-500/10 rounded"><X className="w-3 h-3" /></button>
                                            </div>
                                        ) : (
                                            <>
                                                <MessageSquare className={cn(
                                                    "w-4 h-4 flex-shrink-0",
                                                    currentSessionId === s.id ? "text-primary" : "text-muted-foreground group-hover:text-primary/70"
                                                )} />
                                                <button onClick={() => onSelectSession(s.id)} className="flex-1 text-left min-w-0">
                                                    <p className="truncate font-medium">{s.title}</p>
                                                    <p className="text-[10px] text-muted-foreground/70 truncate">
                                                        {new Date(s.updatedAt).toLocaleDateString()}
                                                    </p>
                                                </button>

                                                <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setMenuOpenId(menuOpenId === s.id ? null : s.id);
                                                        }}
                                                        className="p-1 hover:bg-background rounded-md text-muted-foreground"
                                                    >
                                                        <MoreVertical className="w-3.5 h-3.5" />
                                                    </button>
                                                    {menuOpenId === s.id && (
                                                        <>
                                                            <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); }} />
                                                            <div className="absolute right-0 top-6 w-32 bg-popover border border-border rounded-md shadow-lg z-40 py-1">
                                                                <button onClick={(e) => { e.stopPropagation(); startRename(s); }} className="w-full text-left px-3 py-2 text-xs hover:bg-accent flex items-center gap-2">
                                                                    <Pencil className="w-3 h-3" /> Rename
                                                                </button>
                                                                <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); onDeleteSession(s.id); }} className="w-full text-left px-3 py-2 text-xs hover:bg-red-500/10 text-red-500 flex items-center gap-2">
                                                                    <Trash2 className="w-3 h-3" /> Delete
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* --- TOOLS TAB --- */
                    <div className="p-4 space-y-6">

                        {/* 1. RC Management Section */}
                        {hasRCAccess(session.user.email, session.user.role) && (
                            <div className="space-y-1">
                                <button
                                    onClick={() => setRcManagementOpen(!rcManagementOpen)}
                                    className="flex items-center gap-2 w-full text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors group p-1"
                                >
                                    <div className={cn("transition-transform duration-200", rcManagementOpen ? "rotate-90" : "")}>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="flex items-center gap-2">
                                        <Rocket className="w-3.5 h-3.5" /> RC Dashboards
                                    </span>
                                </button>

                                {rcManagementOpen && (
                                    <div className="grid gap-2 pl-2 animate-in slide-in-from-top-2 duration-200">
                                        <a href="/rc-management/publications" className="group">
                                            <Card className="p-3 flex items-center gap-3 bg-gradient-to-br from-emerald-600/10 to-emerald-900/10 border-emerald-500/20 hover:border-emerald-500/40 transition-all hover:shadow-md hover:shadow-emerald-500/5 cursor-pointer">
                                                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 group-hover:scale-110 transition-transform">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-medium text-emerald-100">Publications</h4>
                                                    <p className="text-[10px] text-emerald-200/60">Manage research outputs</p>
                                                </div>
                                            </Card>
                                        </a>
                                        <a href="/rc-management/postgraduate" className="group">
                                            <Card className="p-3 flex items-center gap-3 bg-gradient-to-br from-purple-600/10 to-purple-900/10 border-purple-500/20 hover:border-purple-500/40 transition-all hover:shadow-md hover:shadow-purple-500/5 cursor-pointer">
                                                <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400 group-hover:scale-110 transition-transform">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-medium text-purple-100">Postgraduate</h4>
                                                    <p className="text-[10px] text-purple-200/60">Student resources</p>
                                                </div>
                                            </Card>
                                        </a>
                                        <a href="/rc-management/grants" className="group">
                                            <Card className="p-3 flex items-center gap-3 bg-gradient-to-br from-amber-600/10 to-amber-900/10 border-amber-500/20 hover:border-amber-500/40 transition-all hover:shadow-md hover:shadow-amber-500/5 cursor-pointer">
                                                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 group-hover:scale-110 transition-transform">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-medium text-amber-100">Grant Management</h4>
                                                    <p className="text-[10px] text-amber-200/60">Funding & applications</p>
                                                </div>
                                            </Card>
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 1.5. Faculty Dashboard Section */}
                        <div className="space-y-1">
                            <button
                                onClick={() => setFacultyDashboardOpen(!facultyDashboardOpen)}
                                className="flex items-center gap-2 w-full text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors group p-1"
                            >
                                <div className={cn("transition-transform duration-200", facultyDashboardOpen ? "rotate-90" : "")}>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </div>
                                <span className="flex items-center gap-2">
                                    <Building2 className="w-3.5 h-3.5" /> Faculty Dashboard
                                </span>
                            </button>

                            {facultyDashboardOpen && (
                                <div className="grid gap-2 pl-2 animate-in slide-in-from-top-2 duration-200">
                                    <a href="/scopus-publications" className="group">
                                        <Card className="p-3 flex items-center gap-3 bg-gradient-to-br from-blue-600/10 to-blue-900/10 border-blue-500/20 hover:border-blue-500/40 transition-all hover:shadow-md hover:shadow-blue-500/5 cursor-pointer">
                                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 group-hover:scale-110 transition-transform">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium text-blue-100">Faculty Publications</h4>
                                                <p className="text-[10px] text-blue-200/60">Scopus data analysis</p>
                                            </div>
                                        </Card>
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* 2. Quick Access (RC) Section */}
                        {hasRCAccess(session.user.email, session.user.role) && (
                            <div className="space-y-1">
                                <button
                                    onClick={() => setQuickAccessRcOpen(!quickAccessRcOpen)}
                                    className="flex items-center gap-2 w-full text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors group p-1"
                                >
                                    <div className={cn("transition-transform duration-200", quickAccessRcOpen ? "rotate-90" : "")}>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="flex items-center gap-2">
                                        <ExternalLink className="w-3.5 h-3.5" /> Quick Access (RC)
                                    </span>
                                </button>

                                {quickAccessRcOpen && (
                                    <div className="space-y-2 pl-2 mt-1 animate-in slide-in-from-top-2 duration-200">
                                        {/* RC System Links */}
                                        {customLinks
                                            .filter((link) => link.section === 'rc' && link.roles.includes(session.user.role))
                                            .map(link => {
                                                const isTeams = link.name.includes('Teams Portal');
                                                const isLinkedIn = link.name.includes('LinkedIn');
                                                const isWebsite = link.name.includes('Official Website');
                                                const isResourceHub = link.name.includes('Resource Hub');

                                                return (
                                                    <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="block group">
                                                        <div className="flex items-center gap-3 p-2 rounded-lg bg-card border border-border/50 hover:bg-accent hover:border-border transition-all">
                                                            {isTeams && <Users className="w-4 h-4 text-indigo-400" />}
                                                            {isLinkedIn && <Linkedin className="w-4 h-4 text-blue-400" />}
                                                            {isWebsite && <Globe className="w-4 h-4 text-teal-400" />}
                                                            {isResourceHub && <FolderOpen className="w-4 h-4 text-purple-400" />}
                                                            {!isTeams && !isLinkedIn && !isWebsite && !isResourceHub && <ExternalLink className="w-4 h-4 text-muted-foreground" />}
                                                            <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">{link.name}</span>
                                                        </div>
                                                    </a>
                                                );
                                            })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 3. Quick Access (Others) Section */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between p-1">
                                <button
                                    onClick={() => setQuickAccessOthersOpen(!quickAccessOthersOpen)}
                                    className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors group"
                                >
                                    <div className={cn("transition-transform duration-200", quickAccessOthersOpen ? "rotate-90" : "")}>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="flex items-center gap-2">
                                        <ExternalLink className="w-3.5 h-3.5" /> Quick Access (Others)
                                    </span>
                                </button>

                                <button
                                    onClick={onAddLink}
                                    className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
                                    title="Add Link"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {quickAccessOthersOpen && (
                                <div className="space-y-2 pl-2 mt-1 animate-in slide-in-from-top-2 duration-200">
                                    {customLinks
                                        .filter((link) => link.section === 'others' && (!link.isSystem || link.roles.includes(session.user.role)))
                                        .map(link => (
                                            <div key={link.id} className="group relative flex items-center gap-3 p-2 rounded-lg bg-card border border-border/50 hover:bg-accent hover:border-border transition-all">
                                                <div className="p-1.5 bg-blue-500/10 rounded text-blue-400">
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </div>
                                                <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-foreground/80 group-hover:text-foreground truncate">{link.name}</p>
                                                </a>

                                                {!link.isSystem && (
                                                    <div className="relative">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setLinkMenuOpenId(linkMenuOpenId === link.id ? null : link.id);
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background rounded text-muted-foreground transition-opacity"
                                                        >
                                                            <MoreHorizontal className="w-3.5 h-3.5" />
                                                        </button>

                                                        {linkMenuOpenId === link.id && (
                                                            <>
                                                                <div className="fixed inset-0 z-30" onClick={() => setLinkMenuOpenId(null)} />
                                                                <div className="absolute right-0 top-6 w-32 bg-popover border border-border rounded-md shadow-lg z-40 py-1">
                                                                    <button onClick={() => { setLinkMenuOpenId(null); onEditLink(link); }} className="w-full text-left px-3 py-2 text-xs hover:bg-accent flex items-center gap-2">
                                                                        <Pencil className="w-3 h-3" /> Edit
                                                                    </button>
                                                                    <button onClick={() => { setLinkMenuOpenId(null); onDeleteLink(link.id); }} className="w-full text-left px-3 py-2 text-xs hover:bg-red-500/10 text-red-500 flex items-center gap-2">
                                                                        <Trash2 className="w-3 h-3" /> Delete
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>

            {/* Footer / User Profile */}
            <div className="p-4 border-t border-border bg-card mt-auto">
                <Button
                    onClick={onOpenFeedback}
                    variant="outline"
                    className="w-full justify-start gap-2 border-violet-500/20 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
                >
                    <MessageSquare className="w-4 h-4" /> Message to Admin
                </Button>
            </div>
        </div>
    );
}

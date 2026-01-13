'use client';

import { useState } from 'react';
import { BookOpen, Download, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';

export default function UserManualButton() {
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [manualContent, setManualContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);

    const userRole = session?.user?.role;
    const isAuthenticated = !!session;

    const handleOpenManual = async (role?: string) => {
        const roleToFetch = role || userRole || 'public';
        setSelectedRole(roleToFetch);
        setIsOpen(true);
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/manual?role=${roleToFetch}`);

            if (!response.ok) {
                throw new Error('Failed to load manual');
            }

            const data = await response.json();
            setManualContent(data.content);
        } catch (err) {
            setError('Failed to load user manual. Please try again.');
            console.error('Error loading manual:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        const roleToDownload = selectedRole || userRole || 'public';
        window.open(`/api/manual/download?role=${roleToDownload}`, '_blank');
    };

    const getRoleDisplayName = (role: string) => {
        const roleNames: Record<string, string> = {
            public: 'Public User',
            student: 'Student',
            member: 'Member',
            chairperson: 'Admin/Chairperson',
        };
        return roleNames[role] || role;
    };

    const RoleSelector = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-[#0B0B10] rounded-lg shadow-xl w-full max-w-md p-6 border border-[#334155]">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-[#3B82F6] font-['Orbitron',sans-serif] uppercase tracking-[0.1em]">SELECT ROLE</h2>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-[#94A3B8] hover:text-white rounded-lg hover:bg-[#1A1A1F] transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-sm text-[#94A3B8] mb-6 font-['JetBrains_Mono',monospace]">
                    // SELECT_USER_MANUAL_TO_VIEW
                </p>
                <div className="space-y-3">
                    {['public', 'student', 'member', 'chairperson'].map((role) => (
                        <button
                            key={role}
                            onClick={() => handleOpenManual(role)}
                            className="w-full flex items-center justify-between p-4 text-left border-2 border-[#334155] rounded-lg hover:border-white hover:bg-[#1A1A1F] transition-all group"
                        >
                            <div>
                                <div className="font-semibold text-white group-hover:text-[#3B82F6] font-['Orbitron',sans-serif] uppercase tracking-wide text-sm">
                                    {getRoleDisplayName(role)}
                                </div>
                                <div className="text-xs text-[#94A3B8] font-['JetBrains_Mono',monospace] mt-1">
                                    {role === 'public' && '// BASIC_FEATURES_AND_GETTING_STARTED'}
                                    {role === 'student' && '// ALL_TOOLS_AND_ACADEMIC_SUPPORT'}
                                    {role === 'member' && '// RESEARCH_TOOLS_AND_JCR_METRICS'}
                                    {role === 'chairperson' && '// ADMIN_DASHBOARD_AND_TECHNICAL_DOCS'}
                                </div>
                            </div>
                            <BookOpen className="w-5 h-5 text-[#64748B] group-hover:text-[#3B82F6]" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <>
            <button
                onClick={() => {
                    if (isAuthenticated) {
                        handleOpenManual();
                    } else {
                        setIsOpen(true);
                    }
                }}
                className="fixed bottom-6 right-24 p-2 bg-background/50 hover:bg-accent border border-border/50 text-muted-foreground hover:text-foreground text-xs rounded-full shadow-sm transition-all duration-200 flex items-center gap-2 z-40 opacity-70 hover:opacity-100"
                title="View User Manual"
            >
                <BookOpen className="w-3 h-3" />
                <span className="hidden sm:inline">Manual</span>
            </button>

            {isOpen && !isAuthenticated && !selectedRole && <RoleSelector />}

            {isOpen && (isAuthenticated || selectedRole) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-[#0B0B10] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-[#334155]">
                        <div className="flex items-center justify-between p-6 border-b border-[#334155]">
                            <div>
                                <h2 className="text-xl font-bold text-[#3B82F6] font-['Orbitron',sans-serif] uppercase tracking-[0.1em]">USER MANUAL</h2>
                                <p className="text-sm text-[#94A3B8] mt-1 font-['JetBrains_Mono',monospace]">
                                    // {getRoleDisplayName(selectedRole || userRole || 'public').toUpperCase().replace(/ /g, '_')}_GUIDE
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg transition-all shadow-md font-['Orbitron',sans-serif] uppercase tracking-wide"
                                >
                                    <Download className="w-4 h-4" />
                                    DOWNLOAD
                                </button>
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setSelectedRole(null);
                                    }}
                                    className="p-2 text-[#94A3B8] hover:text-white rounded-lg hover:bg-[#1A1A1F] transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-[#0B0B10]">
                            {isLoading && (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3B82F6]"></div>
                                </div>
                            )}

                            {error && (
                                <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 font-['JetBrains_Mono',monospace]">
                                    {error}
                                </div>
                            )}

                            {!isLoading && !error && manualContent && (
                                <div className="prose prose-invert max-w-none text-[#94A3B8]">
                                    <ReactMarkdown
                                        components={{
                                            h1: ({ children }) => {
                                                const text = String(children);
                                                const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                                                return <h1 id={id} className="text-2xl font-bold text-[#3B82F6] font-['Orbitron',sans-serif] uppercase tracking-[0.1em] border-b-2 border-[#334155] pb-2 mt-8 mb-4">{children}</h1>;
                                            },
                                            h2: ({ children }) => {
                                                const text = String(children);
                                                const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                                                return <h2 id={id} className="text-xl font-bold text-white font-['Orbitron',sans-serif] uppercase tracking-wide border-b border-[#334155] pb-2 mt-6 mb-3">{children}</h2>;
                                            },
                                            h3: ({ children }) => {
                                                const text = String(children);
                                                const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                                                return <h3 id={id} className="text-xl font-semibold text-purple-200 mt-5 mb-2">{children}</h3>;
                                            },
                                            h4: ({ children }) => {
                                                const text = String(children);
                                                const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                                                return <h4 id={id} className="text-lg font-semibold text-purple-100 mt-4 mb-2">{children}</h4>;
                                            },
                                            p: ({ children }) => <p className="text-gray-300 mb-4 leading-relaxed">{children}</p>,
                                            ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-2 text-gray-300">{children}</ul>,
                                            ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-2 text-gray-300">{children}</ol>,
                                            li: ({ children }) => <li className="text-gray-300">{children}</li>,
                                            strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                                            code: ({ inline, children, ...props }: any) =>
                                                inline ? (
                                                    <code className="bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-pink-400" {...props}>{children}</code>
                                                ) : (
                                                    <code className="block bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono text-gray-200 border border-gray-700" {...props}>{children}</code>
                                                ),
                                            blockquote: ({ children }) => <blockquote className="border-l-4 border-purple-500 pl-4 italic text-gray-400 my-4 bg-gray-800/50 py-2">{children}</blockquote>,
                                            table: ({ children }) => (
                                                <div className="overflow-x-auto my-4">
                                                    <table className="min-w-full divide-y divide-gray-700 border border-gray-700">{children}</table>
                                                </div>
                                            ),
                                            thead: ({ children }) => <thead className="bg-gray-800">{children}</thead>,
                                            th: ({ children }) => <th className="px-4 py-2 bg-purple-900 text-white text-left font-semibold">{children}</th>,
                                            td: ({ children }) => <td className="px-4 py-2 border-t border-gray-700 text-gray-300">{children}</td>,
                                            a: ({ children, href }) => {
                                                // Handle internal hash links (Table of Contents)
                                                if (href?.startsWith('#')) {
                                                    return (
                                                        <a
                                                            href={href}
                                                            className="text-purple-400 hover:text-purple-300 underline cursor-pointer"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                const targetId = href.substring(1);
                                                                const element = document.getElementById(targetId);
                                                                if (element) {
                                                                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                                }
                                                            }}
                                                        >
                                                            {children}
                                                        </a>
                                                    );
                                                }
                                                // External links open in new tab
                                                return (
                                                    <a
                                                        href={href}
                                                        className="text-purple-400 hover:text-purple-300 underline"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        {children}
                                                    </a>
                                                );
                                            },
                                            hr: () => <hr className="my-6 border-gray-700" />,
                                        }}
                                    >
                                        {manualContent}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between p-6 border-t border-[#334155] bg-[#1A1A1F]">
                            <p className="text-sm text-[#94A3B8] font-['JetBrains_Mono',monospace]">
                                // LAST_UPDATED: DECEMBER_2025
                            </p>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    setSelectedRole(null);
                                }}
                                className="px-4 py-2 text-sm font-medium text-white bg-[#1A1A1F] border border-[#334155] rounded-lg hover:bg-[#0B0B10] transition-colors font-['Orbitron',sans-serif] uppercase tracking-wide"
                            >
                                CLOSE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

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

    // Determine user's role or show role selector
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

    // Role selection modal for unauthenticated users
    const RoleSelector = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-white">Select Your Role</h2>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-sm text-gray-300 mb-6">
                    Choose which user manual you'd like to view:
                </p>
                <div className="space-y-3">
                    {['public', 'student', 'member', 'chairperson'].map((role) => (
                        <button
                            key={role}
                            onClick={() => handleOpenManual(role)}
                            className="w-full flex items-center justify-between p-4 text-left border-2 border-gray-700 rounded-lg hover:border-blue-500 hover:bg-gray-800 transition-all group"
                        >
                            <div>
                                <div className="font-semibold text-white group-hover:text-blue-400">
                                    {getRoleDisplayName(role)}
                                </div>
                                <div className="text-sm text-gray-400">
                                    {role === 'public' && 'Basic features and getting started'}
                                    {role === 'student' && 'All tools and academic support'}
                                    {role === 'member' && 'Research tools and JCR metrics'}
                                    {role === 'chairperson' && 'Admin dashboard and technical docs'}
                                </div>
                            </div>
                            <BookOpen className="w-5 h-5 text-gray-500 group-hover:text-blue-400" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Button */}
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

            {/* Role Selector for unauthenticated users */}
            {isOpen && !isAuthenticated && !selectedRole && <RoleSelector />}

            {/* Manual Viewer Modal */}
            {isOpen && (isAuthenticated || selectedRole) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-700">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-700">
                            <div>
                                <h2 className="text-2xl font-bold text-white">User Manual</h2>
                                <p className="text-sm text-gray-400 mt-1">
                                    {getRoleDisplayName(selectedRole || userRole || 'public')} Guide
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    Download
                                </button>
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setSelectedRole(null);
                                    }}
                                    className="p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-900">
                            {isLoading && (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                </div>
                            )}

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                                    {error}
                                </div>
                            )}

                            {!isLoading && !error && manualContent && (
                                <div className="prose prose-blue max-w-none">
                                    <ReactMarkdown
                                        components={{
                                            h1: ({ children }) => (
                                                { manualContent }
                                    </ReactMarkdown>
                                </div>
                            )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between p-6 border-t border-gray-700 bg-gray-800">
                        <p className="text-sm text-gray-400">
                            Last updated: December 2025
                        </p>
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                setSelectedRole(null);
                            }}
                            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
                </div >
            )
}
        </>
    );
}

'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

interface Message {
    id: string;
    role: string;
    content: string;
    sources?: any[];
    createdAt: Date;
}

interface ChatSession {
    id: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    messages: Message[];
}

interface ChatHistoryModalProps {
    userId: string;
    userName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ChatHistoryModal({ userId, userName, open, onOpenChange }: ChatHistoryModalProps) {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && userId) {
            fetchChatHistory();
        }
    }, [open, userId]);

    const fetchChatHistory = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/users/${userId}/chat-history`);
            const data = await response.json();
            setSessions(data.sessions || []);
        } catch (error) {
            console.error('Error fetching chat history:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Chat History - {userName}</DialogTitle>
                    <DialogDescription>
                        View all conversations and messages from this user
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="text-muted-foreground">Loading chat history...</div>
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="text-muted-foreground">No conversations yet</div>
                    </div>
                ) : (
                    <Accordion type="single" collapsible className="w-full">
                        {sessions.map((session) => (
                            <AccordionItem key={session.id} value={session.id}>
                                <AccordionTrigger>
                                    <div className="flex items-center gap-3 text-left">
                                        <div className="flex-1">
                                            <div className="font-medium">{session.title}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {new Date(session.createdAt).toLocaleString()} • {session.messages.length} messages
                                            </div>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-4 pl-4">
                                        {session.messages.map((message) => (
                                            <div
                                                key={message.id}
                                                className={`p-3 rounded-lg ${message.role === 'user'
                                                        ? 'bg-blue-600/10 border border-blue-600/20'
                                                        : 'bg-gray-800/50 border border-gray-700'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge variant={message.role === 'user' ? 'default' : 'outline'}>
                                                        {message.role === 'user' ? 'User' : 'AI'}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(message.createdAt).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                                {message.sources && message.sources.length > 0 && (
                                                    <div className="mt-2 pt-2 border-t border-border">
                                                        <p className="text-xs text-muted-foreground mb-1">Sources:</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {message.sources.map((source: any, idx: number) => (
                                                                <Badge key={idx} variant="secondary" className="text-xs">
                                                                    {source.filename || source.title || `Source ${idx + 1}`}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </DialogContent>
        </Dialog>
    );
}

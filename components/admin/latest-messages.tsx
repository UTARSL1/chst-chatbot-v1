
'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FeedbackMessage {
    id: string;
    content: string;
    createdAt: Date;
    user: {
        name: string;
        role: string;
    };
}

export function LatestMessagesList({ initialMessages }: { initialMessages: FeedbackMessage[] }) {
    const [messages, setMessages] = useState(initialMessages);
    const router = useRouter();

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this message?')) return;

        try {
            const res = await fetch(`/api/admin/feedback/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setMessages(messages.filter(m => m.id !== id));
                router.refresh();
            } else {
                alert('Failed to delete message');
            }
        } catch (error) {
            console.error(error);
            alert('Error deleting message');
        }
    };

    if (messages.length === 0) {
        return <div className="text-gray-400 text-sm">No messages received yet.</div>;
    }

    return (
        <div className="space-y-4">
            {messages.map((msg) => (
                <div key={msg.id} className="flex flex-col gap-1 border-b border-white/5 pb-3 last:border-0 last:pb-0 relative group">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">{msg.user.name || 'Unknown User'}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{new Date(msg.createdAt).toLocaleDateString()}</span>
                            <button
                                onClick={() => handleDelete(msg.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                                title="Delete message"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <p className="text-sm text-gray-300 line-clamp-2 pr-8">{msg.content}</p>
                    <span className="text-xs text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded w-fit capitalize">
                        {msg.user.role}
                    </span>
                </div>
            ))}
        </div>
    );
}

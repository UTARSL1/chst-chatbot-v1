import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ChatHistoryModal } from '@/components/admin/chat-history-modal';

// Mock fetch
global.fetch = jest.fn();

describe('ChatHistoryModal', () => {
    const mockUserId = 'user-123';
    const mockUserName = 'John Doe';
    const mockOnOpenChange = jest.fn();

    const mockChatSessions = [
        {
            id: 'session-1',
            title: 'How to apply for sabbatical leave?',
            createdAt: new Date('2025-11-29T10:00:00Z'),
            updatedAt: new Date('2025-11-29T10:05:00Z'),
            messages: [
                {
                    id: 'msg-1',
                    role: 'user',
                    content: 'How do I apply for sabbatical leave?',
                    createdAt: new Date('2025-11-29T10:00:00Z'),
                },
                {
                    id: 'msg-2',
                    role: 'assistant',
                    content: 'To apply for sabbatical leave, you need to submit Form SL-01...',
                    sources: [
                        { filename: 'sabbatical-policy.pdf', title: 'Sabbatical Leave Policy' },
                    ],
                    createdAt: new Date('2025-11-29T10:00:05Z'),
                },
            ],
        },
        {
            id: 'session-2',
            title: 'Research grant deadlines',
            createdAt: new Date('2025-11-28T14:00:00Z'),
            updatedAt: new Date('2025-11-28T14:02:00Z'),
            messages: [
                {
                    id: 'msg-3',
                    role: 'user',
                    content: 'What are the internal grant deadlines?',
                    createdAt: new Date('2025-11-28T14:00:00Z'),
                },
                {
                    id: 'msg-4',
                    role: 'assistant',
                    content: 'The internal grant deadlines are...',
                    createdAt: new Date('2025-11-28T14:00:03Z'),
                },
            ],
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ sessions: mockChatSessions }),
        });
    });

    describe('Modal Display', () => {
        it('should not render when open is false', () => {
            render(
                <ChatHistoryModal
                    userId={mockUserId}
                    userName={mockUserName}
                    open={false}
                    onOpenChange={mockOnOpenChange}
                />
            );

            expect(screen.queryByText(`Chat History - ${mockUserName}`)).not.toBeInTheDocument();
        });

        it('should render modal when open is true', () => {
            render(
                <ChatHistoryModal
                    userId={mockUserId}
                    userName={mockUserName}
                    open={true}
                    onOpenChange={mockOnOpenChange}
                />
            );

            expect(screen.getByText(`Chat History - ${mockUserName}`)).toBeInTheDocument();
            expect(screen.getByText('View all conversations and messages from this user')).toBeInTheDocument();
        });
    });

    describe('Data Fetching', () => {
        it('should fetch chat history when modal opens', async () => {
            render(
                <ChatHistoryModal
                    userId={mockUserId}
                    userName={mockUserName}
                    open={true}
                    onOpenChange={mockOnOpenChange}
                />
            );

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(`/api/admin/users/${mockUserId}/chat-history`);
            });
        });

        it('should display loading state while fetching', () => {
            (global.fetch as jest.Mock).mockImplementation(
                () => new Promise((resolve) => setTimeout(resolve, 1000))
            );

            render(
                <ChatHistoryModal
                    userId={mockUserId}
                    userName={mockUserName}
                    open={true}
                    onOpenChange={mockOnOpenChange}
                />
            );

            expect(screen.getByText('Loading chat history...')).toBeInTheDocument();
        });

        it('should display sessions after successful fetch', async () => {
            render(
                <ChatHistoryModal
                    userId={mockUserId}
                    userName={mockUserName}
                    open={true}
                    onOpenChange={mockOnOpenChange}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('How to apply for sabbatical leave?')).toBeInTheDocument();
                expect(screen.getByText('Research grant deadlines')).toBeInTheDocument();
            });
        });

        it('should display message count for each session', async () => {
            render(
                <ChatHistoryModal
                    userId={mockUserId}
                    userName={mockUserName}
                    open={true}
                    onOpenChange={mockOnOpenChange}
                />
            );

            await waitFor(() => {
                expect(screen.getByText(/2 messages/)).toBeInTheDocument();
            });
        });
    });

    describe('Empty State', () => {
        it('should display empty state when no sessions exist', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ sessions: [] }),
            });

            render(
                <ChatHistoryModal
                    userId={mockUserId}
                    userName={mockUserName}
                    open={true}
                    onOpenChange={mockOnOpenChange}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('No conversations yet')).toBeInTheDocument();
            });
        });
    });

    describe('Session Expansion', () => {
        it('should expand session and show messages when clicked', async () => {
            render(
                <ChatHistoryModal
                    userId={mockUserId}
                    userName={mockUserName}
                    open={true}
                    onOpenChange={mockOnOpenChange}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('How to apply for sabbatical leave?')).toBeInTheDocument();
            });

            // Click to expand session
            const sessionTrigger = screen.getByText('How to apply for sabbatical leave?');
            fireEvent.click(sessionTrigger);

            await waitFor(() => {
                expect(screen.getByText('How do I apply for sabbatical leave?')).toBeInTheDocument();
                expect(screen.getByText(/To apply for sabbatical leave/)).toBeInTheDocument();
            });
        });

        it('should display role badges for messages', async () => {
            render(
                <ChatHistoryModal
                    userId={mockUserId}
                    userName={mockUserName}
                    open={true}
                    onOpenChange={mockOnOpenChange}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('How to apply for sabbatical leave?')).toBeInTheDocument();
            });

            const sessionTrigger = screen.getByText('How to apply for sabbatical leave?');
            fireEvent.click(sessionTrigger);

            await waitFor(() => {
                expect(screen.getByText('User')).toBeInTheDocument();
                expect(screen.getByText('AI')).toBeInTheDocument();
            });
        });

        it('should display document sources for AI responses', async () => {
            render(
                <ChatHistoryModal
                    userId={mockUserId}
                    userName={mockUserName}
                    open={true}
                    onOpenChange={mockOnOpenChange}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('How to apply for sabbatical leave?')).toBeInTheDocument();
            });

            const sessionTrigger = screen.getByText('How to apply for sabbatical leave?');
            fireEvent.click(sessionTrigger);

            await waitFor(() => {
                expect(screen.getByText('Sources:')).toBeInTheDocument();
                expect(screen.getByText('sabbatical-policy.pdf')).toBeInTheDocument();
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle fetch errors gracefully', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

            render(
                <ChatHistoryModal
                    userId={mockUserId}
                    userName={mockUserName}
                    open={true}
                    onOpenChange={mockOnOpenChange}
                />
            );

            await waitFor(() => {
                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    'Error fetching chat history:',
                    expect.any(Error)
                );
            });

            consoleErrorSpy.mockRestore();
        });
    });

    describe('Modal Interactions', () => {
        it('should call onOpenChange when modal is closed', async () => {
            render(
                <ChatHistoryModal
                    userId={mockUserId}
                    userName={mockUserName}
                    open={true}
                    onOpenChange={mockOnOpenChange}
                />
            );

            // Find and click close button
            const closeButton = screen.getByRole('button', { name: /close/i });
            fireEvent.click(closeButton);

            expect(mockOnOpenChange).toHaveBeenCalledWith(false);
        });
    });

    describe('Timestamp Formatting', () => {
        it('should display formatted timestamps for sessions', async () => {
            render(
                <ChatHistoryModal
                    userId={mockUserId}
                    userName={mockUserName}
                    open={true}
                    onOpenChange={mockOnOpenChange}
                />
            );

            await waitFor(() => {
                // Check that date is formatted (exact format depends on locale)
                const dateElements = screen.getAllByText(/2025|11|29|28/);
                expect(dateElements.length).toBeGreaterThan(0);
            });
        });
    });
});

import { GET } from '@/app/api/admin/users/[id]/chat-history/route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/db', () => ({
    prisma: {
        chatSession: {
            findMany: jest.fn(),
        },
    },
}));

describe('Chat History API Route', () => {
    const mockSession = {
        user: {
            id: 'chairperson-id',
            role: 'chairperson',
            name: 'Admin User',
            email: 'admin@test.com',
        },
    };

    const mockChatSessions = [
        {
            id: 'session-1',
            userId: 'user-123',
            title: 'Test Session',
            createdAt: new Date('2025-11-29T10:00:00Z'),
            updatedAt: new Date('2025-11-29T10:05:00Z'),
            messages: [
                {
                    id: 'msg-1',
                    role: 'user',
                    content: 'Test question',
                    createdAt: new Date('2025-11-29T10:00:00Z'),
                },
                {
                    id: 'msg-2',
                    role: 'assistant',
                    content: 'Test answer',
                    sources: [],
                    createdAt: new Date('2025-11-29T10:00:05Z'),
                },
            ],
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Authentication', () => {
        it('should return 401 if user is not authenticated', async () => {
            (getServerSession as jest.Mock).mockResolvedValue(null);

            const request = new Request('http://localhost:3000/api/admin/users/user-123/chat-history');
            const context = { params: Promise.resolve({ id: 'user-123' }) };

            const response = await GET(request, context);

            expect(response.status).toBe(401);
            expect(await response.text()).toBe('Unauthorized');
        });

        it('should return 401 if user is not a chairperson', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { ...mockSession.user, role: 'student' },
            });

            const request = new Request('http://localhost:3000/api/admin/users/user-123/chat-history');
            const context = { params: Promise.resolve({ id: 'user-123' }) };

            const response = await GET(request, context);

            expect(response.status).toBe(401);
            expect(await response.text()).toBe('Unauthorized');
        });

        it('should allow access for chairperson role', async () => {
            (getServerSession as jest.Mock).mockResolvedValue(mockSession);
            (prisma.chatSession.findMany as jest.Mock).mockResolvedValue(mockChatSessions);

            const request = new Request('http://localhost:3000/api/admin/users/user-123/chat-history');
            const context = { params: Promise.resolve({ id: 'user-123' }) };

            const response = await GET(request, context);

            expect(response.status).toBe(200);
        });
    });

    describe('Data Retrieval', () => {
        beforeEach(() => {
            (getServerSession as jest.Mock).mockResolvedValue(mockSession);
        });

        it('should fetch chat sessions for the specified user', async () => {
            (prisma.chatSession.findMany as jest.Mock).mockResolvedValue(mockChatSessions);

            const request = new Request('http://localhost:3000/api/admin/users/user-123/chat-history');
            const context = { params: Promise.resolve({ id: 'user-123' }) };

            await GET(request, context);

            expect(prisma.chatSession.findMany).toHaveBeenCalledWith({
                where: { userId: 'user-123' },
                include: {
                    messages: {
                        orderBy: { createdAt: 'asc' },
                    },
                },
                orderBy: { updatedAt: 'desc' },
            });
        });

        it('should return sessions in correct format', async () => {
            (prisma.chatSession.findMany as jest.Mock).mockResolvedValue(mockChatSessions);

            const request = new Request('http://localhost:3000/api/admin/users/user-123/chat-history');
            const context = { params: Promise.resolve({ id: 'user-123' }) };

            const response = await GET(request, context);
            const data = await response.json();

            expect(data).toEqual({ sessions: mockChatSessions });
        });

        it('should return empty array when user has no sessions', async () => {
            (prisma.chatSession.findMany as jest.Mock).mockResolvedValue([]);

            const request = new Request('http://localhost:3000/api/admin/users/user-123/chat-history');
            const context = { params: Promise.resolve({ id: 'user-123' }) };

            const response = await GET(request, context);
            const data = await response.json();

            expect(data).toEqual({ sessions: [] });
        });

        it('should order sessions by updatedAt descending', async () => {
            (prisma.chatSession.findMany as jest.Mock).mockResolvedValue(mockChatSessions);

            const request = new Request('http://localhost:3000/api/admin/users/user-123/chat-history');
            const context = { params: Promise.resolve({ id: 'user-123' }) };

            await GET(request, context);

            expect(prisma.chatSession.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderBy: { updatedAt: 'desc' },
                })
            );
        });

        it('should include messages ordered by createdAt ascending', async () => {
            (prisma.chatSession.findMany as jest.Mock).mockResolvedValue(mockChatSessions);

            const request = new Request('http://localhost:3000/api/admin/users/user-123/chat-history');
            const context = { params: Promise.resolve({ id: 'user-123' }) };

            await GET(request, context);

            expect(prisma.chatSession.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    include: {
                        messages: {
                            orderBy: { createdAt: 'asc' },
                        },
                    },
                })
            );
        });
    });

    describe('Error Handling', () => {
        beforeEach(() => {
            (getServerSession as jest.Mock).mockResolvedValue(mockSession);
        });

        it('should return 500 on database error', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            (prisma.chatSession.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

            const request = new Request('http://localhost:3000/api/admin/users/user-123/chat-history');
            const context = { params: Promise.resolve({ id: 'user-123' }) };

            const response = await GET(request, context);

            expect(response.status).toBe(500);
            expect(await response.text()).toBe('Internal Server Error');
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error fetching chat history:',
                expect.any(Error)
            );

            consoleErrorSpy.mockRestore();
        });

        it('should log errors to console', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            const testError = new Error('Test error');
            (prisma.chatSession.findMany as jest.Mock).mockRejectedValue(testError);

            const request = new Request('http://localhost:3000/api/admin/users/user-123/chat-history');
            const context = { params: Promise.resolve({ id: 'user-123' }) };

            await GET(request, context);

            expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching chat history:', testError);

            consoleErrorSpy.mockRestore();
        });
    });

    describe('Parameter Handling', () => {
        beforeEach(() => {
            (getServerSession as jest.Mock).mockResolvedValue(mockSession);
            (prisma.chatSession.findMany as jest.Mock).mockResolvedValue([]);
        });

        it('should correctly extract userId from params', async () => {
            const request = new Request('http://localhost:3000/api/admin/users/test-user-456/chat-history');
            const context = { params: Promise.resolve({ id: 'test-user-456' }) };

            await GET(request, context);

            expect(prisma.chatSession.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { userId: 'test-user-456' },
                })
            );
        });

        it('should handle params as Promise (Next.js 15+ compatibility)', async () => {
            const request = new Request('http://localhost:3000/api/admin/users/user-123/chat-history');
            const context = { params: Promise.resolve({ id: 'user-123' }) };

            const response = await GET(request, context);

            expect(response.status).toBe(200);
        });
    });
});

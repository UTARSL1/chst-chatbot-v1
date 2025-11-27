import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { processRAGQuery } from '@/lib/rag/query';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { message, sessionId } = body;

        if (!message) {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }

        // Get or create chat session
        let chatSession;
        if (sessionId) {
            chatSession = await prisma.chatSession.findUnique({
                where: { id: sessionId },
            });
        }

        if (!chatSession) {
            chatSession = await prisma.chatSession.create({
                data: {
                    userId: session.user.id,
                    title: message.substring(0, 100), // Use first 100 chars as title
                },
            });
        }

        // Save user message
        await prisma.message.create({
            data: {
                sessionId: chatSession.id,
                userId: session.user.id,
                role: 'user',
                content: message,
            },
        });

        // Process RAG query
        const ragResponse = await processRAGQuery({
            query: message,
            userRole: session.user.role as any,
            sessionId: chatSession.id,
        });

        // Save assistant message
        await prisma.message.create({
            data: {
                sessionId: chatSession.id,
                userId: session.user.id,
                role: 'assistant',
                content: ragResponse.answer,
                sources: ragResponse.sources,
            },
        });

        return NextResponse.json(
            {
                success: true,
                sessionId: chatSession.id,
                answer: ragResponse.answer,
                sources: ragResponse.sources,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Chat error:', error);
        return NextResponse.json(
            { error: 'An error occurred while processing your message' },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');

        if (sessionId) {
            // Get messages for specific session
            const messages = await prisma.message.findMany({
                where: {
                    sessionId,
                    userId: session.user.id,
                },
                orderBy: {
                    createdAt: 'asc',
                },
            });

            return NextResponse.json({ messages }, { status: 200 });
        } else {
            // Get all chat sessions for user
            // Filter out deleted sessions for regular users, show all for chairpersons
            const sessions = await prisma.chatSession.findMany({
                where: {
                    userId: session.user.id,
                },
                include: {
                    messages: {
                        take: 1,
                        orderBy: {
                            createdAt: 'desc',
                        },
                    },
                },
                orderBy: {
                    updatedAt: 'desc',
                },
            });

            return NextResponse.json({ sessions }, { status: 200 });
        }
    } catch (error) {
        console.error('Get chat error:', error);
        return NextResponse.json(
            { error: 'An error occurred while fetching chat history' },
            { status: 500 }
        );
    }
}

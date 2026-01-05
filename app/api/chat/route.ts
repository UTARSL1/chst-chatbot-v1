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
        const { message, sessionId, stream } = body;

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

        if (stream) {
            const encoder = new TextEncoder();

            // Create a ReadableStream
            const customStream = new ReadableStream({
                async start(controller) {
                    try {
                        // Process RAG query with onChunk callback
                        const ragResponse = await processRAGQuery({
                            query: message,
                            userRole: session.user.role as any,
                            sessionId: chatSession.id,
                        }, (chunk) => {
                            // Enqueue chunks to client
                            controller.enqueue(encoder.encode(chunk));
                        });

                        // Save assistant message AFTER generation is complete
                        await prisma.message.create({
                            data: {
                                sessionId: chatSession.id,
                                userId: session.user.id,
                                role: 'assistant',
                                content: ragResponse.answer,
                                sources: ragResponse.sources as any,
                            },
                        });

                        // Append metadata delimiter and JSON
                        const metadata = {
                            sessionId: chatSession.id,
                            sources: ragResponse.sources,
                            suggestions: ragResponse.suggestions,
                            logs: ragResponse.logs,
                        };

                        const METADATA_DELIMITER = '___METADATA_JSON___';
                        controller.enqueue(encoder.encode(METADATA_DELIMITER + JSON.stringify(metadata)));

                        controller.close();
                    } catch (error: any) {
                        console.error('Streaming error:', error);
                        // Try to send error to client if stream is still open (might be mixed with content)
                        // A clean way is just closing, client will see incomplete stream or parse error
                        try {
                            controller.error(error);
                        } catch (e) { /* ignore */ }
                    }
                }
            });

            return new Response(customStream, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Transfer-Encoding': 'chunked',
                    'Connection': 'keep-alive',
                }
            });

        } else {
            // Non-streaming fallback (Original logic)
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
                    sources: ragResponse.sources as any,
                },
            });

            return NextResponse.json(
                {
                    success: true,
                    sessionId: chatSession.id,
                    answer: ragResponse.answer,
                    sources: ragResponse.sources,
                    suggestions: ragResponse.suggestions,
                    logs: ragResponse.logs,
                },
                { status: 200 }
            );
        }
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
        const view = searchParams.get('view'); // 'admin' or undefined

        if (sessionId) {
            // Get messages for specific session
            // Check if user has access
            const chatSession = await prisma.chatSession.findUnique({
                where: { id: sessionId },
                select: { userId: true, deletedAt: true }
            });

            if (!chatSession) {
                return NextResponse.json({ error: 'Session not found' }, { status: 404 });
            }

            // Access control: Owner or Chairperson
            if (chatSession.userId !== session.user.id && session.user.role !== 'chairperson') {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
            }

            const messages = await prisma.message.findMany({
                where: {
                    sessionId,
                },
                orderBy: {
                    createdAt: 'asc',
                },
            });

            return NextResponse.json({ messages }, { status: 200 });
        } else {
            // Get chat sessions list
            const whereClause: any = {};

            if (view === 'admin' && session.user.role === 'chairperson') {
                // Admin view: Show all sessions, including deleted ones
                // No userId filter, no deletedAt filter
            } else {
                // Default view: Show only my active sessions
                whereClause.userId = session.user.id;
                whereClause.deletedAt = null;
            }

            const sessions = await prisma.chatSession.findMany({
                where: whereClause,
                include: {
                    user: { // Include user details for admin view
                        select: {
                            name: true,
                            email: true,
                            role: true,
                        }
                    },
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

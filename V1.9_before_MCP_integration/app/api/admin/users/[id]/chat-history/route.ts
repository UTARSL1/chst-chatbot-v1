import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { id: userId } = await context.params;

        // Fetch all chat sessions for this user with their messages
        const chatSessions = await prisma.chatSession.findMany({
            where: {
                userId: userId,
            },
            include: {
                messages: {
                    orderBy: {
                        createdAt: 'asc',
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });

        return NextResponse.json({ sessions: chatSessions });
    } catch (error) {
        console.error('Error fetching chat history:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

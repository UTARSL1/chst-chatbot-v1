import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function DELETE(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;

        const chatSession = await prisma.chatSession.findUnique({
            where: { id },
        });

        if (!chatSession) {
            return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
        }

        if (chatSession.userId !== session.user.id && session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Hard delete: Delete messages first, then the session
        await prisma.message.deleteMany({
            where: { sessionId: id },
        });

        await prisma.chatSession.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting chat session:', error);
        return NextResponse.json(
            { error: 'Failed to delete chat session' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const body = await request.json();
        const { title } = body;

        if (!title || typeof title !== 'string') {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const chatSession = await prisma.chatSession.findUnique({
            where: { id },
        });

        if (!chatSession) {
            return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
        }

        if (chatSession.userId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.chatSession.update({
            where: { id },
            data: { title },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating chat session:', error);
        return NextResponse.json(
            { error: 'Failed to update chat session' },
            { status: 500 }
        );
    }
}

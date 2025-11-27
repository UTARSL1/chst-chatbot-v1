import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
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

        await prisma.chatSession.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                deletedBy: session.user.id,
            },
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

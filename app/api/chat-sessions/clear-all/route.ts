import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST() {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Soft delete all chat sessions for this user
        await prisma.chatSession.updateMany({
            where: {
                userId: session.user.id,
                deletedAt: null, // Only update sessions that aren't already deleted
            },
            data: {
                deletedAt: new Date(),
                deletedBy: session.user.id,
            },
        });

        return NextResponse.json({ success: true, message: 'All chat sessions cleared' });
    } catch (error) {
        console.error('Error clearing chat sessions:', error);
        return NextResponse.json(
            { error: 'Failed to clear chat sessions' },
            { status: 500 }
        );
    }
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        // Only chairpersons can view stats
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const [totalUsers, pendingUsers, totalDocuments, totalChats] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { isApproved: false } }),
            prisma.document.count(),
            prisma.chatSession.count(),
        ]);

        return NextResponse.json({
            totalUsers,
            pendingUsers,
            totalDocuments,
            totalChats,
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stats' },
            { status: 500 }
        );
    }
}

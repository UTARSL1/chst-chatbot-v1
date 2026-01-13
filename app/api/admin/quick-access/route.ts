import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Fetch all quick access links (Admin only)
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all links with user information
        const links = await prisma.quickAccessLink.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                    }
                }
            },
            orderBy: [
                { isSystem: 'desc' }, // System links first
                { section: 'asc' },
                { createdAt: 'desc' }
            ]
        });

        return NextResponse.json({ success: true, links });
    } catch (error) {
        console.error('Error fetching all quick access links:', error);
        return NextResponse.json(
            { error: 'Failed to fetch quick access links' },
            { status: 500 }
        );
    }
}

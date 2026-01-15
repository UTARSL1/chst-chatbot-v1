import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const entries = await prisma.documentLibraryEntry.findMany({
            where: { isActive: true },
            include: {
                creator: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(entries);
    } catch (error) {
        console.error('Error fetching document library entries:', error);
        return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
    }
}

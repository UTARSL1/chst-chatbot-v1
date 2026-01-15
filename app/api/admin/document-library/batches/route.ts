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

        const batches = await prisma.documentLibraryBatch.findMany({
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

        return NextResponse.json(batches);
    } catch (error) {
        console.error('Error fetching document library batches:', error);
        return NextResponse.json({ error: 'Failed to fetch batches' }, { status: 500 });
    }
}

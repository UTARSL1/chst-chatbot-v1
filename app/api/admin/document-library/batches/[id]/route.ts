import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const params = await context.params;

        // Delete all entries from this batch first
        await prisma.documentLibraryEntry.deleteMany({
            where: {
                metadata: {
                    path: ['batchId'],
                    equals: params.id
                }
            }
        });

        // Then delete the batch record
        await prisma.documentLibraryBatch.delete({
            where: { id: params.id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting document library batch:', error);
        return NextResponse.json({ error: 'Failed to delete batch' }, { status: 500 });
    }
}

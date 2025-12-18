import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { deleteDocumentVectors } from '@/lib/rag/vectorStore';

/**
 * Admin endpoint to clean up orphaned vectors
 * Finds vectors in the database that reference deleted documents and removes them
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // Only chairperson can run this
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json(
                { error: 'Unauthorized - Chairperson access required' },
                { status: 403 }
            );
        }

        console.log('[Cleanup] Starting orphaned vector cleanup...');

        // Find all documents that have vectorIds but are deleted or have status != 'processed'
        const orphanedDocs = await prisma.document.findMany({
            where: {
                OR: [
                    { status: { not: 'processed' } },
                    { deletedAt: { not: null } }
                ],
                AND: [
                    { vectorIds: { not: { equals: null } } }
                ]
            },
            select: {
                id: true,
                originalName: true,
                vectorIds: true,
                status: true,
                deletedAt: true
            }
        });

        console.log(`[Cleanup] Found ${orphanedDocs.length} documents with orphaned vectors`);

        let cleanedCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for (const doc of orphanedDocs) {
            try {
                const vectorIds = doc.vectorIds as string[];
                if (!vectorIds || vectorIds.length === 0) continue;

                console.log(`[Cleanup] Deleting ${vectorIds.length} vectors for: ${doc.originalName}`);

                // Delete vectors from Pinecone
                await deleteDocumentVectors(vectorIds);

                // Clear vectorIds from database
                await prisma.document.update({
                    where: { id: doc.id },
                    data: { vectorIds: [] }
                });

                cleanedCount++;
                console.log(`[Cleanup] ✅ Cleaned ${doc.originalName}`);
            } catch (error: any) {
                errorCount++;
                const errorMsg = `Failed to clean ${doc.originalName}: ${error.message}`;
                console.error(`[Cleanup] ❌ ${errorMsg}`);
                errors.push(errorMsg);
            }
        }

        const summary = {
            success: true,
            totalOrphaned: orphanedDocs.length,
            cleanedCount,
            errorCount,
            errors: errors.length > 0 ? errors : undefined,
            message: `Successfully cleaned ${cleanedCount} orphaned documents. ${errorCount > 0 ? `${errorCount} errors occurred.` : ''}`
        };

        console.log('[Cleanup] Summary:', summary);

        return NextResponse.json(summary, { status: 200 });
    } catch (error: any) {
        console.error('[Cleanup] Fatal error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to clean up orphaned vectors',
                details: error.message
            },
            { status: 500 }
        );
    }
}

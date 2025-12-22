import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const cleanupResults = {
            orphanedDocuments: 0,
            orphanedFiles: 0,
            orphanedJunctionEntries: 0,
        };

        // 1. Find all documents
        const allDocuments = await prisma.document.findMany({
            include: {
                linkedKnowledgeNotes: true,
            },
        });

        // 2. Delete documents that have no linked knowledge notes
        for (const doc of allDocuments) {
            if (doc.linkedKnowledgeNotes.length === 0) {
                // Delete file from Supabase Storage
                const { error: storageError } = await supabaseAdmin.storage
                    .from('documents')
                    .remove([doc.filePath]);

                if (storageError) {
                    console.error('Error deleting orphaned file:', storageError);
                } else {
                    cleanupResults.orphanedFiles++;
                }

                // Delete document record
                await prisma.document.delete({
                    where: { id: doc.id },
                });

                cleanupResults.orphanedDocuments++;
                console.log('Deleted orphaned document:', doc.id, doc.originalName);
            }
        }

        // 3. Prisma should automatically clean up junction table entries when documents are deleted
        // But if there are still orphaned entries, they would need manual SQL cleanup

        return NextResponse.json({
            success: true,
            message: 'Cleanup completed',
            results: cleanupResults,
        });
    } catch (error) {
        console.error('Error during cleanup:', error);
        return new NextResponse(JSON.stringify({ error: 'Internal Server Error', details: error }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

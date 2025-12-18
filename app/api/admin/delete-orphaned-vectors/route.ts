import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
});

/**
 * Admin endpoint to delete specific orphaned vectors by filename
 * Use this when you know the filenames of deleted documents
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

        const body = await req.json();
        const { filenames } = body as { filenames: string[] };

        if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
            return NextResponse.json(
                { error: 'Please provide an array of filenames to delete' },
                { status: 400 }
            );
        }

        console.log(`[Delete Orphaned] Deleting vectors for ${filenames.length} filenames:`, filenames);

        const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

        let deletedCount = 0;
        let errorCount = 0;
        const errors: string[] = [];
        const results: any[] = [];

        for (const filename of filenames) {
            try {
                console.log(`[Delete Orphaned] Querying vectors for filename: ${filename}`);

                // Delete all vectors with this filename in metadata
                // Pinecone allows deletion by metadata filter
                await index.deleteMany({
                    filter: {
                        filename: { $eq: filename }
                    }
                });

                deletedCount++;
                results.push({
                    filename,
                    status: 'deleted',
                    message: `Deleted all vectors for ${filename}`
                });

                console.log(`[Delete Orphaned] ✅ Deleted vectors for: ${filename}`);
            } catch (error: any) {
                errorCount++;
                const errorMsg = `Failed to delete ${filename}: ${error.message}`;
                console.error(`[Delete Orphaned] ❌ ${errorMsg}`);
                errors.push(errorMsg);
                results.push({
                    filename,
                    status: 'error',
                    message: errorMsg
                });
            }
        }

        const summary = {
            success: true,
            totalRequested: filenames.length,
            deletedCount,
            errorCount,
            results,
            errors: errors.length > 0 ? errors : undefined,
            message: `Successfully deleted vectors for ${deletedCount} filenames. ${errorCount > 0 ? `${errorCount} errors occurred.` : ''}`
        };

        console.log('[Delete Orphaned] Summary:', summary);

        return NextResponse.json(summary, { status: 200 });
    } catch (error: any) {
        console.error('[Delete Orphaned] Fatal error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to delete orphaned vectors',
                details: error.message
            },
            { status: 500 }
        );
    }
}

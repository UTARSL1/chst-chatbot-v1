import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/client';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        // Only allow chairpersons to access this debug endpoint
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Test 1: List files in the bucket
        const { data, error } = await supabaseAdmin.storage
            .from('documents')
            .list('', { limit: 5 });

        // Test 2: Get a sample document from database
        const sampleDoc = await prisma.document.findFirst({
            select: {
                id: true,
                filename: true,
                originalName: true,
                filePath: true,
            }
        });

        // Test 3: Try to create a signed URL for the sample document
        let signedUrlTest = null;
        if (sampleDoc) {
            const { data: signedData, error: signedError } = await supabase.storage
                .from('documents')
                .createSignedUrl(sampleDoc.filePath, 60);

            signedUrlTest = {
                success: !!signedData,
                error: signedError?.message,
                url: signedData?.signedUrl?.substring(0, 100) + '...',
            };
        }

        return NextResponse.json({
            bucketListTest: {
                success: !listError,
                error: listError?.message,
                fileCount: files?.length || 0,
                files: files?.slice(0, 3).map(f => f.name) || [],
            },
            sampleDocument: sampleDoc ? {
                id: sampleDoc.id,
                filename: sampleDoc.filename,
                filePath: sampleDoc.filePath,
            } : 'No documents in database',
            signedUrlTest,
        });
    } catch (error: any) {
        return NextResponse.json({
            error: 'Failed to test storage',
            details: error.message
        }, { status: 500 });
    }
}

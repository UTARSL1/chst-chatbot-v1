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

        // Test 2: Try to create a signed URL for a sample document
        let signedUrlTest = null;
        if (files && files.length > 0) {
            const sampleFile = files[0]; // Renamed to sampleFile to avoid confusion with DB documents
            const { data: signedData, error: signedError } = await supabaseAdmin.storage
                .from('documents')
                .createSignedUrl(sampleFile.name, 60);

            if (signedError) {
                console.error('Signed URL error:', signedError);
                signedUrlTest = { success: false, error: signedError.message };
            } else {
                signedUrlTest = { success: true, url: signedData?.signedUrl?.substring(0, 100) + '...' };
            }
        }

        // Get database documents
        const dbDocuments = await prisma.document.findMany({
            take: 5,
            orderBy: { uploadedAt: 'desc' }
        });

        return NextResponse.json({
            supabaseStorage: {
                listError: listError ? listError.message : null,
                filesCount: files ? files.length : 0,
                files: files ? files.map((f: any) => f.name) : [],
                signedUrlTest
            },
            dbDocuments: dbDocuments.length > 0 ? dbDocuments.map(doc => ({
                id: doc.id,
                filename: doc.filename,
                filePath: doc.filePath,
            })) : 'No documents in database',
        });
    } catch (error: any) {
        return NextResponse.json({
            error: 'Failed to test storage',
            details: error.message
        }, { status: 500 });
    }
}

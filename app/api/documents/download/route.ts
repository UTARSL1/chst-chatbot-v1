import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized. Please sign in to download documents.' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Document ID is required' },
                { status: 400 }
            );
        }

        // Get document from database
        const document = await prisma.document.findUnique({
            where: { id },
        });

        if (!document) {
            return NextResponse.json(
                { error: 'Document not found' },
                { status: 404 }
            );
        }

        // Check access permissions based on user role
        const userRole = session.user.role;
        const docAccess = document.accessLevel;

        const hasAccess =
            userRole === 'chairperson' ||
            (userRole === 'member' && ['student', 'member'].includes(docAccess)) ||
            (userRole === 'student' && docAccess === 'student') ||
            (userRole === 'public' && docAccess === 'student');

        if (!hasAccess) {
            return NextResponse.json(
                { error: 'Access denied. You do not have permission to download this document.' },
                { status: 403 }
            );
        }

        // Generate a public URL
        console.log('[Download] Generating public URL for:', document.filePath);
        const { data, error } = await supabaseAdmin.storage
            .from('documents')
            .getPublicUrl(document.filePath);

        if (error || !data || !data.publicUrl) {
            console.error('Failed to generate public URL', error);
            return NextResponse.json(
                {
                    error: 'Failed to generate download link',
                    filePath: document.filePath
                },
                { status: 500 }
            );
        }

        console.log('[Download] Public URL generated:', publicUrlData.publicUrl);

        // Return the public URL in JSON format
        return NextResponse.json({
            success: true,
            downloadUrl: publicUrlData.publicUrl,
            filename: document.originalName
        });
    } catch (error) {
        console.error('Document download error:', error);
        return NextResponse.json(
            { error: 'Failed to download document. Please try again later.' },
            { status: 500 }
        );
    }
}

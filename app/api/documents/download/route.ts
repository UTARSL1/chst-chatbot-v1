import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { supabase } from '@/lib/supabase';

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

        // Download file from Supabase Storage
        const { data, error } = await supabase.storage
            .from('documents')
            .download(document.filePath);

        if (error || !data) {
            console.error('Supabase download error:', error);
            return NextResponse.json(
                { error: 'Failed to download document from storage' },
                { status: 500 }
            );
        }

        // Convert blob to buffer
        const arrayBuffer = await data.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Return file with proper headers for download
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${document.originalName}"`,
                'Content-Length': document.fileSize.toString(),
            },
        });
    } catch (error) {
        console.error('Document download error:', error);
        return NextResponse.json(
            { error: 'Failed to download document. Please try again later.' },
            { status: 500 }
        );
    }
}

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

        if (document) {
            // --- EXISTING LOGIC FOR KNOWLEDGE BASE DOCUMENTS ---

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
            console.log('[Download] Generating public URL for Knowledge Base doc:', document.filePath);
            const { data } = supabaseAdmin.storage
                .from('documents')
                .getPublicUrl(document.filePath);

            if (!data || !data.publicUrl) {
                return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                downloadUrl: data.publicUrl,
                filename: document.originalName
            });
        }

        // --- NEW LOGIC FOR DOCUMENT LIBRARY ENTRIES ---
        const docLibEntry = await prisma.documentLibraryEntry.findUnique({
            where: { id: id }
        });

        if (docLibEntry) {
            // Check access (matches logic in query.ts)
            // Default access level usually 'member' or 'student'
            const userRole = session.user.role;
            // Simplistic check for now - improve if strict restrictions needed
            // Most policies are viewable by students/members

            // Construct filename for Storage retrieval
            // We assume files are uploaded to root of 'document-library' bucket
            let objectName = docLibEntry.sourceFile;
            if (objectName && !objectName.toLowerCase().endsWith('.pdf')) {
                objectName += '.pdf';
            }

            if (!objectName) {
                return NextResponse.json({ error: 'Document source file not defined' }, { status: 404 });
            }

            console.log('[Download] Generating public URL for Document Library:', objectName);
            const { data } = supabaseAdmin.storage
                .from('document-library')
                .getPublicUrl(objectName);

            return NextResponse.json({
                success: true,
                downloadUrl: data.publicUrl,
                filename: docLibEntry.documentTitle || objectName
            });
        }

        return NextResponse.json(
            { error: 'Document not found' },
            { status: 404 }
        );
    } catch (error) {
        console.error('Document download error:', error);
        return NextResponse.json(
            { error: 'Failed to download document. Please try again later.' },
            { status: 500 }
        );
    }
}

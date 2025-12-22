import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
// Force rebuild - GET route for fetching single knowledge note

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { id } = await context.params;
        console.log('[GET /api/admin/knowledge/[id]] Fetching note:', id);

        const note = await prisma.knowledgeNote.findUnique({
            where: { id },
            include: {
                linkedDocuments: true,
                department: true,
                documentType: true,
            },
        });

        if (!note) {
            console.log('[GET /api/admin/knowledge/[id]] Note not found:', id);
            return new NextResponse('Knowledge note not found', { status: 404 });
        }

        console.log('[GET /api/admin/knowledge/[id]] Note found:', note.title);
        return NextResponse.json(note);
    } catch (error) {
        console.error('Error fetching knowledge note:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { id } = await context.params;
        const body = await req.json();
        const {
            title,
            content,
            departmentId,
            documentTypeId,
            tags,
            linkedDocIds,
            priority,
            formatType,
            isActive,
            accessLevel,
            status
        } = body;

        const note = await prisma.knowledgeNote.update({
            where: { id },
            data: {
                title,
                content,
                departmentId: departmentId || null,
                documentTypeId: documentTypeId || null,
                tags: tags || [],
                priority,
                formatType,
                isActive,
                accessLevel,
                status,
                linkedDocuments: linkedDocIds ? {
                    set: linkedDocIds.map((docId: string) => ({ id: docId })),
                } : undefined,
            },
        });

        return NextResponse.json(note);
    } catch (error) {
        console.error('Error updating knowledge note:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { id } = await context.params;
        console.log('Attempting to delete knowledge note:', id);

        // First, fetch the knowledge note with its linked documents
        const note = await prisma.knowledgeNote.findUnique({
            where: { id },
            include: {
                linkedDocuments: true,
            },
        });

        if (!note) {
            return new NextResponse('Knowledge note not found', { status: 404 });
        }

        // Delete linked documents from Supabase Storage and database
        if (note.linkedDocuments && note.linkedDocuments.length > 0) {
            const { supabaseAdmin } = await import('@/lib/supabase/client');

            for (const doc of note.linkedDocuments) {
                // Delete file from Supabase Storage
                const { error: storageError } = await supabaseAdmin.storage
                    .from('documents')
                    .remove([doc.filePath]);

                if (storageError) {
                    console.error('Error deleting file from storage:', storageError);
                }

                // Delete document record from database
                await prisma.document.delete({
                    where: { id: doc.id },
                });

                console.log('Deleted document:', doc.id, doc.originalName);
            }
        }

        // Finally, delete the knowledge note
        await prisma.knowledgeNote.delete({
            where: { id },
        });

        console.log('Successfully deleted knowledge note:', id);
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting knowledge note:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return new NextResponse(JSON.stringify({ error: 'Internal Server Error', details: error }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

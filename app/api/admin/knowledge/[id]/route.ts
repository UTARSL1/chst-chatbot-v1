import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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
        const { title, content, category, priority, formatType, isActive, accessLevel, status } = body;

        const note = await prisma.knowledgeNote.update({
            where: { id },
            data: {
                title,
                content,
                category,
                priority,
                formatType,
                isActive,
                accessLevel,
                status,
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

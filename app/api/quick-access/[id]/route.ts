import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// PATCH - Update a quick access link
export async function PATCH(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;

        // Fetch the link first to check ownership
        const existingLink = await prisma.quickAccessLink.findUnique({
            where: { id }
        });

        if (!existingLink) {
            return NextResponse.json({ error: 'Link not found' }, { status: 404 });
        }

        // Allow if user is the creator OR is a chairperson
        if (existingLink.createdBy !== session.user.id && session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { name, url, section, icon, roles, order, isActive, isSystem } = body;

        // Only chairpersons can change isSystem status
        if (isSystem !== undefined && session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Only chairpersons can change system link status' }, { status: 403 });
        }

        // Update the link
        const link = await prisma.quickAccessLink.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(url !== undefined && { url }),
                ...(section !== undefined && { section }),
                ...(icon !== undefined && { icon }),
                ...(roles !== undefined && { roles }),
                ...(order !== undefined && { order }),
                ...(isActive !== undefined && { isActive }),
                ...(isSystem !== undefined && { isSystem })
            }
        });

        return NextResponse.json({ success: true, link });
    } catch (error) {
        console.error('Error updating quick access link:', error);
        return NextResponse.json(
            { error: 'Failed to update quick access link' },
            { status: 500 }
        );
    }
}

// DELETE - Delete a quick access link
export async function DELETE(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;

        // Fetch the link first to check ownership
        const existingLink = await prisma.quickAccessLink.findUnique({
            where: { id }
        });

        if (!existingLink) {
            return NextResponse.json({ error: 'Link not found' }, { status: 404 });
        }

        // Allow if user is the creator OR is a chairperson
        if (existingLink.createdBy !== session.user.id && session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.quickAccessLink.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: 'Link deleted' });
    } catch (error) {
        console.error('Error deleting quick access link:', error);
        return NextResponse.json(
            { error: 'Failed to delete quick access link' },
            { status: 500 }
        );
    }
}

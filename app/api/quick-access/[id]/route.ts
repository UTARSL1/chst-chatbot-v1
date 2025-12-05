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

        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = params;
        const body = await request.json();
        const { name, url, section, icon, roles, order, isActive } = body;

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
                ...(isActive !== undefined && { isActive })
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

        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = params;

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

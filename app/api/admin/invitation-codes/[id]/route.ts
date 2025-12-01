import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// PATCH - Toggle active/inactive status
export async function PATCH(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { isActive } = await req.json();

        const code = await prisma.invitationCode.update({
            where: { id: params.id },
            data: { isActive },
        });

        return NextResponse.json(code);
    } catch (error) {
        console.error('Error updating invitation code:', error);
        return NextResponse.json({ error: 'Failed to update code' }, { status: 500 });
    }
}

// DELETE - Delete invitation code
export async function DELETE(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await prisma.invitationCode.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting invitation code:', error);
        return NextResponse.json({ error: 'Failed to delete code' }, { status: 500 });
    }
}

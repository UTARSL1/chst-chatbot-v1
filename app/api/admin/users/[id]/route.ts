import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendApprovalEmail } from '@/lib/email';

export async function POST(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);

        // Only chairpersons can approve users
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = params;

        // Approve the user and get email/name
        const user = await prisma.user.update({
            where: { id },
            data: { isApproved: true },
            select: { email: true, name: true }
        });

        // Send approval email
        await sendApprovalEmail(user.email, user.name);

        return NextResponse.json({ success: true, message: 'User approved and notified' });
    } catch (error) {
        console.error('Error approving user:', error);
        return NextResponse.json(
            { error: 'Failed to approve user' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);

        // Only chairpersons can reject users
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = params;

        // Delete the rejected user
        await prisma.user.delete({
            where: { id },
        });

        return NextResponse.json({ success: true, message: 'User rejected and deleted' });
    } catch (error) {
        console.error('Error rejecting user:', error);
        return NextResponse.json(
            { error: 'Failed to reject user' },
            { status: 500 }
        );
    }
}

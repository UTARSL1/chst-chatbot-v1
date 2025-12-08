import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// PATCH - Update version
export async function PATCH(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const { versionNumber, commitHash, description, isCurrent } = await request.json();

        // If setting as current, unset all other versions
        if (isCurrent) {
            await prisma.version.updateMany({
                where: {
                    isCurrent: true,
                    id: { not: id }
                },
                data: { isCurrent: false }
            });
        }

        const version = await prisma.version.update({
            where: { id },
            data: {
                versionNumber,
                commitHash,
                description,
                isCurrent
            }
        });

        return NextResponse.json({ version });
    } catch (error) {
        console.error('Error updating version:', error);
        return NextResponse.json({ error: 'Failed to update version' }, { status: 500 });
    }
}

// DELETE - Delete version
export async function DELETE(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;

        // Prevent deleting the current version
        const version = await prisma.version.findUnique({ where: { id } });
        if (version?.isCurrent) {
            return NextResponse.json(
                { error: 'Cannot delete current version' },
                { status: 400 }
            );
        }

        await prisma.version.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting version:', error);
        return NextResponse.json({ error: 'Failed to delete version' }, { status: 500 });
    }
}

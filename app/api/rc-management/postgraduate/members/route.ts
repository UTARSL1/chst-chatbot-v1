import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        // Check authentication and role
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json(
                { error: 'Unauthorized. Chairperson access required.' },
                { status: 403 }
            );
        }

        // Get all members with their counts
        const members = await prisma.rCPostgraduateMember.findMany({
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                staffId: true,
                faculty: true,
                totalStudents: true,
                inProgressCount: true,
                completedCount: true,
                phdCount: true,
                masterCount: true,
                mainSupervisorCount: true,
                coSupervisorCount: true,
                createdAt: true,
                updatedAt: true,
            }
        });

        return NextResponse.json({ success: true, members });
    } catch (error) {
        console.error('[RC Postgraduate Members] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch members' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        // Check authentication and role
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json(
                { error: 'Unauthorized. Chairperson access required.' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const memberId = searchParams.get('id');

        if (!memberId) {
            return NextResponse.json(
                { error: 'Member ID is required' },
                { status: 400 }
            );
        }

        // Delete member (supervisions will be cascade deleted)
        await prisma.rCPostgraduateMember.delete({
            where: { id: memberId }
        });

        return NextResponse.json({
            success: true,
            message: 'Member deleted successfully'
        });
    } catch (error) {
        console.error('[RC Postgraduate Delete Member] Error:', error);
        return NextResponse.json(
            { error: 'Failed to delete member' },
            { status: 500 }
        );
    }
}

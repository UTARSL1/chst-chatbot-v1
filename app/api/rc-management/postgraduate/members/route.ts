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

export async function POST(request: NextRequest) {
    try {
        // Check authentication and role
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json(
                { error: 'Unauthorized. Chairperson access required.' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { name, staffId, faculty } = body;

        if (!name || !staffId) {
            return NextResponse.json(
                { error: 'Name and Staff ID are required' },
                { status: 400 }
            );
        }

        // Check if member already exists
        const existing = await prisma.rCPostgraduateMember.findFirst({
            where: { staffId }
        });

        if (existing) {
            return NextResponse.json(
                { error: 'A member with this Staff ID already exists' },
                { status: 409 }
            );
        }

        // Create new member with zero counts
        const member = await prisma.rCPostgraduateMember.create({
            data: {
                name,
                staffId,
                faculty: faculty || null,
                totalStudents: 0,
                inProgressCount: 0,
                completedCount: 0,
                phdCount: 0,
                masterCount: 0,
                mainSupervisorCount: 0,
                coSupervisorCount: 0
            }
        });

        return NextResponse.json({
            success: true,
            member
        });
    } catch (error) {
        console.error('[RC Postgraduate Create Member] Error:', error);
        return NextResponse.json(
            { error: 'Failed to create member' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        // Check authentication and role
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json(
                { error: 'Unauthorized. Chairperson access required.' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { id, name, staffId, faculty } = body;

        if (!id || !name || !staffId) {
            return NextResponse.json(
                { error: 'ID, Name and Staff ID are required' },
                { status: 400 }
            );
        }

        // Check if another member has this staffId
        const existing = await prisma.rCPostgraduateMember.findFirst({
            where: {
                staffId,
                NOT: { id }
            }
        });

        if (existing) {
            return NextResponse.json(
                { error: 'Another member with this Staff ID already exists' },
                { status: 409 }
            );
        }

        // Update member
        const member = await prisma.rCPostgraduateMember.update({
            where: { id },
            data: {
                name,
                staffId,
                faculty: faculty || null
            }
        });

        return NextResponse.json({
            success: true,
            member
        });
    } catch (error) {
        console.error('[RC Postgraduate Update Member] Error:', error);
        return NextResponse.json(
            { error: 'Failed to update member' },
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

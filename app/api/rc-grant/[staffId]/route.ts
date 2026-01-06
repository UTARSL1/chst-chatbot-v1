import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * Get RC Grant data for a specific member
 * GET /api/rc-grant/[staffId]
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ staffId: string }> }
) {
    try {
        const params = await context.params;
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { staffId } = params;

        const member = await prisma.rCGrantMember.findFirst({
            where: { staffId },
            include: {
                grants: {
                    orderBy: {
                        commencementDate: 'desc'
                    }
                }
            }
        });

        if (!member) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }

        // Parse JSON fields
        const grantsWithParsedData = member.grants.map(grant => ({
            ...grant,
            keywords: grant.keywords ? JSON.parse(grant.keywords) : [],
            collaborators: grant.collaborators ? JSON.parse(grant.collaborators) : [],
            fundingAmount: parseFloat(grant.fundingAmount.toString())
        }));

        return NextResponse.json({
            member: {
                ...member,
                totalFunding: parseFloat(member.totalFunding.toString()),
                grants: grantsWithParsedData
            }
        });

    } catch (error) {
        console.error('Error fetching RC grant data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch grant data' },
            { status: 500 }
        );
    }
}

/**
 * Delete RC Grant member and all their grants
 * DELETE /api/rc-grant/[staffId]
 */
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ staffId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Try to get staffId from context params first
        let staffId: string | undefined;
        try {
            const params = await context.params;
            staffId = params.staffId;
        } catch (e) {
            console.warn('Could not await context.params', e);
        }

        // Fallback: try parsing from URL if context param failed (though context should work in Next 15)
        if (!staffId) {
            const url = new URL(request.url);
            const pathSegments = url.pathname.split('/');
            staffId = pathSegments[pathSegments.length - 1];
        }

        if (!staffId) {
            return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });
        }

        // Find member first to get ID
        const member = await prisma.rCGrantMember.findFirst({
            where: { staffId }
        });

        if (!member) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }

        // Delete member (and their grants first)
        await prisma.grant.deleteMany({
            where: { memberId: member.id }
        });

        await prisma.rCGrantMember.delete({
            where: { id: member.id }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error deleting RC grant member:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete member' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * Get RC Grant overview - all members
 * GET /api/rc-grant/overview
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const members = await prisma.rCGrantMember.findMany({
            include: {
                grants: true
            },
            orderBy: {
                name: 'asc'
            }
        });

        const membersWithParsedData = members.map(member => ({
            ...member,
            totalFunding: parseFloat(member.totalFunding.toString()),
            grants: member.grants.map(grant => ({
                ...grant,
                fundingAmount: parseFloat(grant.fundingAmount.toString()),
                keywords: grant.keywords ? JSON.parse(grant.keywords) : [],
                collaborators: grant.collaborators ? JSON.parse(grant.collaborators) : []
            }))
        }));

        // Calculate aggregate statistics
        const totalMembers = members.length;
        const totalGrants = members.reduce((sum, m) => sum + m.totalGrants, 0);
        const totalFunding = members.reduce((sum, m) => sum + parseFloat(m.totalFunding.toString()), 0);
        const totalInternalGrants = members.reduce((sum, m) => sum + m.internalGrants, 0);
        const totalExternalGrants = members.reduce((sum, m) => sum + m.externalGrants, 0);
        const totalInUtarGrants = members.reduce((sum, m) => sum + m.inUtarGrants, 0);
        const totalNotInUtarGrants = members.reduce((sum, m) => sum + m.notInUtarGrants, 0);

        return NextResponse.json({
            members: membersWithParsedData,
            statistics: {
                totalMembers,
                totalGrants,
                totalFunding,
                totalInternalGrants,
                totalExternalGrants,
                totalInUtarGrants,
                totalNotInUtarGrants,
                averageFundingPerMember: totalMembers > 0 ? totalFunding / totalMembers : 0,
                averageGrantsPerMember: totalMembers > 0 ? totalGrants / totalMembers : 0
            }
        });

    } catch (error) {
        console.error('Error fetching RC grant overview:', error);
        return NextResponse.json(
            { error: 'Failed to fetch grant overview' },
            { status: 500 }
        );
    }
}

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
    { params }: { params: { staffId: string } }
) {
    try {
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

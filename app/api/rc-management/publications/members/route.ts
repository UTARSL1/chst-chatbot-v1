import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

import { hasRCAccess } from '@/lib/utils/rc-member-check';

export async function GET(request: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);

        // Allow if chairperson OR if verified RC member
        const isAuthorized = session && (
            session.user.role === 'chairperson' ||
            hasRCAccess(session.user.email, session.user.role)
        );

        if (!isAuthorized) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const isChairperson = session.user.role === 'chairperson';

        // Get members based on role
        let members;
        if (isChairperson) {
            // Chairperson sees all members
            members = await prisma.rCMember.findMany({
                select: {
                    id: true,
                    name: true,
                    staffId: true,
                    totalPublications: true,
                    journalArticles: true,
                    conferencePapers: true,
                    q1Publications: true,
                    q2Publications: true,
                    q3Publications: true,
                    q4Publications: true,
                    createdAt: true,
                    updatedAt: true
                },
                orderBy: {
                    name: 'asc'
                }
            });
        } else {
            // Regular member sees only their own data
            const { getStaffIdByEmail } = await import('@/lib/utils/rc-member-check');
            const userStaffId = getStaffIdByEmail(session.user.email);

            if (userStaffId) {
                const cleanStaffId = userStaffId.trim().replace(/^\?\s*/, '');
                members = await prisma.rCMember.findMany({
                    where: {
                        staffId: cleanStaffId
                    },
                    select: {
                        id: true,
                        name: true,
                        staffId: true,
                        totalPublications: true,
                        journalArticles: true,
                        conferencePapers: true,
                        q1Publications: true,
                        q2Publications: true,
                        q3Publications: true,
                        q4Publications: true,
                        createdAt: true,
                        updatedAt: true
                    }
                });
            } else {
                members = [];
            }
        }

        return NextResponse.json({
            success: true,
            members
        });
    } catch (error) {
        console.error('[RC Publications Members] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch members' },
            { status: 500 }
        );
    }
}

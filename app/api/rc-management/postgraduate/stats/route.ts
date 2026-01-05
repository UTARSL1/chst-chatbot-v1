import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasRCAccess } from '@/lib/utils/rc-member-check';

export async function GET(request: NextRequest) {
    try {
        // Check authentication and role
        const session = await getServerSession(authOptions);

        // Allow if chairperson OR verified RC member
        const isAuthorized = session && (
            session.user.role === 'chairperson' ||
            hasRCAccess(session.user.email, session.user.role)
        );

        if (!isAuthorized) {
            return NextResponse.json(
                { error: 'Unauthorized. RC member access required.' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const memberId = searchParams.get('memberId');
        const yearsParam = searchParams.get('years'); // Comma-separated years or "all"

        if (!memberId) {
            return NextResponse.json(
                { error: 'Member ID is required' },
                { status: 400 }
            );
        }

        // Get member
        const member = await prisma.rCPostgraduateMember.findUnique({
            where: { id: memberId },
            include: {
                supervisions: true
            }
        });

        if (!member) {
            return NextResponse.json(
                { error: 'Member not found' },
                { status: 404 }
            );
        }

        // Filter supervisions by year if specified
        let supervisions = member.supervisions;
        if (yearsParam && yearsParam !== 'all') {
            const years = yearsParam.split(',').map(y => parseInt(y.trim()));
            supervisions = supervisions.filter(s =>
                s.startYear && years.includes(s.startYear)
            );
        }

        // Calculate stats from filtered supervisions
        const stats = {
            totalStudents: supervisions.length,
            inProgressCount: supervisions.filter(s => s.status === 'IN PROGRESS').length,
            completedCount: supervisions.filter(s => s.status === 'COMPLETED').length,
            phdCount: supervisions.filter(s => s.level === 'PHD').length,
            masterCount: supervisions.filter(s => s.level === 'MASTER').length,
            mainSupervisorCount: supervisions.filter(s => s.role.includes('MAIN')).length,
            coSupervisorCount: supervisions.filter(s => s.role.includes('CO')).length,
        };

        // Group by year for timeline
        const yearGroups: Record<number, { inProgress: number; completed: number }> = {};
        supervisions.forEach(s => {
            if (s.startYear) {
                if (!yearGroups[s.startYear]) {
                    yearGroups[s.startYear] = { inProgress: 0, completed: 0 };
                }
                if (s.status === 'IN PROGRESS') {
                    yearGroups[s.startYear].inProgress++;
                } else if (s.status === 'COMPLETED') {
                    yearGroups[s.startYear].completed++;
                }
            }
        });

        // Group by area of study
        const areaGroups: Record<string, number> = {};
        supervisions.forEach(s => {
            if (s.areaOfStudy) {
                areaGroups[s.areaOfStudy] = (areaGroups[s.areaOfStudy] || 0) + 1;
            }
        });

        // Get all unique years from all supervisions (for year filter dropdown)
        const allYears = Array.from(
            new Set(
                member.supervisions
                    .map(s => s.startYear)
                    .filter((y): y is number => y !== null)
            )
        ).sort((a, b) => b - a); // Descending order

        return NextResponse.json({
            member: {
                id: member.id,
                name: member.name,
                staffId: member.staffId,
                faculty: member.faculty,
            },
            stats,
            supervisions: supervisions.map(s => ({
                id: s.id,
                studentName: s.studentName,
                level: s.level,
                status: s.status,
                role: s.role,
                institution: s.institution,
                programTitle: s.programTitle,
                startDate: s.startDate,
                completedDate: s.completedDate,
                startYear: s.startYear,
                completedYear: s.completedYear,
                areaOfStudy: s.areaOfStudy,
            })),
            yearGroups,
            areaGroups,
            availableYears: allYears,
        });
    } catch (error) {
        console.error('[RC Postgraduate Stats] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch supervision statistics' },
            { status: 500 }
        );
    }
}

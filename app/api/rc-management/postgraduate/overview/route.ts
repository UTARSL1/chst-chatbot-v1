
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Get all "Main Supervisor" records
        // This effectively gets unique students if we assume each student has 1 main supervisor
        const supervisions = await prisma.postgraduateSupervision.findMany({
            where: {
                role: {
                    contains: 'Main',
                    mode: 'insensitive'
                }
            },
            include: {
                member: {
                    select: {
                        id: true,
                        name: true,
                        staffId: true
                    }
                }
            }
        });

        // Deduplication & Stats
        // Although filtering by Main Supervisor should be unique, we check studentName just in case
        const uniqueStudentsMap = new Map<string, {
            id: string;
            name: string;
            level: string;
            year: number | null;
            member: { name: string; staffId: string | null; id: string };
        }>();

        for (const sup of supervisions) {
            // Key: Student Name (plus Level to differentiate if same name exists in PhD vs Master?)
            // Usually Name is best proxy. 
            const key = sup.studentName.trim().toLowerCase();

            if (!uniqueStudentsMap.has(key)) {
                uniqueStudentsMap.set(key, {
                    id: sup.id,
                    name: sup.studentName,
                    level: sup.level || 'Unknown',
                    year: sup.startYear,
                    member: {
                        id: sup.member.id,
                        name: sup.member.name,
                        staffId: sup.member.staffId
                    }
                });
            }
        }

        const uniqueStudents = Array.from(uniqueStudentsMap.values());

        // Calculate Level counts (PhD vs Master)
        const levelCounts = {
            phd: 0,
            master: 0,
            other: 0
        };

        for (const stud of uniqueStudents) {
            const lvl = stud.level.toLowerCase();
            if (lvl.includes('phd') || lvl.includes('doctor')) levelCounts.phd++;
            else if (lvl.includes('master')) levelCounts.master++;
            else levelCounts.other++;
        }

        // Active Supervisors (Unique Members in this Main Supervisor list)
        const activeSupervisorIds = new Set(uniqueStudents.map(s => s.member.id));
        const activeSupervisors = activeSupervisorIds.size;

        // Years Logic (Up to 2020, 2021...2025)
        const anchorYear = 2025;
        const startYear = 2021;
        const accumulatedLabel = `Up to ${startYear - 1}`;

        // Top Supervisors by Year
        const memberYearlyStats = new Map<string, Map<string, {
            name: string;
            staffId: string | null;
            count: number;
        }>>();

        // Chart Data (Students by Year with Level breakdown)
        const chartDataMap = new Map<string, { phd: number; master: number; count: number }>();
        const yearsOrder = [
            accumulatedLabel,
            startYear.toString(),
            (startYear + 1).toString(),
            (startYear + 2).toString(),
            (startYear + 3).toString(),
            (startYear + 4).toString()
        ];

        // Initialize map
        yearsOrder.forEach(y => chartDataMap.set(y, { phd: 0, master: 0, count: 0 }));

        // Process Unique Students for Year Stats
        for (const stud of uniqueStudents) {
            const year = stud.year || 0;
            if (year === 0) continue;

            let yearKey = year.toString();
            if (year < startYear) {
                yearKey = accumulatedLabel;
            } else if (year > anchorYear) {
                continue; // Skip future
            }

            // Chart Data
            if (!chartDataMap.has(yearKey)) {
                // Should be initialized, but safety check
                chartDataMap.set(yearKey, { phd: 0, master: 0, count: 0 });
            }
            const data = chartDataMap.get(yearKey)!;
            data.count++;

            const lvl = stud.level.toLowerCase();
            if (lvl.includes('phd') || lvl.includes('doctor')) {
                data.phd++;
            } else if (lvl.includes('master')) {
                data.master++;
            }

            // Member Leaderboard
            if (!memberYearlyStats.has(yearKey)) {
                memberYearlyStats.set(yearKey, new Map());
            }
            const yearStats = memberYearlyStats.get(yearKey)!;

            if (!yearStats.has(stud.member.id)) {
                yearStats.set(stud.member.id, {
                    name: stud.member.name,
                    staffId: stud.member.staffId,
                    count: 0
                });
            }
            yearStats.get(stud.member.id)!.count++;
        }

        // Format Top Members Response
        const topMembersByYear = yearsOrder.slice().reverse().map(yearKey => { // Display reverse for logic order? No, user wants chronological maybe? Publications showed recent first?
            // Wait, previous logic was: accumulated, 2021, 2022, 2023, 2024, 2025.
            // Leaderboard usually shows recent first? Or same order.
            // Let's stick to the yearsOrder for consistency in variable names, but the UI might map it.
            // Previous code used 'yearsOrder' for chart data map init, but mapped manually for response.
            // Let's use yearsOrder for both.

            const yearStats = memberYearlyStats.get(yearKey);
            if (!yearStats) return { year: yearKey, members: [] };

            const members = Array.from(yearStats.values())
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            return {
                year: yearKey,
                members
            };
        });

        // Format Chart Response
        const studentsByYear = yearsOrder.map(yearKey => ({
            year: yearKey,
            ...chartDataMap.get(yearKey)!,
            isAccumulated: yearKey === accumulatedLabel
        }));

        return NextResponse.json({
            success: true,
            stats: {
                totalStudents: uniqueStudents.length,
                uniqueStudents: uniqueStudents.length, // Same effectively
                activeSupervisors,
                levelCounts,
                studentsByYear,
                topMembersByYear
            }
        });

    } catch (error) {
        console.error('[RC PG Overview] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch PG overview' },
            { status: 500 }
        );
    }
}

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

        // Get all publications with member info (Journal Only - defined by having Q1-Q4)
        // User requested: "basically you can just find those rows with Q1-Q4"
        const publications = await prisma.publication.findMany({
            where: {
                wosQuartile: {
                    in: ['Q1', 'Q2', 'Q3', 'Q4']
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

        // Deduplication logic: Only count papers where member is 1st Author OR Corresponding Author
        // Group by DOI/title to identify unique papers
        const uniquePapersMap = new Map<string, {
            id: string;
            title: string;
            year: number | null;
            quartile: string | null;
            contributingMembers: Array<{ name: string; staffId: string | null; role: string }>;
            roles: Set<string>;
        }>();

        for (const pub of publications) {
            // Only count if member is 1st Author or Corresponding Author
            const role = pub.authorshipRole?.toUpperCase() || '';
            if (!role.includes('1ST AUTHOR') && !role.includes('FIRST AUTHOR') && !role.includes('CORRESPONDING')) {
                // Relaxed check to match memberYearlyStats logic
                continue;
            }

            // Use DOI as unique key, fallback to title
            const key = pub.doi || pub.title;

            if (!uniquePapersMap.has(key)) {
                uniquePapersMap.set(key, {
                    id: pub.id,
                    title: pub.title,
                    year: pub.publicationYear,
                    quartile: pub.wosQuartile,
                    contributingMembers: [],
                    roles: new Set()
                });
            }

            const paper = uniquePapersMap.get(key)!;
            paper.contributingMembers.push({
                name: pub.member.name,
                staffId: pub.member.staffId,
                role: pub.authorshipRole || 'Unknown'
            });
            paper.roles.add(role);
        }

        // Convert to array and calculate stats
        const uniquePapers = Array.from(uniquePapersMap.values());

        // Calculate quartile counts
        const quartileCounts = {
            q1: 0,
            q2: 0,
            q3: 0,
            q4: 0
        };

        const yearCounts: Record<number, number> = {};

        for (const paper of uniquePapers) {
            // Count quartiles
            if (paper.quartile === 'Q1') quartileCounts.q1++;
            else if (paper.quartile === 'Q2') quartileCounts.q2++;
            else if (paper.quartile === 'Q3') quartileCounts.q3++;
            else if (paper.quartile === 'Q4') quartileCounts.q4++;

            // Count by year
            if (paper.year) {
                yearCounts[paper.year] = (yearCounts[paper.year] || 0) + 1;
            }
        }

        // Calculate active members from the filtered publications
        // This ensures we only count members who have contributed to JOURNAL publications
        const activeMemberIds = new Set(publications.map(p => p.memberId));
        const activeMembers = activeMemberIds.size;

        // Calculate Top Contributors by Year
        // Calculate Top Contributors by Year (Aggregated)
        // Groups: 2025, 2024, 2023, 2022, 2021, Up to 2020
        const memberYearlyStats = new Map<string, Map<string, {
            name: string;
            staffId: string | null;
            count: number;
            q1Count: number;
            paperIds: Set<string>;
        }>>();

        const anchorYear = 2025;
        const startYear = 2021; // We show 2021-2025 individually
        const accumulatedLabel = `Up to ${startYear - 1}`; // "Up to 2020"

        for (const pub of publications) {
            const year = pub.publicationYear || 0;
            if (year === 0) continue;

            const role = pub.authorshipRole?.toUpperCase() || '';
            const isFirst = role.includes('1ST AUTHOR') || role === 'FIRST AUTHOR';
            const isCorr = role.includes('CORRESPONDING') || role === 'CORRESPONDING AUTHOR';

            if (!isFirst && !isCorr) continue;

            let yearKey = year.toString();
            if (year < startYear) {
                yearKey = accumulatedLabel;
            } else if (year > anchorYear) {
                continue; // Skip future years if any
            }

            if (!memberYearlyStats.has(yearKey)) {
                memberYearlyStats.set(yearKey, new Map());
            }

            const yearStats = memberYearlyStats.get(yearKey)!;
            const memberId = pub.member.id;

            // Unique key for paper to prevent double counting if multiple records/roles exist for same paper+member
            const paperUniqueKey = pub.doi || pub.title;

            if (!yearStats.has(memberId)) {
                yearStats.set(memberId, {
                    name: pub.member.name,
                    staffId: pub.member.staffId,
                    count: 0,
                    q1Count: 0,
                    paperIds: new Set()
                });
            }

            const memberStats = yearStats.get(memberId)!;

            if (!memberStats.paperIds.has(paperUniqueKey)) {
                memberStats.count++;
                if (pub.wosQuartile === 'Q1') {
                    memberStats.q1Count++;
                }
                memberStats.paperIds.add(paperUniqueKey);
            }
        }

        // Convert to sorted array for the response
        // Expected order: 2025, 2024, 2023, 2022, 2021, Up to 2020
        const yearsOrder = [
            anchorYear.toString(),
            (anchorYear - 1).toString(),
            (anchorYear - 2).toString(),
            (anchorYear - 3).toString(),
            (anchorYear - 4).toString(),
            accumulatedLabel
        ];

        const topMembersByYear = yearsOrder.map(yearKey => {
            const yearStats = memberYearlyStats.get(yearKey);

            // If no data for this year bucket, return empty list
            if (!yearStats) {
                return { year: yearKey, members: [] };
            }

            const members = Array.from(yearStats.values())
                .map(({ name, staffId, count, q1Count }) => ({ name, staffId, count, q1Count }))
                .sort((a, b) => {
                    if (b.count !== a.count) return b.count - a.count; // Sort by count desc
                    return b.q1Count - a.q1Count; // Tie-breaker: Q1 count
                })
                .slice(0, 5); // Top 5 members per year

            return {
                year: yearKey,
                members
            };
        });

        // Convert yearCounts to chart data
        // Logic: 6 bars
        // Convert yearCounts to chart data
        // Logic: 6 bars
        const chartDataMap = new Map<string, { q1: number, q2: number, q3: number, q4: number, count: number }>();
        yearsOrder.forEach(y => chartDataMap.set(y, { q1: 0, q2: 0, q3: 0, q4: 0, count: 0 })); // Initialize

        for (const paper of uniquePapers) {
            if (!paper.year) continue;

            let key = '';
            if (paper.year < startYear) {
                key = accumulatedLabel;
            } else {
                const yearStr = paper.year.toString();
                if (parseInt(yearStr) <= anchorYear) {
                    key = yearStr;
                }
            }

            if (key && chartDataMap.has(key)) {
                const data = chartDataMap.get(key)!;
                data.count++;
                if (paper.quartile === 'Q1') data.q1++;
                else if (paper.quartile === 'Q2') data.q2++;
                else if (paper.quartile === 'Q3') data.q3++;
                else if (paper.quartile === 'Q4') data.q4++;
            }
        }

        // Convert to array structure for frontend (Ordered chronologically for Bar Chart: Up to 2020 -> 2025)
        const publicationsByYear = [
            accumulatedLabel,
            startYear.toString(),
            (startYear + 1).toString(),
            (startYear + 2).toString(),
            (startYear + 3).toString(),
            (startYear + 4).toString()
        ].map(yearKey => ({
            year: yearKey,
            ...chartDataMap.get(yearKey)!,
            isAccumulated: yearKey === accumulatedLabel
        }));

        return NextResponse.json({
            success: true,
            stats: {
                totalPublications: publications.length,
                uniquePapers: uniquePapers.length,
                activeMembers,
                quartileCounts,
                publicationsByYear,
                topMembersByYear
            }
        });
    } catch (error) {
        console.error('[RC Overview] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch RC overview' },
            { status: 500 }
        );
    }
}

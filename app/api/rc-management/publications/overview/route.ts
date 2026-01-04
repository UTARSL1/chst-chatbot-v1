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

        // Get all publications with member info
        const publications = await prisma.publication.findMany({
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
            if (role !== '1ST AUTHOR' && role !== 'CORRESPONDING AUTHOR') {
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

        // Get active members count (members with at least 1 publication)
        const activeMembers = await prisma.rCMember.count({
            where: {
                totalPublications: {
                    gt: 0
                }
            }
        });

        // Calculate Top Contributors by Year
        const memberYearlyStats = new Map<string, Map<string, {
            name: string;
            staffId: string | null;
            count: number;
            q1Count: number;
            paperIds: Set<string>;
        }>>();

        for (const pub of publications) {
            const year = pub.publicationYear || 0;
            if (year === 0) continue;

            const role = pub.authorshipRole?.toUpperCase() || '';
            // Allow strict checks or combined checks if data format changes (e.g. "1st Author & Corresponding")
            const isFirst = role.includes('1ST AUTHOR') || role === 'FIRST AUTHOR';
            const isCorr = role.includes('CORRESPONDING') || role === 'CORRESPONDING AUTHOR';

            if (!isFirst && !isCorr) continue;

            const yearKey = year.toString();
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

            // Only count if this specific paper hasn't been counted for this member yet
            if (!memberStats.paperIds.has(paperUniqueKey)) {
                memberStats.count++;
                if (pub.wosQuartile === 'Q1') {
                    memberStats.q1Count++;
                }
                memberStats.paperIds.add(paperUniqueKey);
            }
        }

        // Convert to sorted array for the response
        // Get top 5 years
        const years = Array.from(memberYearlyStats.keys())
            .map(Number)
            .sort((a, b) => b - a)
            .slice(0, 5); // Last 5 years

        const topMembersByYear = years.map(year => {
            const yearStats = memberYearlyStats.get(year.toString())!;
            const members = Array.from(yearStats.values())
                .map(({ name, staffId, count, q1Count }) => ({ name, staffId, count, q1Count }))
                .sort((a, b) => {
                    if (b.count !== a.count) return b.count - a.count; // Sort by count desc
                    return b.q1Count - a.q1Count; // Tie-breaker: Q1 count
                })
                .slice(0, 5); // Top 5 members per year

            return {
                year,
                members
            };
        });

        // Convert yearCounts to chart data
        // Logic: 5 bars total.
        // Bar 1: Up to 2021 (Total accumulated)
        // Bar 2: 2022
        // Bar 3: 2023
        // Bar 4: 2024
        // Bar 5: 2025

        const anchorYear = 2025;
        const cutoffYear = anchorYear - 3; // 2022

        const chartDataMap = new Map<string, number>();
        chartDataMap.set(`Up to ${cutoffYear - 1}`, 0);
        chartDataMap.set((cutoffYear).toString(), 0);
        chartDataMap.set((cutoffYear + 1).toString(), 0);
        chartDataMap.set((cutoffYear + 2).toString(), 0);
        chartDataMap.set((cutoffYear + 3).toString(), 0);

        for (const paper of uniquePapers) {
            if (!paper.year) continue;

            if (paper.year < cutoffYear) {
                const key = `Up to ${cutoffYear - 1}`;
                chartDataMap.set(key, (chartDataMap.get(key) || 0) + 1);
            } else {
                const key = paper.year.toString();
                // Only track up to the anchor year, ignore future if any
                if (parseInt(key) <= anchorYear) {
                    chartDataMap.set(key, (chartDataMap.get(key) || 0) + 1);
                }
            }
        }

        // Convert key-value map to array structure for frontend
        const publicationsByYear = [
            { year: `Up to ${cutoffYear - 1}`, count: chartDataMap.get(`Up to ${cutoffYear - 1}`) || 0, isAccumulated: true },
            { year: cutoffYear, count: chartDataMap.get(cutoffYear.toString()) || 0, isAccumulated: false },
            { year: cutoffYear + 1, count: chartDataMap.get((cutoffYear + 1).toString()) || 0, isAccumulated: false },
            { year: cutoffYear + 2, count: chartDataMap.get((cutoffYear + 2).toString()) || 0, isAccumulated: false },
            { year: cutoffYear + 3, count: chartDataMap.get((cutoffYear + 3).toString()) || 0, isAccumulated: false },
        ];

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

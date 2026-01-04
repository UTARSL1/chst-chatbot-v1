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

        // Sort papers by year (most recent first) and get top 20
        const topPapers = uniquePapers
            .sort((a, b) => (b.year || 0) - (a.year || 0))
            .slice(0, 20)
            .map(paper => ({
                title: paper.title,
                year: paper.year,
                quartile: paper.quartile,
                contributingMembersCount: paper.contributingMembers.length,
                contributingMembers: paper.contributingMembers,
                roles: Array.from(paper.roles)
            }));

        // Convert yearCounts to array and sort
        const publicationsByYear = Object.entries(yearCounts)
            .map(([year, count]) => ({ year: parseInt(year), count }))
            .sort((a, b) => a.year - b.year);

        return NextResponse.json({
            success: true,
            stats: {
                totalPublications: publications.length,
                uniquePapers: uniquePapers.length,
                activeMembers,
                quartileCounts,
                publicationsByYear,
                topPapers
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

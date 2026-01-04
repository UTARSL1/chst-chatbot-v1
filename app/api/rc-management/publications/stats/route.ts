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

        const { searchParams } = new URL(request.url);
        const year = searchParams.get('year');

        // Get all publications across all members
        const allPublications = await prisma.publication.findMany({
            where: year && year !== 'all'
                ? { publicationYear: parseInt(year, 10) }
                : {},
            include: {
                member: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        const journalArticles = allPublications.filter(p =>
            p.publicationType?.toUpperCase().includes('JOURNAL')
        );

        const stats = {
            totalMembers: await prisma.rCMember.count(),
            totalPublications: allPublications.length,
            journalArticles: journalArticles.length,
            conferencePapers: allPublications.length - journalArticles.length,
            q1Publications: allPublications.filter(p => p.wosQuartile === 'Q1').length,
            q2Publications: allPublications.filter(p => p.wosQuartile === 'Q2').length,
            q3Publications: allPublications.filter(p => p.wosQuartile === 'Q3').length,
            q4Publications: allPublications.filter(p => p.wosQuartile === 'Q4').length,

            // Authorship breakdown
            firstAuthor: allPublications.filter(p => p.authorshipRole === '1st Author').length,
            correspondingAuthor: allPublications.filter(p => p.authorshipRole === 'Corresponding Author').length,
            coAuthor: allPublications.filter(p => p.authorshipRole === 'Co-author').length,

            // Authorship by quartile
            q1FirstAuthor: allPublications.filter(p => p.wosQuartile === 'Q1' && p.authorshipRole === '1st Author').length,
            q1Corresponding: allPublications.filter(p => p.wosQuartile === 'Q1' && p.authorshipRole === 'Corresponding Author').length,
            q1CoAuthor: allPublications.filter(p => p.wosQuartile === 'Q1' && p.authorshipRole === 'Co-author').length,

            q2FirstAuthor: allPublications.filter(p => p.wosQuartile === 'Q2' && p.authorshipRole === '1st Author').length,
            q2Corresponding: allPublications.filter(p => p.wosQuartile === 'Q2' && p.authorshipRole === 'Corresponding Author').length,
            q2CoAuthor: allPublications.filter(p => p.wosQuartile === 'Q2' && p.authorshipRole === 'Co-author').length,

            q3FirstAuthor: allPublications.filter(p => p.wosQuartile === 'Q3' && p.authorshipRole === '1st Author').length,
            q3Corresponding: allPublications.filter(p => p.wosQuartile === 'Q3' && p.authorshipRole === 'Corresponding Author').length,
            q3CoAuthor: allPublications.filter(p => p.wosQuartile === 'Q3' && p.authorshipRole === 'Co-author').length,

            q4FirstAuthor: allPublications.filter(p => p.wosQuartile === 'Q4' && p.authorshipRole === '1st Author').length,
            q4Corresponding: allPublications.filter(p => p.wosQuartile === 'Q4' && p.authorshipRole === 'Corresponding Author').length,
            q4CoAuthor: allPublications.filter(p => p.wosQuartile === 'Q4' && p.authorshipRole === 'Co-author').length
        };

        return NextResponse.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('[RC Publications Overall Stats] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch overall statistics' },
            { status: 500 }
        );
    }
}

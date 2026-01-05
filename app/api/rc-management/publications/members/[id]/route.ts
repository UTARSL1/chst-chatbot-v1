import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

console.log('[RC Publications] Module loaded, prisma client created');
console.log('[RC Publications] Prisma has rCMember?', 'rCMember' in prisma);

import { hasRCAccess } from '@/lib/utils/rc-member-check';
// ... imports

// ...

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        // Await params in Next.js 15+
        const params = await context.params;

        // Check authentication
        const session = await getServerSession(authOptions);

        // Allow if chairperson OR verified RC member
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

        const { searchParams } = new URL(request.url);
        const year = searchParams.get('year');

        // Build where clause for publications
        const publicationWhere: any = { memberId: params.id };
        if (year && year !== 'all') {
            publicationWhere.publicationYear = parseInt(year, 10);
        }

        // Get member with publications
        console.log('[RC Publications] About to query member:', params.id);
        console.log('[RC Publications] Prisma client type:', typeof prisma);
        console.log('[RC Publications] Has rCMember?', 'rCMember' in prisma);

        const member = await prisma.rCMember.findUnique({
            where: { id: params.id },
            include: {
                publications: {
                    where: publicationWhere,
                    orderBy: {
                        publicationYear: 'desc'
                    }
                }
            }
        });

        console.log('[RC Publications] Member query result:', member);

        if (!member) {
            return NextResponse.json(
                { error: 'Member not found' },
                { status: 404 }
            );
        }

        // Calculate filtered statistics
        const publications = member.publications;
        const journalArticles = publications.filter(p =>
            p.publicationType?.toUpperCase().includes('JOURNAL')
        );

        const stats = {
            totalPublications: publications.length,
            journalArticles: journalArticles.length,
            conferencePapers: publications.length - journalArticles.length,
            q1Publications: publications.filter(p => p.wosQuartile === 'Q1').length,
            q2Publications: publications.filter(p => p.wosQuartile === 'Q2').length,
            q3Publications: publications.filter(p => p.wosQuartile === 'Q3').length,
            q4Publications: publications.filter(p => p.wosQuartile === 'Q4').length,

            // Authorship breakdown
            firstAuthor: publications.filter(p => p.authorshipRole === '1st Author').length,
            correspondingAuthor: publications.filter(p => p.authorshipRole === 'Corresponding Author').length,
            coAuthor: publications.filter(p => p.authorshipRole === 'Co-author').length,

            // Authorship by quartile
            q1FirstAuthor: publications.filter(p => p.wosQuartile === 'Q1' && p.authorshipRole === '1st Author').length,
            q1Corresponding: publications.filter(p => p.wosQuartile === 'Q1' && p.authorshipRole === 'Corresponding Author').length,
            q1CoAuthor: publications.filter(p => p.wosQuartile === 'Q1' && p.authorshipRole === 'Co-author').length,

            q2FirstAuthor: publications.filter(p => p.wosQuartile === 'Q2' && p.authorshipRole === '1st Author').length,
            q2Corresponding: publications.filter(p => p.wosQuartile === 'Q2' && p.authorshipRole === 'Corresponding Author').length,
            q2CoAuthor: publications.filter(p => p.wosQuartile === 'Q2' && p.authorshipRole === 'Co-author').length,

            q3FirstAuthor: publications.filter(p => p.wosQuartile === 'Q3' && p.authorshipRole === '1st Author').length,
            q3Corresponding: publications.filter(p => p.wosQuartile === 'Q3' && p.authorshipRole === 'Corresponding Author').length,
            q3CoAuthor: publications.filter(p => p.wosQuartile === 'Q3' && p.authorshipRole === 'Co-author').length,

            q4FirstAuthor: publications.filter(p => p.wosQuartile === 'Q4' && p.authorshipRole === '1st Author').length,
            q4Corresponding: publications.filter(p => p.wosQuartile === 'Q4' && p.authorshipRole === 'Corresponding Author').length,
            q4CoAuthor: publications.filter(p => p.wosQuartile === 'Q4' && p.authorshipRole === 'Co-author').length
        };

        return NextResponse.json({
            success: true,
            member: {
                id: member.id,
                name: member.name,
                staffId: member.staffId,
                createdAt: member.createdAt,
                updatedAt: member.updatedAt
            },
            stats,
            publications
        });
    } catch (error) {
        const errorDetails = {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : 'No stack',
            type: typeof error,
            keys: error && typeof error === 'object' ? Object.keys(error) : []
        };

        // Write to file for debugging
        const fs = require('fs');
        const path = require('path');
        fs.writeFileSync(
            path.join(process.cwd(), 'rc-publications-error.json'),
            JSON.stringify(errorDetails, null, 2)
        );

        console.error('[RC Publications Member Details] Error:', error);
        console.error('[RC Publications Member Details] Error stack:', error instanceof Error ? error.stack : 'No stack');
        console.error('[RC Publications Member Details] Error message:', error instanceof Error ? error.message : String(error));
        return NextResponse.json(
            { error: 'Failed to fetch member details' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;

        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Delete member (publications will be cascade deleted)
        await prisma.rCMember.delete({
            where: { id: params.id }
        });

        return NextResponse.json({
            success: true,
            message: 'Member deleted successfully'
        });
    } catch (error) {
        console.error('[RC Publications Delete Member] Error:', error);
        return NextResponse.json(
            { error: 'Failed to delete member' },
            { status: 500 }
        );
    }
}

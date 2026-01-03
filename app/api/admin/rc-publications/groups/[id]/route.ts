import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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

        // Get working group with members and their publications
        const group = await prisma.workingGroup.findUnique({
            where: { id: params.id },
            include: {
                members: {
                    include: {
                        member: {
                            include: {
                                publications: {
                                    where: year && year !== 'all'
                                        ? { publicationYear: parseInt(year, 10) }
                                        : {}
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!group) {
            return NextResponse.json(
                { error: 'Working group not found' },
                { status: 404 }
            );
        }

        // Aggregate statistics across all members
        const allPublications = group.members.flatMap(m => m.member.publications);

        const journalArticles = allPublications.filter(p =>
            p.publicationType?.toUpperCase().includes('JOURNAL')
        );

        const stats = {
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
            group: {
                id: group.id,
                name: group.name,
                description: group.description,
                memberCount: group.members.length,
                members: group.members.map(m => ({
                    id: m.member.id,
                    name: m.member.name
                }))
            },
            stats,
            publications: allPublications
        });
    } catch (error) {
        console.error('[RC Publications Group Details] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch group details' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { name, description, memberIds } = body;

        // Update group
        const group = await prisma.workingGroup.update({
            where: { id: params.id },
            data: {
                name,
                description,
                members: {
                    deleteMany: {},
                    create: (memberIds || []).map((memberId: string) => ({
                        memberId
                    }))
                }
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Working group updated successfully',
            group
        });
    } catch (error) {
        console.error('[RC Publications Update Group] Error:', error);
        return NextResponse.json(
            { error: 'Failed to update working group' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Delete group (members will be cascade deleted from junction table)
        await prisma.workingGroup.delete({
            where: { id: params.id }
        });

        return NextResponse.json({
            success: true,
            message: 'Working group deleted successfully'
        });
    } catch (error) {
        console.error('[RC Publications Delete Group] Error:', error);
        return NextResponse.json(
            { error: 'Failed to delete working group' },
            { status: 500 }
        );
    }
}

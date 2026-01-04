import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parsePublicationCSV } from '@/lib/rc-publications/publication-parser';

export async function POST(request: NextRequest) {
    try {
        // Check authentication and role
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json(
                { error: 'Unauthorized. Chairperson access required.' },
                { status: 403 }
            );
        }

        // Get form data
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file type
        if (!file.name.endsWith('.csv')) {
            return NextResponse.json(
                { error: 'Invalid file type. Please upload a CSV file.' },
                { status: 400 }
            );
        }

        // Read file content
        const fileContent = await file.text();

        // Parse CSV
        const parsedData = await parsePublicationCSV(fileContent);

        // Check if member already exists
        const existingMember = await prisma.rCMember.findFirst({
            where: { name: parsedData.staffName }
        });

        if (existingMember) {
            // Update existing member
            await prisma.publication.deleteMany({
                where: { memberId: existingMember.id }
            });

            await prisma.rCMember.update({
                where: { id: existingMember.id },
                data: {
                    staffId: parsedData.staffId,
                    totalPublications: parsedData.totalPublications,
                    journalArticles: parsedData.journalArticles,
                    conferencePapers: parsedData.conferencePapers,
                    q1Publications: parsedData.q1Count,
                    q2Publications: parsedData.q2Count,
                    q3Publications: parsedData.q3Count,
                    q4Publications: parsedData.q4Count,
                    publications: {
                        create: parsedData.publications.map(pub => ({
                            title: pub.title,
                            journalName: pub.journalName,
                            publicationType: pub.publicationType,
                            wosQuartile: pub.wosQuartile,
                            authorshipRole: pub.authorshipRole,
                            publicationYear: pub.publicationYear,
                            publicationDate: pub.publicationDate,
                            role: pub.role,
                            issn: pub.issn,
                            doi: pub.doi
                        }))
                    }
                }
            });

            return NextResponse.json({
                success: true,
                message: 'Member publications updated successfully',
                member: {
                    id: existingMember.id,
                    name: parsedData.staffName,
                    totalPublications: parsedData.totalPublications
                }
            });
        } else {
            // Create new member
            const newMember = await prisma.rCMember.create({
                data: {
                    name: parsedData.staffName,
                    staffId: parsedData.staffId,
                    totalPublications: parsedData.totalPublications,
                    journalArticles: parsedData.journalArticles,
                    conferencePapers: parsedData.conferencePapers,
                    q1Publications: parsedData.q1Count,
                    q2Publications: parsedData.q2Count,
                    q3Publications: parsedData.q3Count,
                    q4Publications: parsedData.q4Count,
                    publications: {
                        create: parsedData.publications.map(pub => ({
                            title: pub.title,
                            journalName: pub.journalName,
                            publicationType: pub.publicationType,
                            wosQuartile: pub.wosQuartile,
                            authorshipRole: pub.authorshipRole,
                            publicationYear: pub.publicationYear,
                            publicationDate: pub.publicationDate,
                            role: pub.role,
                            issn: pub.issn,
                            doi: pub.doi
                        }))
                    }
                }
            });

            return NextResponse.json({
                success: true,
                message: 'Member publications uploaded successfully',
                member: {
                    id: newMember.id,
                    name: parsedData.staffName,
                    totalPublications: parsedData.totalPublications
                }
            });
        }
    } catch (error) {
        console.error('[RC Publications Upload] Error:', error);
        return NextResponse.json(
            {
                error: 'Failed to upload publications',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

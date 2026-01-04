import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parsePostgraduateCSV } from '@/lib/rc-postgraduate/postgraduate-parser';

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
        const parsedData = await parsePostgraduateCSV(fileContent);

        // Check if member already exists
        const existingMember = await prisma.rCPostgraduateMember.findFirst({
            where: { name: parsedData.staffName }
        });

        if (existingMember) {
            // Update existing member
            await prisma.postgraduateSupervision.deleteMany({
                where: { memberId: existingMember.id }
            });

            await prisma.rCPostgraduateMember.update({
                where: { id: existingMember.id },
                data: {
                    staffId: parsedData.staffId,
                    faculty: parsedData.faculty,
                    totalStudents: parsedData.totalStudents,
                    inProgressCount: parsedData.inProgressCount,
                    completedCount: parsedData.completedCount,
                    phdCount: parsedData.phdCount,
                    masterCount: parsedData.masterCount,
                    mainSupervisorCount: parsedData.mainSupervisorCount,
                    coSupervisorCount: parsedData.coSupervisorCount,
                    supervisions: {
                        create: parsedData.supervisions.map(sup => ({
                            staffId: sup.staffId,
                            staffName: sup.staffName,
                            faculty: sup.faculty,
                            staffCategory: sup.staffCategory,
                            status: sup.status,
                            areaOfStudy: sup.areaOfStudy,
                            researchCentre: sup.researchCentre,
                            studentName: sup.studentName,
                            level: sup.level,
                            institution: sup.institution,
                            programTitle: sup.programTitle,
                            startDate: sup.startDate,
                            completedDate: sup.completedDate,
                            startYear: sup.startYear,
                            completedYear: sup.completedYear,
                            role: sup.role,
                        }))
                    }
                }
            });

            return NextResponse.json({
                success: true,
                message: `Updated supervision records for ${parsedData.staffName}`,
                member: {
                    id: existingMember.id,
                    name: parsedData.staffName,
                    totalStudents: parsedData.totalStudents
                }
            });
        } else {
            // Create new member
            const newMember = await prisma.rCPostgraduateMember.create({
                data: {
                    name: parsedData.staffName,
                    staffId: parsedData.staffId,
                    faculty: parsedData.faculty,
                    totalStudents: parsedData.totalStudents,
                    inProgressCount: parsedData.inProgressCount,
                    completedCount: parsedData.completedCount,
                    phdCount: parsedData.phdCount,
                    masterCount: parsedData.masterCount,
                    mainSupervisorCount: parsedData.mainSupervisorCount,
                    coSupervisorCount: parsedData.coSupervisorCount,
                    supervisions: {
                        create: parsedData.supervisions.map(sup => ({
                            staffId: sup.staffId,
                            staffName: sup.staffName,
                            faculty: sup.faculty,
                            staffCategory: sup.staffCategory,
                            status: sup.status,
                            areaOfStudy: sup.areaOfStudy,
                            researchCentre: sup.researchCentre,
                            studentName: sup.studentName,
                            level: sup.level,
                            institution: sup.institution,
                            programTitle: sup.programTitle,
                            startDate: sup.startDate,
                            completedDate: sup.completedDate,
                            startYear: sup.startYear,
                            completedYear: sup.completedYear,
                            role: sup.role,
                        }))
                    }
                }
            });

            return NextResponse.json({
                success: true,
                message: `Successfully uploaded ${parsedData.totalStudents} supervisions for ${parsedData.staffName}`,
                member: {
                    id: newMember.id,
                    name: parsedData.staffName,
                    totalStudents: parsedData.totalStudents
                }
            });
        }
    } catch (error) {
        console.error('[RC Postgraduate Upload] Error:', error);
        return NextResponse.json(
            {
                error: 'Failed to upload postgraduate supervision data',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

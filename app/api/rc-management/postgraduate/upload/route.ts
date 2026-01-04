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

        // Parse CSV - returns array of members
        const membersData = await parsePostgraduateCSV(fileContent);

        let updatedMembers = 0;
        let createdMembers = 0;
        let totalSupervisions = 0;

        for (const data of membersData) {
            totalSupervisions += data.totalStudents;

            // Try to find existing member by ID first, then Name
            let existingMember = null;

            if (data.staffId) {
                existingMember = await prisma.rCPostgraduateMember.findFirst({
                    where: { staffId: data.staffId }
                });
            }

            if (!existingMember && data.staffName) {
                existingMember = await prisma.rCPostgraduateMember.findFirst({
                    where: { name: data.staffName }
                });
            }

            if (existingMember) {
                // Update existing member
                // First delete old supervisions to replace with new data (full sync for this member)
                await prisma.postgraduateSupervision.deleteMany({
                    where: { memberId: existingMember.id }
                });

                await prisma.rCPostgraduateMember.update({
                    where: { id: existingMember.id },
                    data: {
                        staffId: data.staffId || existingMember.staffId,
                        faculty: data.faculty || existingMember.faculty,
                        totalStudents: data.totalStudents,
                        inProgressCount: data.inProgressCount,
                        completedCount: data.completedCount,
                        phdCount: data.phdCount,
                        masterCount: data.masterCount,
                        mainSupervisorCount: data.mainSupervisorCount,
                        coSupervisorCount: data.coSupervisorCount,
                        supervisions: {
                            create: data.supervisions.map(sup => ({
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
                updatedMembers++;
            } else {
                // Create new member
                await prisma.rCPostgraduateMember.create({
                    data: {
                        name: data.staffName,
                        staffId: data.staffId,
                        faculty: data.faculty,
                        totalStudents: data.totalStudents,
                        inProgressCount: data.inProgressCount,
                        completedCount: data.completedCount,
                        phdCount: data.phdCount,
                        masterCount: data.masterCount,
                        mainSupervisorCount: data.mainSupervisorCount,
                        coSupervisorCount: data.coSupervisorCount,
                        supervisions: {
                            create: data.supervisions.map(sup => ({
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
                createdMembers++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Successfully processed ${membersData.length} supervisors. Created: ${createdMembers}, Updated: ${updatedMembers}. Total Records: ${totalSupervisions}`,
            member: membersData.length === 1 ? { name: membersData[0].staffName, id: 'multi' } : { name: 'Multiple Members', id: 'multi' } // Legacy support for frontend
        });

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

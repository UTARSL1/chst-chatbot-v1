import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Papa from 'papaparse';

/**
 * Upload RC Grant data from CSV files
 * POST /api/rc-grant/upload
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const inUtarFile = formData.get('inUtarFile') as File | null;
        const notInUtarFile = formData.get('notInUtarFile') as File | null;

        if (!inUtarFile && !notInUtarFile) {
            return NextResponse.json({ error: 'At least one file is required' }, { status: 400 });
        }

        // Group grants by Staff ID
        const grantsByStaff = new Map<string, {
            info: { name: string, faculty: string },
            grants: any[]
        }>();

        // Determine which locations are being updated in this request
        const locationsToUpdate: string[] = [];
        if (inUtarFile) locationsToUpdate.push('IN_UTAR');
        if (notInUtarFile) locationsToUpdate.push('NOT_IN_UTAR');

        const processRow = (row: any, fundingLocation: 'IN_UTAR' | 'NOT_IN_UTAR') => {
            // Sanitize Staff ID to prevent duplicates
            const rawStaffId = row['Staff ID'];
            if (!rawStaffId) return;
            // Strip "? " prefix if present (common Excel CSV artifact)
            const staffId = String(rawStaffId).trim().replace(/^\?\s*/, '');

            if (!grantsByStaff.has(staffId)) {
                grantsByStaff.set(staffId, {
                    info: {
                        name: row['Staff Name'] || '',
                        faculty: row['Faculty'] || ''
                    },
                    grants: []
                });
            }

            const StaffData = grantsByStaff.get(staffId)!;

            // Update info if missing
            if (!StaffData.info.name && row['Staff Name']) StaffData.info.name = row['Staff Name'];
            if (!StaffData.info.faculty && row['Faculty']) StaffData.info.faculty = row['Faculty'];

            const fundingBody = row['Funding Body'] || '';
            const typeOfFunding = row['Type of Funding'] || ''; // For Not In UTAR

            // Determine grant type and category
            const fundingBodyUpper = fundingBody.toUpperCase();
            const typeOfFundingUpper = typeOfFunding.toUpperCase();

            // Logic: UTARRF is Internal. Everything else is External.
            const grantType = fundingBodyUpper.includes('UTARRF') ? 'INTERNAL' : 'EXTERNAL';

            let grantCategory = null;
            if (grantType === 'EXTERNAL') {
                // Check keywords for International. 'OTHERS' also implies International per user request.
                const isInternational =
                    fundingBodyUpper.includes('INTERNATIONAL') ||
                    fundingBodyUpper.includes('OTHERS') ||
                    typeOfFundingUpper.includes('INTERNATIONAL') ||
                    typeOfFundingUpper.includes('OTHERS');

                grantCategory = isInternational ? 'INTERNATIONAL' : 'NATIONAL';
            }

            // Parse keywords
            const keywords = [
                row['Keywords 1'],
                row['Keywords 2'],
                row['Keywords 3'],
                row['Keywords 4'],
                row['Keywords 5']
            ].filter(k => k && k.trim());

            // Parse collaborators
            const collaborators = [];
            for (let i = 1; i <= 5; i++) {
                const collabName = row[`Collaborators ${i}`];
                const collabInst = row[`Institution ${i}`];
                const collabRole = row[`Role ${i}`];

                if (collabName && collabName.trim()) {
                    collaborators.push({
                        name: collabName,
                        institution: collabInst || '',
                        role: collabRole || ''
                    });
                }
            }

            StaffData.grants.push({
                staffId,
                staffName: StaffData.info.name,
                faculty: StaffData.info.faculty,
                fundingLocation,
                fundingBody,
                projectStatus: row['Project Status'] || '',
                role: row['Role'] || '',
                title: row['Title of Research'] || '',
                objective: row['Objective'] || '',
                projectDuration: row['Project Duration'] || '',
                commencementDate: row['Commencement Date'] || '',
                endDate: row['End Date'] || '',
                fundingAmount: parseFloat(row['Funding Amount (RM)']?.replace(/,/g, '') || '0'),
                grantType,
                grantCategory,
                projectNumber: row['Project Number'] || '',
                researchArea: row['Research Area'] || '',
                researchCentre: row['Research Centre'] || '',
                keywords: JSON.stringify(keywords),
                collaborators: JSON.stringify(collaborators),
                institutionParked: row['Institution Where The Funding is Parked'] || null
            });
        };

        // Process IN_UTAR file
        if (inUtarFile) {
            const text = await inUtarFile.text();
            const data = Papa.parse(text, { header: true });
            (data.data as any[]).forEach(row => processRow(row, 'IN_UTAR'));
        }

        // Process NOT_IN_UTAR file
        if (notInUtarFile) {
            const text = await notInUtarFile.text();
            const data = Papa.parse(text, { header: true });
            (data.data as any[]).forEach(row => processRow(row, 'NOT_IN_UTAR'));
        }

        if (grantsByStaff.size === 0) {
            return NextResponse.json({ error: 'No valid grant data found' }, { status: 400 });
        }

        // Process each staff member
        let processedCount = 0;

        for (const [staffId, data] of grantsByStaff) {
            // Find or create member
            let member = await prisma.rCGrantMember.findFirst({ where: { staffId } });

            if (!member) {
                member = await prisma.rCGrantMember.create({
                    data: {
                        name: data.info.name || 'Unknown',
                        staffId,
                        faculty: data.info.faculty || ''
                    }
                });
            } else {
                // Update name/faculty if they were missing or changed
                await prisma.rCGrantMember.update({
                    where: { id: member.id },
                    data: {
                        name: data.info.name || member.name,
                        faculty: data.info.faculty || member.faculty
                    }
                });
            }

            // Scoped Deletion: Only delete grants for the locations we are updating
            // This allows merging IN_UTAR and NOT_IN_UTAR data by uploading them sequentially
            await prisma.grant.deleteMany({
                where: {
                    memberId: member.id,
                    fundingLocation: { in: locationsToUpdate }
                }
            });

            // Insert new grants
            if (data.grants.length > 0) {
                await prisma.grant.createMany({
                    data: data.grants.map(g => ({
                        ...g,
                        memberId: member!.id
                    }))
                });
            }

            // Fetch ALL grants for this member to calculate correct totals (merging existing + new)
            const allGrants = await prisma.grant.findMany({
                where: { memberId: member.id }
            });

            const stats = {
                totalGrants: allGrants.length,
                totalFunding: allGrants.reduce((sum: number, g: any) => sum + Number(g.fundingAmount), 0),
                inUtarGrants: allGrants.filter((g: any) => g.fundingLocation === 'IN_UTAR').length,
                notInUtarGrants: allGrants.filter((g: any) => g.fundingLocation === 'NOT_IN_UTAR').length,
                internalGrants: allGrants.filter((g: any) => g.grantType === 'INTERNAL').length,
                externalGrants: allGrants.filter((g: any) => g.grantType === 'EXTERNAL').length,
                piCount: allGrants.filter((g: any) => g.role === 'PRINCIPAL INVESTIGATOR').length,
                coResearcherCount: allGrants.filter((g: any) => g.role === 'CO-RESEARCHER').length
            };

            await prisma.rCGrantMember.update({
                where: { id: member.id },
                data: stats
            });

            processedCount++;
        }

        return NextResponse.json({
            success: true,
            membersProcessed: processedCount,
            totalGrantsFound: Array.from(grantsByStaff.values()).reduce((sum, d) => sum + d.grants.length, 0)
        });

    } catch (error) {
        console.error('Error uploading RC grant data:', error);
        return NextResponse.json(
            { error: 'Failed to upload grant data' },
            { status: 500 }
        );
    }
}

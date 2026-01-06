import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import prisma from '@/lib/prisma';
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
        const staffId = formData.get('staffId') as string;

        if (!staffId) {
            return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });
        }

        if (!inUtarFile && !notInUtarFile) {
            return NextResponse.json({ error: 'At least one file is required' }, { status: 400 });
        }

        const grants: any[] = [];
        let staffName = '';
        let faculty = '';

        // Process IN_UTAR file
        if (inUtarFile) {
            const inUtarText = await inUtarFile.text();
            const inUtarData = Papa.parse(inUtarText, { header: true });

            for (const row of inUtarData.data as any[]) {
                if (!row['Staff ID']) continue;

                staffName = row['Staff Name'] || staffName;
                faculty = row['Faculty'] || faculty;

                const fundingBody = row['Funding Body'] || '';
                const grantType = fundingBody.toUpperCase().includes('UTARRF') ? 'INTERNAL' : 'EXTERNAL';

                // Determine grant category for external grants
                let grantCategory = null;
                if (grantType === 'EXTERNAL') {
                    if (fundingBody.toLowerCase().includes('international')) {
                        grantCategory = 'INTERNATIONAL';
                    } else {
                        grantCategory = 'NATIONAL';
                    }
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

                grants.push({
                    staffId: row['Staff ID'],
                    staffName: row['Staff Name'],
                    faculty: row['Faculty'],
                    fundingLocation: 'IN_UTAR',
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
                    institutionParked: null
                });
            }
        }

        // Process NOT_IN_UTAR file
        if (notInUtarFile) {
            const notInUtarText = await notInUtarFile.text();
            const notInUtarData = Papa.parse(notInUtarText, { header: true });

            for (const row of notInUtarData.data as any[]) {
                if (!row['Staff ID']) continue;

                staffName = row['Staff Name'] || staffName;
                faculty = row['Faculty'] || faculty;

                const fundingBody = row['Funding Body'] || '';
                const typeOfFunding = row['Type of Funding'] || '';

                // Determine grant type and category
                const grantType = fundingBody.toUpperCase().includes('UTARRF') ? 'INTERNAL' : 'EXTERNAL';
                let grantCategory = null;
                if (grantType === 'EXTERNAL') {
                    if (typeOfFunding.toUpperCase().includes('INTERNATIONAL')) {
                        grantCategory = 'INTERNATIONAL';
                    } else {
                        grantCategory = 'NATIONAL';
                    }
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

                grants.push({
                    staffId: row['Staff ID'],
                    staffName: row['Staff Name'],
                    faculty: row['Faculty'],
                    fundingLocation: 'NOT_IN_UTAR',
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
            }
        }

        if (grants.length === 0) {
            return NextResponse.json({ error: 'No valid grant data found in files' }, { status: 400 });
        }

        // Find or create member
        let member = await prisma.rCGrantMember.findFirst({
            where: { staffId }
        });

        if (!member) {
            member = await prisma.rCGrantMember.create({
                data: {
                    name: staffName,
                    staffId,
                    faculty
                }
            });
        }

        // Delete existing grants for this member
        await prisma.grant.deleteMany({
            where: { memberId: member.id }
        });

        // Insert new grants
        await prisma.grant.createMany({
            data: grants.map(g => ({
                ...g,
                memberId: member!.id
            }))
        });

        // Update member statistics
        const stats = {
            totalGrants: grants.length,
            totalFunding: grants.reduce((sum, g) => sum + g.fundingAmount, 0),
            inUtarGrants: grants.filter(g => g.fundingLocation === 'IN_UTAR').length,
            notInUtarGrants: grants.filter(g => g.fundingLocation === 'NOT_IN_UTAR').length,
            internalGrants: grants.filter(g => g.grantType === 'INTERNAL').length,
            externalGrants: grants.filter(g => g.grantType === 'EXTERNAL').length,
            piCount: grants.filter(g => g.role === 'PRINCIPAL INVESTIGATOR').length,
            coResearcherCount: grants.filter(g => g.role === 'CO-RESEARCHER').length
        };

        await prisma.rCGrantMember.update({
            where: { id: member.id },
            data: stats
        });

        return NextResponse.json({
            success: true,
            member: {
                ...member,
                ...stats
            },
            grantsProcessed: grants.length
        });

    } catch (error) {
        console.error('Error uploading RC grant data:', error);
        return NextResponse.json(
            { error: 'Failed to upload grant data' },
            { status: 500 }
        );
    }
}

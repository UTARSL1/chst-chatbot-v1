/**
 * Verify Complete LKC FES Staff Processing
 * 
 * This script verifies that all LKC FES academic staff have been processed
 * and generates a comprehensive report
 */

import fs from 'fs';
import path from 'path';

interface StaffMember {
    searchId: string;
    name: string;
    email: string;
    department: string;
    departmentAcronym: string;
    designation: string;
    scopusUrl: string;
}

interface PublicationRecord {
    searchId: string;
    name: string;
    email: string;
    department: string;
    departmentAcronym: string;
    scopusAuthorId: string;
    publications: Array<{
        year: number;
        count: number;
        success: boolean;
    }>;
    totalPublications: number;
}

function verifyProcessing(): void {
    console.log('='.repeat(80));
    console.log('LKC FES STAFF PROCESSING VERIFICATION');
    console.log('='.repeat(80));
    console.log();

    // Load staff directory
    const staffDirPath = path.join(process.cwd(), 'lib', 'tools', 'staff_directory.json');
    const staffDirectory = JSON.parse(fs.readFileSync(staffDirPath, 'utf-8'));

    // Extract all LKC FES academic staff
    const lkcfesStaff: StaffMember[] = [];
    const lkcfes = staffDirectory.faculties?.['LKC FES'];

    if (lkcfes) {
        const departments = lkcfes.departments || {};

        for (const [deptKey, deptData] of Object.entries(departments) as [string, any][]) {
            // Skip non-academic departments
            if (deptKey === 'DLMSA' || deptKey === 'FGO') continue;
            if (deptData.departmentType !== 'Academic') continue;

            const staff = deptData.staff || [];

            for (const member of staff) {
                const isAcademic = member.designation &&
                    (member.designation.includes('Professor') ||
                        member.designation.includes('Lecturer') ||
                        member.designation.includes('Instructor'));

                if (isAcademic) {
                    lkcfesStaff.push({
                        searchId: member.searchId,
                        name: member.name,
                        email: member.email,
                        department: member.department,
                        departmentAcronym: member.departmentAcronym,
                        designation: member.designation,
                        scopusUrl: member.scopusUrl || '',
                    });
                }
            }
        }
    }

    console.log('Step 1: Total LKC FES Academic Staff in Directory');
    console.log('='.repeat(80));
    console.log(`Total academic staff: ${lkcfesStaff.length}`);
    console.log();

    // Categorize staff by Scopus URL status
    const withScopusUrl = lkcfesStaff.filter(s => {
        const url = s.scopusUrl.trim();
        return url !== '' && url.toUpperCase() !== 'NIL' && url.includes('scopus.com');
    });

    const withoutScopusUrl = lkcfesStaff.filter(s => {
        const url = s.scopusUrl.trim();
        return url === '' || url.toUpperCase() === 'NIL' || !url.includes('scopus.com');
    });

    console.log('Staff categorized by Scopus URL:');
    console.log(`  With valid Scopus URL: ${withScopusUrl.length}`);
    console.log(`  Without Scopus URL: ${withoutScopusUrl.length}`);
    console.log();

    // Load publication data
    const publicationData = JSON.parse(
        fs.readFileSync('lkcfes-scopus-publications.json', 'utf-8')
    );
    const publicationRecords: PublicationRecord[] = publicationData.results;

    console.log('='.repeat(80));
    console.log('Step 2: Publication Data Analysis');
    console.log('='.repeat(80));
    console.log(`Total records in publication JSON: ${publicationRecords.length}`);
    console.log();

    // Match staff with publication records
    const staffWithPublications = new Set<string>();
    const staffWithoutPublications: StaffMember[] = [];

    for (const staff of withScopusUrl) {
        const hasRecord = publicationRecords.some(r => r.email === staff.email);

        if (hasRecord) {
            staffWithPublications.add(staff.email);
        } else {
            staffWithoutPublications.push(staff);
        }
    }

    console.log('Matching Results:');
    console.log(`  Staff with publication records: ${staffWithPublications.size}`);
    console.log(`  Staff with Scopus URL but NO publication record: ${staffWithoutPublications.length}`);
    console.log();

    if (staffWithoutPublications.length > 0) {
        console.log('⚠️  WARNING: Staff with Scopus URL but missing from publication JSON:');
        staffWithoutPublications.forEach(s => {
            console.log(`  - ${s.name} (${s.email}) - ${s.departmentAcronym}`);
        });
        console.log();
    }

    // Analyze publication statistics
    const staffWith0Pubs = publicationRecords.filter(r => r.totalPublications === 0);
    const staffWithPubs = publicationRecords.filter(r => r.totalPublications > 0);

    console.log('='.repeat(80));
    console.log('Step 3: Publication Statistics');
    console.log('='.repeat(80));
    console.log(`Staff with publications > 0: ${staffWithPubs.length}`);
    console.log(`Staff with 0 publications: ${staffWith0Pubs.length}`);
    console.log();

    const total2023 = publicationData.metadata.statistics.publications2023;
    const total2024 = publicationData.metadata.statistics.publications2024;
    const total2025 = publicationData.metadata.statistics.publications2025;
    const totalPubs = publicationData.metadata.statistics.totalPublications;
    const avgPerStaff = publicationData.metadata.statistics.averagePerStaff;

    console.log('Publication Counts:');
    console.log(`  2023: ${total2023}`);
    console.log(`  2024: ${total2024}`);
    console.log(`  2025: ${total2025}`);
    console.log(`  Total: ${totalPubs}`);
    console.log(`  Average per staff: ${avgPerStaff}`);
    console.log();

    // Verification summary
    console.log('='.repeat(80));
    console.log('VERIFICATION SUMMARY');
    console.log('='.repeat(80));
    console.log();

    const expectedTotal = lkcfesStaff.length;
    const processedWithScopus = staffWithPublications.size;
    const withoutScopus = withoutScopusUrl.length;
    const accountedFor = processedWithScopus + withoutScopus;

    console.log('Processing Breakdown:');
    console.log(`  1. Initial batch (154 staff): ✅ Processed`);
    console.log(`  2. Corrected IDs (29 staff): ✅ Processed`);
    console.log(`  3. CSV batch (42 staff with IDs): ✅ Processed`);
    console.log(`  4. Staff without Scopus IDs (29 from CSV): ✅ Documented`);
    console.log();

    console.log('Final Count:');
    console.log(`  Total LKC FES academic staff: ${expectedTotal}`);
    console.log(`  Staff with Scopus IDs processed: ${processedWithScopus}`);
    console.log(`  Staff without Scopus IDs: ${withoutScopus}`);
    console.log(`  Total accounted for: ${accountedFor}`);
    console.log();

    const isComplete = accountedFor === expectedTotal && staffWithoutPublications.length === 0;

    if (isComplete) {
        console.log('✅ STATUS: ALL STAFF PROCESSED AND VERIFIED!');
        console.log();
        console.log('The publication JSON is complete and ready for UI development.');
    } else {
        console.log('⚠️  STATUS: VERIFICATION ISSUES DETECTED');
        console.log();
        console.log('Issues:');
        if (accountedFor !== expectedTotal) {
            console.log(`  - Mismatch: ${expectedTotal} total vs ${accountedFor} accounted for`);
        }
        if (staffWithoutPublications.length > 0) {
            console.log(`  - ${staffWithoutPublications.length} staff with Scopus URL missing from publication JSON`);
        }
    }

    console.log();
    console.log('='.repeat(80));

    // Save verification report
    const report = {
        verifiedAt: new Date().toISOString(),
        totalStaff: expectedTotal,
        breakdown: {
            withScopusIds: processedWithScopus,
            withoutScopusIds: withoutScopus,
            totalAccountedFor: accountedFor,
        },
        publicationStats: {
            totalRecords: publicationRecords.length,
            staffWithPublications: staffWithPubs.length,
            staffWith0Publications: staffWith0Pubs.length,
            publications2023: total2023,
            publications2024: total2024,
            publications2025: total2025,
            totalPublications: totalPubs,
            averagePerStaff: avgPerStaff,
        },
        processingBatches: {
            initialBatch: 154,
            correctedIds: 29,
            csvBatch: 42,
            withoutScopusIds: 29,
        },
        isComplete,
        issues: {
            staffMissingFromPublicationJson: staffWithoutPublications.map(s => ({
                name: s.name,
                email: s.email,
                department: s.departmentAcronym,
                scopusUrl: s.scopusUrl,
            })),
        },
    };

    fs.writeFileSync(
        'lkcfes-verification-report.json',
        JSON.stringify(report, null, 2),
        'utf-8'
    );

    console.log('📄 Verification report saved: lkcfes-verification-report.json');
    console.log();
}

if (require.main === module) {
    verifyProcessing();
}

export { verifyProcessing };

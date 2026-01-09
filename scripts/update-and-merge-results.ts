/**
 * Update Staff Directory and Merge Publication Results
 * 
 * This script:
 * 1. Updates staff_directory.json with corrected Scopus IDs
 * 2. Merges corrected publication results into lkcfes-scopus-publications.json
 * 
 * Usage:
 *   npx tsx scripts/update-and-merge-results.ts
 */

import fs from 'fs';
import path from 'path';

interface Correction {
    email: string;
    name: string;
    oldScopusId: string;
    newScopusId: string;
    orcid: string;
}

interface CorrectedResult {
    email: string;
    name: string;
    orcid: string;
    oldScopusId: string;
    newScopusId: string;
    publications: Array<{
        year: number;
        count: number;
        success: boolean;
    }>;
    totalPublications: number;
    success: boolean;
}

interface PublicationResult {
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

async function updateAndMerge(): Promise<void> {
    console.log('='.repeat(80));
    console.log('Updating Staff Directory and Merging Publication Results');
    console.log('='.repeat(80));
    console.log();

    // Load corrections
    const corrections: Correction[] = JSON.parse(
        fs.readFileSync('scopus-id-corrections.json', 'utf-8')
    );

    // Load corrected results
    const correctedData = JSON.parse(
        fs.readFileSync('lkcfes-corrected-scopus-results.json', 'utf-8')
    );
    const correctedResults: CorrectedResult[] = correctedData.results;

    // Load staff directory
    const staffDirPath = path.join(process.cwd(), 'lib', 'tools', 'staff_directory.json');
    const staffDirectory = JSON.parse(fs.readFileSync(staffDirPath, 'utf-8'));

    // Load original publication results
    const publicationData = JSON.parse(
        fs.readFileSync('lkcfes-scopus-publications.json', 'utf-8')
    );
    const originalResults: PublicationResult[] = publicationData.results;

    console.log('Step 1: Updating Staff Directory with Corrected Scopus IDs');
    console.log('='.repeat(80));

    let updatedCount = 0;
    const changedIds = corrections.filter(c => c.oldScopusId !== c.newScopusId);

    // Update staff directory
    const lkcfes = staffDirectory.faculties?.['LKC FES'];
    if (lkcfes) {
        const departments = lkcfes.departments || {};

        for (const [deptKey, deptData] of Object.entries(departments) as [string, any][]) {
            const staff = deptData.staff || [];

            for (const member of staff) {
                const correction = corrections.find(c => c.email === member.email);

                if (correction && correction.oldScopusId !== correction.newScopusId) {
                    const oldUrl = member.scopusUrl;
                    const newUrl = `https://www.scopus.com/authid/detail.uri?authorId=${correction.newScopusId}`;

                    member.scopusUrl = newUrl;

                    console.log(`✅ Updated: ${member.name}`);
                    console.log(`   Old URL: ${oldUrl}`);
                    console.log(`   New URL: ${newUrl}`);
                    console.log();

                    updatedCount++;
                }
            }
        }
    }

    console.log(`Total Scopus URLs updated in staff directory: ${updatedCount}`);
    console.log();

    // Save updated staff directory
    fs.writeFileSync(
        staffDirPath,
        JSON.stringify(staffDirectory, null, 2),
        'utf-8'
    );
    console.log(`✅ Staff directory saved: ${staffDirPath}`);
    console.log();

    console.log('='.repeat(80));
    console.log('Step 2: Merging Corrected Publication Results');
    console.log('='.repeat(80));
    console.log();

    // Create a map of email to corrected results
    const correctedMap = new Map<string, CorrectedResult>();
    correctedResults.forEach(r => correctedMap.set(r.email, r));

    // Update or add corrected results
    const updatedResults: PublicationResult[] = [];
    const emailsProcessed = new Set<string>();

    // First, update existing results
    for (const original of originalResults) {
        const corrected = correctedMap.get(original.email);

        if (corrected) {
            // Replace with corrected data
            updatedResults.push({
                searchId: original.searchId,
                name: corrected.name,
                email: corrected.email,
                department: original.department,
                departmentAcronym: original.departmentAcronym,
                scopusAuthorId: corrected.newScopusId,
                publications: corrected.publications,
                totalPublications: corrected.totalPublications,
            });

            console.log(`🔄 Updated: ${corrected.name} (${corrected.totalPublications} pubs)`);
            emailsProcessed.add(corrected.email);
        } else {
            // Keep original
            updatedResults.push(original);
        }
    }

    // Add any corrected results that weren't in original (shouldn't happen, but just in case)
    for (const corrected of correctedResults) {
        if (!emailsProcessed.has(corrected.email)) {
            // Need to find searchId and department from staff directory
            let searchId = '';
            let department = '';
            let departmentAcronym = '';

            if (lkcfes) {
                const departments = lkcfes.departments || {};

                for (const [deptKey, deptData] of Object.entries(departments) as [string, any][]) {
                    const staff = deptData.staff || [];
                    const member = staff.find((m: any) => m.email === corrected.email);

                    if (member) {
                        searchId = member.searchId;
                        department = member.department;
                        departmentAcronym = member.departmentAcronym;
                        break;
                    }
                }
            }

            updatedResults.push({
                searchId,
                name: corrected.name,
                email: corrected.email,
                department,
                departmentAcronym,
                scopusAuthorId: corrected.newScopusId,
                publications: corrected.publications,
                totalPublications: corrected.totalPublications,
            });

            console.log(`➕ Added: ${corrected.name} (${corrected.totalPublications} pubs)`);
        }
    }

    console.log();
    console.log(`Total results in merged dataset: ${updatedResults.length}`);
    console.log();

    // Recalculate statistics
    const totalPublications2023 = updatedResults.reduce((sum, r) => {
        const pub2023 = r.publications.find(p => p.year === 2023);
        return sum + (pub2023?.count || 0);
    }, 0);

    const totalPublications2024 = updatedResults.reduce((sum, r) => {
        const pub2024 = r.publications.find(p => p.year === 2024);
        return sum + (pub2024?.count || 0);
    }, 0);

    const totalPublications2025 = updatedResults.reduce((sum, r) => {
        const pub2025 = r.publications.find(p => p.year === 2025);
        return sum + (pub2025?.count || 0);
    }, 0);

    const totalPublications = totalPublications2023 + totalPublications2024 + totalPublications2025;
    const averagePerStaff = updatedResults.length > 0 ? totalPublications / updatedResults.length : 0;

    // Update metadata
    const updatedMetadata = {
        ...publicationData.metadata,
        lastUpdated: new Date().toISOString(),
        correctedIdsApplied: true,
        correctedIdsCount: changedIds.length,
        statistics: {
            publications2023: totalPublications2023,
            publications2024: totalPublications2024,
            publications2025: totalPublications2025,
            totalPublications,
            averagePerStaff: parseFloat(averagePerStaff.toFixed(2)),
        },
    };

    // Save updated publication results
    const updatedPublicationData = {
        metadata: updatedMetadata,
        results: updatedResults,
    };

    fs.writeFileSync(
        'lkcfes-scopus-publications.json',
        JSON.stringify(updatedPublicationData, null, 2),
        'utf-8'
    );

    console.log('='.repeat(80));
    console.log('Updated Publication Statistics');
    console.log('='.repeat(80));
    console.log(`Total staff: ${updatedResults.length}`);
    console.log(`Publications by year:`);
    console.log(`  2023: ${totalPublications2023}`);
    console.log(`  2024: ${totalPublications2024}`);
    console.log(`  2025: ${totalPublications2025}`);
    console.log(`  Total: ${totalPublications}`);
    console.log(`  Average per staff: ${averagePerStaff.toFixed(2)}`);
    console.log();

    console.log('✅ Updated publication results saved: lkcfes-scopus-publications.json');
    console.log();

    // Create a backup of original
    const backupPath = 'lkcfes-scopus-publications-original-backup.json';
    if (!fs.existsSync(backupPath)) {
        fs.writeFileSync(
            backupPath,
            JSON.stringify(publicationData, null, 2),
            'utf-8'
        );
        console.log(`📦 Original backup saved: ${backupPath}`);
    }

    console.log();
    console.log('='.repeat(80));
    console.log('✅ Update and Merge Completed Successfully!');
    console.log('='.repeat(80));
    console.log();
    console.log('Summary:');
    console.log(`  • Staff directory updated: ${updatedCount} Scopus URLs corrected`);
    console.log(`  • Publication results merged: ${correctedResults.length} staff updated`);
    console.log(`  • Total publications increased by: ${totalPublications - (publicationData.metadata.statistics?.totalPublications || 0)}`);
    console.log();
}

// Run the script
if (require.main === module) {
    updateAndMerge()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

export { updateAndMerge };

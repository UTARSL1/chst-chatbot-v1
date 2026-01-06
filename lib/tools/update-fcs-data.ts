/**
 * Update FCS data in staff_directory.json
 */

import fs from 'fs';
import path from 'path';

const STAFF_DIRECTORY_PATH = path.join(process.cwd(), 'lib', 'tools', 'staff_directory.json');
const FCS_DATA_PATH = path.join(process.cwd(), 'lib', 'tools', 'fcs-data.json');

interface ScrapedStaff {
    name: string;
    position: string;
    email: string;
    searchId: string;
}

interface ScrapedDept {
    deptId: string;
    deptName: string;
    staff: ScrapedStaff[];
}

function parseDesignationAndPosts(position: string): { designation: string; adminPosts: string[] } {
    const adminPosts: string[] = [];
    let designation = '';

    // Split by common delimiters
    const parts = position.split(/\s+(?:Associate Professor|Assistant Professor|Professor|Adjunct Professor|Manager|Assistant Manager|Senior Assistant Manager|Administrative Assistant)/);

    // The last part should be the designation
    if (parts.length > 0) {
        const lastPart = position.substring(position.lastIndexOf(parts[parts.length - 1]));
        designation = lastPart.trim();

        // Everything before is admin posts
        const postsText = position.substring(0, position.lastIndexOf(lastPart)).trim();
        if (postsText) {
            // Split by common patterns
            const posts = postsText.split(/\s+(?:Head|Deputy Dean|Dean|Director|Chairperson|Acting Head)/);
            posts.forEach(post => {
                const trimmed = post.trim();
                if (trimmed && !trimmed.match(/^(Associate|Assistant|Adjunct)?$/)) {
                    // Reconstruct the post
                    const match = postsText.match(new RegExp(`((?:Head|Deputy Dean|Dean|Director|Chairperson|Acting Head)[^)]*(?:\\([^)]+\\))?)`));
                    if (match) {
                        adminPosts.push(match[1].trim());
                    }
                }
            });
        }
    } else {
        designation = position;
    }

    return { designation, adminPosts };
}

function determineStaffType(designation: string): { staffType: string; employmentType: string } {
    const lower = designation.toLowerCase();

    if (lower.includes('adjunct')) {
        return { staffType: 'adjunct', employmentType: 'Adjunct' };
    } else if (lower.includes('professor') || lower.includes('lecturer')) {
        return { staffType: 'full-time', employmentType: 'Full-Time' };
    } else {
        return { staffType: 'full-time', employmentType: 'Full-Time' };
    }
}

function main() {
    console.log('='.repeat(80));
    console.log('📝 Updating FCS Data in staff_directory.json');
    console.log('='.repeat(80));
    console.log('');

    // Load data
    const directory = JSON.parse(fs.readFileSync(STAFF_DIRECTORY_PATH, 'utf-8'));
    const fcsData: ScrapedDept[] = JSON.parse(fs.readFileSync(FCS_DATA_PATH, 'utf-8'));

    const deptMapping: { [key: string]: { acronym: string; name: string; type: string } } = {
        '7389': { acronym: 'DCS-KPR', name: 'Department of Chinese Studies (Kampar Campus)', type: 'Academic Department' },
        '7390': { acronym: 'DCS-SL', name: 'Department of Chinese Studies (Sungai Long Campus)', type: 'Academic Department' },
        '7391': { acronym: 'FGO-KPR-FCS', name: 'Faculty General Office (Kampar Campus)', type: 'Administrative Department' },
        '7392': { acronym: 'FGO-SL-FCS', name: 'Faculty General Office (Sungai Long Campus)', type: 'Administrative Department' }
    };

    // Process each department
    const departments: any = {};
    let totalStaff = 0;
    let fullTimeCount = 0;
    let adjunctCount = 0;

    for (const dept of fcsData) {
        const deptInfo = deptMapping[dept.deptId];
        if (!deptInfo) {
            console.error(`Unknown department ID: ${dept.deptId}`);
            continue;
        }

        console.log(`\n📋 Processing ${deptInfo.name} (${dept.staff.length} staff)`);

        const processedStaff = dept.staff.map(s => {
            const { designation, adminPosts } = parseDesignationAndPosts(s.position);
            const { staffType, employmentType } = determineStaffType(designation);

            return {
                searchId: s.searchId,
                staffType,
                employmentType,
                name: s.name,
                position: s.position,
                email: s.email,
                faculty: 'Faculty of Chinese Studies',
                facultyAcronym: 'FCS',
                department: deptInfo.name,
                departmentAcronym: deptInfo.acronym,
                designation,
                administrativePosts: adminPosts,
                googleScholarUrl: '',
                scopusUrl: '',
                orcidUrl: '',
                homepageUrl: `http://www.utar.edu.my/cv_V2/index.jsp?cv=${s.searchId}`,
                areasOfExpertise: [],
                joiningYear: 2025,
                joiningSequence: parseInt(s.searchId.replace(/[^0-9]/g, '')) || 0
            };
        });

        const deptFullTime = processedStaff.filter(s => s.staffType === 'full-time').length;
        const deptAdjunct = processedStaff.filter(s => s.staffType === 'adjunct').length;

        departments[deptInfo.acronym] = {
            canonical: deptInfo.name,
            acronym: deptInfo.acronym,
            aliases: [deptInfo.name],
            departmentId: dept.deptId,
            parent: 'FCS',
            type: deptInfo.type,
            departmentType: deptInfo.type.replace(' Department', ''),
            staffCount: processedStaff.length,
            fullTimeCount: deptFullTime,
            adjunctCount: deptAdjunct,
            partTimeCount: 0,
            expatriateCount: 0,
            emeritusCount: 0,
            unknownCount: 0,
            staff: processedStaff
        };

        totalStaff += processedStaff.length;
        fullTimeCount += deptFullTime;
        adjunctCount += deptAdjunct;

        console.log(`   ✅ ${processedStaff.length} staff (${deptFullTime} full-time, ${deptAdjunct} adjunct)`);
    }

    // Update FCS in directory
    const oldFCSCount = directory.faculties.FCS?.staffCount || 3;

    directory.faculties.FCS = {
        canonical: 'Faculty of Chinese Studies',
        acronym: 'FCS',
        aliases: ['Faculty of Chinese Studies', 'Chinese Studies Faculty', 'FCS'],
        type: 'Faculty',
        staffCount: totalStaff,
        fullTimeCount,
        adjunctCount,
        partTimeCount: 0,
        expatriateCount: 0,
        emeritusCount: 0,
        unknownCount: 0,
        departments
    };

    // Update metadata
    directory.metadata.staffCount = directory.metadata.staffCount - oldFCSCount + totalStaff;
    directory.metadata.uniqueStaffCount = directory.metadata.uniqueStaffCount - oldFCSCount + totalStaff;
    directory.metadata.fullTimeCount = directory.metadata.fullTimeCount - oldFCSCount + fullTimeCount;
    directory.metadata.adjunctCount = (directory.metadata.adjunctCount || 0) - 0 + adjunctCount;
    directory.lastUpdated = new Date().toISOString();

    // Save
    fs.writeFileSync(STAFF_DIRECTORY_PATH, JSON.stringify(directory, null, 2));

    console.log('');
    console.log('='.repeat(80));
    console.log('✅ FCS Data Updated Successfully!');
    console.log('='.repeat(80));
    console.log('');
    console.log('Summary:');
    console.log(`  Old FCS count: ${oldFCSCount}`);
    console.log(`  New FCS count: ${totalStaff} (${fullTimeCount} full-time, ${adjunctCount} adjunct)`);
    console.log(`  Difference: +${totalStaff - oldFCSCount}`);
    console.log(`  New total staff: ${directory.metadata.staffCount}`);
    console.log('');
}

main();

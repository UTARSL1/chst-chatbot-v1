/**
 * Manual FCS Sync - Scrape each department individually and update staff_directory.json
 */

import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import https from 'https';

const STAFF_DIRECTORY_PATH = path.join(process.cwd(), 'lib', 'tools', 'staff_directory.json');
const RATE_LIMIT_MS = 500;

// Bypass SSL certificate verification for UTAR website
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function httpsGet(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

interface StaffMember {
    searchId: string;
    name: string;
    position: string;
    email: string;
    department: string;
    departmentAcronym: string;
    designation: string;
    administrativePosts: string[];
    [key: string]: any;
}

async function scrapeDepartment(deptId: string, deptName: string, deptAcronym: string): Promise<StaffMember[]> {
    console.log(`\n📋 Scraping ${deptName} (ID: ${deptId})...`);

    const allStaff: StaffMember[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const url = page === 1
            ? `https://www2.utar.edu.my/staffListSearchV2.jsp?searchDept=FCS&searchDiv=${deptId}&searchName=&searchExpertise=&submit=Search&searchResult=Y`
            : `https://www2.utar.edu.my/staffListSearchV2.jsp?iPage=${page}&searchDept=FCS&searchDiv=${deptId}&searchSurname=All&searchName=&searchOrder=name&searchResult=Y`;

        console.log(`   Page ${page}: ${url}`);

        const html = await httpsGet(url);
        const $ = cheerio.load(html);

        // Find all staff cards
        const staffCards = $('table[width="100%"][cellpadding="5"]').filter((i, el) => {
            return $(el).find('a[href*="staffListDetailV2.jsp"]').length > 0;
        });

        console.log(`   Found ${staffCards.length} staff on page ${page}`);

        if (staffCards.length === 0) {
            hasMore = false;
            break;
        }

        // Parse each staff card
        staffCards.each((i, card) => {
            const $card = $(card);
            const nameLink = $card.find('a[href*="staffListDetailV2.jsp"]').first();
            const href = nameLink.attr('href') || '';
            const searchIdMatch = href.match(/searchId=(\d+)/);

            if (!searchIdMatch) return;

            const searchId = searchIdMatch[1];
            const name = nameLink.text().trim();
            const position = $card.find('font[color="brown"]').text().trim();
            const email = $card.find('a[href^="mailto:"]').text().trim();

            // Parse designation and admin posts from position
            let designation = '';
            const adminPosts: string[] = [];

            if (position.includes('(') && position.includes(')')) {
                const lastParenIndex = position.lastIndexOf('(');
                const designationMatch = position.substring(lastParenIndex + 1, position.lastIndexOf(')'));
                designation = designationMatch;

                const postsText = position.substring(0, lastParenIndex).trim();
                if (postsText) {
                    const posts = postsText.split(';').map(p => p.trim()).filter(p => p);
                    adminPosts.push(...posts);
                }
            } else {
                designation = position;
            }

            allStaff.push({
                searchId,
                staffType: 'full-time',
                employmentType: 'Full-Time',
                name,
                position,
                email,
                faculty: 'Faculty of Chinese Studies',
                facultyAcronym: 'FCS',
                department: deptName,
                departmentAcronym: deptAcronym,
                designation,
                administrativePosts: adminPosts,
                googleScholarUrl: '',
                scopusUrl: '',
                orcidUrl: '',
                homepageUrl: `http://www.utar.edu.my/cv_V2/index.jsp?cv=${searchId}`,
                areasOfExpertise: [],
                joiningYear: 2025,
                joiningSequence: parseInt(searchId)
            });
        });

        // Check for next page
        const nextPageLink = $(`a:contains("${page + 1}")`);
        if (nextPageLink.length === 0) {
            hasMore = false;
        } else {
            page++;
            await sleep(RATE_LIMIT_MS);
        }
    }

    console.log(`   ✅ Total: ${allStaff.length} staff from ${deptName}`);
    return allStaff;
}

async function main() {
    console.log('='.repeat(80));
    console.log('🔧 MANUAL FCS SYNC');
    console.log('='.repeat(80));
    console.log('');

    // Load current directory
    const directory = JSON.parse(fs.readFileSync(STAFF_DIRECTORY_PATH, 'utf-8'));

    // Scrape all FCS departments
    const departments = [
        { id: '7389', name: 'Department of Chinese Studies (Kampar Campus)', acronym: 'DCS-KPR' },
        { id: '7390', name: 'Department of Chinese Studies (Sungai Long Campus)', acronym: 'DCS-SL' },
        { id: '7391', name: 'Faculty General Office (Kampar Campus)', acronym: 'FGO-KPR-FCS' },
        { id: '7392', name: 'Faculty General Office (Sungai Long Campus)', acronym: 'FGO-SL-FCS' }
    ];

    const allFCSStaff: { [key: string]: StaffMember[] } = {};
    let totalStaff = 0;

    for (const dept of departments) {
        const staff = await scrapeDepartment(dept.id, dept.name, dept.acronym);
        allFCSStaff[dept.acronym] = staff;
        totalStaff += staff.length;
        await sleep(RATE_LIMIT_MS);
    }

    console.log('');
    console.log('='.repeat(80));
    console.log(`📊 Total FCS Staff: ${totalStaff}`);
    console.log('='.repeat(80));
    console.log('');

    // Update the directory
    console.log('Updating staff_directory.json...');

    // Create FCS departments structure
    const fcsData: any = {
        canonical: 'Faculty of Chinese Studies',
        acronym: 'FCS',
        aliases: ['Faculty of Chinese Studies', 'Chinese Studies Faculty', 'FCS'],
        type: 'Faculty',
        staffCount: totalStaff,
        fullTimeCount: totalStaff,
        adjunctCount: 0,
        partTimeCount: 0,
        expatriateCount: 0,
        emeritusCount: 0,
        unknownCount: 0,
        departments: {} as any
    };

    // Add each department
    for (const dept of departments) {
        const staff = allFCSStaff[dept.acronym];
        fcsData.departments[dept.acronym] = {
            canonical: dept.name,
            acronym: dept.acronym,
            aliases: [dept.name],
            departmentId: dept.id,
            parent: 'FCS',
            type: dept.acronym.startsWith('FGO') ? 'Administrative Department' : 'Academic Department',
            departmentType: dept.acronym.startsWith('FGO') ? 'Administrative' : 'Academic',
            staffCount: staff.length,
            fullTimeCount: staff.length,
            adjunctCount: 0,
            partTimeCount: 0,
            expatriateCount: 0,
            emeritusCount: 0,
            unknownCount: 0,
            staff: staff
        };
    }

    // Replace FCS in directory
    directory.faculties.FCS = fcsData;

    // Update metadata
    const oldFCSCount = 3; // Previous count
    directory.metadata.staffCount = directory.metadata.staffCount - oldFCSCount + totalStaff;
    directory.metadata.uniqueStaffCount = directory.metadata.uniqueStaffCount - oldFCSCount + totalStaff;
    directory.metadata.fullTimeCount = directory.metadata.fullTimeCount - oldFCSCount + totalStaff;
    directory.lastUpdated = new Date().toISOString();

    // Save
    fs.writeFileSync(STAFF_DIRECTORY_PATH, JSON.stringify(directory, null, 2));

    console.log('✅ staff_directory.json updated successfully!');
    console.log('');
    console.log('Summary:');
    console.log(`  Old FCS count: 3`);
    console.log(`  New FCS count: ${totalStaff}`);
    console.log(`  Difference: +${totalStaff - 3}`);
    console.log('');
}

main().catch(console.error);

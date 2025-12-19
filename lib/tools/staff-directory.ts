import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import https from 'https';
import unitsData from './units.json';
import {
    StaffDirectory,
    StaffMember,
    Faculty,
    Department,
    ResearchCentre,
    TopLevelDepartment,
    SyncHistoryEntry,
    detectEmploymentType,
    parseSearchId,
    extractPrefix,
    StaffCounts,
    DepartmentType
} from './staff-directory-types';

const STAFF_DIRECTORY_PATH = path.join(__dirname, 'staff_directory.json');
const RATE_LIMIT_MS = 500; // 500ms delay between requests

// Utility: Sleep function for rate limiting
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Utility: HTTPS GET with error handling
function httpsGet(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        https.get(url, { rejectUnauthorized: false }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

// Load staff directory from JSON file
export function loadStaffDirectory(): StaffDirectory | null {
    try {
        if (!fs.existsSync(STAFF_DIRECTORY_PATH)) {
            console.log('[StaffDirectory] File not found, returning null');
            return null;
        }
        const data = fs.readFileSync(STAFF_DIRECTORY_PATH, 'utf-8');
        return JSON.parse(data) as StaffDirectory;
    } catch (error) {
        console.error('[StaffDirectory] Error loading directory:', error);
        return null;
    }
}

// Save staff directory to JSON file
export function saveStaffDirectory(directory: StaffDirectory): void {
    try {
        fs.writeFileSync(STAFF_DIRECTORY_PATH, JSON.stringify(directory, null, 2), 'utf-8');
        console.log('[StaffDirectory] Saved successfully');
    } catch (error) {
        console.error('[StaffDirectory] Error saving directory:', error);
        throw error;
    }
}

// Calculate staff counts from staff array
function calculateStaffCounts(staff: StaffMember[]): StaffCounts {
    const counts: StaffCounts = {
        staffCount: staff.length,
        fullTimeCount: 0,
        adjunctCount: 0,
        partTimeCount: 0,
        expatriateCount: 0,
        emeritusCount: 0,
        unknownCount: 0
    };

    for (const member of staff) {
        switch (member.staffType) {
            case 'full-time':
                counts.fullTimeCount++;
                break;
            case 'adjunct':
                counts.adjunctCount++;
                break;
            case 'part-time':
                counts.partTimeCount++;
                break;
            case 'expatriate':
                counts.expatriateCount++;
                break;
            case 'emeritus':
                counts.emeritusCount++;
                break;
            default:
                counts.unknownCount!++;
        }
    }

    return counts;
}

// Find unit in units.json
function findUnit(query: string) {
    if (!query || query.toLowerCase() === 'all') return null;
    const q = query.toLowerCase().trim();
    return unitsData.find(u =>
        u.canonical.toLowerCase() === q ||
        (u.acronym && u.acronym.toLowerCase() === q) ||
        (u.aliases && u.aliases.some(alias => alias.toLowerCase() === q))
    );
}

// Scrape staff detail page
async function scrapeStaffDetail(
    baseUrl: string,
    searchId: string,
    logger?: (msg: string) => void
): Promise<StaffMember | null> {
    const log = (msg: string) => {
        if (logger) logger(msg);
    };

    try {
        const detailUrl = `${baseUrl}/staffListDetailV2.jsp?searchId=${searchId}`;
        log(`Fetching detail: ${detailUrl}`);

        const detailHtml = await httpsGet(detailUrl);
        const $ = cheerio.load(detailHtml);

        let name = "";
        let email = "";
        let faculty = "";
        let department = "";
        let designation = "";
        let administrativePosts: string[] = [];
        let googleScholarUrl = "";
        let scopusUrl = "";
        let orcidUrl = "";
        let homepageUrl = "";
        let areasOfExpertise: string[] = [];

        $('tr').each((_, row) => {
            const label = $(row).find('td').first().text().trim();
            const value = $(row).find('td').last();
            const valueText = value.text().trim();

            if (label.includes('Name')) name = valueText.replace(/^:\s*/, '');
            if (label.includes('Email')) email = valueText.replace(/^:\s*/, '');
            if (label.includes('Faculty') || label.includes('Division')) {
                faculty = valueText.replace(/^:\s*/, '');
            }
            if (label.includes('Department') || label.includes('Unit')) {
                department = valueText.replace(/^:\s*/, '');
            }
            if (label.includes('Designation')) designation = valueText.replace(/^:\s*/, '');

            // Capture ALL Administrative Posts
            const labelLower = label.toLowerCase();
            if (labelLower.includes('administrative') && labelLower.includes('post')) {
                const postValue = valueText.replace(/^:\s*/, '').trim();
                if (postValue) {
                    administrativePosts.push(postValue);
                }
            }

            // Areas of Expertise
            if (labelLower.includes('area') && labelLower.includes('expertise')) {
                const expertiseText = valueText.replace(/^:\s*/, '').trim();
                if (expertiseText) {
                    // Split by common delimiters
                    areasOfExpertise = expertiseText
                        .split(/[;,\n]/)
                        .map(e => e.trim())
                        .filter(e => e.length > 0);
                }
            }

            if (label.includes('Google Scholar')) {
                const link = value.find('a').attr('href');
                if (link) googleScholarUrl = link;
            }
            if (label.includes('Scopus')) {
                const link = value.find('a').attr('href');
                if (link) scopusUrl = link;
            }
            if (label.includes('Orcid')) {
                const link = value.find('a').attr('href');
                if (link) orcidUrl = link;
            }
            if (label.includes('Homepage URL')) {
                const link = value.find('a').attr('href');
                if (link) homepageUrl = link;
            }
        });

        if (!name) {
            log(`Missing name for searchId ${searchId}`);
            return null;
        }

        // Email is optional (especially for adjunct/part-time staff)
        if (!email) {
            log(`  Note: No email for ${name} (${searchId}) - this is normal for adjunct/part-time staff`);
        }

        // Detect employment type
        const { type: staffType, label: employmentType } = detectEmploymentType(searchId);

        // Parse joining year
        const { year: joiningYear, seq: joiningSequence } = parseSearchId(searchId);

        // Build position string
        let position = "";
        if (administrativePosts.length > 0) {
            position = administrativePosts.join('; ');
        }
        if (designation) {
            if (position) position += ` (${designation})`;
            else position = designation;
        }
        if (!position) position = "Staff";

        // Resolve faculty and department acronyms
        const facultyUnit = findUnit(faculty);
        const departmentUnit = findUnit(department);

        return {
            searchId,
            staffType,
            employmentType,
            name,
            position,
            email,
            faculty,
            facultyAcronym: facultyUnit?.acronym || '',
            department,
            departmentAcronym: departmentUnit?.acronym || '',
            designation,
            administrativePosts,
            googleScholarUrl,
            scopusUrl,
            orcidUrl,
            homepageUrl,
            areasOfExpertise,
            joiningYear,
            joiningSequence
        };

    } catch (error: any) {
        log(`Error scraping detail for ${searchId}: ${error.message}`);
        return null;
    }
}

// Scrape all staff from a unit (faculty/department/research centre)
async function scrapeUnitStaff(
    unitAcronym: string,
    departmentId: string = 'All',
    logger?: (msg: string) => void
): Promise<StaffMember[]> {
    const log = (msg: string) => {
        console.log(`[StaffDirectory] ${msg}`);
        if (logger) logger(msg);
    };

    const baseUrl = 'https://www2.utar.edu.my';
    const results: StaffMember[] = [];
    const seenIds = new Set<string>();

    const searchParams = new URLSearchParams();
    searchParams.set('searchDept', unitAcronym === 'All' ? 'ALL' : unitAcronym);
    searchParams.set('searchDiv', departmentId);
    searchParams.set('searchName', '');
    searchParams.set('searchExpertise', '');
    searchParams.set('submit', 'Search');
    searchParams.set('searchResult', 'Y');

    const url = `${baseUrl}/staffListSearchV2.jsp?${searchParams.toString()}`;
    log(`Scraping: ${unitAcronym} / ${departmentId}`);

    let currentPage = 1;
    let hasMorePages = true;

    while (hasMorePages && currentPage <= 20) { // Max 20 pages
        const pageUrl = currentPage === 1 ? url : `${url}&iPage=${currentPage}`;
        log(`Page ${currentPage}: ${pageUrl}`);

        const html = await httpsGet(pageUrl);
        await sleep(RATE_LIMIT_MS); // Rate limiting

        const $ = cheerio.load(html);
        const staffTables = $('table[onclick*="staffListDetailV2.jsp"]');

        log(`Page ${currentPage}: Found ${staffTables.length} staff cards`);

        if (staffTables.length === 0) {
            hasMorePages = false;
            break;
        }

        // Check if next page exists
        // UTAR shows 30 staff per page, so if we got exactly 30, there might be more
        if (staffTables.length < 30) {
            hasMorePages = false;
        } else {
            // Also check for next page link as secondary confirmation
            const nextPageNum = currentPage + 1;
            if (!html.includes(`iPage=${nextPageNum}`)) {
                // No next page link found, but we got 30 staff, so try next page anyway
                log(`  No iPage=${nextPageNum} link found, but got ${staffTables.length} staff - will try next page`);
            }
        }

        // Extract searchIds and fetch details
        for (let i = 0; i < staffTables.length; i++) {
            const table = staffTables[i];
            const onclick = $(table).attr('onclick') || '';

            const match = onclick.match(/staffListDetailV2\.jsp\?searchId=([A-Z0-9]+)/i);
            if (!match) continue;

            const searchId = match[1];
            if (seenIds.has(searchId)) continue;
            seenIds.add(searchId);

            // Fetch staff detail with rate limiting
            const staffDetail = await scrapeStaffDetail(baseUrl, searchId, logger);
            await sleep(RATE_LIMIT_MS);

            if (staffDetail) {
                results.push(staffDetail);
                log(`✓ ${staffDetail.name} (${staffDetail.employmentType})`);
            }
        }

        currentPage++;
    }

    log(`Scraped ${results.length} staff from ${unitAcronym} / ${departmentId}`);
    return results;
}

// Main sync function - sync specific faculties only
export async function syncStaffDirectory(
    facultiesToSync: string[] = ['LKC FES'], // Default to LKC FES for testing
    logger?: (msg: string) => void
): Promise<SyncHistoryEntry> {
    const log = (msg: string) => {
        console.log(`[StaffDirectory] ${msg}`);
        if (logger) logger(msg);
    };

    const startTime = Date.now();
    log('=== Starting Staff Directory Sync ===');
    log(`Faculties to sync: ${facultiesToSync.join(', ')}`);

    // Load existing directory
    let directory = loadStaffDirectory();
    if (!directory) {
        log('No existing directory found, creating new one');
        directory = {
            version: '1.0.0',
            lastUpdated: '',
            syncDuration: '',
            metadata: {
                staffCount: 0,
                uniqueStaffCount: 0,
                fullTimeCount: 0,
                adjunctCount: 0,
                partTimeCount: 0,
                expatriateCount: 0,
                emeritusCount: 0,
                unknownCount: 0,
                facultiesCount: 0,
                departmentsCount: 0,
                researchCentresCount: 0,
                topLevelDepartmentsCount: 0
            },
            faculties: {},
            researchCentres: {},
            topLevelDepartments: {},
            syncHistory: [],
            employmentTypeMapping: {
                description: 'SearchId patterns for employment type detection',
                patterns: {
                    'full-time': 'Numeric only (e.g., 16072, 22083)',
                    'adjunct': 'AP prefix (e.g., AP2201, AP1903)',
                    'part-time': 'J prefix (e.g., J2105, J1908)',
                    'expatriate': 'EP or E prefix (e.g., EP1801, E2001)',
                    'emeritus': 'EM prefix (e.g., EM1501)'
                }
            }
        };
    }

    // TypeScript: directory is guaranteed non-null from this point
    const dir = directory!;


    // Build lookup map of existing staff by searchId
    const existingStaffMap = new Map<string, StaffMember>();
    for (const faculty of Object.values(directory.faculties)) {
        for (const dept of Object.values(faculty.departments)) {
            for (const staff of dept.staff) {
                existingStaffMap.set(staff.searchId, staff);
            }
        }
    }

    const liveStaffMap = new Map<string, StaffMember>();
    const unknownPrefixes = new Set<string>();
    let added = 0, updated = 0, deleted = 0, unchanged = 0;

    // Process each faculty
    for (const facultyAcronym of facultiesToSync) {
        log(`\n=== Processing Faculty: ${facultyAcronym} ===`);

        // Find faculty in units.json
        const facultyUnit = unitsData.find(u =>
            u.acronym === facultyAcronym && u.type === 'Faculty'
        );

        if (!facultyUnit) {
            log(`Faculty ${facultyAcronym} not found in units.json, skipping`);
            continue;
        }

        // Find all departments under this faculty (including those without departmentId)
        const departments = unitsData.filter(u =>
            (u as any).parent === facultyUnit.canonical &&
            (u.type === 'Academic Department' || u.type === 'Admin Department')
        );

        log(`Found ${departments.length} departments under ${facultyUnit.canonical}`);

        // Initialize faculty structure
        if (!directory.faculties[facultyAcronym]) {
            directory.faculties[facultyAcronym] = {
                canonical: facultyUnit.canonical,
                acronym: facultyUnit.acronym || facultyAcronym,
                aliases: facultyUnit.aliases || [],
                type: facultyUnit.type || 'Faculty',
                staffCount: 0,
                fullTimeCount: 0,
                adjunctCount: 0,
                partTimeCount: 0,
                expatriateCount: 0,
                emeritusCount: 0,
                unknownCount: 0,
                departments: {}
            };
        }

        const faculty = directory.faculties[facultyAcronym];

        // Process each department
        for (const deptUnit of departments) {
            const deptAcronym = deptUnit.acronym || '';
            const deptId = (deptUnit as any).departmentId || 'All'; // Use 'All' if no departmentId

            log(`\n--- Processing Department: ${deptAcronym} (${deptUnit.canonical}) ---`);

            // Scrape staff from this department
            const staffList = await scrapeUnitStaff(facultyAcronym, deptId, logger);

            // Track unknown prefixes
            for (const staff of staffList) {
                if (staff.staffType === 'unknown') {
                    const prefix = extractPrefix(staff.searchId);
                    if (prefix) unknownPrefixes.add(prefix);
                }
            }

            // Initialize department structure
            if (!faculty.departments[deptAcronym]) {
                // Determine department type
                const deptType: DepartmentType =
                    deptUnit.type === 'Administrative Department' ? 'Administrative' : 'Academic';

                faculty.departments[deptAcronym] = {
                    canonical: deptUnit.canonical,
                    acronym: deptAcronym,
                    aliases: deptUnit.aliases || [],
                    departmentId: deptId,
                    parent: facultyAcronym,
                    type: deptUnit.type || 'Department',
                    departmentType: deptType,
                    staffCount: 0,
                    fullTimeCount: 0,
                    adjunctCount: 0,
                    partTimeCount: 0,
                    expatriateCount: 0,
                    emeritusCount: 0,
                    unknownCount: 0,
                    staff: []
                };
            }

            const department = faculty.departments[deptAcronym];

            // Build map of existing staff in this department
            const existingDeptStaffMap = new Map<string, StaffMember>();
            for (const staff of department.staff) {
                existingDeptStaffMap.set(staff.searchId, staff);
            }

            // Detect changes
            const liveSearchIds = new Set(staffList.map(s => s.searchId));

            // Find new and updated staff
            for (const liveStaff of staffList) {
                liveStaffMap.set(liveStaff.searchId, liveStaff);

                if (!existingDeptStaffMap.has(liveStaff.searchId)) {
                    // New staff
                    added++;
                    log(`  [+] NEW: ${liveStaff.name}`);
                } else {
                    // Check if updated
                    const existing = existingDeptStaffMap.get(liveStaff.searchId)!;
                    const hasChanged =
                        existing.name !== liveStaff.name ||
                        existing.designation !== liveStaff.designation ||
                        existing.email !== liveStaff.email ||
                        JSON.stringify(existing.administrativePosts) !== JSON.stringify(liveStaff.administrativePosts);

                    if (hasChanged) {
                        updated++;
                        log(`  [~] UPDATED: ${liveStaff.name}`);
                    } else {
                        unchanged++;
                    }
                }
            }

            // Find deleted staff
            for (const existingStaff of department.staff) {
                if (!liveSearchIds.has(existingStaff.searchId)) {
                    deleted++;
                    log(`  [-] DELETED: ${existingStaff.name}`);
                }
            }

            // Update department staff list
            department.staff = staffList;

            // Recalculate department counts
            const deptCounts = calculateStaffCounts(staffList);
            department.staffCount = deptCounts.staffCount;
            department.fullTimeCount = deptCounts.fullTimeCount;
            department.adjunctCount = deptCounts.adjunctCount;
            department.partTimeCount = deptCounts.partTimeCount;
            department.expatriateCount = deptCounts.expatriateCount;
            department.emeritusCount = deptCounts.emeritusCount;
            department.unknownCount = deptCounts.unknownCount || 0;

            log(`  Department Total: ${department.staffCount} staff`);
        }

        // Recalculate faculty counts
        let facultyTotalStaff = 0;
        let facultyFullTime = 0;
        let facultyAdjunct = 0;
        let facultyPartTime = 0;
        let facultyExpatriate = 0;
        let facultyEmeritus = 0;
        let facultyUnknown = 0;

        for (const dept of Object.values(faculty.departments)) {
            facultyTotalStaff += dept.staffCount;
            facultyFullTime += dept.fullTimeCount;
            facultyAdjunct += dept.adjunctCount;
            facultyPartTime += dept.partTimeCount;
            facultyExpatriate += dept.expatriateCount;
            facultyEmeritus += dept.emeritusCount;
            facultyUnknown += dept.unknownCount || 0;
        }

        // Calculate unique staff count (avoid double-counting staff in multiple departments)
        const facultyUniqueSearchIds = new Set<string>();
        for (const dept of Object.values(faculty.departments)) {
            for (const staff of dept.staff) {
                facultyUniqueSearchIds.add(staff.searchId);
            }
        }

        faculty.staffCount = facultyTotalStaff;
        faculty.uniqueStaffCount = facultyUniqueSearchIds.size;
        faculty.fullTimeCount = facultyFullTime;
        faculty.adjunctCount = facultyAdjunct;
        faculty.partTimeCount = facultyPartTime;
        faculty.expatriateCount = facultyExpatriate;
        faculty.emeritusCount = facultyEmeritus;
        faculty.unknownCount = facultyUnknown;

        log(`\nFaculty ${facultyAcronym} Total: ${faculty.staffCount} staff (${faculty.uniqueStaffCount} unique)`);
    }

    // Recalculate global metadata
    let totalStaff = 0;
    let totalFullTime = 0;
    let totalAdjunct = 0;
    let totalPartTime = 0;
    let totalExpatriate = 0;
    let totalEmeritus = 0;
    let totalUnknown = 0;
    const globalUniqueSearchIds = new Set<string>();

    for (const faculty of Object.values(directory.faculties)) {
        totalStaff += faculty.staffCount;
        totalFullTime += faculty.fullTimeCount;
        totalAdjunct += faculty.adjunctCount;
        totalPartTime += faculty.partTimeCount;
        totalExpatriate += faculty.expatriateCount;
        totalEmeritus += faculty.emeritusCount;
        totalUnknown += faculty.unknownCount || 0;

        // Collect unique searchIds across all faculties
        for (const dept of Object.values(faculty.departments)) {
            for (const staff of dept.staff) {
                globalUniqueSearchIds.add(staff.searchId);
            }
        }
    }

    directory.metadata.staffCount = totalStaff;
    directory.metadata.uniqueStaffCount = globalUniqueSearchIds.size;
    directory.metadata.fullTimeCount = totalFullTime;
    directory.metadata.adjunctCount = totalAdjunct;
    directory.metadata.partTimeCount = totalPartTime;
    directory.metadata.expatriateCount = totalExpatriate;
    directory.metadata.emeritusCount = totalEmeritus;
    directory.metadata.unknownCount = totalUnknown;
    directory.metadata.facultiesCount = Object.keys(directory.faculties).length;

    let totalDepartments = 0;
    for (const faculty of Object.values(directory.faculties)) {
        totalDepartments += Object.keys(faculty.departments).length;
    }
    directory.metadata.departmentsCount = totalDepartments;

    // Update timestamp
    const now = new Date().toISOString();
    directory.lastUpdated = now;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    directory.syncDuration = `${duration}s`;

    // Create sync history entry
    const syncEntry: SyncHistoryEntry = {
        timestamp: now,
        duration: `${duration}s`,
        changes: {
            added,
            updated,
            deleted,
            unchanged
        },
        totalStaff,
        status: 'success',
        facultiesProcessed: facultiesToSync,
        researchCentresProcessed: [],
        topLevelDepartmentsProcessed: [],
        unknownPrefixes: Array.from(unknownPrefixes)
    };

    directory.syncHistory.unshift(syncEntry); // Add to beginning
    if (directory.syncHistory.length > 10) {
        directory.syncHistory = directory.syncHistory.slice(0, 10); // Keep last 10
    }

    // Save directory
    saveStaffDirectory(directory);

    log('\n=== Sync Complete ===');
    log(`Total Staff: ${totalStaff}`);
    log(`Added: ${added}, Updated: ${updated}, Deleted: ${deleted}, Unchanged: ${unchanged}`);
    log(`Duration: ${duration}s`);
    if (unknownPrefixes.size > 0) {
        log(`Unknown Prefixes Found: ${Array.from(unknownPrefixes).join(', ')}`);
    }

    return syncEntry;
}


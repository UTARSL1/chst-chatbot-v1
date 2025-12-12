import Fuse from 'fuse.js';
import * as cheerio from 'cheerio';
import unitsData from './units.json';
import https from 'https';

// --- Types ---
interface UnitMapping {
    acronym: string | null;
    canonical: string;
    type: string | null;
    parent?: string | null;
    aliases: string[];
}

interface StaffResult {
    name: string;
    position: string;
    email: string;
    faculty: string;
    department: string;
    designation?: string;
    administrativePost?: string;
    googleScholarUrl?: string;
    scopusUrl?: string;
    orcidUrl?: string;
    homepageUrl?: string;
    extra?: string;
}

// --- Tool 1: Resolve Unit ---
const fuseOptions = {
    includeScore: true,
    keys: ['canonical', 'acronym', 'aliases'],
    threshold: 0.4,
};

const fuse = new Fuse(unitsData, fuseOptions);

export function resolveUnit(query: string, logger?: (msg: string) => void) {
    const log = (msg: string) => {
        console.log(`[Tools] ${msg}`);
        if (logger) logger(`[Tools] ${msg}`);
    };

    log(`Resolving unit: ${query}`);
    if (!query) return { canonical: "", acronym: null, type: null, error: "Empty query" };

    const queryLower = query.toLowerCase().trim();

    const exact = unitsData.find(u =>
        u.canonical.toLowerCase() === queryLower ||
        (u.acronym && u.acronym.toLowerCase() === queryLower) ||
        u.aliases.some(a => a.toLowerCase() === queryLower)
    );

    if (exact) {
        return {
            canonical: exact.canonical,
            acronym: exact.acronym,
            type: exact.type,
            parent: exact.parent
        };
    }

    const searchResults = fuse.search(query);
    if (searchResults.length > 0) {
        const best = searchResults[0].item;
        return {
            canonical: best.canonical,
            acronym: best.acronym,
            type: best.type,
            parent: best.parent
        };
    }

    return {
        canonical: query,
        acronym: null,
        type: null,
        error: "No confident match found, using original query"
    };
}

// Helper function to make HTTPS GET request
function httpsGet(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: 'GET',
            rejectUnauthorized: false,
            timeout: 10000
        }, (res) => {
            let html = '';
            res.on('data', (chunk) => { html += chunk; });
            res.on('end', () => resolve(html));
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        req.end();
    });
}

export async function searchStaff(
    params: { faculty?: string; department?: string; name?: string; expertise?: string },
    logger?: (msg: string) => void
): Promise<StaffResult[]> {
    const log = (msg: string) => {
        console.log(`[Tools] ${msg}`);
        if (logger) logger(`[Tools] ${msg}`);
    };

    log(`Searching staff with params: ${JSON.stringify(params)}`);

    const baseUrl = "https://www2.utar.edu.my";
    const searchUrl = `${baseUrl}/staffListSearchV2.jsp`;

    let facultyAcronym = params.faculty || 'All';
    if (facultyAcronym !== 'All') {
        const queryLower = facultyAcronym.toLowerCase().trim();
        const unit = unitsData.find(u =>
            u.canonical.toLowerCase() === queryLower ||
            (u.acronym && u.acronym.toLowerCase() === queryLower)
        );
        if (unit && unit.acronym) {
            facultyAcronym = unit.acronym;
            log(`Mapped faculty '${params.faculty}' to acronym '${facultyAcronym}'`);
        }
    }

    // Step 1: Search for staff
    const queryParams = new URLSearchParams();
    queryParams.append('searchDept', facultyAcronym === 'All' ? 'ALL' : facultyAcronym);
    queryParams.append('searchDiv', params.department && params.department !== 'All' ? params.department : 'All');
    queryParams.append('searchName', params.name || '');
    queryParams.append('searchExpertise', params.expertise || '');
    queryParams.append('submit', 'Search');
    queryParams.append('searchResult', 'Y');

    const url = `${searchUrl}?${queryParams.toString()}`;
    log(`GET Request to: ${url}`);

    try {
        const html = await httpsGet(url);
        log(`Response HTML length: ${html.length} characters`);

        const $ = cheerio.load(html);
        const results: StaffResult[] = [];
        const seenIds = new Set<string>();

        // Find all staff card tables (they have onclick with staffListDetailV2.jsp)
        const staffTables = $('table[onclick*="staffListDetailV2.jsp"]');
        log(`Found ${staffTables.length} staff cards`);

        // Step 2: For each staff card, extract detail page URL and fetch it
        for (let i = 0; i < staffTables.length; i++) {
            const table = staffTables[i];
            const onclick = $(table).attr('onclick') || '';

            // Extract detail page URL from onclick="javascript:location='staffListDetailV2.jsp?searchId=16131';"
            const match = onclick.match(/staffListDetailV2\.jsp\?searchId=(\d+)/);
            if (!match) {
                log(`Card ${i + 1}: No searchId found in onclick`);
                continue;
            }

            const searchId = match[1];
            if (seenIds.has(searchId)) continue;
            seenIds.add(searchId);

            const detailUrl = `${baseUrl}/staffListDetailV2.jsp?searchId=${searchId}`;
            log(`Card ${i + 1}: Fetching detail page: ${detailUrl}`);

            try {
                const detailHtml = await httpsGet(detailUrl);
                const $detail = cheerio.load(detailHtml);

                // Parse the clean, structured detail page
                let name = "";
                let email = "";
                let faculty = "";
                let department = "";
                let designation = "";
                let administrativePost = "";
                let googleScholarUrl = "";
                let scopusUrl = "";
                let orcidUrl = "";
                let homepageUrl = "";

                // Extract data from the detail page's structured format
                $detail('tr').each((_, row) => {
                    const label = $detail(row).find('td').first().text().trim();
                    const value = $detail(row).find('td').last();
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

                    // Enhanced Administrative Post extraction with case-insensitive matching
                    const labelLower = label.toLowerCase();
                    if (labelLower.includes('administrative') && labelLower.includes('post')) {
                        const postValue = valueText.replace(/^:\s*/, '').trim();
                        if (postValue && !administrativePost) {
                            // Take the first non-empty administrative post (usually "Dean", not "Director (Xinwei)")
                            administrativePost = postValue;
                            log(`Card ${i + 1}: Found admin post: "${administrativePost}" (label: "${label}")`);
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

                if (!name || !email) {
                    log(`Card ${i + 1}: Missing name or email`);
                    continue;
                }

                // Build position string
                let position = "";
                if (administrativePost) position = administrativePost;
                if (designation) {
                    if (position) position += ` (${designation})`;
                    else position = designation;
                }
                if (!position) position = "Staff";

                log(`Card ${i + 1}: ✓ ${name} <${email}> - ${position}`);

                results.push({
                    name,
                    position,
                    email,
                    faculty,
                    department,
                    designation,
                    administrativePost,
                    googleScholarUrl,
                    scopusUrl,
                    orcidUrl,
                    homepageUrl,
                    extra: `${faculty} | ${department}`
                });

            } catch (detailError: any) {
                log(`Card ${i + 1}: Error fetching detail page: ${detailError.message}`);
            }
        }

        log(`Found ${results.length} staff members.`);
        return results;

    } catch (error: any) {
        log(`Error: ${error.message}`);
        return [];
    }
}

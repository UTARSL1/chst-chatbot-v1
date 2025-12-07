import Fuse from 'fuse.js';
import * as cheerio from 'cheerio';
import unitsData from './units.json';
import https from 'https';

// --- Types ---
interface UnitMapping {
    acronym: string | null;
    canonical: string;
    type: string | null;
    aliases: string[];
}

interface StaffResult {
    name: string;
    position: string;
    email: string;
    faculty: string;
    department: string;
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
            type: exact.type
        };
    }

    const searchResults = fuse.search(query);
    if (searchResults.length > 0) {
        const best = searchResults[0].item;
        return {
            canonical: best.canonical,
            acronym: best.acronym,
            type: best.type
        };
    }

    return {
        canonical: query,
        acronym: null,
        type: null,
        error: "No confident match found, using original query"
    };
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

    const baseUrl = "https://www2.utar.edu.my/staffListSearchV2.jsp";

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
        } else {
            log(`Could not resolve '${params.faculty}' to a known acronym. Using original value.`);
        }
    }

    // Build URL with query parameters (GET request, not POST!)
    const queryParams = new URLSearchParams();
    queryParams.append('searchDept', facultyAcronym === 'All' ? 'ALL' : facultyAcronym); // Use ALL (uppercase)
    queryParams.append('searchDiv', params.department && params.department !== 'All' ? params.department : 'All');
    queryParams.append('searchName', params.name || '');
    queryParams.append('searchExpertise', params.expertise || '');
    queryParams.append('submit', 'Search'); // Required parameter
    queryParams.append('searchResult', 'Y');

    const url = `${baseUrl}?${queryParams.toString()}`;
    log(`GET Request to: ${url}`);

    return new Promise((resolve) => {
        const options = {
            method: 'GET', // Changed from POST
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
                'Referer': 'https://www2.utar.edu.my/staffListSearchV2.jsp',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive'
            },
            rejectUnauthorized: false,
            timeout: 10000
        };

        const req = https.request(url, options, (res) => {
            let html = '';

            res.on('data', (chunk) => {
                html += chunk;
            });

            res.on('end', () => {
                log(`Response status: ${res.statusCode}`);
                log(`HTML length: ${html.length} characters`);

                if (res.statusCode !== 200) {
                    log(`Failed to fetch staff directory: HTTP ${res.statusCode}`);
                    resolve([]);
                    return;
                }

                try {
                    const $ = cheerio.load(html);
                    const results: StaffResult[] = [];
                    const seenEmails = new Set<string>();

                    // DEBUG: Log HTML sample
                    log(`HTML sample (first 500 chars): ${html.substring(0, 500)}`);
                    log(`HTML contains 'lyng': ${html.includes('lyng')}`);
                    log(`HTML contains '@utar.edu.my': ${html.includes('@utar.edu.my')}`);

                    // Find all email addresses in the HTML
                    const emailRegex = /([\w.-]+@utar\.edu\.my)/gi;
                    const emailMatches = html.match(emailRegex) || [];
                    log(`Found ${emailMatches.length} email addresses in HTML`);
                    if (emailMatches.length > 0) {
                        log(`Emails found: ${emailMatches.join(', ')}`);
                    }

                    // For each unique email, find its container and extract staff info
                    const uniqueEmails = [...new Set(emailMatches.map(e => e.toLowerCase()))];

                    let cardIndex = 0;
                    uniqueEmails.forEach(email => {
                        cardIndex++;

                        // Find element containing this email
                        let container = $('*').filter((_, el) => {
                            const text = $(el).text();
                            return text.includes(email);
                        }).first();

                        // Try to get a more specific container (table with onclick)
                        const staffTable = container.closest('table[onclick*="staffListDetail"]');
                        if (staffTable.length > 0) {
                            container = staffTable;
                        }

                        const containerText = container.text().trim();

                        if (!containerText) {
                            log(`Card ${cardIndex}: Empty container for ${email}`);
                            return;
                        }

                        // Extract name
                        let name = "";
                        const firstBold = container.find('b').first().text().trim();
                        if (firstBold && firstBold.length > 3 && !firstBold.includes(':')) {
                            name = firstBold;
                        }

                        if (!name) {
                            const lines = containerText.split('\n').map(l => l.trim()).filter(l => l);
                            for (const line of lines) {
                                if (/^(Ir\s+)?(Ts\s+)?(Prof\s+|Dr\s+|Ap\s+)*[A-Z][a-z]+(\s+[A-Z][a-z]+)+$/i.test(line) && line.length < 60) {
                                    name = line;
                                    break;
                                }
                            }
                        }

                        if (!name) {
                            log(`Card ${cardIndex}: No name (email: ${email})`);
                            return;
                        }

                        log(`Card ${cardIndex}: "${name}" <${email}>`);

                        // Extract positions
                        const academicPos = container.find('i').first().text().trim();
                        let adminPos = "";
                        container.find('*').each((_, el) => {
                            const text = $(el).text().trim();
                            if (/^(Head of Department|Chairperson|Director|Dean|President|Deputy)/i.test(text) && text.length < 100) {
                                adminPos = text;
                                return false;
                            }
                        });

                        log(`Card ${cardIndex}: Academic position (italic): "${academicPos}"`);
                        log(`Card ${cardIndex}: Admin position (regex match): "${adminPos}"`);

                        let position = adminPos;
                        if (academicPos) {
                            if (position) position += ` (${academicPos})`;
                            else position = academicPos;
                        }
                        if (!position) position = "Staff";

                        // Extract faculty and department from container text
                        let extractedFaculty = facultyAcronym;
                        let extractedDept = params.department || "Unknown";

                        const lines = containerText.split('\n').map(l => l.trim()).filter(l => l);
                        for (const line of lines) {
                            if (line.includes('Faculty') && line.length < 100) {
                                extractedFaculty = line;
                            }
                            if (line.startsWith('Department of') && line.length < 100) {
                                extractedDept = line;
                            }
                        }

                        log(`Card ${cardIndex}: Extracted faculty: "${extractedFaculty}"`);
                        log(`Card ${cardIndex}: Extracted dept: "${extractedDept}"`);

                        // Deduplication
                        if (seenEmails.has(email)) return;
                        seenEmails.add(email);
                        if (results.some(r => r.name === name)) return;

                        log(`Card ${cardIndex}: ✓ ADDED`);
                        results.push({
                            name,
                            position,
                            email,
                            faculty: extractedFaculty,
                            department: extractedDept,
                            extra: containerText.replace(/\s+/g, ' ').substring(0, 500)
                        });
                    });

                    log(`Found ${results.length} staff members.`);
                    resolve(results);
                } catch (parseError: any) {
                    log(`Error parsing HTML: ${parseError.message}`);
                    resolve([]);
                }
            });
        });

        req.on('error', (error: any) => {
            const errorDetails: any = {
                message: error.message,
                name: error.name,
            };

            if (error.code) errorDetails.code = error.code;
            if (error.cause) errorDetails.cause = String(error.cause);

            log(`Request error: ${JSON.stringify(errorDetails)}`);
            resolve([]);
        });

        req.on('timeout', () => {
            log('Request timeout: exceeded 10 seconds');
            req.destroy();
            resolve([]);
        });

        req.end(); // No need to write POST data for GET request
    });
}

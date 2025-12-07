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

    const queryParams = new URLSearchParams();
    queryParams.append('searchDept', facultyAcronym);
    queryParams.append('searchDiv', params.department && params.department !== 'All' ? params.department : 'All');
    queryParams.append('searchName', params.name || '');
    queryParams.append('searchExpertise', params.expertise || '');
    queryParams.append('searchResult', 'Y');

    const postData = queryParams.toString();
    log(`POST Request to: ${baseUrl} with body: ${postData}`);

    return new Promise((resolve) => {
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': 'https://www2.utar.edu.my/staffListSearchV2.jsp',
                'Origin': 'https://www2.utar.edu.my',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive'
            },
            rejectUnauthorized: false,
            timeout: 10000
        };

        const req = https.request(baseUrl, options, (res) => {
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
                    // DEBUG: Save HTML to file for inspection
                    const fs = require('fs');
                    const debugHtml = html.substring(0, 5000);
                    fs.writeFileSync('/tmp/utar_search_debug.html', debugHtml, 'utf8');
                    log(`DEBUG: Wrote HTML sample to /tmp/utar_search_debug.html`);

                    const $ = cheerio.load(html);
                    const results: StaffResult[] = [];
                    const seenEmails = new Set<string>();

                    const pageTitle = $('title').text().trim();
                    log(`Page Title: "${pageTitle}"`);

                    const allTables = $('table');
                    log(`Total tables found: ${allTables.length}`);

                    let tableIndex = 0;
                    $('table').each((_, table) => {
                        tableIndex++;
                        const tableText = $(table).text().trim();

                        if (!tableText) {
                            log(`Table ${tableIndex}: Skipped - empty`);
                            return;
                        }

                        // FLEXIBLE PARSING: Find email first (most reliable)
                        let email = "";
                        const emailLink = $(table).find('a[href^="mailto:"]');
                        if (emailLink.length > 0) {
                            email = emailLink.attr('href')?.replace('mailto:', '').trim() || "";
                        }
                        if (!email) {
                            const emailMatch = tableText.match(/[\w.-]+@utar\.edu\.my/i);
                            if (emailMatch) email = emailMatch[0];
                        }

                        if (!email) {
                            log(`Table ${tableIndex}: Skipped - no email`);
                            return;
                        }

                        // FLEXIBLE NAME EXTRACTION
                        let name = "";

                        // Method 1: Bold tag (works for some layouts like CCSN)
                        const firstBold = $(table).find('b').first().text().trim();
                        if (firstBold && firstBold.length > 3 && !firstBold.includes(':')) {
                            name = firstBold;
                        }

                        // Method 2: Split text by lines and find name pattern
                        if (!name) {
                            const lines = tableText.split('\n').map(l => l.trim()).filter(l => l);
                            for (const line of lines) {
                                // Match patterns like "Ir Dr Ng Law Yong" or "Prof Ts Dr Name"
                                if (/^(Ir\s+)?(Ts\s+)?(Prof\s+|Dr\s+|Ap\s+)*[A-Z][a-z]+(\s+[A-Z][a-z]+)+$/i.test(line) && line.length < 60) {
                                    name = line;
                                    break;
                                }
                            }
                        }

                        if (!name) {
                            log(`Table ${tableIndex}: Skipped - could not extract name (email: ${email})`);
                            return;
                        }

                        log(`Table ${tableIndex}: Found "${name}" with email ${email}`);

                        // Extract positions
                        const academicPos = $(table).find('i').first().text().trim();

                        let adminPos = "";
                        $(table).find('*').each((_, el) => {
                            const text = $(el).text().trim();
                            if (/^(Head of Department|Chairperson|Director|Dean|President|Deputy)/i.test(text) && text.length < 100) {
                                adminPos = text;
                                return false;
                            }
                        });

                        let position = adminPos;
                        if (academicPos) {
                            if (position) position += ` (${academicPos})`;
                            else position = academicPos;
                        }
                        if (!position) position = "Staff";

                        // Deduplication
                        if (seenEmails.has(email)) {
                            log(`Table ${tableIndex}: Skipped "${name}" - duplicate email`);
                            return;
                        }
                        seenEmails.add(email);

                        const isDuplicate = results.some(r => r.name === name);
                        if (isDuplicate) {
                            log(`Table ${tableIndex}: Skipped "${name}" - duplicate name`);
                            return;
                        }

                        log(`Table ${tableIndex}: ✓ Added "${name}" - ${position}`);
                        results.push({
                            name,
                            position,
                            email,
                            faculty: facultyAcronym,
                            department: params.department || "Unknown",
                            extra: tableText.replace(/\s+/g, ' ').trim()
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

        req.write(postData);
        req.end();
    });
}

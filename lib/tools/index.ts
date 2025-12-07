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
                    const $ = cheerio.load(html);
                    const results: StaffResult[] = [];
                    const seenEmails = new Set<string>();

                    const pageTitle = $('title').text().trim();
                    log(`Page Title: "${pageTitle}"`);

                    // NEW STRATEGY: Find all links with @utar.edu.my, then get containers
                    const emailLinks = $('a').filter((_, el) => {
                        const href = $(el).attr('href') || '';
                        const text = $(el).text() || '';
                        return href.includes('@utar.edu.my') || text.includes('@utar.edu.my');
                    });

                    log(`Found ${emailLinks.length} email links`);

                    let cardIndex = 0;
                    emailLinks.each((_, link) => {
                        cardIndex++;

                        // Get closest container (table or styled div)
                        const container = $(link).closest('table[onclick], div[style*="margin"]');
                        const containerText = container.text().trim();

                        // Extract email
                        let email = "";
                        const href = $(link).attr('href') || '';
                        if (href.includes('mailto:')) {
                            email = href.replace('mailto:', '').trim();
                        } else {
                            const linkText = $(link).text().trim();
                            if (linkText.includes('@')) email = linkText;
                        }

                        if (!email) {
                            const emailMatch = containerText.match(/[\w.-]+@utar\.edu\.my/i);
                            if (emailMatch) email = emailMatch[0];
                        }

                        if (!email) {
                            log(`Card ${cardIndex}: No email`);
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

                        let position = adminPos;
                        if (academicPos) {
                            if (position) position += ` (${academicPos})`;
                            else position = academicPos;
                        }
                        if (!position) position = "Staff";

                        // Deduplication
                        if (seenEmails.has(email)) return;
                        seenEmails.add(email);
                        if (results.some(r => r.name === name)) return;

                        log(`Card ${cardIndex}: ✓ ADDED`);
                        results.push({
                            name,
                            position,
                            email,
                            faculty: facultyAcronym,
                            department: params.department || "Unknown",
                            extra: containerText.replace(/\s+/g, ' ').trim()
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

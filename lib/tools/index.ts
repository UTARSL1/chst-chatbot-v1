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

    log(`POST Request to: ${baseUrl} with body: ${queryParams.toString()}`);

    // Add timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    // Custom HTTPS agent to bypass SSL verification for UTAR server
    // The UTAR server has an incomplete certificate chain
    const httpsAgent = new https.Agent({
        rejectUnauthorized: false
    });

    try {
        try {
            const response = await fetch(baseUrl, {
                method: 'POST',
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                    "Referer": baseUrl,
                    "Origin": "https://www2.utar.edu.my",
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Connection": "keep-alive"
                },
                body: queryParams,
                signal: controller.signal,
                // @ts-ignore - agent is not in TypeScript types for fetch but works in Node.js
                agent: httpsAgent,
                next: { revalidate: 0 }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                log(`Failed to fetch staff directory: HTTP ${response.status}`);
                return [];
            }

            const html = await response.text();
            const $ = cheerio.load(html);
            const results: StaffResult[] = [];
            const seenEmails = new Set<string>();

            const pageTitle = $('title').text().trim();
            log(`Page Title: ${pageTitle}`);

            $('table').each((_, table) => {
                const tableText = $(table).text().trim();
                if (!tableText) return;

                const nameEl = $(table).find('b').first();
                const name = nameEl.text().trim();
                if (!name) return;

                let email = "";
                const emailLink = $(table).find('a[href^="mailto:"]');
                if (emailLink.length > 0) {
                    email = emailLink.attr('href')?.replace('mailto:', '').trim() || "";
                }
                if (!email) {
                    const emailMatch = tableText.match(/[\w.-]+@utar\.edu\.my/i);
                    if (emailMatch) email = emailMatch[0];
                }

                if (!email && !tableText.includes('@utar.edu.my')) {
                    return;
                }

                const academicPos = $(table).find('i').first().text().trim();

                let adminPos = "";
                $(table).find('b').each((i, el) => {
                    if (i === 0) return;
                    const text = $(el).text().trim();
                    if (/Chairperson|Director|Dean|Head|President|Deputy/i.test(text)) {
                        adminPos = text;
                    }
                });

                let position = adminPos;
                if (academicPos) {
                    if (position) position += ` (${academicPos})`;
                    else position = academicPos;
                }
                if (!position) position = "Staff";

                if (email && seenEmails.has(email)) return;
                if (email) seenEmails.add(email);

                const isDuplicate = results.some(r => r.name === name);
                if (isDuplicate) return;

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
            return results;

        } catch (fetchError: any) {
            clearTimeout(timeoutId);

            // Detailed error logging
            const errorDetails: any = {
                message: fetchError.message,
                name: fetchError.name,
            };

            if (fetchError.code) errorDetails.code = fetchError.code;
            if (fetchError.cause) errorDetails.cause = String(fetchError.cause);

            if (fetchError.name === 'AbortError') {
                log(`Request timeout: exceeded 10 seconds`);
            }

            log(`Fetch error details: ${JSON.stringify(errorDetails)}`);

            // Re-throw to be caught by outer catch
            throw fetchError;
        }

    } catch (error: any) {
        log(`Error searching staff: ${error.message || 'Unknown error'}`);
        return [];
    }
}

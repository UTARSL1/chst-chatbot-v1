import Fuse from 'fuse.js';
import * as cheerio from 'cheerio';
import unitsData from './units.json';

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
    threshold: 0.4, // Lower is stricter (0.0 is exact match)
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

    // 1. Exact canonical/acronym match
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

    // 2. Fuzzy match
    const searchResults = fuse.search(query);
    if (searchResults.length > 0) {
        const best = searchResults[0].item;
        return {
            canonical: best.canonical,
            acronym: best.acronym,
            type: best.type
        };
    }

    // Fallback
    return {
        canonical: query,
        acronym: null,
        type: null,
        error: "No confident match found, using original query"
    };
}

// --- Tool 2: Staff Search ---
export async function searchStaff(
    params: { faculty?: string; department?: string; name?: string; expertise?: string },
    logger?: (msg: string) => void
): Promise<StaffResult[]> {
    const log = (msg: string) => {
        console.log(`[Tools] ${msg}`);
        if (logger) logger(`[Tools] ${msg}`);
    };

    log(`Searching staff with params: ${JSON.stringify(params)}`);

    // Default URL
    const baseUrl = "https://www2.utar.edu.my/staffListSearchV2.jsp";

    // Resolve Faculty Name -> Acronym (The form expects Acronyms for 'searchDept')
    let facultyAcronym = params.faculty || 'All';
    if (facultyAcronym !== 'All') {
        const queryLower = facultyAcronym.toLowerCase().trim();
        // Try to find the unit in our DB
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

    // Construct Query Params
    const queryParams = new URLSearchParams();
    // Correct Mapping based on HTML form:
    // searchDept = Faculty/Centre (Main dropdown)
    queryParams.append('searchDept', facultyAcronym);
    // searchDiv = Department (Sub dropdown)
    queryParams.append('searchDiv', params.department && params.department !== 'All' ? params.department : 'All');

    queryParams.append('searchName', params.name || '');
    queryParams.append('searchExpertise', params.expertise || '');

    // Crucial: This parameter tells the server to actually perform the search
    queryParams.append('searchResult', 'Y');

    log(`POST Request to: ${baseUrl} with body: ${queryParams.toString()}`);

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
            next: { revalidate: 0 } // Don't cache for server actions usually
        });

        if (!response.ok) {
            log(`Failed to fetch staff directory: ${response.status}`);
            return [];
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const results: StaffResult[] = [];
        const seenEmails = new Set<string>();

        // Debug: Check title to catch Access Denied
        const pageTitle = $('title').text().trim();
        log(`Page Title: ${pageTitle}`);

        // Parsing logic updated based on investigation
        // We iterate ALL tables and use deduplication to handle nesting.
        $('table').each((_, table) => {
            const tableText = $(table).text().trim();
            // Basic heuristic to identify a staff card row
            if (!tableText) return;

            // Name: Usually the first bold text
            const nameEl = $(table).find('b').first();
            const name = nameEl.text().trim();
            if (!name) return; // Must have name

            // Email: Try mailto link first, then regex search in text
            let email = "";
            const emailLink = $(table).find('a[href^="mailto:"]');
            if (emailLink.length > 0) {
                email = emailLink.attr('href')?.replace('mailto:', '').trim() || "";
            }
            if (!email) {
                // Regex for email in text (e.g. limeh@utar.edu.my inside a span)
                const emailMatch = tableText.match(/[\w.-]+@utar\.edu\.my/i);
                if (emailMatch) email = emailMatch[0];
            }

            // Relaxed filter: If we have Name AND (Email OR @utar in text), keep it.
            // Removed strict 'Position' check which causes issues for cards without explicit titles labels.
            if (!email && !tableText.includes('@utar.edu.my')) {
                return;
            }

            // Position: 
            // 1. Look for <i> tag (Academic position)
            // 2. Look for administrative titles in <b> tags (excluding the name)
            const academicPos = $(table).find('i').first().text().trim();

            let adminPos = "";
            $(table).find('b').each((i, el) => {
                if (i === 0) return; // Skip name at index 0
                const text = $(el).text().trim();
                // Check for common admin titles
                if (/Chairperson|Director|Dean|Head|President|Deputy/i.test(text)) {
                    adminPos = text;
                }
            });

            // Combine positions: Admin > Academic
            let position = adminPos;
            if (academicPos) {
                if (position) position += ` (${academicPos})`;
                else position = academicPos;
            }
            if (!position) position = "Staff";

            // Deduplication
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

    } catch (error: any) {
        log(`Error searching staff: ${error.message}`);
        return [];
    }
}

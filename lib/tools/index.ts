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

export function resolveUnit(query: string) {
    console.log(`[Tools] Resolving unit: ${query}`);
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
export async function searchStaff(params: { faculty?: string; department?: string; name?: string; expertise?: string }): Promise<StaffResult[]> {
    console.log(`[Tools] Searching staff with params:`, params);

    // Default URL
    const baseUrl = "https://www2.utar.edu.my/staffListSearchV2.jsp";

    // Resolve Faculty Name -> Acronym (The form expects Acronyms for 'searchDept')
    // We check against Canonical Name OR Acronym to ensure robust matching
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
            console.log(`[Tools] Mapped faculty '${params.faculty}' to acronym '${facultyAcronym}'`);
        } else {
            console.log(`[Tools] Could not resolve '${params.faculty}' to a known acronym. Using original value.`);
        }
    }

    // Construct Query Params
    const queryParams = new URLSearchParams();
    // Correct Mapping based on HTML form:
    // searchDept = Faculty/Centre (Main dropdown) - Must be Acronym
    queryParams.append('searchDept', facultyAcronym);
    // searchDiv = Department (Sub dropdown)
    queryParams.append('searchDiv', params.department && params.department !== 'All' ? params.department : 'All');

    queryParams.append('searchName', params.name || '');
    queryParams.append('searchExpertise', params.expertise || '');

    // CRITICAL FIX: explicit toggle to show results
    queryParams.append('searchResult', 'Y');

    const url = `${baseUrl}?${queryParams.toString()}`;
    console.log(`[Tools] Fetching: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            },
            next: { revalidate: 0 } // Don't cache for server actions usually
        });

        if (!response.ok) {
            console.error(`[Tools] Failed to fetch staff directory: ${response.status}`);
            return [];
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const results: StaffResult[] = [];

        // Parsing logic ported from Python/Analysis
        // Strategy: Iterate over tables that contain staff info
        // Heuristic: Look for tables with specific style or content patterns
        $('table').each((_, table) => {
            const tableText = $(table).text();
            if (!tableText.includes('@utar.edu.my') && !$(table).html()?.includes('mailto:')) {
                return;
            }

            const nameEl = $(table).find('b').first();
            const name = nameEl.text().trim();
            if (!name) return;

            const positionEl = $(table).find('i').first();
            const position = positionEl.text().trim();

            const emailEl = $(table).find('a[href^="mailto:"]').first();
            let email = emailEl.text().trim();
            if (!email) {
                const href = emailEl.attr('href') || '';
                email = href.replace('mailto:', '');
            }

            results.push({
                name,
                position,
                email,
                faculty: facultyAcronym,
                department: params.department || "Unknown",
                extra: tableText.replace(/\s+/g, ' ').trim()
            });
        });

        console.log(`[Tools] Found ${results.length} staff members.`);
        return results;

    } catch (error) {
        console.error(`[Tools] Error searching staff:`, error);
        return [];
    }
}

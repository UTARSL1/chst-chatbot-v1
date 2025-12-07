import Fuse from 'fuse.js';
import * as cheerio from 'cheerio';
import unitsData from './units.json';

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

const fuseOptions = {
    includeScore: true,
    keys: ['canonical', 'acronym', 'aliases'],
    threshold: 0.4,
};

const fuse = new Fuse(unitsData, fuseOptions);

export function resolveUnit(query: string) {
    console.log(`[Tools] Resolving unit: ${query}`);
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

export async function searchStaff(params: { faculty?: string; department?: string; name?: string; expertise?: string }): Promise<StaffResult[]> {
    console.log(`[Tools] Searching staff with params:`, params);

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
            console.log(`[Tools] Mapped faculty '${params.faculty}' to acronym '${facultyAcronym}'`);
        } else {
            console.log(`[Tools] Could not resolve '${params.faculty}' to a known acronym. Using original value.`);
        }
    }

    const queryParams = new URLSearchParams();
    queryParams.append('searchDept', facultyAcronym);
    queryParams.append('searchDiv', params.department && params.department !== 'All' ? params.department : 'All');
    queryParams.append('searchName', params.name || '');
    queryParams.append('searchExpertise', params.expertise || '');
    queryParams.append('searchResult', 'Y');

    console.log(`[Tools] POST Request to: ${baseUrl} with body: ${queryParams.toString()}`);

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
            next: { revalidate: 0 }
        });

        if (!response.ok) {
            console.error(`[Tools] Failed to fetch staff directory: ${response.status}`);
            return [];
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const results: StaffResult[] = [];
        const seenEmails = new Set<string>();

        const pageTitle = $('title').text().trim();
        console.log(`[Tools] Page Title: ${pageTitle}`);

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

        console.log(`[Tools] Found ${results.length} staff members.`);
        return results;

    } catch (error) {
        console.error(`[Tools] Error searching staff:`, error);
        return [];
    }
}

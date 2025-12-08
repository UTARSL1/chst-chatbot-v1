
import { prisma } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

export type JcrMetricRecord = {
    fullTitle: string;
    normalizedTitle: string;
    issnPrint: string | null;
    issnElectronic: string | null;
    category: string;
    edition: string | null;
    jifYear: number;
    jifValue: number | null;
    jifQuartile: string; // Q1–Q4, or N/A
}

export type JcrMetricByYear = {
    year: number;
    jifValue: number | null;
    bestQuartile: string | null;
    categories: {
        category: string;
        edition: string | null;
        jifQuartile: string;
        jifValue: number | null;
    }[];
}

export type JournalMatchResult = {
    found: boolean;
    journal?: {
        fullTitle: string;
        issnPrint: string | null;
        issnElectronic: string | null;
    };
    metrics?: JcrMetricByYear[];
    matchType?: 'issn' | 'title';
    reason?: string;
}

let isCacheLoaded = false;
let cacheLoadingPromise: Promise<void> | null = null;

// Maps
// Key: normalized title -> Records[]
const byTitleMap = new Map<string, JcrMetricRecord[]>();
// Key: normalized ISSN -> Records[]
const byIssnMap = new Map<string, JcrMetricRecord[]>();

const QUARTILE_RANK = {
    'Q1': 1,
    'Q2': 2,
    'Q3': 3,
    'Q4': 4,
    'N/A': 99
};

export async function ensureJcrCacheLoaded(): Promise<void> {
    if (isCacheLoaded) return;
    if (cacheLoadingPromise) return cacheLoadingPromise;

    cacheLoadingPromise = (async () => {
        console.log('Loading JCR cache...');
        try {
            const all = await prisma.jcrJournalMetric.findMany({
                orderBy: { jifYear: 'asc' }
            });

            for (const row of all) {
                const record: JcrMetricRecord = {
                    fullTitle: row.fullTitle,
                    normalizedTitle: row.normalizedTitle,
                    issnPrint: row.issnPrint,
                    issnElectronic: row.issnElectronic,
                    category: row.category,
                    edition: row.edition,
                    jifYear: row.jifYear,
                    jifValue: row.jifValue ? Number(row.jifValue) : null,
                    jifQuartile: row.jifQuartile
                };

                // By Title
                const tKey = record.normalizedTitle;
                if (!byTitleMap.has(tKey)) byTitleMap.set(tKey, []);
                byTitleMap.get(tKey)!.push(record);

                // By ISSN (Print)
                if (record.issnPrint) {
                    const iKey = record.issnPrint.trim().toUpperCase(); // Normalize ISSN
                    if (!byIssnMap.has(iKey)) byIssnMap.set(iKey, []);
                    byIssnMap.get(iKey)!.push(record);
                }

                // By ISSN (Electronic)
                if (record.issnElectronic) {
                    const iKey = record.issnElectronic.trim().toUpperCase();
                    // If distinct from print, add it. The map stores records.
                    // It's okay if we point to the same array or add the same record object twice to different keys? 
                    // Wait, if print == ele, we added above.
                    if (record.issnElectronic.trim().toUpperCase() !== (record.issnPrint?.trim().toUpperCase())) {
                        if (!byIssnMap.has(iKey)) byIssnMap.set(iKey, []);
                        byIssnMap.get(iKey)!.push(record);
                    }
                }
            }
            isCacheLoaded = true;
            console.log(`JCR cache loaded: ${all.length} records.`);
        } catch (e) {
            console.error("Failed to load JCR cache:", e);
            // Reset promise so we can retry?
            cacheLoadingPromise = null;
            throw e;
        }
    })();

    return cacheLoadingPromise;
}

function processRecords(records: JcrMetricRecord[], years?: number[]): JcrMetricByYear[] {
    // Filter by year if needed
    let filtered = records;
    if (years && years.length > 0) {
        filtered = records.filter(r => years.includes(r.jifYear));
    }

    // Group by year
    const byYear = new Map<number, JcrMetricRecord[]>();
    for (const r of filtered) {
        if (!byYear.has(r.jifYear)) byYear.set(r.jifYear, []);
        byYear.get(r.jifYear)!.push(r);
    }

    // Sort years
    const sortedYears = Array.from(byYear.keys()).sort((a, b) => a - b);

    return sortedYears.map(year => {
        const yearRecords = byYear.get(year)!;

        // Find best quartile
        let bestQ = 'N/A';
        let bestRank = 99;

        for (const r of yearRecords) {
            const q = r.jifQuartile as keyof typeof QUARTILE_RANK;
            const rank = QUARTILE_RANK[q] ?? 99;
            if (rank < bestRank) {
                bestRank = rank;
                bestQ = q;
            }
        }

        // JIF value (should be same for all, take first valid)
        const jif = yearRecords.find(r => r.jifValue !== null)?.jifValue ?? null;

        const categories = yearRecords.map(r => ({
            category: r.category,
            edition: r.edition,
            jifQuartile: r.jifQuartile,
            jifValue: r.jifValue
        }));

        return {
            year,
            jifValue: jif,
            bestQuartile: bestQ === 'N/A' || bestRank === 99 ? null : bestQ,
            categories
        };
    });
}

// Helper for Levenshtein Distance (simple implementation)
function levenshtein(a: string, b: string): number {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

// Helper to wrap results
function wrapResult(records: JcrMetricRecord[], years?: number[], matchType?: 'issn' | 'title', reason?: string): JournalMatchResult {
    if (!records || records.length === 0) {
        return { found: false, reason: reason || 'No records found' };
    }
    const r = records[0];
    const metrics = processRecords(records, years);
    return {
        found: true,
        journal: {
            fullTitle: r.fullTitle,
            issnPrint: r.issnPrint,
            issnElectronic: r.issnElectronic
        },
        metrics,
        matchType
    };
}

export function getJournalMetricsByIssn(issn: string, years?: number[]): JournalMatchResult {
    if (!issn) return { found: false, reason: 'No ISSN provided' };
    const iKey = issn.trim().toUpperCase();
    const records = byIssnMap.get(iKey);
    return wrapResult(records || [], years, 'issn');
}

export function getJournalMetricsByTitle(title: string, years?: number[]): JournalMatchResult {
    if (!title) return { found: false, reason: 'No title provided' };
    const tKey = title.trim().toLowerCase().replace(/\s+/g, ' ');

    // 1. Exact match
    if (byTitleMap.has(tKey)) {
        return wrapResult(byTitleMap.get(tKey)!, years, 'title');
    }

    // 2. Fuzzy match (Find best close match)
    // Only search if length > 3 to avoid noise
    if (tKey.length > 3) {
        let bestMatch: string | null = null;
        let minDist = 999;
        const threshold = Math.max(3, Math.floor(tKey.length * 0.2)); // Allow 20% typos

        for (const knownTitle of byTitleMap.keys()) {
            // Optimization: Skip if length diff is too big
            if (Math.abs(knownTitle.length - tKey.length) > threshold) continue;

            const dist = levenshtein(tKey, knownTitle);
            if (dist < minDist && dist <= threshold) {
                minDist = dist;
                bestMatch = knownTitle;
            }
        }

        if (bestMatch) {
            console.log(`[JCR Cache] Fuzzy match: "${title}" -> "${bestMatch}"`);
            return wrapResult(byTitleMap.get(bestMatch)!, years, 'title', `Fuzzy matched from "${title}"`);
        }
    }

    return { found: false, reason: 'Journal not found' };
}

export function getJournalInfo(titleOrIssn: string): { fullTitle: string, issnPrint: string | null, issnElectronic: string | null } | null {
    // Helper to get basic info from cache if we have a match
    // Check ISSN first
    let iKey = titleOrIssn.trim().toUpperCase();
    if (byIssnMap.has(iKey)) {
        const r = byIssnMap.get(iKey)![0];
        return { fullTitle: r.fullTitle, issnPrint: r.issnPrint, issnElectronic: r.issnElectronic };
    }
    // Check Title
    let tKey = titleOrIssn.trim().toLowerCase().replace(/\s+/g, ' ');
    if (byTitleMap.has(tKey)) {
        const r = byTitleMap.get(tKey)![0];
        return { fullTitle: r.fullTitle, issnPrint: r.issnPrint, issnElectronic: r.issnElectronic };
    }
    return null;
}


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

export function getJournalMetricsByIssn(issn: string, years?: number[]): JcrMetricByYear[] {
    if (!issn) return [];
    const iKey = issn.trim().toUpperCase();
    const records = byIssnMap.get(iKey);
    if (!records) return [];
    return processRecords(records, years);
}

export function getJournalMetricsByTitle(title: string, years?: number[]): JcrMetricByYear[] {
    if (!title) return [];
    const tKey = title.trim().toLowerCase().replace(/\s+/g, ' ');
    const records = byTitleMap.get(tKey);
    if (!records) return [];
    return processRecords(records, years);
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

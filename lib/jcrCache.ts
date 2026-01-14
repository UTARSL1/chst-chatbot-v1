
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
            // Load all records, prioritizing JCR_complete over JCR_incomplete
            const all = await prisma.jcrJournalMetric.findMany({
                orderBy: { jifYear: 'asc' }
            });

            // Sort in memory to prioritize JCR_complete
            all.sort((a, b) => {
                // First sort by source (complete before incomplete)
                if (a.source !== b.source) {
                    if (a.source === 'JCR_complete') return -1;
                    if (b.source === 'JCR_complete') return 1;
                }
                // Then by year
                return a.jifYear - b.jifYear;
            });

            // Track which journals we've already added from complete dataset
            const processedJournals = new Set<string>();


            for (const row of all) {
                const journalKey = `${row.normalizedTitle}_${row.jifYear}`;

                // Skip incomplete records if we already have complete data for this journal+year
                if (row.source === 'JCR_incomplete' && processedJournals.has(journalKey)) {
                    continue;
                }

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

                // Mark this journal+year as processed
                if (row.source === 'JCR_complete') {
                    processedJournals.add(journalKey);
                }

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
            console.log(`JCR cache loaded: ${all.length} total records (prioritizing JCR_complete).`);
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

// Direct mapping for Nature Index journal names to Clarivate database names
// This handles known inconsistencies between the two sources
const NATURE_INDEX_TO_CLARIVATE_MAP: Record<string, string> = {
    // Exact mappings from user-provided list
    'angewandte chemie international edition': 'angewandte chemie-international edition',
    'british journal of surgery': 'bjs-british journal of surgery',
    'environmental science and technology': 'environmental science & technology',
    'jama: the journal of the american medical association': 'jama-journal of the american medical association',
    'journal of bone and joint surgery american volume': 'journal of bone and joint surgery-american volume',
    'journal of geophysical research: atmospheres': 'journal of geophysical research-atmospheres',
    'journal of geophysical research: solid earth': 'journal of geophysical research-solid earth',
    'journal of physiology': 'journal of physiology london',
    'journal of the american society of nephrology': 'journal of the american society of nephrology',
    'journal of the national cancer institute': 'jnci-journal of the national cancer institute',
    'monthly notices of the royal astronomical society: letters': 'monthly notices of the royal astronomical society',
    'proceedings of the royal society b': 'proceedings of the royal society b-biological sciences',
    'the astrophysical journal letters': 'astrophysical journal letters',
    'the embo journal': 'embo journal',
    'the isme journal: multidisciplinary journal of microbial ecology': 'isme journal',
    'the journal of allergy and clinical immunology': 'journal of allergy and clinical immunology',
    'the journal of physical chemistry letters': 'journal of physical chemistry letters',
    'the lancet': 'lancet',
    'the lancet diabetes & endocrinology': 'lancet diabetes & endocrinology',
    'the lancet global health': 'lancet global health',
    'the lancet neurology': 'lancet neurology',
    'the lancet oncology': 'lancet oncology',
    'the lancet psychiatry': 'lancet psychiatry',
    'the new england journal of medicine': 'new england journal of medicine',
    'the plant cell': 'plant cell',
};

export function getJournalMetricsByTitle(title: string, years?: number[]): JournalMatchResult {
    if (!title) return { found: false, reason: 'No title provided' };
    const tKey = title.trim().toLowerCase().replace(/\s+/g, ' ');

    // 1. Check direct mapping table first (for known Nature Index variations)
    if (NATURE_INDEX_TO_CLARIVATE_MAP[tKey]) {
        const mappedTitle = NATURE_INDEX_TO_CLARIVATE_MAP[tKey];
        if (byTitleMap.has(mappedTitle)) {
            console.log(`[JCR Cache] Direct mapping: "${title}" -> "${mappedTitle}"`);
            return wrapResult(byTitleMap.get(mappedTitle)!, years, 'title', `Mapped from "${title}"`);
        }
    }

    // 2. Exact match
    if (byTitleMap.has(tKey)) {
        return wrapResult(byTitleMap.get(tKey)!, years, 'title');
    }

    // Helper: Normalize title by removing common prefixes/suffixes and punctuation
    const normalizeTitle = (t: string): string => {
        return t
            .replace(/^(the|a|an)\s+/i, '') // Remove leading articles
            .replace(/[:\-–—]/g, ' ') // Replace punctuation with spaces
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
    };

    // 2. Enhanced fuzzy match with multiple strategies
    if (tKey.length > 3) {
        let bestMatch: string | null = null;
        let bestScore = 0;
        const minScore = 0.65; // 65% similarity threshold (lowered to catch more variations)

        const tNormalized = normalizeTitle(tKey);
        const tWords = new Set(tNormalized.split(' ').filter(w => w.length > 2));

        for (const knownTitle of byTitleMap.keys()) {
            const kNormalized = normalizeTitle(knownTitle);
            const kWords = new Set(kNormalized.split(' ').filter(w => w.length > 2));

            // Strategy 1: Levenshtein distance (for typos)
            const threshold = Math.max(3, Math.floor(tKey.length * 0.2));
            if (Math.abs(knownTitle.length - tKey.length) <= threshold) {
                const dist = levenshtein(tKey, knownTitle);
                if (dist <= threshold) {
                    const score = 1 - (dist / Math.max(tKey.length, knownTitle.length));
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = knownTitle;
                    }
                }
            }

            // Strategy 2: Word-based matching (handles extra words, prefixes, suffixes)
            const intersection = new Set([...tWords].filter(w => kWords.has(w)));
            const union = new Set([...tWords, ...kWords]);

            if (intersection.size > 0 && union.size > 0) {
                // Base word overlap score (Jaccard Index)
                let wordScore = intersection.size / union.size;

                // Calculate simple character coverage ratio to ensure "most alphabets" match
                // This prevents "Neuroscience" (12 chars) from matching "Neuroscience Informatics" (24 chars)
                const shorterLen = Math.min(tNormalized.length, kNormalized.length);
                const longerLen = Math.max(tNormalized.length, kNormalized.length);
                const lengthRatio = shorterLen / longerLen;

                // Boost 1: If one is a substring of the other
                // Only boost if the length difference is small (e.g. typos, "The" prefix)
                const isSubstring = kNormalized.includes(tNormalized) || tNormalized.includes(kNormalized);
                if (isSubstring && lengthRatio > 0.8) {
                    wordScore = Math.max(wordScore, 0.85);
                }

                // Boost 2: If all words from the shorter title are in the longer one
                // (handles "British Journal of Surgery" vs "BJS-British Journal of Surgery")
                const shorterWords = tWords.size <= kWords.size ? tWords : kWords;
                const longerWords = tWords.size > kWords.size ? tWords : kWords;
                const allShorterInLonger = [...shorterWords].every(w => longerWords.has(w));

                if (allShorterInLonger && lengthRatio > 0.9) {
                    // High confidence if all words match AND lengths are extremely close (almost exact)
                    wordScore = Math.max(wordScore, 0.90);
                }

                if (wordScore > bestScore && wordScore >= minScore) {
                    bestScore = wordScore;
                    bestMatch = knownTitle;
                }
            }
        }

        if (bestMatch) {
            console.log(`[JCR Cache] Fuzzy match: "${title}" -> "${bestMatch}" (score: ${bestScore.toFixed(2)})`);
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

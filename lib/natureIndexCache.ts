import { prisma } from '@/lib/db';

export type NatureIndexRecord = {
    position: number;
    institution: string;
    country: string;
    count: number;
    share: number;
};

export type NatureIndexResult = {
    found: boolean;
    institution?: NatureIndexRecord;
    matchType?: 'exact' | 'fuzzy';
    reason?: string;
};

let isCacheLoaded = false;
let cacheLoadingPromise: Promise<void> | null = null;

// Maps for fast lookups
const byNameMap = new Map<string, NatureIndexRecord>();
const byCountryMap = new Map<string, NatureIndexRecord[]>();
const allInstitutions: NatureIndexRecord[] = [];

// Helper for Levenshtein Distance (fuzzy matching)
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

export async function ensureNatureIndexCacheLoaded(): Promise<void> {
    if (isCacheLoaded) return;
    if (cacheLoadingPromise) return cacheLoadingPromise;

    cacheLoadingPromise = (async () => {
        console.log('[Nature Index] Loading cache...');
        try {
            const all = await prisma.natureIndexInstitution.findMany({
                orderBy: { position: 'asc' }
            });

            for (const row of all) {
                const record: NatureIndexRecord = {
                    position: row.position,
                    institution: row.institution,
                    country: row.country,
                    count: row.count,
                    share: Number(row.share)
                };

                // By normalized name
                const nameKey = row.normalizedName;
                byNameMap.set(nameKey, record);

                // By country
                if (!byCountryMap.has(row.country)) {
                    byCountryMap.set(row.country, []);
                }
                byCountryMap.get(row.country)!.push(record);

                // All institutions list
                allInstitutions.push(record);
            }

            isCacheLoaded = true;
            console.log(`[Nature Index] Cache loaded: ${all.length} institutions`);
        } catch (e) {
            console.error('[Nature Index] Failed to load cache:', e);
            cacheLoadingPromise = null;
            throw e;
        }
    })();

    return cacheLoadingPromise;
}

export function getInstitutionByName(name: string): NatureIndexResult {
    if (!name) return { found: false, reason: 'No institution name provided' };

    const nameKey = name.trim().toLowerCase();

    // 1. Exact match
    if (byNameMap.has(nameKey)) {
        return {
            found: true,
            institution: byNameMap.get(nameKey)!,
            matchType: 'exact'
        };
    }

    // 2. Fuzzy match
    if (nameKey.length > 3) {
        let bestMatch: string | null = null;
        let minDist = 999;
        const threshold = Math.max(3, Math.floor(nameKey.length * 0.2)); // Allow 20% typos

        for (const knownName of byNameMap.keys()) {
            // Skip if length diff is too big
            if (Math.abs(knownName.length - nameKey.length) > threshold) continue;

            const dist = levenshtein(nameKey, knownName);
            if (dist < minDist && dist <= threshold) {
                minDist = dist;
                bestMatch = knownName;
            }
        }

        if (bestMatch) {
            console.log(`[Nature Index] Fuzzy match: "${name}" -> "${bestMatch}"`);
            return {
                found: true,
                institution: byNameMap.get(bestMatch)!,
                matchType: 'fuzzy',
                reason: `Fuzzy matched from "${name}"`
            };
        }
    }

    return { found: false, reason: 'Institution not found' };
}

export function getInstitutionsByCountry(country: string, limit?: number): NatureIndexRecord[] {
    if (!country) return [];

    const countryKey = country.trim();
    const institutions = byCountryMap.get(countryKey) || [];

    if (limit && limit > 0) {
        return institutions.slice(0, limit);
    }

    return institutions;
}

export function getTopInstitutions(limit: number = 10): NatureIndexRecord[] {
    return allInstitutions.slice(0, limit);
}

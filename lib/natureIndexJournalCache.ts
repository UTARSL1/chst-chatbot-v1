import fs from 'fs';
import path from 'path';
import Fuse from 'fuse.js';

interface NatureIndexJournal {
    journalName: string;
    isNatureIndex: boolean;
}

let journalCache: NatureIndexJournal[] | null = null;
let fuse: Fuse<NatureIndexJournal> | null = null;

/**
 * Load Nature Index journal data from CSV
 */
export async function ensureNatureIndexJournalCacheLoaded(): Promise<void> {
    if (journalCache) return; // Already loaded

    try {
        const csvPath = path.join(process.cwd(), 'data', 'Journal_in_nature_index.csv');
        const csvContent = fs.readFileSync(csvPath, 'utf-8');

        // Parse CSV (skip header row)
        const lines = csvContent.trim().split('\n').slice(1);

        journalCache = lines
            .filter(line => line.trim())
            .map(line => {
                const [journalName, isNatureIndex] = line.split(',').map(s => s.trim());
                return {
                    journalName,
                    isNatureIndex: isNatureIndex.toLowerCase() === 'yes'
                };
            });

        // Initialize Fuse for fuzzy searching
        fuse = new Fuse(journalCache, {
            keys: ['journalName'],
            threshold: 0.3, // Allow some typos
            includeScore: true
        });

        console.log(`[Nature Index Journals] Loaded ${journalCache.length} journals from CSV`);
    } catch (error) {
        console.error('[Nature Index Journals] Failed to load CSV:', error);
        journalCache = [];
        fuse = null;
    }
}

/**
 * Check if a journal is in the Nature Index
 */
export function checkJournalInNatureIndex(journalName: string): {
    found: boolean;
    journal?: NatureIndexJournal;
    matchedName?: string;
    confidence?: number;
} {
    if (!journalCache || !fuse) {
        return { found: false };
    }

    // Try exact match first (case-insensitive)
    const exactMatch = journalCache.find(
        j => j.journalName.toLowerCase() === journalName.toLowerCase()
    );

    if (exactMatch) {
        return {
            found: true,
            journal: exactMatch,
            matchedName: exactMatch.journalName,
            confidence: 1.0
        };
    }

    // Fuzzy search
    const results = fuse.search(journalName);

    if (results.length > 0 && results[0].score! < 0.3) {
        const match = results[0].item;
        return {
            found: true,
            journal: match,
            matchedName: match.journalName,
            confidence: 1 - results[0].score!
        };
    }

    return { found: false };
}

/**
 * Get all Nature Index journals (for listing)
 */
export function getAllNatureIndexJournals(): NatureIndexJournal[] {
    if (!journalCache) {
        return [];
    }
    return journalCache.filter(j => j.isNatureIndex);
}

/**
 * Search journals by partial name
 */
export function searchJournalsByName(query: string, limit: number = 10): NatureIndexJournal[] {
    if (!fuse) {
        return [];
    }

    const results = fuse.search(query, { limit });
    return results.map(r => r.item);
}

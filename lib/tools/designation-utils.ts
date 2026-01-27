
/**
 * Helper to normalize designation query string to standard academic ranks
 */
export function normalizeDesignation(query: string): string {
    if (!query) return '';
    const q = query.toLowerCase().trim();

    // Map common variations to standard designations
    const mappings: Record<string, string> = {
        'senior prof': 'Senior Professor',
        'prof': 'Professor',
        'emeritus prof': 'Emeritus Professor',
        'assoc prof': 'Associate Professor',
        'associate prof': 'Associate Professor',
        'asst prof': 'Assistant Professor',
        'assistant prof': 'Assistant Professor',
        'adjunct prof': 'Adjunct Professor',
        'lecturer': 'Lecturer',
        'senior lecturer': 'Senior Lecturer'
    };

    // Check strict mappings first
    for (const [key, value] of Object.entries(mappings)) {
        if (q === key || q === key + 's') return value;
    }

    // Try to match by partial string with logic to differentiate ranks
    if (q.includes('senior') && q.includes('professor')) return 'Senior Professor';
    if (q.includes('emeritus')) return 'Emeritus Professor';
    if (q.includes('associate')) return 'Associate Professor';
    if (q.includes('assistant')) return 'Assistant Professor';
    if (q.includes('adjunct')) return 'Adjunct Professor';

    // "Professor" (rank 2) logic: Must include 'professor' but NOT the other qualifiers
    if (q.includes('professor') &&
        !q.includes('associate') &&
        !q.includes('assistant') &&
        !q.includes('senior') &&
        !q.includes('adjunct') &&
        !q.includes('emeritus')) {
        return 'Professor';
    }

    if (q.includes('lecturer')) return 'Lecturer';

    return query;
}

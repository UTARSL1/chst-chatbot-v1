import { parse } from 'csv-parse/sync';

export interface ParsedPublication {
    title: string;
    journalName?: string;
    publicationType?: string;
    wosQuartile?: string;
    authorshipRole?: string;
    publicationYear?: number;
    publicationDate?: string;
    role?: string;
    issn?: string;
    doi?: string;
}

export interface ParsedCSVData {
    staffName: string;
    publications: ParsedPublication[];
    totalPublications: number;
    journalArticles: number;
    conferencePapers: number;
    q1Count: number;
    q2Count: number;
    q3Count: number;
    q4Count: number;
}

/**
 * Extract year from publication date string (e.g., "Jul-17" -> 2017, "Dec-17" -> 2017)
 */
export function extractYear(dateStr: string): number | null {
    if (!dateStr) return null;

    // Handle formats like "Jul-17", "Dec-17"
    const match = dateStr.match(/(\w{3})-(\d{2})/);
    if (match) {
        const year = parseInt(match[2], 10);
        // Assume 20xx for years 00-50, 19xx for 51-99
        return year <= 50 ? 2000 + year : 1900 + year;
    }

    // Handle full year "2017", "2018"
    const yearMatch = dateStr.match(/(\d{4})/);
    if (yearMatch) {
        return parseInt(yearMatch[1], 10);
    }

    return null;
}

/**
 * Categorize authorship role from Role column
 * - 1st Author: "1ST AUTHOR", "PRINCIPAL AUTHOR"
 * - Corresponding Author: "CORRESPONDING AUTHOR"
 * - Co-author: All others
 */
export function categorizeAuthorship(role: string): '1st Author' | 'Corresponding Author' | 'Co-author' {
    if (!role) return 'Co-author';

    const roleUpper = role.toUpperCase().trim();

    if (roleUpper === '1ST AUTHOR' || roleUpper === 'PRINCIPAL AUTHOR') {
        return '1st Author';
    }

    if (roleUpper === 'CORRESPONDING AUTHOR') {
        return 'Corresponding Author';
    }

    return 'Co-author';
}

/**
 * Parse publication CSV file
 */
export async function parsePublicationCSV(fileContent: string): Promise<ParsedCSVData> {
    try {
        // Parse CSV
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relax_column_count: true, // Handle malformed rows
            on_record: (record) => {
                // Clean up record - remove empty values
                const cleaned: any = {};
                for (const [key, value] of Object.entries(record)) {
                    if (value && typeof value === 'string' && value.trim()) {
                        cleaned[key] = value.trim();
                    }
                }
                return cleaned;
            }
        });

        if (records.length === 0) {
            throw new Error('CSV file is empty or invalid');
        }

        // Extract staff name from first row
        const staffName = records[0]['Staff Name'] || 'Unknown';

        // Parse publications
        const publications: ParsedPublication[] = [];
        let journalCount = 0;
        let conferenceCount = 0;
        let q1 = 0, q2 = 0, q3 = 0, q4 = 0;

        for (const row of records) {
            const title = row['Title of Publication'] || '';
            if (!title) continue; // Skip rows without title

            const publicationType = row['Type of Publication'] || '';
            const isJournal = publicationType.toUpperCase().includes('JOURNAL');

            if (isJournal) {
                journalCount++;
            } else {
                conferenceCount++;
            }

            const wosQuartile = row['WOS'] || null;
            const role = row['Role'] || '';
            const authorshipRole = categorizeAuthorship(role);
            const publicationDate = row['Publication Date'] || '';
            const publicationYear = extractYear(publicationDate);

            // Count quartiles (only for journal articles)
            if (wosQuartile) {
                if (wosQuartile === 'Q1') q1++;
                else if (wosQuartile === 'Q2') q2++;
                else if (wosQuartile === 'Q3') q3++;
                else if (wosQuartile === 'Q4') q4++;
            }

            publications.push({
                title,
                journalName: row['Name of Journal'] || undefined,
                publicationType: publicationType || undefined,
                wosQuartile: wosQuartile || undefined,
                authorshipRole,
                publicationYear,
                publicationDate: publicationDate || undefined,
                role: role || undefined,
                issn: row['ISSN No.'] || undefined,
                doi: row['D.O.I / Link'] || undefined
            });
        }

        return {
            staffName,
            publications,
            totalPublications: publications.length,
            journalArticles: journalCount,
            conferencePapers: conferenceCount,
            q1Count: q1,
            q2Count: q2,
            q3Count: q3,
            q4Count: q4
        };
    } catch (error) {
        console.error('[PublicationParser] Error parsing CSV:', error);
        throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

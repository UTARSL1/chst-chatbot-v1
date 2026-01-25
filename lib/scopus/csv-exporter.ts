/**
 * CSV Export Utilities for Scopus Publication Details
 */

export interface PublicationDetail {
    scopusId: string;
    eid: string;
    doi: string;
    title: string;
    authors: string[];
    authorIds: string[];
    publicationYear: number;
    sourceTitle: string;
    volume: string;
    issue: string;
    pageRange: string;
    citationCount: number;
    abstract: string;
    keywords: string[];
    documentType: string;
    affiliations: string[];
    openAccess: boolean;
    fundingAgency: string[];
    subjectAreas: string[];
    issn: string;
    isbn: string;
    publisher: string;
    aggregationType: string;
    coverDate: string;
    publicationName: string;
    link: string;
    staffName: string;
    staffEmail: string;
    staffDepartment: string;
}

/**
 * Escape CSV field (handle commas, quotes, newlines)
 */
function escapeCSVField(field: any): string {
    if (field === null || field === undefined) return '';

    const str = String(field);

    // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
}

/**
 * Convert array to semicolon-separated string for CSV
 */
function arrayToString(arr: any[]): string {
    if (!arr || arr.length === 0) return '';
    return arr.join('; ');
}

/**
 * Generate CSV content from publication details
 * @param publications - Array of publication details
 * @param includeStaffInfo - Whether to include staff information columns
 * @returns CSV string
 */
export function generatePublicationsCSV(
    publications: PublicationDetail[],
    includeStaffInfo: boolean = true
): string {
    const headers = [
        'Scopus ID',
        'EID',
        'DOI',
        'Title',
        'Authors',
        'Author IDs',
        'Publication Year',
        'Source Title',
        'Volume',
        'Issue',
        'Page Range',
        'Citation Count',
        'Abstract',
        'Keywords',
        'Document Type',
        'Affiliations',
        'Open Access',
        'Funding Agency',
        'Subject Areas',
        'ISSN',
        'ISBN',
        'Publisher',
        'Aggregation Type',
        'Cover Date',
        'Publication Name',
        'Scopus Link'
    ];

    if (includeStaffInfo) {
        headers.push('Staff Name', 'Staff Email', 'Staff Department');
    }

    const rows = publications.map(pub => {
        const row = [
            escapeCSVField(pub.scopusId),
            escapeCSVField(pub.eid),
            escapeCSVField(pub.doi),
            escapeCSVField(pub.title),
            escapeCSVField(arrayToString(pub.authors)),
            escapeCSVField(arrayToString(pub.authorIds)),
            escapeCSVField(pub.publicationYear),
            escapeCSVField(pub.sourceTitle),
            escapeCSVField(pub.volume),
            escapeCSVField(pub.issue),
            escapeCSVField(pub.pageRange),
            escapeCSVField(pub.citationCount),
            escapeCSVField(pub.abstract),
            escapeCSVField(arrayToString(pub.keywords)),
            escapeCSVField(pub.documentType),
            escapeCSVField(arrayToString(pub.affiliations)),
            escapeCSVField(pub.openAccess ? 'Yes' : 'No'),
            escapeCSVField(arrayToString(pub.fundingAgency)),
            escapeCSVField(arrayToString(pub.subjectAreas)),
            escapeCSVField(pub.issn),
            escapeCSVField(pub.isbn),
            escapeCSVField(pub.publisher),
            escapeCSVField(pub.aggregationType),
            escapeCSVField(pub.coverDate),
            escapeCSVField(pub.publicationName),
            escapeCSVField(pub.link)
        ];

        if (includeStaffInfo) {
            row.push(
                escapeCSVField(pub.staffName),
                escapeCSVField(pub.staffEmail),
                escapeCSVField(pub.staffDepartment)
            );
        }

        return row.join(',');
    });

    return [headers.join(','), ...rows].join('\n');
}

/**
 * Remove duplicate publications based on EID or DOI
 * @param publications - Array of publication details
 * @returns Array of unique publications
 */
export function removeDuplicatePublications(
    publications: PublicationDetail[]
): PublicationDetail[] {
    const seen = new Set<string>();
    const unique: PublicationDetail[] = [];

    for (const pub of publications) {
        // Use EID as primary unique identifier, fallback to DOI, then Scopus ID
        const identifier = pub.eid || pub.doi || pub.scopusId;

        if (!identifier || seen.has(identifier)) {
            continue;
        }

        seen.add(identifier);
        unique.push(pub);
    }

    return unique;
}

/**
 * Download CSV file in browser
 * @param csvContent - CSV string content
 * @param filename - Filename for download
 */
export function downloadCSV(csvContent: string, filename: string): void {
    try {
        // Add UTF-8 BOM to ensure proper encoding
        const BOM = '\uFEFF';
        const csvWithBOM = BOM + csvContent;

        const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up the URL after a short delay to ensure download starts
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 100);

            console.log('[CSV Download] File download triggered successfully');
        } else {
            console.error('[CSV Download] Browser does not support download attribute');
            throw new Error('Your browser does not support file downloads');
        }
    } catch (error) {
        console.error('[CSV Download] Error:', error);
        throw error;
    }
}

/**
 * Generate filename for CSV export
 * @param scope - Export scope (individual, department, faculty)
 * @param identifier - Department name, staff name, or faculty name
 * @param years - Selected years or 'lifetime'
 * @param includesDuplicates - Whether duplicates are included
 * @returns Filename string
 */
export function generateCSVFilename(
    scope: 'individual' | 'department' | 'faculty',
    identifier: string,
    years: number[] | 'lifetime',
    includesDuplicates: boolean
): string {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const yearStr = years === 'lifetime' ? 'lifetime' : years.join('-');
    const dupStr = includesDuplicates ? 'with-duplicates' : 'unique';
    const cleanIdentifier = identifier.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

    return `scopus-publications-${scope}-${cleanIdentifier}-${yearStr}-${dupStr}-${timestamp}.csv`;
}

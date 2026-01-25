import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

// Import data directly so Vercel bundles it
import staffData from '@/lkcfes-scopus-publications.json';

// Timeout limit: 300s (5 mins) is the maximum for Vercel Hobby plan
// Note: Faculty exports may time out if they exceed this limit.
export const maxDuration = 300;
export const dynamic = 'force-dynamic'; // Disable caching for real-time data

const SCOPUS_API_KEY = process.env.SCOPUS_API_KEY || '246160ba1cace197268c2b42a06f5349';
const SCOPUS_SEARCH_ENDPOINT = 'https://api.elsevier.com/content/search/scopus';
const SCOPUS_ABSTRACT_ENDPOINT = 'https://api.elsevier.com/content/abstract/scopus_id';
const RATE_LIMIT_DELAY_MS = 500;
const MAX_RETRIES = 3;

const PERMISSIONS_FILE = path.join(process.cwd(), 'faculty-permissions.json');

function getPermissions() {
    if (!fs.existsSync(PERMISSIONS_FILE)) return {};
    return JSON.parse(fs.readFileSync(PERMISSIONS_FILE, 'utf-8'));
}

interface PublicationDetail {
    scopusId: string;
    eid: string;
    doi: string;
    title: string;
    authors: string[];
    authorIds: string[];
    publicationYear: number;
    sourceTitle: string; // Journal/Conference name
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
    aggregationType: string; // Journal, Conference Proceeding, Book, etc.
    coverDate: string;
    publicationName: string;
    link: string;
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch publication details from Scopus API
 */
async function fetchPublicationDetails(
    authorId: string,
    years: number[],
    retryCount = 0
): Promise<PublicationDetail[]> {
    try {
        const publications: PublicationDetail[] = [];

        // Build query for all years
        const yearQuery = years.length > 0
            ? `AND (${years.map(y => `PUBYEAR IS ${y}`).join(' OR ')})`
            : '';

        const query = `AU-ID(${authorId}) ${yearQuery}`;

        const url = new URL(SCOPUS_SEARCH_ENDPOINT);
        url.searchParams.append('query', query);
        url.searchParams.append('apiKey', SCOPUS_API_KEY);
        url.searchParams.append('count', '200'); // Max results per request
        url.searchParams.append('start', '0');
        url.searchParams.append('httpAccept', 'application/json');
        url.searchParams.append('field', 'dc:identifier,eid,doi,dc:title,dc:creator,author,prism:publicationName,prism:coverDate,prism:volume,prism:issueIdentifier,prism:pageRange,citedby-count,dc:description,authkeywords,subtypeDescription,affilname,openaccess,fund-agency,subject-area,prism:issn,prism:isbn,dc:publisher,prism:aggregationType,link');

        console.log(`Fetching publications for Author ID ${authorId}...`);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            if (response.status === 429 && retryCount < MAX_RETRIES) {
                console.log(`Rate limited. Waiting before retry ${retryCount + 1}/${MAX_RETRIES}...`);
                await sleep(5000);
                return fetchPublicationDetails(authorId, years, retryCount + 1);
            }
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();
        const entries = data['search-results']?.entry || [];

        for (const entry of entries) {
            // Extract all available metadata
            const publication: PublicationDetail = {
                scopusId: entry['dc:identifier']?.replace('SCOPUS_ID:', '') || '',
                eid: entry['eid'] || '',
                doi: entry['prism:doi'] || entry['doi'] || '',
                title: entry['dc:title'] || '',
                authors: entry['author']?.map((a: any) => a['authname']) || [],
                authorIds: entry['author']?.map((a: any) => a['authid']) || [],
                publicationYear: parseInt(entry['prism:coverDate']?.substring(0, 4) || '0'),
                sourceTitle: entry['prism:publicationName'] || '',
                volume: entry['prism:volume'] || '',
                issue: entry['prism:issueIdentifier'] || '',
                pageRange: entry['prism:pageRange'] || '',
                citationCount: parseInt(entry['citedby-count'] || '0'),
                abstract: entry['dc:description'] || '',
                keywords: entry['authkeywords']?.split('|').map((k: string) => k.trim()).filter(Boolean) || [],
                documentType: entry['subtypeDescription'] || entry['subtype'] || '',
                affiliations: entry['affilname']?.split(';').map((a: string) => a.trim()).filter(Boolean) || [],
                openAccess: entry['openaccess'] === '1' || entry['openaccess'] === 'true' || entry['openaccess'] === true,
                fundingAgency: entry['fund-agency']?.split(';').map((f: string) => f.trim()).filter(Boolean) || [],
                subjectAreas: entry['subject-area']?.map((s: any) => s['$']) || [],
                issn: entry['prism:issn'] || '',
                isbn: entry['prism:isbn'] || '',
                publisher: entry['dc:publisher'] || '',
                aggregationType: entry['prism:aggregationType'] || '',
                coverDate: entry['prism:coverDate'] || '',
                publicationName: entry['prism:publicationName'] || '',
                link: entry['link']?.find((l: any) => l['@ref'] === 'scopus')?.['@href'] ||
                    `https://www.scopus.com/record/display.uri?eid=${entry['eid']}&origin=resultslist`
            };

            publications.push(publication);
        }

        return publications;
    } catch (error) {
        console.error(`Error fetching publication details:`, error);
        throw error;
    }
}

/**
 * GET endpoint to fetch publication details
 * Query params:
 * - scope: 'individual' | 'department' | 'faculty'
 * - department: department acronym (required for individual and department scope)
 * - faculty: faculty acronym (required for faculty scope)
 * - staffEmail: staff email (required for individual scope)
 * - years: comma-separated years (e.g., "2023,2024,2025") or "lifetime"
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const scope = searchParams.get('scope') as 'individual' | 'department' | 'faculty';
        const department = searchParams.get('department');
        const faculty = searchParams.get('faculty') || 'LKC FES';
        const staffEmail = searchParams.get('staffEmail');
        const yearsParam = searchParams.get('years');

        if (!scope) {
            return NextResponse.json({ success: false, error: 'Scope parameter required' }, { status: 400 });
        }

        // Parse years
        const years: number[] = yearsParam === 'lifetime' || !yearsParam
            ? []
            : yearsParam.split(',').map(y => parseInt(y.trim())).filter(y => !isNaN(y));

        // Permission check
        const isChairperson = session.user.role === 'chairperson';
        if (!isChairperson && department) {
            const permissionKey = `${faculty}-${department}`;
            const perms = getPermissions();
            const allowedUsers = perms.permissions?.[permissionKey] || [];

            if (!allowedUsers.includes(session.user.email)) {
                return NextResponse.json({ success: false, error: 'Access Denied' }, { status: 403 });
            }
        }

        // Use imported data directly (works in Vercel)
        // Handle potential default export wrapping
        const publicationsData = (staffData as any).default || staffData;

        let staffToProcess: any[] = [];

        // Determine which staff members to process based on scope
        if (scope === 'individual') {
            if (!staffEmail) {
                return NextResponse.json({ success: false, error: 'staffEmail required for individual scope' }, { status: 400 });
            }
            const staff = publicationsData.results.find((s: any) => s.email === staffEmail);
            if (!staff) {
                return NextResponse.json({ success: false, error: 'Staff member not found' }, { status: 404 });
            }
            staffToProcess = [staff];
        } else if (scope === 'department') {
            if (!department) {
                return NextResponse.json({ success: false, error: 'department required for department scope' }, { status: 400 });
            }
            staffToProcess = publicationsData.results.filter((s: any) => s.departmentAcronym === department);
        } else if (scope === 'faculty') {
            // For now, all data is LKC FES
            staffToProcess = publicationsData.results || [];
        }

        console.log(`[Publication Details Debug] Scope: ${scope}, Data Loaded: ${!!publicationsData}, Results: ${publicationsData?.results?.length}, Staff to process: ${staffToProcess.length}`);

        if (staffToProcess.length === 0) {
            console.warn(`[Publication Details Warning] No staff found. Debug: Data=${JSON.stringify(Object.keys(publicationsData || {}))}`);
        }

        // Fetch publication details for all staff members
        const allPublications: Array<PublicationDetail & { staffName: string; staffEmail: string; staffDepartment: string }> = [];

        let processedCount = 0;
        const totalStaff = staffToProcess.length;
        console.log(`[Publication Details] Starting to process ${totalStaff} staff members...`);

        for (const staff of staffToProcess) {
            if (!staff.scopusAuthorId || staff.scopusAuthorId === 'NA') continue;

            try {
                processedCount++;
                console.log(`[Publication Details] Processing ${processedCount}/${totalStaff}: ${staff.name} (${staff.email})`);

                const publications = await fetchPublicationDetails(staff.scopusAuthorId, years);

                // Add staff information to each publication
                publications.forEach(pub => {
                    allPublications.push({
                        ...pub,
                        staffName: staff.name,
                        staffEmail: staff.email,
                        staffDepartment: staff.departmentAcronym
                    });
                });

                console.log(`[Publication Details] Found ${publications.length} publications for ${staff.name}`);

                // Rate limiting
                await sleep(RATE_LIMIT_DELAY_MS);
            } catch (error) {
                console.error(`Error fetching publications for ${staff.name}:`, error);
            }
        }

        return NextResponse.json({
            success: true,
            publications: allPublications,
            metadata: {
                scope,
                department,
                faculty,
                years: years.length > 0 ? years : 'lifetime',
                totalPublications: allPublications.length,
                staffCount: staffToProcess.length
            }
        });

    } catch (error) {
        console.error('Error in publication-details API:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error'
        }, { status: 500 });
    }
}

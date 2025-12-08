
import { NextResponse } from 'next/server';
import { ensureJcrCacheLoaded, getJournalMetricsByIssn, getJournalMetricsByTitle, getJournalInfo } from '@/lib/jcrCache';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { query, issn, years } = body;

        // Ensure cache is loaded
        await ensureJcrCacheLoaded();

        let metrics: any[] = [];
        let matchType = '';
        let found = false;

        // 1. Try ISSN lookup
        if (issn) {
            metrics = getJournalMetricsByIssn(issn, years);
            if (metrics.length > 0) {
                found = true;
                matchType = 'issn';
            }
        }

        // 2. Try Title lookup if not found
        if (!found && query) {
            metrics = getJournalMetricsByTitle(query, years);
            if (metrics.length > 0) {
                found = true;
                matchType = 'title';
            }
        }

        if (!found) {
            return NextResponse.json({ found: false, reason: 'No matching journal for given ISSN or title' });
        }

        // Retrieve full journal metadata
        // use the same input that yielded results to fetch metadata
        let journalInfo = null;
        if (matchType === 'issn') {
            journalInfo = getJournalInfo(issn);
        } else {
            journalInfo = getJournalInfo(query);
        }

        return NextResponse.json({
            found: true,
            journal: journalInfo,
            metrics,
            matchType
        });

    } catch (e) {
        console.error('JCR API Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

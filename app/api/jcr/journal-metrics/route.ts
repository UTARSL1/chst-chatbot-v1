
import { NextResponse } from 'next/server';
import { ensureJcrCacheLoaded, getJournalMetricsByIssn, getJournalMetricsByTitle, getJournalInfo } from '@/lib/jcrCache';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { query, issn, years } = body;

        // Ensure cache is loaded
        await ensureJcrCacheLoaded();

        // 1. Try ISSN lookup
        if (issn) {
            const result = getJournalMetricsByIssn(issn, years);
            if (result.found) {
                return NextResponse.json(result);
            }
        }

        // 2. Try Title lookup if not found or skipped
        if (query) {
            const result = getJournalMetricsByTitle(query, years);
            if (result.found) {
                return NextResponse.json(result);
            }
        }

        return NextResponse.json({ found: false, reason: 'No matching journal found' });

    } catch (e) {
        console.error('JCR API Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

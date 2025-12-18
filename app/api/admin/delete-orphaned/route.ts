import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
});

/**
 * Simple endpoint to delete orphaned vectors by filename
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await req.json();
        const { filenames } = body as { filenames: string[] };

        if (!filenames || !Array.isArray(filenames)) {
            return NextResponse.json({ error: 'Provide filenames array' }, { status: 400 });
        }

        const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

        const results = [];
        for (const filename of filenames) {
            try {
                await index.deleteMany({ filename });
                results.push({ filename, status: 'deleted' });
                console.log(`✅ Deleted vectors for: ${filename}`);
            } catch (error: any) {
                results.push({ filename, status: 'error', error: error.message });
                console.error(`❌ Error deleting ${filename}:`, error);
            }
        }

        return NextResponse.json({ success: true, results }, { status: 200 });
    } catch (error: any) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

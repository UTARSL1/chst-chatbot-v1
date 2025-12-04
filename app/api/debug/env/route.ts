import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        // Only allow chairpersons to access this debug endpoint
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        return NextResponse.json({
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
            hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...' || 'NOT SET',
            nodeEnv: process.env.NODE_ENV,
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to check environment' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { syncStaffDirectory } from '@/lib/tools/staff-directory';

/**
 * POST /api/admin/sync-staff
 * Trigger manual staff directory sync
 * Only accessible by chairpersons
 */
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        // Authentication check
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { faculties } = body;

        // Validate faculties parameter
        if (!faculties || !Array.isArray(faculties) || faculties.length === 0) {
            return NextResponse.json(
                { error: 'Faculties array is required and must not be empty' },
                { status: 400 }
            );
        }

        console.log(`[Admin API] Starting staff directory sync for faculties: ${faculties.join(', ')}`);
        console.log(`[Admin API] Triggered by: ${session.user.email}`);

        // Run sync (this will take several minutes)
        const result = await syncStaffDirectory(faculties);

        console.log(`[Admin API] Sync completed: ${result.status}`);
        console.log(`[Admin API] Duration: ${result.duration}`);
        console.log(`[Admin API] Total staff: ${result.totalStaff}`);
        console.log(`[Admin API] Changes: +${result.changes.added}, ~${result.changes.updated}, -${result.changes.deleted}`);

        return NextResponse.json({
            success: true,
            result: {
                status: result.status,
                duration: result.duration,
                totalStaff: result.totalStaff,
                changes: result.changes,
                unknownPrefixes: result.unknownPrefixes,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error('[Admin API] Staff sync error:', error);
        return NextResponse.json(
            {
                error: 'Failed to sync staff directory',
                details: error.message
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/admin/sync-staff
 * Get current staff directory status
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        // Authentication check
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Load staff directory to get metadata
        const { loadStaffDirectory } = await import('@/lib/tools/staff-directory');
        const directory = loadStaffDirectory();

        if (!directory) {
            return NextResponse.json({
                success: true,
                status: 'not_initialized',
                message: 'Staff directory has not been synced yet'
            });
        }

        // Calculate days since last sync
        const lastUpdated = new Date(directory.lastUpdated);
        const now = new Date();
        const daysSinceSync = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));

        // Determine status
        let status: 'fresh' | 'warning' | 'stale';
        if (daysSinceSync <= 7) {
            status = 'fresh';
        } else if (daysSinceSync <= 30) {
            status = 'warning';
        } else {
            status = 'stale';
        }

        return NextResponse.json({
            success: true,
            status: 'initialized',
            data: {
                lastUpdated: directory.lastUpdated,
                daysSinceSync,
                syncDuration: directory.syncDuration,
                totalStaff: directory.metadata.staffCount,
                uniqueStaff: directory.metadata.uniqueStaffCount,
                facultiesCount: directory.metadata.facultiesCount,
                departmentsCount: directory.metadata.departmentsCount,
                employmentTypes: {
                    fullTime: directory.metadata.fullTimeCount,
                    adjunct: directory.metadata.adjunctCount,
                    partTime: directory.metadata.partTimeCount,
                    expatriate: directory.metadata.expatriateCount,
                    emeritus: directory.metadata.emeritusCount
                },
                syncHistory: directory.syncHistory.slice(-5), // Last 5 syncs
                healthStatus: status
            }
        });

    } catch (error: any) {
        console.error('[Admin API] Error fetching staff directory status:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch staff directory status',
                details: error.message
            },
            { status: 500 }
        );
    }
}

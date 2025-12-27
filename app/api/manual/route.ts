import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        // Verify authentication
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const user = session.user;
        const { searchParams } = new URL(request.url);
        const requestedRole = searchParams.get('role');

        // Validate role parameter
        if (!requestedRole || !['public', 'student', 'member', 'chairperson'].includes(requestedRole)) {
            return NextResponse.json(
                { error: 'Invalid role parameter' },
                { status: 400 }
            );
        }

        // Ensure user can only access their own role's manual
        // (chairperson can access all manuals for review purposes)
        if (user.role !== requestedRole && user.role !== 'chairperson') {
            return NextResponse.json(
                { error: 'Forbidden: You can only access your role\'s manual' },
                { status: 403 }
            );
        }

        // Map role to filename
        const roleToFilename: Record<string, string> = {
            public: 'public-user-manual.md',
            student: 'student-user-manual.md',
            member: 'member-user-manual.md',
            chairperson: 'admin-user-manual.md',
        };

        const filename = roleToFilename[requestedRole];
        const filePath = join(process.cwd(), 'public', 'manuals', filename);

        // Read the manual file
        const content = await readFile(filePath, 'utf-8');

        return NextResponse.json({
            role: requestedRole,
            content,
            filename,
        });

    } catch (error) {
        console.error('Error fetching manual:', error);

        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return NextResponse.json(
                { error: 'Manual not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

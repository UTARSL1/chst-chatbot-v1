import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const PERMISSIONS_FILE = path.join(process.cwd(), 'faculty-permissions.json');

function getPermissions() {
    if (!fs.existsSync(PERMISSIONS_FILE)) return {};
    return JSON.parse(fs.readFileSync(PERMISSIONS_FILE, 'utf-8'));
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const department = searchParams.get('department');
        const faculty = searchParams.get('faculty') || 'LKC FES';

        // Permission Check
        const isChairperson = session.user.role === 'chairperson';

        // If no department specified, return all faculty staff (chairperson only)
        if (!department) {
            if (!isChairperson) {
                return NextResponse.json({ success: false, error: 'Access Denied - Faculty-level access requires chairperson role' }, { status: 403 });
            }

            // Load all faculty staff
            const publicationsPath = path.join(process.cwd(), 'lkcfes-scopus-publications.json');
            const publicationsData = JSON.parse(fs.readFileSync(publicationsPath, 'utf-8'));

            return NextResponse.json(
                {
                    success: true,
                    staff: publicationsData.results
                },
                {
                    headers: {
                        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0',
                    }
                }
            );
        }

        // Department-level access check
        if (!isChairperson) {
            const permissionKey = `${faculty}-${department}`;
            const perms = getPermissions();
            const allowedUsers = perms.permissions?.[permissionKey] || [];

            if (!allowedUsers.includes(session.user.email)) {
                return NextResponse.json({ success: false, error: 'Access Denied' }, { status: 403 });
            }
        }

        // Load Scopus publications data
        const publicationsPath = path.join(process.cwd(), 'lkcfes-scopus-publications.json');
        const publicationsData = JSON.parse(fs.readFileSync(publicationsPath, 'utf-8'));

        // Filter staff by department
        const departmentStaff = publicationsData.results.filter((staff: any) =>
            staff.departmentAcronym === department
        );

        return NextResponse.json(
            {
                success: true,
                staff: departmentStaff
            },
            {
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                }
            }
        );
    } catch (error) {
        console.error('Error fetching staff:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

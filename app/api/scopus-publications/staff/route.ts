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
        // We assume Faculty is LKC FES for now as per current data structure, 
        // but ideally we should pass faculty too. For now we can infer or check broadly.
        // To be safe, let's allow if they have access to THIS department under ANY faculty 
        // OR better, since the UI passes department acronym, we construct the key.
        // The permission key format is "Faculty-DepartmentAcronym".
        // Since we only have LKC FES now, we default to that.
        const faculty = 'LKC FES';

        if (!department) {
            return NextResponse.json({ success: false, error: 'Department parameter required' }, { status: 400 });
        }

        // Permission Check
        const isChairperson = session.user.role === 'chairperson';
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

        return NextResponse.json({
            success: true,
            staff: departmentStaff
        });
    } catch (error) {
        console.error('Error fetching staff:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

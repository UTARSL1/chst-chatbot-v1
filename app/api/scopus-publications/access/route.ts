import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const PERMISSIONS_FILE = path.join(process.cwd(), 'faculty-permissions.json');

// Helper to read permissions
function getPermissions() {
    if (!fs.existsSync(PERMISSIONS_FILE)) {
        return {};
    }
    return JSON.parse(fs.readFileSync(PERMISSIONS_FILE, 'utf-8'));
}

// Helper to save permissions
function savePermissions(data: any) {
    fs.writeFileSync(PERMISSIONS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const faculty = searchParams.get('faculty');
        const department = searchParams.get('department');

        if (!faculty || !department) {
            return NextResponse.json({ success: false, error: 'Faculty and Department required' }, { status: 400 });
        }

        const permissionKey = `${faculty}-${department}`;
        const data = getPermissions();
        const allowedUsers = data.permissions?.[permissionKey] || [];

        const isChairperson = session.user.role === 'chairperson';
        const hasAccess = isChairperson || allowedUsers.includes(session.user.email);

        // If chairperson, return the list of allowed users
        if (isChairperson) {
            return NextResponse.json({
                success: true,
                hasAccess: true,
                allowedUsers: allowedUsers,
                isChairperson: true
            });
        }

        // If regular user, just return access status
        return NextResponse.json({
            success: true,
            hasAccess: hasAccess,
            isChairperson: false
        });

    } catch (error) {
        console.error('Error checking permissions:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // Only chairperson can grant access
        if (!session?.user?.email || session.user.role !== 'chairperson') {
            return NextResponse.json({ success: false, error: 'Unauthorized. Only Chairperson can grant access.' }, { status: 403 });
        }

        const body = await request.json();
        const { faculty, department, email } = body;

        if (!faculty || !department || !email) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const permissionKey = `${faculty}-${department}`;
        const data = getPermissions();

        if (!data.permissions) data.permissions = {};
        if (!data.permissions[permissionKey]) data.permissions[permissionKey] = [];

        // Add email if not already exists
        if (!data.permissions[permissionKey].includes(email)) {
            data.permissions[permissionKey].push(email);
            data.lastUpdated = new Date().toISOString();
            savePermissions(data);
        }

        return NextResponse.json({
            success: true,
            allowedUsers: data.permissions[permissionKey]
        });

    } catch (error) {
        console.error('Error granting permission:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // Only chairperson can revoke access
        if (!session?.user?.email || session.user.role !== 'chairperson') {
            return NextResponse.json({ success: false, error: 'Unauthorized. Only Chairperson can revoke access.' }, { status: 403 });
        }

        const body = await request.json();
        const { faculty, department, email } = body;

        if (!faculty || !department || !email) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const permissionKey = `${faculty}-${department}`;
        const data = getPermissions();

        if (data.permissions && data.permissions[permissionKey]) {
            data.permissions[permissionKey] = data.permissions[permissionKey].filter((e: string) => e !== email);
            data.lastUpdated = new Date().toISOString();
            savePermissions(data);
        }

        return NextResponse.json({
            success: true,
            allowedUsers: data.permissions?.[permissionKey] || []
        });

    } catch (error) {
        console.error('Error revoking permission:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

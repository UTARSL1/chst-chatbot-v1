import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadStaffDirectory } from '@/lib/tools/staff-directory';
import { compareStaffDirectories } from '@/lib/tools/staff-comparison';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = req.nextUrl.searchParams;
        const year1 = searchParams.get('year1');
        const year2 = searchParams.get('year2');

        if (!year1 || !year2) {
            return NextResponse.json(
                { error: 'Both year1 and year2 parameters are required' },
                { status: 400 }
            );
        }

        // Load the two directories
        let dir1, dir2;

        // Load year1 directory
        if (year1 === 'current') {
            dir1 = loadStaffDirectory();
        } else {
            const year1Path = path.join(process.cwd(), 'lib', 'tools', `staff_directory_${year1}.json`);
            if (!fs.existsSync(year1Path)) {
                return NextResponse.json(
                    { error: `Staff directory for year ${year1} not found` },
                    { status: 404 }
                );
            }
            const year1Data = fs.readFileSync(year1Path, 'utf-8');
            dir1 = JSON.parse(year1Data);
        }

        // Load year2 directory
        if (year2 === 'current') {
            dir2 = loadStaffDirectory();
        } else {
            const year2Path = path.join(process.cwd(), 'lib', 'tools', `staff_directory_${year2}.json`);
            if (!fs.existsSync(year2Path)) {
                return NextResponse.json(
                    { error: `Staff directory for year ${year2} not found` },
                    { status: 404 }
                );
            }
            const year2Data = fs.readFileSync(year2Path, 'utf-8');
            dir2 = JSON.parse(year2Data);
        }

        if (!dir1 || !dir2) {
            return NextResponse.json(
                { error: 'Failed to load staff directories' },
                { status: 500 }
            );
        }

        // Perform comparison
        const comparison = compareStaffDirectories(dir1, dir2);

        return NextResponse.json(comparison);

    } catch (error: any) {
        console.error('Staff comparison error:', error);
        return NextResponse.json(
            { error: 'Failed to compare staff directories', details: error.message },
            { status: 500 }
        );
    }
}

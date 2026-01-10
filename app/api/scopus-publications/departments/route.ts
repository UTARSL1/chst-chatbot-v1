import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const faculty = searchParams.get('faculty');

        if (!faculty) {
            return NextResponse.json({ success: false, error: 'Faculty parameter required' }, { status: 400 });
        }

        // Load staff directory
        const staffDirPath = path.join(process.cwd(), 'lib', 'tools', 'staff_directory.json');
        const staffDirectory = JSON.parse(fs.readFileSync(staffDirPath, 'utf-8'));

        const facultyData = staffDirectory.faculties?.[faculty];

        if (!facultyData) {
            return NextResponse.json({ success: false, error: 'Faculty not found' }, { status: 404 });
        }

        // Extract departments (excluding FGO and DLMSA)
        const departments = Object.entries(facultyData.departments || {})
            .filter(([key]) => key !== 'FGO' && key !== 'DLMSA')
            .map(([acronym, deptData]: [string, any]) => ({
                acronym,
                name: deptData.canonical || deptData.name || acronym,
                staffCount: deptData.staff?.length || 0
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json({
            success: true,
            departments
        });
    } catch (error) {
        console.error('Error fetching departments:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

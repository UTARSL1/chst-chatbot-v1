import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { uploadFile, generateFilePath } from '@/lib/supabase/storage';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const departments = await prisma.department.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json(departments);
    } catch (error) {
        console.error('Error fetching departments:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const formData = await req.formData();
        const name = formData.get('name') as string;
        const abbreviation = formData.get('abbreviation') as string | null;
        const icon = formData.get('icon') as string | null;
        const color = formData.get('color') as string | null;
        const iconFile = formData.get('iconFile') as File | null;
        const imageFile = formData.get('imageFile') as File | null;

        if (!name) {
            return new NextResponse('Name is required', { status: 400 });
        }

        // Create department first to get ID
        const department = await prisma.department.create({
            data: {
                name,
                abbreviation,
                icon,
                color,
            },
        });

        // Upload files if provided
        let iconUrl: string | undefined;
        let imageUrl: string | undefined;

        if (iconFile && iconFile.size > 0) {
            const iconPath = generateFilePath('icons', department.id, iconFile.name);
            const iconResult = await uploadFile('departments', iconFile, iconPath);
            if (iconResult.success) {
                iconUrl = iconResult.url;
            }
        }

        if (imageFile && imageFile.size > 0) {
            const imagePath = generateFilePath('images', department.id, imageFile.name);
            const imageResult = await uploadFile('departments', imageFile, imagePath);
            if (imageResult.success) {
                imageUrl = imageResult.url;
            }
        }

        // Update department with file URLs if uploaded
        if (iconUrl || imageUrl) {
            const updatedDepartment = await prisma.department.update({
                where: { id: department.id },
                data: {
                    ...(iconUrl && { iconUrl }),
                    ...(imageUrl && { imageUrl }),
                },
            });
            return NextResponse.json(updatedDepartment);
        }

        return NextResponse.json(department);
    } catch (error) {
        console.error('Error creating department:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

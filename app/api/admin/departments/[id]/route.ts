import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { uploadFile, deleteFile, extractPathFromUrl, generateFilePath } from '@/lib/supabase/storage';

export async function PATCH(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { id } = await context.params;

        // Get existing department
        const existingDept = await prisma.department.findUnique({
            where: { id },
        });

        if (!existingDept) {
            return new NextResponse('Department not found', { status: 404 });
        }

        const formData = await req.formData();
        const name = formData.get('name') as string;
        const description = formData.get('description') as string | null;
        const abbreviation = formData.get('abbreviation') as string | null;
        const icon = formData.get('icon') as string | null;
        const color = formData.get('color') as string | null;
        const iconFile = formData.get('iconFile') as File | null;
        const imageFile = formData.get('imageFile') as File | null;

        let iconUrl = existingDept.iconUrl;
        let imageUrl = existingDept.imageUrl;

        // Handle icon file upload
        if (iconFile && iconFile.size > 0) {
            // Delete old icon if exists
            if (existingDept.iconUrl) {
                const oldPath = extractPathFromUrl(existingDept.iconUrl, 'departments');
                if (oldPath) {
                    await deleteFile('departments', oldPath);
                }
            }

            // Upload new icon
            const iconPath = generateFilePath('icons', id, iconFile.name);
            const iconResult = await uploadFile('departments', iconFile, iconPath);
            if (iconResult.success && iconResult.url) {
                iconUrl = iconResult.url;
            }
        }

        // Handle image file upload
        if (imageFile && imageFile.size > 0) {
            // Delete old image if exists
            if (existingDept.imageUrl) {
                const oldPath = extractPathFromUrl(existingDept.imageUrl, 'departments');
                if (oldPath) {
                    await deleteFile('departments', oldPath);
                }
            }

            // Upload new image
            const imagePath = generateFilePath('images', id, imageFile.name);
            const imageResult = await uploadFile('departments', imageFile, imagePath);
            if (imageResult.success && imageResult.url) {
                imageUrl = imageResult.url;
            }
        }

        const department = await prisma.department.update({
            where: { id },
            data: {
                name,
                description,
                abbreviation,
                icon,
                color,
                iconUrl,
                imageUrl,
            },
        });

        return NextResponse.json(department);
    } catch (error) {
        console.error('Error updating department:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { id } = await context.params;

        // Get department to find file URLs
        const department = await prisma.department.findUnique({
            where: { id },
        });

        if (!department) {
            return new NextResponse('Department not found', { status: 404 });
        }

        // Delete files from storage
        if (department.iconUrl) {
            const iconPath = extractPathFromUrl(department.iconUrl, 'departments');
            if (iconPath) {
                await deleteFile('departments', iconPath);
            }
        }

        if (department.imageUrl) {
            const imagePath = extractPathFromUrl(department.imageUrl, 'departments');
            if (imagePath) {
                await deleteFile('departments', imagePath);
            }
        }

        // Delete from database
        await prisma.department.delete({
            where: { id },
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting department:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

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

        // Get existing document type
        const existingType = await prisma.documentType.findUnique({
            where: { id },
        });

        if (!existingType) {
            return new NextResponse('Document type not found', { status: 404 });
        }

        const formData = await req.formData();
        const name = formData.get('name') as string;
        const description = formData.get('description') as string | null;
        const icon = formData.get('icon') as string | null;
        const color = formData.get('color') as string | null;
        const iconFile = formData.get('iconFile') as File | null;
        const imageFile = formData.get('imageFile') as File | null;

        let iconUrl = existingType.iconUrl;
        let imageUrl = existingType.imageUrl;

        // Handle icon file upload
        if (iconFile && iconFile.size > 0) {
            // Delete old icon if exists
            if (existingType.iconUrl) {
                const oldPath = extractPathFromUrl(existingType.iconUrl, 'document-types');
                if (oldPath) {
                    await deleteFile('document-types', oldPath);
                }
            }

            // Upload new icon
            const iconPath = generateFilePath('icons', id, iconFile.name);
            const iconResult = await uploadFile('document-types', iconFile, iconPath);
            if (iconResult.success) {
                iconUrl = iconResult.url;
            }
        }

        // Handle image file upload
        if (imageFile && imageFile.size > 0) {
            // Delete old image if exists
            if (existingType.imageUrl) {
                const oldPath = extractPathFromUrl(existingType.imageUrl, 'document-types');
                if (oldPath) {
                    await deleteFile('document-types', oldPath);
                }
            }

            // Upload new image
            const imagePath = generateFilePath('images', id, imageFile.name);
            const imageResult = await uploadFile('document-types', imageFile, imagePath);
            if (imageResult.success) {
                imageUrl = imageResult.url;
            }
        }

        const documentType = await prisma.documentType.update({
            where: { id },
            data: {
                name,
                description,
                icon,
                color,
                iconUrl,
                imageUrl,
            },
        });

        return NextResponse.json(documentType);
    } catch (error) {
        console.error('Error updating document type:', error);
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

        // Get document type to find file URLs
        const documentType = await prisma.documentType.findUnique({
            where: { id },
        });

        if (!documentType) {
            return new NextResponse('Document type not found', { status: 404 });
        }

        // Delete files from storage
        if (documentType.iconUrl) {
            const iconPath = extractPathFromUrl(documentType.iconUrl, 'document-types');
            if (iconPath) {
                await deleteFile('document-types', iconPath);
            }
        }

        if (documentType.imageUrl) {
            const imagePath = extractPathFromUrl(documentType.imageUrl, 'document-types');
            if (imagePath) {
                await deleteFile('document-types', imagePath);
            }
        }

        // Delete from database
        await prisma.documentType.delete({
            where: { id },
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting document type:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

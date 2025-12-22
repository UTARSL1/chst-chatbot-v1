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

        const documentTypes = await prisma.documentType.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json(documentTypes);
    } catch (error) {
        console.error('Error fetching document types:', error);
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
        const icon = formData.get('icon') as string | null;
        const color = formData.get('color') as string | null;
        const iconFile = formData.get('iconFile') as File | null;
        const imageFile = formData.get('imageFile') as File | null;

        if (!name) {
            return new NextResponse('Name is required', { status: 400 });
        }

        // Create document type first to get ID
        const documentType = await prisma.documentType.create({
            data: {
                name,
                icon,
                color,
            },
        });

        // Upload files if provided
        let iconUrl: string | null = null;
        let imageUrl: string | null = null;

        if (iconFile && iconFile.size > 0) {
            const iconPath = generateFilePath('icons', documentType.id, iconFile.name);
            const iconResult = await uploadFile('document-types', iconFile, iconPath);
            if (iconResult.success && iconResult.url) {
                iconUrl = iconResult.url;
            }
        }

        if (imageFile && imageFile.size > 0) {
            const imagePath = generateFilePath('images', documentType.id, imageFile.name);
            const imageResult = await uploadFile('document-types', imageFile, imagePath);
            if (imageResult.success && imageResult.url) {
                imageUrl = imageResult.url;
            }
        }

        // Update document type with file URLs if uploaded
        if (iconUrl || imageUrl) {
            const updatedDocumentType = await prisma.documentType.update({
                where: { id: documentType.id },
                data: {
                    ...(iconUrl && { iconUrl }),
                    ...(imageUrl && { imageUrl }),
                },
            });
            return NextResponse.json(updatedDocumentType);
        }

        return NextResponse.json(documentType);
    } catch (error) {
        console.error('Error creating document type:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

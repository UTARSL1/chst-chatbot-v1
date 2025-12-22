import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { put } from '@vercel/blob';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const category = formData.get('category') as string; // 'policy' or 'form'
        const department = formData.get('department') as string || 'General';
        const accessLevel = formData.get('accessLevel') as string || 'public';

        if (!file) {
            return new NextResponse('No file provided', { status: 400 });
        }

        if (!category || !['policy', 'form'].includes(category)) {
            return new NextResponse('Invalid category', { status: 400 });
        }

        // Upload to Vercel Blob
        const blob = await put(file.name, file, {
            access: 'public',
        });

        // Create document record in database
        const document = await prisma.document.create({
            data: {
                filename: blob.url,
                originalName: file.name,
                fileSize: file.size,
                mimeType: file.type,
                category,
                department,
                accessLevel,
                status: 'active',
                uploadedById: session.user.id,
            },
        });

        return NextResponse.json(document);
    } catch (error) {
        console.error('Error uploading document:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const documents = await prisma.document.findMany({
            orderBy: { uploadedAt: 'desc' },
            include: {
                uploadedBy: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return NextResponse.json(documents);
    } catch (error) {
        console.error('Error fetching documents:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

        const body = await req.json();
        const { name, icon, color } = body;

        if (!name) {
            return new NextResponse('Name is required', { status: 400 });
        }

        const documentType = await prisma.documentType.create({
            data: {
                name,
                icon,
                color,
            },
        });

        return NextResponse.json(documentType);
    } catch (error) {
        console.error('Error creating document type:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

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

        const notes = await prisma.knowledgeNote.findMany({
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'desc' },
            ],
            include: {
                creator: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return NextResponse.json(notes);
    } catch (error) {
        console.error('Error fetching knowledge notes:', error);
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
        const {
            title,
            content,
            departmentId,
            documentTypeId,
            tags,
            linkedDocIds,
            priority,
            formatType,
            accessLevel
        } = body;

        if (!title || !content) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const note = await prisma.knowledgeNote.create({
            data: {
                title,
                content,
                departmentId: departmentId || null,
                documentTypeId: documentTypeId || null,
                tags: tags || [],
                priority: priority || 'standard',
                formatType: formatType || 'auto',
                accessLevel: accessLevel || ['public', 'student', 'member', 'chairperson'],
                status: 'active',
                createdBy: session.user.id,
                linkedDocuments: linkedDocIds?.length > 0 ? {
                    connect: linkedDocIds.map((id: string) => ({ id })),
                } : undefined,
            },
        });

        return NextResponse.json(note);
    } catch (error) {
        console.error('Error creating knowledge note:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

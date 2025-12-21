import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { stringifyMetadata, type KnowledgeNoteMetadata } from '@/lib/types/knowledge-base';

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
            department,
            documentType,
            tags,
            linkedDocIds,
            priority,
            formatType,
            accessLevel
        } = body;

        if (!title || !content) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        // Build metadata object
        const metadata: KnowledgeNoteMetadata = {
            department,
            documentType,
            tags: tags || [],
            linkedDocIds: linkedDocIds || [],
        };

        const note = await prisma.knowledgeNote.create({
            data: {
                title,
                content,
                category: stringifyMetadata(metadata), // Store metadata as JSON string
                priority: priority || 'standard',
                formatType: formatType || 'auto',
                accessLevel: accessLevel || ['public', 'student', 'member', 'chairperson'],
                status: 'active',
                createdBy: session.user.id,
            },
        });

        return NextResponse.json(note);
    } catch (error) {
        console.error('Error creating knowledge note:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

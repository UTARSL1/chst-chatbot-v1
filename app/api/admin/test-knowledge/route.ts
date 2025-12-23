import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        // Find the service bond knowledge note
        const notes = await prisma.knowledgeNote.findMany({
            where: {
                title: {
                    contains: 'service bond',
                    mode: 'insensitive'
                }
            },
            include: {
                linkedDocuments: {
                    select: {
                        id: true,
                        filename: true,
                        originalName: true,
                        accessLevel: true,
                    }
                }
            }
        });

        return NextResponse.json({
            found: notes.length,
            notes: notes.map(note => ({
                id: note.id,
                title: note.title,
                linkedDocumentsCount: note.linkedDocuments.length,
                linkedDocuments: note.linkedDocuments
            }))
        });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

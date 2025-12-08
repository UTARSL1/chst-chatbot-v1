
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET all questions (for admin dashboard table)
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const questions = await prisma.popularQuestion.findMany({
            orderBy: { order: 'asc' },
        });

        return NextResponse.json(questions);
    } catch (error) {
        console.error('Error fetching questions:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST create new question
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { question, roles, isActive } = body;

        if (!question) {
            return NextResponse.json({ error: 'Question text is required' }, { status: 400 });
        }

        const newQuestion = await prisma.popularQuestion.create({
            data: {
                question,
                roles: roles || ['public', 'student', 'member', 'chairperson'],
                isActive: isActive ?? true,
                order: 0, // Default order, can be updated later
            },
        });

        return NextResponse.json(newQuestion);
    } catch (error) {
        console.error('Error creating question:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE question
export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        await prisma.popularQuestion.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting question:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT/PATCH update question
export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { id, question, roles, isActive, order } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const updated = await prisma.popularQuestion.update({
            where: { id },
            data: {
                question,
                roles,
                isActive,
                order,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating question:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

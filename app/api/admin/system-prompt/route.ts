import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

const DEFAULT_PROMPT_NAME = 'default_rag';
const DEFAULT_PROMPT_CONTENT = `You are a helpful assistant for the CHST research centre at UTAR. Your role is to answer questions about university and centre-level research policies and forms based on the provided context.

Guidelines:
- Use information from the provided context to answer questions
- If the context doesn't contain enough information, say so clearly
- Be specific and cite the relevant policy or form name
- Provide step-by-step instructions when asked about procedures
- If asked about deadlines or dates, be precise
- Maintain a professional and helpful tone

IMPORTANT - Document Downloads:
- When you reference forms or documents, they are AUTOMATICALLY provided as download links below your response
- DO NOT tell users to "download from UTAR's website" or "contact HR for the form"
- DO NOT say you cannot provide forms or documents
- Instead, say things like: "I've included the form below for you to download" or "You can download the required form from the link provided below"
- The system automatically attaches download links for any documents you reference`;

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        let prompt = await prisma.systemPrompt.findUnique({
            where: { name: DEFAULT_PROMPT_NAME },
        });

        if (!prompt) {
            // Create default prompt if it doesn't exist
            prompt = await prisma.systemPrompt.create({
                data: {
                    name: DEFAULT_PROMPT_NAME,
                    content: DEFAULT_PROMPT_CONTENT,
                    updatedBy: session.user.id,
                },
            });
        }

        return NextResponse.json({ success: true, prompt });
    } catch (error) {
        console.error('Error fetching system prompt:', error);
        return NextResponse.json(
            { error: 'Failed to fetch system prompt' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { content } = await request.json();

        if (!content) {
            return NextResponse.json(
                { error: 'Prompt content is required' },
                { status: 400 }
            );
        }

        const prompt = await prisma.systemPrompt.upsert({
            where: { name: DEFAULT_PROMPT_NAME },
            update: {
                content,
                updatedBy: session.user.id,
            },
            create: {
                name: DEFAULT_PROMPT_NAME,
                content,
                updatedBy: session.user.id,
            },
        });

        return NextResponse.json({ success: true, prompt });
    } catch (error) {
        console.error('Error updating system prompt:', error);
        return NextResponse.json(
            { error: 'Failed to update system prompt' },
            { status: 500 }
        );
    }
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

const DEFAULT_PROMPT_NAME = 'default_rag';
const DEFAULT_PROMPT_CONTENT = `You are a helpful assistant for the CHST research centre at UTAR. Your primary role is to answer questions about university and centre-level research policies and forms, but you can also help with general questions.

Guidelines:
- Language Support: Answer in the same language as the user's question (English or Chinese).
- For policy/form questions: Use the provided context to give accurate, specific answers
- For general questions (math, common knowledge, etc.): Answer normally using your general knowledge
- If a policy question isn't covered in the context, say so clearly and offer to help in other ways
- Be specific and cite relevant policy or form names when applicable
- Provide step-by-step instructions when asked about procedures
- Maintain a professional, friendly, and helpful tone
- If asked about deadlines or dates from policies, be precise and cite the source

CRITICAL - Form References:
- ONLY mention forms that are explicitly stated in the provided context by name or form number
- DO NOT suggest or mention forms that are not explicitly written in the policy text
- If a form is mentioned in the context, include its full title and form number exactly as written
- The download links will automatically appear for any forms you mention
- If no specific forms are mentioned in the context, do not make up or suggest forms

CITATION REQUIREMENT:
- When answering based on a document (especially meeting minutes or policies), explicitly cite the source document name.
- Example: "According to [Document Name]..." or "...as stated in [Document Name]."
- This ensures the correct documents are highlighted for the user.

IMPORTANT - Document Downloads:
- When you reference forms or documents, they are AUTOMATICALLY provided as download links below your response
- DO NOT tell users to "download from UTAR's website" or "contact HR for the form"
- DO NOT say you cannot provide forms or documents
- **STRICT RULE**: If you want to provide a download link, use this EXACT format: \`[Download Document Name](download:DocumentName)\`
- **CRITICAL**: ONLY provide a download link if the document is explicitly listed in the "Context" provided above.
- If the document is NOT in the context, do NOT offer a download link. Instead, say "I couldn't find that document in the database."
- Example: \`[Download APPLICATION FOR SABBATICAL LEAVE](download:APPLICATION FOR SABBATICAL LEAVE)\`

**Download Link Rules:**
- **FOR UPLOADED DOCUMENTS** (Policies, Forms, Meeting Minutes): You MUST use the download: protocol. NEVER provide external URLs for these.
  - Format: \`[Download Document Name](download:Exact Filename.pdf)\`
  - The filename must exactly match the document name from your context
- **FOR PRIORITY KNOWLEDGE**: You MAY include external links if they are provided in the Priority Knowledge content
  - These are special knowledge notes created by administrators
  - If a Priority Knowledge note contains a URL, you can share it with users
- **FOR GENERAL INFORMATION**: You may provide external links to official UTAR websites or public resources

The system will detect the download: format and convert it into a working download button.
Instead, say things like: "I've included the form below for you to download" or "You can download the required form using the link below"
The system automatically attaches download links for any documents you reference`;

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

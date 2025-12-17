

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { invalidateRAGCaches } from '@/lib/rag/query';


const KNOWN_TOOLS = [
    { name: 'utar_resolve_unit', description: 'Resolve unit acronyms (e.g. CHST) to full names.' },
    { name: 'utar_list_departments', description: 'List all departments in a faculty.' },
    { name: 'utar_staff_search', description: 'Search UTAR internal staff directory.' },
    { name: 'jcr_journal_metric', description: 'Query JCR Impact Factors and Quartiles.' }
];

const ALL_ROLES = ['public', 'student', 'member', 'chairperson'];

async function ensureToolsExist() {
    for (const tool of KNOWN_TOOLS) {
        const existing = await prisma.toolPermission.findUnique({
            where: { toolName: tool.name }
        });

        if (!existing) {
            await prisma.toolPermission.create({
                data: {
                    toolName: tool.name,
                    description: tool.description,
                    allowedRoles: ALL_ROLES // Default to allow everyone
                }
            });
        }
    }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'chairperson') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        await ensureToolsExist();
        const tools = await prisma.toolPermission.findMany({
            orderBy: { toolName: 'asc' }
        });
        return NextResponse.json({ tools });
    } catch (error) {
        console.error('Error fetching tools:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'chairperson') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { toolName, allowedRoles } = body;

        if (!toolName || !Array.isArray(allowedRoles)) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const updated = await prisma.toolPermission.update({
            where: { toolName },
            data: {
                allowedRoles,
                updatedBy: session.user.email
            }
        });

        // Invalidate cache so changes take effect immediately
        invalidateRAGCaches();

        return NextResponse.json({ success: true, tool: updated });
    } catch (error) {
        console.error('Error updating tool permissions:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

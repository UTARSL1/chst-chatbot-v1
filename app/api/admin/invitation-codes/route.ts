import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateInvitationCode } from '@/lib/email-validation';

// GET - List all invitation codes
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const codes = await prisma.invitationCode.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });

        return NextResponse.json(codes);
    } catch (error) {
        console.error('Error fetching invitation codes:', error);
        return NextResponse.json({ error: 'Failed to fetch codes' }, { status: 500 });
    }
}

// POST - Generate new invitation code
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await req.json();
        const { expiresAt } = body;

        const code = generateInvitationCode();

        const invitationCode = await prisma.invitationCode.create({
            data: {
                code,
                createdBy: session.user.id,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
            },
        });

        return NextResponse.json(invitationCode, { status: 201 });
    } catch (error) {
        console.error('Error creating invitation code:', error);
        return NextResponse.json({ error: 'Failed to create code' }, { status: 500 });
    }
}

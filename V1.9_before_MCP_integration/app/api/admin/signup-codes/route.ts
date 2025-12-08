import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // Check if user is chairperson
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json(
                { error: 'Unauthorized. Only chairpersons can generate signup codes.' },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { expiresInDays } = body;

        // Generate unique code
        const code = `CHST-${uuidv4().substring(0, 8).toUpperCase()}`;

        // Calculate expiration date if provided
        let expiresAt = null;
        if (expiresInDays) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + expiresInDays);
        }

        // Create signup code
        const signupCode = await prisma.signupCode.create({
            data: {
                code,
                expiresAt,
            },
        });

        return NextResponse.json(
            {
                success: true,
                code: signupCode.code,
                expiresAt: signupCode.expiresAt,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Generate code error:', error);
        return NextResponse.json(
            { error: 'An error occurred while generating the code' },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // Check if user is chairperson
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Get all signup codes
        const codes = await prisma.signupCode.findMany({
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ codes }, { status: 200 });
    } catch (error) {
        console.error('Get codes error:', error);
        return NextResponse.json(
            { error: 'An error occurred while fetching codes' },
            { status: 500 }
        );
    }
}

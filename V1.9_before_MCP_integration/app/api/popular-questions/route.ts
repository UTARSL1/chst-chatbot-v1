
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = session.user.role;

        // Fetch questions that are active AND include the user's role
        const questions = await prisma.popularQuestion.findMany({
            where: {
                isActive: true,
                roles: {
                    has: userRole
                }
            },
            orderBy: { order: 'asc' },
        });

        return NextResponse.json({ questions });
    } catch (error) {
        console.error('Error fetching popular questions:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

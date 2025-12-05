import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Fetch all quick access links (filtered by user role)
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = session.user.role;

        // Fetch active links that the user has access to
        const links = await prisma.quickAccessLink.findMany({
            where: {
                isActive: true,
                roles: {
                    has: userRole
                }
            },
            orderBy: [
                { section: 'asc' },
                { order: 'asc' }
            ]
        });

        return NextResponse.json({ links });
    } catch (error) {
        console.error('Error fetching quick access links:', error);
        return NextResponse.json(
            { error: 'Failed to fetch quick access links' },
            { status: 500 }
        );
    }
}

// POST - Create a new quick access link (chairperson only)
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await req.json();
        const { name, url, section, icon, roles, order } = body;

        // Validate input
        if (!name || !url) {
            return NextResponse.json(
                { error: 'Name and URL are required' },
                { status: 400 }
            );
        }

        // Create the link
        const link = await prisma.quickAccessLink.create({
            data: {
                name,
                url,
                section: section || 'others',
                icon: icon || null,
                roles: roles || ['public', 'student', 'member', 'chairperson'],
                order: order || 0,
                createdBy: session.user.id
            }
        });

        return NextResponse.json({ success: true, link }, { status: 201 });
    } catch (error) {
        console.error('Error creating quick access link:', error);
        return NextResponse.json(
            { error: 'Failed to create quick access link' },
            { status: 500 }
        );
    }
}

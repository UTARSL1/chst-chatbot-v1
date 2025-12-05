import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Fetch quick access links (System + Personal)
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = session.user.role;
        const userId = session.user.id;

        // Fetch active links that:
        // 1. Are visible to the user's role (System links)
        // 2. OR were created by the user (Personal links)
        const links = await prisma.quickAccessLink.findMany({
            where: {
                isActive: true,
                OR: [
                    {
                        roles: {
                            has: userRole
                        }
                    },
                    {
                        createdBy: userId
                    }
                ]
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

// POST - Create a new quick access link
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        // For personal links, we can default roles to empty or just the user's role, 
        // but since we filter by createdBy in GET, roles doesn't strictly matter for visibility 
        // to the creator. However, to keep it clean, we can just set it to the user's role 
        // or keep the default 'public', 'student', 'member', 'chairperson' if we want it potentially shareable later.
        // For now, let's keep the default behavior but allow any user to create.

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

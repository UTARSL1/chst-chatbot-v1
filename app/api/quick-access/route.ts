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
        // 1. Are System links visible to the user's role
        // 2. OR are Personal links created by the user
        const links = await prisma.quickAccessLink.findMany({
            where: {
                isActive: true,
                OR: [
                    {
                        isSystem: true,
                        roles: {
                            has: userRole
                        }
                    },
                    {
                        isSystem: false,
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
        const { name, url, section, icon, roles, order, isSystem } = body;

        // Validate input
        if (!name || !url) {
            return NextResponse.json(
                { error: 'Name and URL are required' },
                { status: 400 }
            );
        }

        // Only chairpersons can create system links
        if (isSystem && session.user.role !== 'chairperson') {
            return NextResponse.json(
                { error: 'Only chairpersons can create system links' },
                { status: 403 }
            );
        }

        // Determine roles:
        // - System links: Use provided roles or default to all
        // - Personal links: Always empty (private)
        const linkRoles = isSystem
            ? (roles || ['public', 'student', 'member', 'chairperson'])
            : [];

        // Create the link
        const link = await prisma.quickAccessLink.create({
            data: {
                name,
                url,
                section: section || 'others',
                icon: icon || null,
                roles: linkRoles,
                order: order || 0,
                isSystem: !!isSystem,
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

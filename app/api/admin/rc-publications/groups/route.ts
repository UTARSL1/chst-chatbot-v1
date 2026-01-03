import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Get all working groups with member count
        const groups = await prisma.workingGroup.findMany({
            include: {
                members: {
                    include: {
                        member: {
                            select: {
                                id: true,
                                name: true,
                                totalPublications: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Format response
        const formattedGroups = groups.map(group => ({
            id: group.id,
            name: group.name,
            description: group.description,
            memberCount: group.members.length,
            members: group.members.map(m => ({
                id: m.member.id,
                name: m.member.name,
                totalPublications: m.member.totalPublications
            })),
            createdAt: group.createdAt,
            updatedAt: group.updatedAt
        }));

        return NextResponse.json({
            success: true,
            groups: formattedGroups
        });
    } catch (error) {
        console.error('[RC Publications Groups] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch working groups' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { name, description, memberIds } = body;

        if (!name) {
            return NextResponse.json(
                { error: 'Group name is required' },
                { status: 400 }
            );
        }

        // Create working group
        const group = await prisma.workingGroup.create({
            data: {
                name,
                description,
                createdBy: session.user.id,
                members: {
                    create: (memberIds || []).map((memberId: string) => ({
                        memberId
                    }))
                }
            },
            include: {
                members: {
                    include: {
                        member: {
                            select: {
                                id: true,
                                name: true,
                                totalPublications: true
                            }
                        }
                    }
                }
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Working group created successfully',
            group: {
                id: group.id,
                name: group.name,
                description: group.description,
                memberCount: group.members.length,
                members: group.members.map(m => ({
                    id: m.member.id,
                    name: m.member.name,
                    totalPublications: m.member.totalPublications
                }))
            }
        });
    } catch (error) {
        console.error('[RC Publications Create Group] Error:', error);
        return NextResponse.json(
            { error: 'Failed to create working group' },
            { status: 500 }
        );
    }
}

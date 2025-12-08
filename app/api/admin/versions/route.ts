import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Fetch all versions or current version
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const currentOnly = searchParams.get('current') === 'true';

        if (currentOnly) {
            // Get only the current version
            const currentVersion = await prisma.version.findFirst({
                where: { isCurrent: true },
                orderBy: { createdAt: 'desc' }
            });

            return NextResponse.json({
                version: currentVersion?.versionNumber || 'v1.0',
                commitHash: currentVersion?.commitHash || 'unknown',
                description: currentVersion?.description || ''
            });
        }

        // Get all versions (admin only)
        if (session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const versions = await prisma.version.findMany({
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ versions });
    } catch (error) {
        console.error('Error fetching versions:', error);
        return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 });
    }
}

// POST - Create new version
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { versionNumber, commitHash, description, isCurrent } = await request.json();

        if (!versionNumber || !commitHash || !description) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // If setting as current, unset all other versions
        if (isCurrent) {
            await prisma.version.updateMany({
                where: { isCurrent: true },
                data: { isCurrent: false }
            });
        }

        const version = await prisma.version.create({
            data: {
                versionNumber,
                commitHash,
                description,
                isCurrent: isCurrent || false,
                createdBy: session.user.id
            }
        });

        return NextResponse.json({ version });
    } catch (error) {
        console.error('Error creating version:', error);
        return NextResponse.json({ error: 'Failed to create version' }, { status: 500 });
    }
}

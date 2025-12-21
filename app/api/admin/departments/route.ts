import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const departments = await prisma.department.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json(departments);
    } catch (error) {
        console.error('Error fetching departments:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await req.json();
        const { name, abbreviation, icon, color } = body;

        if (!name) {
            return new NextResponse('Name is required', { status: 400 });
        }

        const department = await prisma.department.create({
            data: {
                name,
                abbreviation,
                icon,
                color,
            },
        });

        return NextResponse.json(department);
    } catch (error) {
        console.error('Error creating department:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

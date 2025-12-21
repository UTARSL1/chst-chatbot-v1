import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return new NextResponse('Unauthorized', { status: 403 });
        }

        const users = await prisma.user.findMany({
            select: {
                email: true,
                name: true,
                password: true,
                role: true,
                isApproved: true,
                isVerified: true,
                recoveryEmail: true,
                createdAt: true,
            },
        });

        // Convert to CSV
        const csv = [
            'email,name,password,role,isApproved,isVerified,recoveryEmail,createdAt',
            ...users.map(u =>
                `${u.email},"${(u.name || '').replace(/"/g, '""')}",${u.password},${u.role},${u.isApproved},${u.isVerified},${u.recoveryEmail || ''},${u.createdAt.toISOString()}`
            )
        ].join('\n');

        const filename = `backup-users-${new Date().toISOString().split('T')[0]}.csv`;

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('Error creating backup:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

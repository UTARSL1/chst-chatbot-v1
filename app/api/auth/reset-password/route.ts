import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
    try {
        const { token, password } = await req.json();

        if (!token || !password) {
            return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
        }

        // Find user with valid token
        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: {
                    gt: new Date(), // Expiry must be in the future
                },
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(password, 12);

        // Update user
        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                resetToken: null,       // Clear token
                resetTokenExpiry: null, // Clear expiry
            },
        });

        return NextResponse.json({ success: true, message: 'Password reset successfully' });

    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
    }
}

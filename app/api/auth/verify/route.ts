import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendExpiredTokenEmail, sendAdminNotification } from '@/lib/email';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
        return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    try {
        // Find user with this token
        const user = await prisma.user.findUnique({
            where: { verificationToken: token },
        });

        if (!user) {
            const loginUrl = new URL('/auth/signin', req.url);
            loginUrl.searchParams.set('error', 'InvalidToken');
            return NextResponse.redirect(loginUrl);
        }

        // Check if token has expired
        if (user.verificationTokenExpiry && new Date() > user.verificationTokenExpiry) {
            // Send expiration notification email
            await sendExpiredTokenEmail(user.email, user.name);

            // Delete the expired unverified account
            await prisma.user.delete({
                where: { id: user.id },
            });

            const loginUrl = new URL('/auth/signin', req.url);
            loginUrl.searchParams.set('error', 'ExpiredToken');
            return NextResponse.redirect(loginUrl);
        }

        // Verify user and clear token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                verificationToken: null, // Clear token so it can't be used again
                verificationTokenExpiry: null, // Clear expiry
            },
        });

        // Notify admin of verified user registration (only after email verification)
        await sendAdminNotification(user.name, user.email, user.role);

        // Redirect to login with success message
        const loginUrl = new URL('/auth/signin', req.url);
        loginUrl.searchParams.set('verified', 'true');

        return NextResponse.redirect(loginUrl);

    } catch (error) {
        console.error('Verification error:', error);
        const loginUrl = new URL('/auth/signin', req.url);
        loginUrl.searchParams.set('error', 'VerificationFailed');
        return NextResponse.redirect(loginUrl);
    }
}

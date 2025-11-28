import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!user) {
            // Don't reveal if user exists or not for security
            return NextResponse.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
        }

        // Generate token
        const resetToken = uuidv4();
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

        // Save to DB
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetTokenExpiry,
            },
        });

        // Create reset link
        const resetLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;

        // Determine which email to send to (recovery email if exists, otherwise primary email)
        const emailTo = user.recoveryEmail || user.email;

        // Send email
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4F46E5;">Reset Your Password</h2>
                <p>Hello ${user.name},</p>
                <p>We received a request to reset your password for CHST-Chatbot V1.3. If you didn't make this request, you can safely ignore this email.</p>
                <p>To reset your password, click the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="color: #666; font-size: 14px;">${resetLink}</p>
                <p>This link will expire in 1 hour.</p>
                ${user.recoveryEmail ? `<p style="color: #888; font-size: 12px;">This email was sent to your recovery email address.</p>` : ''}
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="color: #888; font-size: 12px;">CHST Research Centre</p>
            </div>
        `;

        await sendEmail({
            to: emailTo,
            subject: 'Reset your CHST-Chatbot password',
            html: emailHtml,
        });

        return NextResponse.json({ success: true, message: 'If an account exists, a reset link has been sent.' });

    } catch (error: any) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
    }
}

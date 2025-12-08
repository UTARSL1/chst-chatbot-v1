import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { isUTAREmail, isGeneralEmailProvider, isValidRecoveryEmail } from '@/lib/email-validation';
import { sendVerificationEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, email, password, invitationCode, recoveryEmail } = body;

        // Validate input
        if (!name || !email || !password) {
            return NextResponse.json(
                { error: 'Name, email, and password are required' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'An account with this email already exists' },
                { status: 400 }
            );
        }

        let role: 'student' | 'member' | 'public' | 'chairperson';
        let invitationCodeId: string | undefined;
        let finalRecoveryEmail: string | undefined;

        // Determine signup type based on email domain
        if (isUTAREmail(email)) {
            // UTAR email - requires invitation code and recovery email
            if (!invitationCode) {
                return NextResponse.json(
                    { error: 'Invitation code is required for UTAR email addresses' },
                    { status: 400 }
                );
            }

            if (!recoveryEmail) {
                return NextResponse.json(
                    { error: 'Recovery email is required for UTAR email addresses' },
                    { status: 400 }
                );
            }

            // Validate recovery email
            if (!isValidRecoveryEmail(recoveryEmail)) {
                return NextResponse.json(
                    { error: 'Recovery email must be a personal email (Gmail, Outlook, Yahoo, etc.)' },
                    { status: 400 }
                );
            }

            // Validate invitation code
            const code = await prisma.invitationCode.findUnique({
                where: { code: invitationCode },
            });

            if (!code) {
                return NextResponse.json(
                    { error: 'Invalid invitation code' },
                    { status: 400 }
                );
            }

            if (!code.isActive) {
                return NextResponse.json(
                    { error: 'This invitation code is no longer active' },
                    { status: 400 }
                );
            }

            if (code.expiresAt && new Date() > code.expiresAt) {
                return NextResponse.json(
                    { error: 'This invitation code has expired' },
                    { status: 400 }
                );
            }

            // Determine role based on UTAR domain
            const domain = email.split('@')[1]?.toLowerCase();
            if (domain === 'utar.edu.my') {
                role = 'member'; // Staff
            } else if (domain === '1utar.my') {
                role = 'student';
            } else {
                role = 'public'; // Fallback
            }

            invitationCodeId = code.id;
            finalRecoveryEmail = recoveryEmail.toLowerCase();

            // Increment usage count
            await prisma.invitationCode.update({
                where: { id: code.id },
                data: { usageCount: { increment: 1 } },
            });

        } else if (isGeneralEmailProvider(email)) {
            // Public user with general email provider
            role = 'public';
            finalRecoveryEmail = undefined; // Use email itself for recovery
            invitationCodeId = undefined;

        } else {
            // Company/institutional email (not allowed)
            return NextResponse.json(
                { error: 'Please use a personal email (Gmail, Outlook, etc.) or UTAR email address' },
                { status: 400 }
            );
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Generate verification token with 24-hour expiry
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Create user
        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                passwordHash,
                name,
                role,
                recoveryEmail: finalRecoveryEmail,
                invitationCodeId,
                isApproved: false, // All users require approval
                verificationToken,
                verificationTokenExpiry,
                isVerified: false,
            },
        });

        // Send verification email
        await sendVerificationEmail(user.email, verificationToken);

        return NextResponse.json(
            {
                success: true,
                message: 'Signup successful! Please check your email to verify your account before logging in.',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    isApproved: user.isApproved,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: 'An error occurred during signup' },
            { status: 500 }
        );
    }
}

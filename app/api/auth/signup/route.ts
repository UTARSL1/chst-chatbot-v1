import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { detectRoleFromEmail, shouldAutoApprove } from '@/lib/utils';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, email, password, chairpersonCode } = body;

        // Validate input
        if (!name || !email || !password) {
            return NextResponse.json(
                { error: 'All fields are required' },
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

        // Detect role from email domain
        let role: 'student' | 'member' | 'public' | 'chairperson' = detectRoleFromEmail(email);
        const autoApprove = shouldAutoApprove(email);

        // Check if chairperson code is provided
        if (chairpersonCode) {
            // Only allow chairperson code for staff emails
            if (!email.toLowerCase().endsWith('@utar.edu.my')) {
                return NextResponse.json(
                    { error: 'Chairperson code can only be used with a valid staff email (@utar.edu.my)' },
                    { status: 400 }
                );
            }

            const signupCode = await prisma.signupCode.findUnique({
                where: { code: chairpersonCode },
            });

            if (!signupCode) {
                return NextResponse.json(
                    { error: 'Invalid chairperson signup code' },
                    { status: 400 }
                );
            }

            if (signupCode.isUsed) {
                return NextResponse.json(
                    { error: 'This signup code has already been used' },
                    { status: 400 }
                );
            }

            if (signupCode.expiresAt && new Date() > signupCode.expiresAt) {
                return NextResponse.json(
                    { error: 'This signup code has expired' },
                    { status: 400 }
                );
            }

            // Set role to chairperson
            role = 'chairperson';

            // Mark code as used
            await prisma.signupCode.update({
                where: { code: chairpersonCode },
                data: {
                    isUsed: true,
                    usedBy: email.toLowerCase(),
                    usedAt: new Date(),
                },
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                passwordHash,
                name,
                role,
                isApproved: false, // All users require approval
            },
        });

        return NextResponse.json(
            {
                success: true,
                message: 'Account created. Awaiting administrator approval.',
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

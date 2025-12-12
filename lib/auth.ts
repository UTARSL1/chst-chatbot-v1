import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Please enter your email and password');
                }

                // Find user by email
                const user = await prisma.user.findUnique({
                    where: { email: credentials.email.toLowerCase() },
                });

                console.log('[AUTH] Login attempt for:', credentials.email);

                if (!user) {
                    console.log('[AUTH] User not found');
                    throw new Error('No user found with this email');
                }

                console.log('[AUTH] User found:', { email: user.email, role: user.role, isApproved: user.isApproved });

                // Check if user is approved (apply to all roles)
                if (!user.isApproved) {
                    console.log('[AUTH] User not approved');
                    throw new Error('Your account is pending approval by the administrator');
                }

                // Check if email is verified
                if (!user.isVerified) {
                    console.log('[AUTH] User email not verified');
                    throw new Error('Please verify your email address before logging in');
                }

                // Verify password
                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    user.passwordHash
                );

                console.log('[AUTH] Password valid:', isPasswordValid);

                if (!isPasswordValid) {
                    console.log('[AUTH] Invalid password');
                    throw new Error('Invalid password');
                }

                // Update last login timestamp
                await prisma.user.update({
                    where: { id: user.id },
                    data: { lastLogin: new Date() },
                });

                console.log('[AUTH] Login successful, lastLogin updated');

                // Return user object
                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
            }
            return session;
        },
    },
    pages: {
        signIn: '/auth/signin',
        error: '/auth/signin',
    },
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    secret: process.env.NEXTAUTH_SECRET,
};

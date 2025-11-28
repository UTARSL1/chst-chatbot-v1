'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        if (password !== confirmPassword) {
            setStatus('error');
            setMessage('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setStatus('error');
            setMessage('Password must be at least 8 characters');
            return;
        }

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setStatus('error');
                setMessage(data.error || 'Reset failed');
                return;
            }

            setStatus('success');
            setMessage('Password reset successfully! Redirecting to login...');

            setTimeout(() => {
                router.push('/auth/signin');
            }, 2000);
        } catch (error) {
            setStatus('error');
            setMessage('An unexpected error occurred');
        }
    };

    if (!token) {
        return (
            <div className="text-center text-red-400">
                <p>Invalid or missing reset token.</p>
                <Link href="/auth/forgot-password" className="text-primary hover:underline mt-2 block">
                    Request a new link
                </Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
                {status === 'error' && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-md text-sm">
                        {message}
                    </div>
                )}

                {status === 'success' && (
                    <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-md text-sm">
                        {message}
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={status === 'loading' || status === 'success'}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={status === 'loading' || status === 'success'}
                    />
                </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
                <Button
                    type="submit"
                    variant="gradient"
                    className="w-full"
                    disabled={status === 'loading' || status === 'success'}
                >
                    {status === 'loading' ? 'Resetting...' : 'Reset Password'}
                </Button>

                <Link href="/auth/signin" className="text-sm text-muted-foreground hover:text-white transition-colors">
                    ← Back to Sign In
                </Link>
            </CardFooter>
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
            <Card className="w-full max-w-md glassmorphism">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
                    <CardDescription>Enter your new password below</CardDescription>
                </CardHeader>
                <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
                    <ResetPasswordForm />
                </Suspense>
            </Card>
        </div>
    );
}

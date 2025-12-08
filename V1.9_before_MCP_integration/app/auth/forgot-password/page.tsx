'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                setStatus('error');
                setMessage(data.error || 'Something went wrong');
                return;
            }

            setStatus('success');
            setMessage(data.message);
        } catch (error) {
            setStatus('error');
            setMessage('An unexpected error occurred');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
            <Card className="w-full max-w-md glassmorphism">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                    </div>
                    <CardTitle className="text-2xl font-bold">Forgot Password?</CardTitle>
                    <CardDescription>Enter your email to reset your password</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {status === 'error' && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-md text-sm">
                                {message}
                            </div>
                        )}

                        {status === 'success' ? (
                            <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-md text-sm text-center">
                                <p className="font-medium mb-1">Check your email</p>
                                <p>{message}</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="your.email@utar.edu.my"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={status === 'loading'}
                                />
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="flex flex-col space-y-4">
                        {status !== 'success' && (
                            <Button
                                type="submit"
                                variant="gradient"
                                className="w-full"
                                disabled={status === 'loading'}
                            >
                                {status === 'loading' ? 'Sending Link...' : 'Send Reset Link'}
                            </Button>
                        )}

                        <Link href="/auth/signin" className="text-sm text-muted-foreground hover:text-white transition-colors">
                            ← Back to Sign In
                        </Link>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}

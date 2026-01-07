'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentVersion } from '@/hooks/useCurrentVersion';
import { Suspense } from 'react';

function SignInContent() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const currentVersion = useCurrentVersion();

    const searchParams = useSearchParams();
    const verified = searchParams.get('verified');
    const errorParam = searchParams.get('error');

    useEffect(() => {
        if (verified) {
            setSuccess('Email verified! Your account is pending admin approval. You will be notified when active.');
        }
        if (errorParam === 'InvalidToken') {
            setError('Invalid or expired verification link. Please try signing up again or contact support.');
        } else if (errorParam === 'ExpiredToken') {
            setError('Verification link expired. Your account has been removed. Please check your email and sign up again.');
        } else if (errorParam === 'VerificationFailed') {
            setError('Verification failed. Please try again later.');
        }
    }, [verified, errorParam]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError(result.error);
            } else {
                router.push('/chat');
                router.refresh();
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-md glassmorphism">
            <CardHeader className="space-y-1 text-center">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center gap-1 mb-4">
                    <span className="text-sm font-bold text-white tracking-tight">CHST</span>
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
                <CardTitle className="text-2xl font-bold text-white">
                    Welcome to CHST AI Assistant{' '}
                    <span className="inline-block ml-2 px-2 py-0.5 text-xs bg-blue-500/20 border border-blue-500/50 rounded text-blue-300">
                        {currentVersion}
                    </span>
                </CardTitle>
                <CardDescription>Your intelligent assistant for research and administration</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-md text-sm">
                            {success}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                            <Input
                                id="email"
                                type="email"
                                placeholder=""
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="pl-10"
                            />
                            <svg
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                            </svg>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder=""
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="pl-10 pr-10"
                            />
                            <svg
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showPassword ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <input
                                id="remember"
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300"
                            />
                            <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                                Remember me
                            </Label>
                        </div>
                        <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                            Forgot password?
                        </Link>
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col space-y-4">
                    <Button
                        type="submit"
                        variant="gradient"
                        className="w-full"
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-muted" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">or</span>
                        </div>
                    </div>

                    <p className="text-center text-sm text-muted-foreground">
                        Don&apos;t have an account?{' '}
                        <Link href="/auth/signup" className="text-primary hover:underline font-medium">
                            Sign up
                        </Link>
                    </p>
                </CardFooter>
            </form>
        </Card>
    );
}

export default function SignInPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
            <Suspense fallback={<div>Loading...</div>}>
                <SignInContent />
            </Suspense>
        </div>
    );
}

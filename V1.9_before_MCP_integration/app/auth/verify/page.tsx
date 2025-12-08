'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function VerifyContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('Verifying your email...');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Missing verification token.');
            return;
        }

        // Call verification API
        // Note: The API actually redirects on success, but if we're here, we might want to handle it client-side too
        // or just let the API redirect happen if the user clicked the link directly.
        // However, since we're building a page for it, we might want to fetch the API instead of relying on redirect.
        // Let's adjust the API to return JSON if we fetch it, or redirect if visited directly.
        // Actually, for simplicity, the API redirects. So this page might not be needed if the link goes straight to API.
        // BUT, usually it's better to go to a page that calls the API, so we can show loading state.

        // Let's change the plan slightly: The link goes to this page. This page calls the API.
        // The API should handle the verification logic.

        const verify = async () => {
            try {
                // We'll use a POST request or a different endpoint structure if we want to avoid auto-redirect behavior of GET
                // Or we can just use the GET endpoint we made, but fetch it.
                // If the GET endpoint redirects, fetch might follow it.

                // Let's assume the link points to /auth/verify?token=... (this page)
                // And this page calls the API.

                // Wait, the API I wrote is a GET route at /api/auth/verify.
                // The email link points to /auth/verify (this page).

                const response = await fetch(`/api/auth/verify?token=${token}`);

                if (response.redirected) {
                    // If API redirects to login, we follow
                    window.location.href = response.url;
                    return;
                }

                if (response.ok) {
                    setStatus('success');
                    setMessage('Email verified successfully!');
                    setTimeout(() => {
                        router.push('/auth/signin?verified=true');
                    }, 2000);
                } else {
                    const data = await response.json();
                    setStatus('error');
                    setMessage(data.error || 'Verification failed.');
                }
            } catch (error) {
                setStatus('error');
                setMessage('An error occurred. Please try again.');
            }
        };

        verify();
    }, [token, router]);

    return (
        <Card className="w-full max-w-md glassmorphism">
            <CardHeader className="text-center">
                <CardTitle>Email Verification</CardTitle>
                <CardDescription>
                    {status === 'verifying' && 'Please wait while we verify your email...'}
                    {status === 'success' && 'Success!'}
                    {status === 'error' && 'Error'}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
                <div className={`text-center ${status === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                    {message}
                </div>

                {status === 'error' && (
                    <Button onClick={() => router.push('/auth/signin')}>
                        Back to Login
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

export default function VerifyPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
            <Suspense fallback={<div>Loading...</div>}>
                <VerifyContent />
            </Suspense>
        </div>
    );
}

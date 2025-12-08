'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentVersion } from '@/hooks/useCurrentVersion';

export default function SignUpPage() {
    const router = useRouter();
    const [step, setStep] = useState(1); // 1 = basic info, 2 = recovery email (for UTAR)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        invitationCode: '',
        recoveryEmail: '',
    });
    const [emailType, setEmailType] = useState<'utar' | 'public' | 'invalid' | ''>('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const currentVersion = useCurrentVersion();

    // Detect email type
    useEffect(() => {
        if (!formData.email) {
            setEmailType('');
            return;
        }

        const domain = formData.email.split('@')[1]?.toLowerCase();
        const generalProviders = ['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'ymail.com', 'icloud.com', 'me.com', 'protonmail.com', 'pm.me', 'aol.com', 'zoho.com', 'mail.com'];

        if (domain === 'utar.edu.my' || domain === '1utar.my') {
            setEmailType('utar');
        } else if (generalProviders.includes(domain)) {
            setEmailType('public');
        } else {
            setEmailType('invalid');
        }
    }, [formData.email]);

    const handleNext = () => {
        setError('');

        // Validation for step 1
        if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
            setError('All fields are required');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        if (emailType === 'invalid') {
            setError('Please use a personal email (Gmail, Outlook, etc.) or UTAR email');
            return;
        }

        if (emailType === 'utar' && !formData.invitationCode) {
            setError('Invitation code is required for UTAR emails');
            return;
        }

        // If UTAR email, go to step 2 for recovery email
        if (emailType === 'utar') {
            setStep(2);
        } else {
            // Public user, submit directly
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        setError('');
        setLoading(true);

        // Validate recovery email for UTAR users
        if (emailType === 'utar') {
            if (!formData.recoveryEmail) {
                setError('Recovery email is required');
                setLoading(false);
                return;
            }

            const recoveryDomain = formData.recoveryEmail.split('@')[1]?.toLowerCase();
            const generalProviders = ['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'ymail.com', 'icloud.com', 'me.com', 'protonmail.com', 'pm.me', 'aol.com', 'zoho.com', 'mail.com'];

            if (!generalProviders.includes(recoveryDomain)) {
                setError('Recovery email must be a personal email (Gmail, Outlook, etc.)');
                setLoading(false);
                return;
            }
        }

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    invitationCode: formData.invitationCode || undefined,
                    recoveryEmail: formData.recoveryEmail || undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Signup failed');
                return;
            }

            setSuccess(data.message);
            setTimeout(() => router.push('/auth/signin'), 2000);
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
            <Card className="w-full max-w-md glassmorphism">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center gap-1 mb-4">
                        <span className="text-sm font-bold text-white tracking-tight">CHST</span>
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
                    <CardDescription>Join CHST-Chatbot {currentVersion}</CardDescription>
                </CardHeader>

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

                    {step === 1 ? (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder=""
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder=""
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                                {emailType === 'utar' && (
                                    <p className="text-xs text-blue-400">✓ UTAR email detected</p>
                                )}
                                {emailType === 'public' && (
                                    <p className="text-xs text-green-400">✓ Public email accepted</p>
                                )}
                                {emailType === 'invalid' && (
                                    <p className="text-xs text-red-400">✗ Please use Gmail, Outlook, or UTAR email</p>
                                )}
                            </div>

                            {emailType === 'utar' && (
                                <div className="space-y-2">
                                    <Label htmlFor="invitationCode">Invitation Code</Label>
                                    <Input
                                        id="invitationCode"
                                        type="text"
                                        placeholder="INV-XXXXXXXX"
                                        value={formData.invitationCode}
                                        onChange={(e) => setFormData({ ...formData, invitationCode: e.target.value.toUpperCase() })}
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">Required for UTAR signups</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder=""
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7c.44 0 .87-.03 1.28-.09" /><line x1="2" x2="22" y1="2" y2="22" /></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder=""
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    required
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bg-blue-500/10 border border-blue-500/50 text-blue-400 px-4 py-3 rounded-md text-sm">
                                <p className="font-semibold mb-1">Recovery Email Required</p>
                                <p className="text-xs">For password recovery, please provide a personal email (Gmail, Outlook, etc.)</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="recoveryEmail">Recovery Email</Label>
                                <Input
                                    id="recoveryEmail"
                                    type="email"
                                    placeholder="your.email@gmail.com"
                                    value={formData.recoveryEmail}
                                    onChange={(e) => setFormData({ ...formData, recoveryEmail: e.target.value })}
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Password reset links will be sent to this email
                                </p>
                            </div>
                        </>
                    )}
                </CardContent>

                <CardFooter className="flex flex-col space-y-4">
                    {step === 1 ? (
                        <Button
                            onClick={handleNext}
                            variant="gradient"
                            className="w-full"
                            disabled={loading || !emailType || emailType === 'invalid'}
                        >
                            {emailType === 'utar' ? 'Next →' : 'Sign Up'}
                        </Button>
                    ) : (
                        <div className="flex gap-2 w-full">
                            <Button
                                onClick={() => setStep(1)}
                                variant="outline"
                                className="flex-1"
                                disabled={loading}
                            >
                                ← Back
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                variant="gradient"
                                className="flex-1"
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : 'Sign Up'}
                            </Button>
                        </div>
                    )}

                    <p className="text-center text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <Link href="/auth/signin" className="text-primary hover:underline font-medium">
                            Sign in
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}

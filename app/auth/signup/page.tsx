'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChstLogo } from '@/components/ChstLogo';
import { useCurrentVersion } from '@/hooks/useCurrentVersion';

export default function SignUpPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
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

        if (emailType === 'utar') {
            setStep(2);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        setError('');
        setLoading(true);

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
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B0B10] p-4">
            <div className="w-full max-w-md">
                {/* Card Container */}
                <div className="bg-[#1A1A1F] border border-[#1E293B] rounded-lg shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-[#1E293B]">
                        <div className="flex items-center gap-3 mb-3">
                            <ChstLogo className="w-10 h-10 text-[#3B82F6]" />
                            <div>
                                <h1 className="text-[#3B82F6] font-['Orbitron',sans-serif] text-lg font-bold tracking-wide uppercase">
                                    Create Account
                                </h1>
                                <p className="text-[#94A3B8] text-xs font-['JetBrains_Mono',monospace]" suppressHydrationWarning>
                                    Join CHST AI Portal {currentVersion}
                                </p>
                            </div>
                        </div>

                        {/* Step Indicator */}
                        <div className="flex items-center gap-2 mt-4">
                            <div className={`flex-1 h-1 rounded ${step >= 1 ? 'bg-[#3B82F6]' : 'bg-[#334155]'}`}></div>
                            <div className={`flex-1 h-1 rounded ${step >= 2 ? 'bg-[#3B82F6]' : 'bg-[#334155]'}`}></div>
                        </div>
                        <p className="text-[#94A3B8] text-xs mt-2 font-['JetBrains_Mono',monospace]">
                            {step === 1 ? 'Step 1: Basic Information' : 'Step 2: Recovery Email'}
                        </p>
                    </div>

                    {/* Form Content */}
                    <div className="p-6 space-y-4">
                        {/* Status Messages */}
                        {error && (
                            <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] px-4 py-3 rounded text-sm">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] px-4 py-3 rounded text-sm">
                                {success}
                            </div>
                        )}

                        {!success && step === 1 ? (
                            <>
                                {/* Full Name */}
                                <div className="space-y-2">
                                    <label className="block text-white text-sm font-medium">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        className="w-full bg-[#0B0B10] border border-[#334155] text-white px-4 py-2.5 rounded text-sm focus:outline-none focus:border-[#3B82F6] transition-colors"
                                    />
                                </div>

                                {/* Email */}
                                <div className="space-y-2">
                                    <label className="block text-white text-sm font-medium">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                        className="w-full bg-[#0B0B10] border border-[#334155] text-white px-4 py-2.5 rounded text-sm focus:outline-none focus:border-[#3B82F6] transition-colors"
                                    />
                                    {emailType === 'utar' && (
                                        <p className="text-xs text-[#3B82F6] font-['JetBrains_Mono',monospace]">✓ UTAR email detected</p>
                                    )}
                                    {emailType === 'public' && (
                                        <p className="text-xs text-[#10B981] font-['JetBrains_Mono',monospace]">✓ Public email accepted</p>
                                    )}
                                    {emailType === 'invalid' && (
                                        <p className="text-xs text-[#EF4444] font-['JetBrains_Mono',monospace]">✗ Please use Gmail, Outlook, or UTAR email</p>
                                    )}
                                </div>

                                {/* Invitation Code (UTAR only) */}
                                {emailType === 'utar' && (
                                    <div className="space-y-2">
                                        <label className="block text-white text-sm font-medium">
                                            Invitation Code
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.invitationCode}
                                            onChange={(e) => setFormData({ ...formData, invitationCode: e.target.value.toUpperCase() })}
                                            required
                                            placeholder="INV-XXXXXXXX"
                                            className="w-full bg-[#0B0B10] border border-[#334155] text-white px-4 py-2.5 rounded text-sm focus:outline-none focus:border-[#3B82F6] transition-colors placeholder:text-[#475569]"
                                        />
                                        <p className="text-xs text-[#94A3B8]">Required for UTAR signups</p>
                                    </div>
                                )}

                                {/* Password */}
                                <div className="space-y-2">
                                    <label className="block text-white text-sm font-medium">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            required
                                            className="w-full bg-[#0B0B10] border border-[#334155] text-white px-4 py-2.5 pr-10 rounded text-sm focus:outline-none focus:border-[#3B82F6] transition-colors"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white transition-colors"
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

                                {/* Confirm Password */}
                                <div className="space-y-2">
                                    <label className="block text-white text-sm font-medium">
                                        Confirm Password
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        required
                                        className="w-full bg-[#0B0B10] border border-[#334155] text-white px-4 py-2.5 rounded text-sm focus:outline-none focus:border-[#3B82F6] transition-colors"
                                    />
                                </div>
                            </>
                        ) : !success && (
                            <>
                                {/* Recovery Email Info */}
                                <div className="bg-[#3B82F6]/10 border border-[#3B82F6]/30 p-4 rounded">
                                    <p className="text-sm text-white font-medium mb-1">Recovery Email Required</p>
                                    <p className="text-xs text-[#94A3B8]">
                                        For password recovery, please provide a personal email (Gmail, Outlook, etc.)
                                    </p>
                                </div>

                                {/* Recovery Email */}
                                <div className="space-y-2">
                                    <label className="block text-white text-sm font-medium">
                                        Recovery Email
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.recoveryEmail}
                                        onChange={(e) => setFormData({ ...formData, recoveryEmail: e.target.value })}
                                        required
                                        placeholder="your.email@gmail.com"
                                        className="w-full bg-[#0B0B10] border border-[#334155] text-white px-4 py-2.5 rounded text-sm focus:outline-none focus:border-[#3B82F6] transition-colors placeholder:text-[#475569]"
                                    />
                                    <p className="text-xs text-[#94A3B8]">Password reset links will be sent to this email</p>
                                </div>
                            </>
                        )}

                        {/* Action Buttons */}
                        <div className="pt-2 space-y-3">
                            {success ? (
                                <button
                                    onClick={() => router.push('/auth/signin')}
                                    className="w-full bg-[#3B82F6] text-white px-6 py-3 rounded font-semibold text-sm hover:bg-[#2563EB] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-200"
                                >
                                    Go to Sign In →
                                </button>
                            ) : step === 1 ? (
                                <button
                                    onClick={handleNext}
                                    disabled={loading || !emailType || emailType === 'invalid'}
                                    className="w-full bg-[#3B82F6] text-white px-6 py-3 rounded font-semibold text-sm hover:bg-[#2563EB] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                                >
                                    {emailType === 'utar' ? 'Next →' : 'Create Account'}
                                </button>
                            ) : (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setStep(1)}
                                        disabled={loading}
                                        className="flex-1 bg-transparent border border-[#334155] text-white px-4 py-3 rounded font-semibold text-sm hover:bg-white/5 hover:border-[#3B82F6] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading}
                                        className="flex-1 bg-[#3B82F6] text-white px-6 py-3 rounded font-semibold text-sm hover:bg-[#2563EB] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                                    >
                                        {loading ? 'Creating...' : 'Create Account'}
                                    </button>
                                </div>
                            )}

                            {/* Sign In Link */}
                            {!success && (
                                <div className="text-center">
                                    <span className="text-[#94A3B8] text-sm">
                                        Already have an account?{' '}
                                        <Link href="/auth/signin" className="text-[#3B82F6] hover:text-[#60A5FA] font-medium transition-colors">
                                            Sign in
                                        </Link>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-4 text-center">
                    <p className="text-[#64748B] text-xs font-['JetBrains_Mono',monospace]">
                        © 2026 CHST Research Centre
                    </p>
                </div>
            </div>
        </div>
    );
}

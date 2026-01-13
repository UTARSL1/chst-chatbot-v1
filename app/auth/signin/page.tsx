'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCurrentVersion } from '@/hooks/useCurrentVersion';
import { Suspense } from 'react';
import { ChstLogo } from '@/components/ChstLogo';

function SignInContent() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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
            setSuccess('[SUCCESS] Email verified. Account pending admin approval.');
        }
        if (errorParam === 'InvalidToken') {
            setError('[ERROR] Invalid or expired verification link.');
        } else if (errorParam === 'ExpiredToken') {
            setError('[ERROR] Verification link expired. Account removed.');
        } else if (errorParam === 'VerificationFailed') {
            setError('[ERROR] Verification failed. Try again later.');
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
                setError(`[AUTH_ERROR] ${result.error}`);
            } else {
                setSuccess('[AUTH_SUCCESS] Redirecting to system...');
                setTimeout(() => {
                    router.push('/chat');
                    router.refresh();
                }, 500);
            }
        } catch (err) {
            setError('[SYSTEM_ERROR] Unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-2xl">
            {/* Terminal Header */}
            <div className="bg-[#1A1A1F] border border-[#1E293B] mb-0">
                <div className="flex items-center justify-between px-4 py-2 border-b border-[#1E293B] font-['JetBrains_Mono',monospace] text-[10px] text-[#94A3B8]">
                    <div className="flex items-center gap-4">
                        <span>SYSTEM: CHST_AUTH_TERMINAL</span>
                        <span className="text-[#10B981]">STATUS: ONLINE</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span>DEVELOPER: Dr. Hum</span>
                    </div>
                </div>
            </div>

            {/* Main Terminal Window */}
            <div className="bg-[#0B0B10] border-x border-b border-[#1E293B]">
                {/* Terminal Title Bar */}
                <div className="bg-[#1A1A1F] px-6 py-4 border-b border-[#1E293B]">
                    <div className="flex items-center gap-3">
                        <ChstLogo className="w-12 h-12 text-white" />
                        <div>
                            <h1 className="text-[#3B82F6] font-['Orbitron',sans-serif] text-xl font-bold tracking-[0.1em] uppercase">
                                CHST AI PORTAL <sub className="text-xs text-[#94A3B8] font-normal" suppressHydrationWarning>v{currentVersion}</sub>
                            </h1>
                            <p className="text-[#94A3B8] text-xs font-['JetBrains_Mono',monospace] mt-1">
                                INTELLIGENT ASSISTANT // AUTHENTICATION REQUIRED
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Status Messages */}
                    {error && (
                        <div className="bg-[#1A1A1F] border border-[#EF4444] p-3">
                            <div className="flex items-start gap-2 font-['JetBrains_Mono',monospace] text-xs text-[#EF4444]">
                                <span className="mt-0.5">⚠</span>
                                <span>{error}</span>
                            </div>
                        </div>
                    )}
                    {success && (
                        <div className="bg-[#1A1A1F] border border-[#10B981] p-3">
                            <div className="flex items-start gap-2 font-['JetBrains_Mono',monospace] text-xs text-[#10B981]">
                                <span className="mt-0.5">✓</span>
                                <span>{success}</span>
                            </div>
                        </div>
                    )}

                    {/* Email Input */}
                    <div className="space-y-2">
                        <label
                            htmlFor="email"
                            className="block text-[#F8FAFC] font-['Orbitron',sans-serif] text-xs uppercase tracking-[0.1em] font-semibold"
                        >
                            // USER_EMAIL
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] font-['JetBrains_Mono',monospace] text-sm">
                                @
                            </span>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="••••••••••••••"
                                className="w-full bg-[#1A1A1F] border border-[#334155] text-white pl-8 pr-4 py-2.5 font-['JetBrains_Mono',monospace] text-sm focus:outline-none focus:border-white transition-colors placeholder:text-[#475569]"
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-2">
                        <label
                            htmlFor="password"
                            className="block text-[#F8FAFC] font-['Orbitron',sans-serif] text-xs uppercase tracking-[0.1em] font-semibold"
                        >
                            // USER_PASSWORD
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] font-['JetBrains_Mono',monospace] text-sm">
                                #
                            </span>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••••••"
                                className="w-full bg-[#1A1A1F] border border-[#334155] text-white pl-8 pr-12 py-2.5 font-['JetBrains_Mono',monospace] text-sm focus:outline-none focus:border-white transition-colors placeholder:text-[#475569]"
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

                    {/* Options */}
                    <div className="flex items-center justify-between pt-2">
                        <Link
                            href="/auth/forgot-password"
                            className="text-[#94A3B8] hover:text-white text-xs font-['JetBrains_Mono',monospace] transition-colors"
                        >
                            [RESET_PASSWORD]
                        </Link>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white text-black py-3 font-['Orbitron',sans-serif] font-bold text-sm uppercase tracking-[0.15em] hover:bg-[#E5E5E5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? '> AUTHENTICATING...' : '> EXECUTE LOGIN'}
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-[#1E293B]"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-[#0B0B10] px-4 text-[#475569] text-xs font-['JetBrains_Mono',monospace]">
                                OR
                            </span>
                        </div>
                    </div>

                    {/* Sign Up Link */}
                    <div className="text-center">
                        <p className="text-[#94A3B8] text-xs font-['JetBrains_Mono',monospace]">
                            NEW USER?{' '}
                            <Link
                                href="/auth/signup"
                                className="text-white hover:underline font-semibold"
                            >
                                [CREATE_ACCOUNT]
                            </Link>
                        </p>
                    </div>
                </form>

                {/* Terminal Footer */}
                <div className="bg-[#1A1A1F] border-t border-[#1E293B] px-6 py-3">
                    <div className="flex items-center justify-between font-['JetBrains_Mono',monospace] text-[10px] text-[#64748B]">
                        <span>SECURE CONNECTION: TLS 1.3 | ENCRYPTED</span>
                        <span>© 2026 CHST RESEARCH CENTRE</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SignInPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B0B10] p-4">
            <Suspense fallback={
                <div className="text-white font-['JetBrains_Mono',monospace] text-sm">
                    [LOADING_SYSTEM...]
                </div>
            }>
                <SignInContent />
            </Suspense>
        </div>
    );
}

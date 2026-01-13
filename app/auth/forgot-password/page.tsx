'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChstLogo } from '@/components/ChstLogo';
import { useCurrentVersion } from '@/hooks/useCurrentVersion';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const currentVersion = useCurrentVersion();

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
                setMessage(data.error || '[ERROR] Request failed');
                return;
            }

            setStatus('success');
            setMessage(data.message);
        } catch (error) {
            setStatus('error');
            setMessage('[SYSTEM_ERROR] Unexpected error occurred');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B0B10] p-4">
            <div className="w-full max-w-2xl">
                {/* Terminal Header */}
                <div className="bg-[#1A1A1F] border border-[#1E293B] mb-0">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-[#1E293B] font-['JetBrains_Mono',monospace] text-[10px] text-[#94A3B8]">
                        <div className="flex items-center gap-4">
                            <span>SYSTEM: CHST_PASSWORD_RECOVERY</span>
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
                                    PASSWORD RECOVERY <sub className="text-xs text-[#94A3B8] font-normal" suppressHydrationWarning>{currentVersion}</sub>
                                </h1>
                                <p className="text-[#94A3B8] text-xs font-['JetBrains_Mono',monospace] mt-1">
                                    // RESET_YOUR_ACCOUNT_PASSWORD
                                </p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {/* Status Messages */}
                        {status === 'error' && (
                            <div className="bg-[#1A1A1F] border border-[#EF4444] p-3">
                                <div className="flex items-start gap-2 font-['JetBrains_Mono',monospace] text-xs text-[#EF4444]">
                                    <span className="mt-0.5">⚠</span>
                                    <span>{message}</span>
                                </div>
                            </div>
                        )}
                        {status === 'success' && (
                            <div className="bg-[#1A1A1F] border border-[#10B981] p-3">
                                <div className="flex items-start gap-2 font-['JetBrains_Mono',monospace] text-xs text-[#10B981]">
                                    <span className="mt-0.5">✓</span>
                                    <div>
                                        <p className="font-semibold mb-1">[SUCCESS] Check your email</p>
                                        <p>{message}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Email Input */}
                        {status !== 'success' && (
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
                                        disabled={status === 'loading'}
                                        className="w-full bg-[#1A1A1F] border border-[#334155] text-white pl-8 pr-4 py-2.5 font-['JetBrains_Mono',monospace] text-sm focus:outline-none focus:border-white transition-colors placeholder:text-[#475569] disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        {status !== 'success' && (
                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full bg-white text-black px-6 py-3 font-['Orbitron',sans-serif] font-bold text-xs uppercase tracking-[0.15em] hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.6)] hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:scale-100"
                            >
                                {status === 'loading' ? '> SENDING_LINK...' : '> SEND RESET LINK'}
                            </button>
                        )}

                        {/* Back Link */}
                        <div className="text-center pt-2">
                            <Link
                                href="/auth/signin"
                                className="text-[#94A3B8] font-['JetBrains_Mono',monospace] text-xs hover:text-white transition-colors"
                            >
                                [RESET_PASSWORD]
                            </Link>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="px-6 py-3 border-t border-[#1E293B] bg-[#1A1A1F]">
                        <div className="flex items-center justify-between font-['JetBrains_Mono',monospace] text-[10px] text-[#64748B]">
                            <span>SECURE CONNECTION: TLS 1.3 | ENCRYPTED</span>
                            <span>© 2026 CHST RESEARCH CENTRE</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

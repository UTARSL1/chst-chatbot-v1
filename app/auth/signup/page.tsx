'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChstLogo } from '@/components/ChstLogo';
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
            setError('[ERROR] All fields are required');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('[ERROR] Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            setError('[ERROR] Password must be at least 8 characters');
            return;
        }

        if (emailType === 'invalid') {
            setError('[ERROR] Please use a personal email (Gmail, Outlook, etc.) or UTAR email');
            return;
        }

        if (emailType === 'utar' && !formData.invitationCode) {
            setError('[ERROR] Invitation code is required for UTAR emails');
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
                setError('[ERROR] Recovery email is required');
                setLoading(false);
                return;
            }

            const recoveryDomain = formData.recoveryEmail.split('@')[1]?.toLowerCase();
            const generalProviders = ['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'ymail.com', 'icloud.com', 'me.com', 'protonmail.com', 'pm.me', 'aol.com', 'zoho.com', 'mail.com'];

            if (!generalProviders.includes(recoveryDomain)) {
                setError('[ERROR] Recovery email must be a personal email (Gmail, Outlook, etc.)');
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
                setError(data.error || '[ERROR] Signup failed');
                return;
            }

            setSuccess('[SUCCESS] ' + data.message);
            setTimeout(() => router.push('/auth/signin'), 2000);
        } catch (err) {
            setError('[SYSTEM_ERROR] Unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B0B10] p-4">
            <div className="w-full max-w-2xl">
                {/* Terminal Header */}
                <div className="bg-[#1A1A1F] border border-[#1E293B] mb-0">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-[#1E293B] font-['JetBrains_Mono',monospace] text-[10px] text-[#94A3B8]">
                        <div className="flex items-center gap-4">
                            <span>SYSTEM: CHST_ACCOUNT_REGISTRATION</span>
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
                                    CREATE ACCOUNT <sub className="text-xs text-[#94A3B8] font-normal" suppressHydrationWarning>{currentVersion}</sub>
                                </h1>
                                <p className="text-[#94A3B8] text-xs font-['JetBrains_Mono',monospace] mt-1">
                                    {step === 1 ? '// STEP_1_BASIC_INFORMATION' : '// STEP_2_RECOVERY_EMAIL'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
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

                        {step === 1 ? (
                            <>
                                {/* Full Name */}
                                <div className="space-y-2">
                                    <label className="block text-[#F8FAFC] font-['Orbitron',sans-serif] text-xs uppercase tracking-[0.1em] font-semibold">
                                        // FULL_NAME
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        placeholder="••••••••••••••"
                                        className="w-full bg-[#1A1A1F] border border-[#334155] text-white px-4 py-2.5 font-['JetBrains_Mono',monospace] text-sm focus:outline-none focus:border-white transition-colors placeholder:text-[#475569]"
                                    />
                                </div>

                                {/* Email */}
                                <div className="space-y-2">
                                    <label className="block text-[#F8FAFC] font-['Orbitron',sans-serif] text-xs uppercase tracking-[0.1em] font-semibold">
                                        // USER_EMAIL
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] font-['JetBrains_Mono',monospace] text-sm">
                                            @
                                        </span>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                            placeholder="••••••••••••••"
                                            className="w-full bg-[#1A1A1F] border border-[#334155] text-white pl-8 pr-4 py-2.5 font-['JetBrains_Mono',monospace] text-sm focus:outline-none focus:border-white transition-colors placeholder:text-[#475569]"
                                        />
                                    </div>
                                    {emailType === 'utar' && (
                                        <p className="text-xs text-[#3B82F6] font-['JetBrains_Mono',monospace]">✓ UTAR_EMAIL_DETECTED</p>
                                    )}
                                    {emailType === 'public' && (
                                        <p className="text-xs text-[#10B981] font-['JetBrains_Mono',monospace]">✓ PUBLIC_EMAIL_ACCEPTED</p>
                                    )}
                                    {emailType === 'invalid' && (
                                        <p className="text-xs text-[#EF4444] font-['JetBrains_Mono',monospace]">✗ INVALID_EMAIL_DOMAIN</p>
                                    )}
                                </div>

                                {/* Invitation Code (UTAR only) */}
                                {emailType === 'utar' && (
                                    <div className="space-y-2">
                                        <label className="block text-[#F8FAFC] font-['Orbitron',sans-serif] text-xs uppercase tracking-[0.1em] font-semibold">
                                            // INVITATION_CODE
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.invitationCode}
                                            onChange={(e) => setFormData({ ...formData, invitationCode: e.target.value.toUpperCase() })}
                                            required
                                            placeholder="INV-XXXXXXXX"
                                            className="w-full bg-[#1A1A1F] border border-[#334155] text-white px-4 py-2.5 font-['JetBrains_Mono',monospace] text-sm focus:outline-none focus:border-white transition-colors placeholder:text-[#475569]"
                                        />
                                        <p className="text-xs text-[#94A3B8] font-['JetBrains_Mono',monospace]">// REQUIRED_FOR_UTAR_SIGNUPS</p>
                                    </div>
                                )}

                                {/* Password */}
                                <div className="space-y-2">
                                    <label className="block text-[#F8FAFC] font-['Orbitron',sans-serif] text-xs uppercase tracking-[0.1em] font-semibold">
                                        // USER_PASSWORD
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] font-['JetBrains_Mono',monospace] text-sm">
                                            #
                                        </span>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            required
                                            placeholder="••••••••••••••"
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

                                {/* Confirm Password */}
                                <div className="space-y-2">
                                    <label className="block text-[#F8FAFC] font-['Orbitron',sans-serif] text-xs uppercase tracking-[0.1em] font-semibold">
                                        // CONFIRM_PASSWORD
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] font-['JetBrains_Mono',monospace] text-sm">
                                            #
                                        </span>
                                        <input
                                            type="password"
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            required
                                            placeholder="••••••••••••••"
                                            className="w-full bg-[#1A1A1F] border border-[#334155] text-white pl-8 pr-4 py-2.5 font-['JetBrains_Mono',monospace] text-sm focus:outline-none focus:border-white transition-colors placeholder:text-[#475569]"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Recovery Email Info */}
                                <div className="bg-[#1A1A1F] border border-[#3B82F6]/30 p-3">
                                    <div className="font-['JetBrains_Mono',monospace] text-xs text-[#3B82F6]">
                                        <p className="font-semibold mb-1">// RECOVERY_EMAIL_REQUIRED</p>
                                        <p className="text-[#94A3B8]">For password recovery, please provide a personal email (Gmail, Outlook, etc.)</p>
                                    </div>
                                </div>

                                {/* Recovery Email */}
                                <div className="space-y-2">
                                    <label className="block text-[#F8FAFC] font-['Orbitron',sans-serif] text-xs uppercase tracking-[0.1em] font-semibold">
                                        // RECOVERY_EMAIL
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] font-['JetBrains_Mono',monospace] text-sm">
                                            @
                                        </span>
                                        <input
                                            type="email"
                                            value={formData.recoveryEmail}
                                            onChange={(e) => setFormData({ ...formData, recoveryEmail: e.target.value })}
                                            required
                                            placeholder="your.email@gmail.com"
                                            className="w-full bg-[#1A1A1F] border border-[#334155] text-white pl-8 pr-4 py-2.5 font-['JetBrains_Mono',monospace] text-sm focus:outline-none focus:border-white transition-colors placeholder:text-[#475569]"
                                        />
                                    </div>
                                    <p className="text-xs text-[#94A3B8] font-['JetBrains_Mono',monospace]">// PASSWORD_RESET_LINKS_SENT_HERE</p>
                                </div>
                            </>
                        )}

                        {/* Action Buttons */}
                        <div className="pt-2 space-y-3">
                            {step === 1 ? (
                                <button
                                    onClick={handleNext}
                                    disabled={loading || !emailType || emailType === 'invalid'}
                                    className="w-full bg-white text-black px-6 py-3 font-['Orbitron',sans-serif] font-bold text-xs uppercase tracking-[0.15em] hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.6)] hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:scale-100"
                                >
                                    {emailType === 'utar' ? '> NEXT STEP' : '> CREATE ACCOUNT'}
                                </button>
                            ) : (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setStep(1)}
                                        disabled={loading}
                                        className="flex-1 bg-transparent border border-white/20 text-white px-4 py-3 font-['Orbitron',sans-serif] font-bold text-xs uppercase tracking-wide hover:bg-white/10 hover:border-white/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        ← BACK
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading}
                                        className="flex-1 bg-white text-black px-6 py-3 font-['Orbitron',sans-serif] font-bold text-xs uppercase tracking-[0.15em] hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.6)] hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:scale-100"
                                    >
                                        {loading ? '> CREATING...' : '> CREATE ACCOUNT'}
                                    </button>
                                </div>
                            )}

                            {/* Sign In Link */}
                            <div className="text-center">
                                <span className="text-[#94A3B8] font-['JetBrains_Mono',monospace] text-xs">
                                    Already have an account?{' '}
                                    <Link href="/auth/signin" className="text-[#3B82F6] hover:text-[#60A5FA] transition-colors">
                                        [SIGN_IN]
                                    </Link>
                                </span>
                            </div>
                        </div>
                    </div>

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

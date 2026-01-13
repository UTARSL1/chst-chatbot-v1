'use client';

import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ChstLogo } from '@/components/ChstLogo';
import { useCurrentVersion } from '@/hooks/useCurrentVersion';

export default function SignOutPage() {
    const router = useRouter();
    const currentVersion = useCurrentVersion();

    const handleSignOut = async () => {
        await signOut({ callbackUrl: '/auth/signin' });
    };

    const handleCancel = () => {
        router.back();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B0B10] p-4">
            <div className="w-full max-w-md">
                {/* Card Container */}
                <div className="bg-[#1A1A1F] border border-[#1E293B] rounded-lg shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-[#1E293B]">
                        <div className="flex items-center gap-3 mb-2">
                            <ChstLogo className="w-10 h-10 text-[#3B82F6]" />
                            <div>
                                <h1 className="text-[#3B82F6] font-['Orbitron',sans-serif] text-lg font-bold tracking-wide uppercase">
                                    Sign Out
                                </h1>
                                <p className="text-[#94A3B8] text-xs font-['JetBrains_Mono',monospace]" suppressHydrationWarning>
                                    CHST AI Portal {currentVersion}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        <p className="text-[#94A3B8] text-center mb-6">
                            Are you sure you want to sign out?
                        </p>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancel}
                                className="flex-1 bg-transparent border border-[#334155] text-white px-4 py-3 rounded font-semibold text-sm hover:bg-white/5 hover:border-[#3B82F6] transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSignOut}
                                className="flex-1 bg-[#3B82F6] text-white px-6 py-3 rounded font-semibold text-sm hover:bg-[#2563EB] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-200"
                            >
                                Sign Out
                            </button>
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

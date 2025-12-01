'use client';

import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SignOutPage() {
    const router = useRouter();

    const handleSignOut = async () => {
        await signOut({ callbackUrl: '/auth/signin' });
    };

    const handleCancel = () => {
        router.back();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
            <Card className="w-full max-w-md glassmorphism">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Signout</CardTitle>
                    <CardDescription>Are you sure you want to sign out?</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="flex gap-3">
                        <Button
                            onClick={handleCancel}
                            variant="outline"
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSignOut}
                            variant="gradient"
                            className="flex-1"
                        >
                            Sign out
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/auth/signin');
    }

    if (session.user.role !== 'chairperson') {
        redirect('/chat');
    }

    return (
        <div className="flex h-screen bg-gray-950 text-gray-100">
            <AdminSidebar />
            <main className="flex-1 overflow-y-auto">
                <div className="p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}

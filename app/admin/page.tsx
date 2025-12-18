import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/db';
import { LatestMessagesList } from '@/components/admin/latest-messages';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
    // Fetch stats directly on the server (parallelized)
    const [totalUsers, pendingUsers, totalDocuments, totalChats, totalChunks, latestFeedback] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isApproved: false } }),
        prisma.document.count(),
        prisma.chatSession.count(),
        prisma.document.aggregate({
            _sum: { chunkCount: true },
            where: { status: 'processed' }
        }).then(result => result._sum.chunkCount || 0),
        prisma.feedback.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        name: true,
                        role: true
                    }
                }
            }
        })
    ]);

    const stats = {
        totalUsers,
        pendingUsers,
        totalDocuments,
        totalChats,
        totalChunks,
    };

    const dashboardCards = [
        {
            name: 'Total Users',
            value: stats.totalUsers,
            icon: (
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ),
            color: 'bg-blue-500/10 border-blue-500/20',
        },
        {
            name: 'Pending Approvals',
            value: stats.pendingUsers,
            icon: (
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
            color: 'bg-yellow-500/10 border-yellow-500/20',
            href: '/admin/users',
            clickable: true,
        },
        {
            name: 'Documents',
            value: stats.totalDocuments,
            icon: (
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            color: 'bg-purple-500/10 border-purple-500/20',
        },
        {
            name: 'Chat Sessions',
            value: stats.totalChats,
            icon: (
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            ),
            color: 'bg-green-500/10 border-green-500/20',
        },
        {
            name: 'Total Chunks',
            value: stats.totalChunks,
            icon: (
                <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
            ),
            color: 'bg-violet-500/10 border-violet-500/20',
        },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h1>
                <p className="text-gray-400">Welcome back, Chairperson.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {dashboardCards.map((stat) => {
                    const CardComponent = (
                        <Card
                            className={`backdrop-blur-xl border ${stat.color} bg-gray-900/50 ${stat.clickable ? 'cursor-pointer hover:scale-105 transition-transform' : ''} h-full`}
                        >
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-gray-400">
                                    {stat.name}
                                </CardTitle>
                                {stat.icon}
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{stat.value}</div>
                                {stat.clickable && stat.value > 0 && (
                                    <p className="text-xs text-yellow-400 mt-1">Click to review →</p>
                                )}
                            </CardContent>
                        </Card>
                    );

                    return (
                        <div key={stat.name}>
                            {stat.href ? (
                                <Link href={stat.href} className="block h-full">
                                    {CardComponent}
                                </Link>
                            ) : (
                                CardComponent
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-gray-900/50 border-white/10 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-white">Latest User Messages</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <LatestMessagesList initialMessages={latestFeedback as any} />
                    </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-white/10 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-white">System Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">Database</span>
                                <span className="flex items-center text-green-400 text-sm">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                    Connected
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">Vector Store</span>
                                <span className="flex items-center text-green-400 text-sm">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                    Operational
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">OpenAI API</span>
                                <span className="flex items-center text-green-400 text-sm">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                    Active
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

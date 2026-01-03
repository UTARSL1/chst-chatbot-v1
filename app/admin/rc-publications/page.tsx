'use client';

import { useState, useEffect } from 'react';
import { Upload, Users, BarChart3, Download } from 'lucide-react';

interface Member {
    id: string;
    name: string;
    totalPublications: number;
    journalArticles: number;
    conferencePapers: number;
    q1Publications: number;
    q2Publications: number;
    q3Publications: number;
    q4Publications: number;
}

interface Stats {
    totalPublications: number;
    journalArticles: number;
    conferencePapers: number;
    q1Publications: number;
    q2Publications: number;
    q3Publications: number;
    q4Publications: number;
    firstAuthor: number;
    correspondingAuthor: number;
    coAuthor: number;
    q1FirstAuthor: number;
    q1Corresponding: number;
    q1CoAuthor: number;
    q2FirstAuthor: number;
    q2Corresponding: number;
    q2CoAuthor: number;
    q3FirstAuthor: number;
    q3Corresponding: number;
    q3CoAuthor: number;
    q4FirstAuthor: number;
    q4Corresponding: number;
    q4CoAuthor: number;
}

export default function RCPublicationsPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [selectedYear, setSelectedYear] = useState<string>('all');
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Fetch members on mount
    useEffect(() => {
        fetchMembers();
    }, []);

    // Fetch stats when member or year changes
    useEffect(() => {
        if (selectedMember) {
            fetchMemberStats(selectedMember.id, selectedYear);
        }
    }, [selectedMember, selectedYear]);

    const fetchMembers = async () => {
        try {
            const res = await fetch('/api/admin/rc-publications/members');
            const data = await res.json();
            if (data.success) {
                setMembers(data.members);
                if (data.members.length > 0) {
                    setSelectedMember(data.members[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching members:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMemberStats = async (memberId: string, year: string) => {
        try {
            const res = await fetch(`/api/admin/rc-publications/members/${memberId}?year=${year}`);
            const data = await res.json();
            if (data.success) {
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/admin/rc-publications/upload', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (data.success) {
                alert(`Successfully uploaded publications for ${data.member.name}`);
                fetchMembers();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Error uploading:', error);
            alert('Failed to upload file');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const calculatePercentage = (value: number, total: number) => {
        if (total === 0) return 0;
        return ((value / total) * 100).toFixed(1);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        RC Members Publication Analysis Toolbox
                    </h1>
                    <p className="text-gray-600">
                        Analyze publication quality and quartile distribution for research centre members
                    </p>
                </div>

                {/* Upload Section */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Upload className="w-6 h-6 text-blue-600" />
                            <div>
                                <h2 className="text-lg font-semibold">Upload Member Publication</h2>
                                <p className="text-sm text-gray-600">Upload CSV file containing publication data</p>
                            </div>
                        </div>
                        <label className="cursor-pointer">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className="hidden"
                                disabled={uploading}
                            />
                            <div className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                                {uploading ? 'Uploading...' : 'Choose CSV File'}
                            </div>
                        </label>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Panel - Members List */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="w-5 h-5 text-gray-700" />
                                <h3 className="font-semibold">RC Members ({members.length})</h3>
                            </div>

                            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                {members.map((member) => (
                                    <button
                                        key={member.id}
                                        onClick={() => setSelectedMember(member)}
                                        className={`w-full text-left p-3 rounded-lg transition ${selectedMember?.id === member.id
                                                ? 'bg-blue-50 border-2 border-blue-500'
                                                : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                                            }`}
                                    >
                                        <div className="font-medium text-sm">{member.name}</div>
                                        <div className="text-xs text-gray-600 mt-1">
                                            {member.totalPublications} publications
                                        </div>
                                        <div className="flex gap-1 mt-2">
                                            {member.q1Publications > 0 && (
                                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                                    Q1: {member.q1Publications}
                                                </span>
                                            )}
                                            {member.q2Publications > 0 && (
                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                                    Q2: {member.q2Publications}
                                                </span>
                                            )}
                                            {member.q3Publications > 0 && (
                                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                                                    Q3: {member.q3Publications}
                                                </span>
                                            )}
                                            {member.q4Publications > 0 && (
                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                                                    Q4: {member.q4Publications}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Analysis */}
                    <div className="lg:col-span-2">
                        {selectedMember && stats && (
                            <div className="space-y-6">
                                {/* Header with Year Selector */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h2 className="text-2xl font-bold">{selectedMember.name}</h2>
                                            <p className="text-gray-600">Publication Analysis</p>
                                        </div>
                                        <select
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(e.target.value)}
                                            className="px-4 py-2 border border-gray-300 rounded-lg"
                                        >
                                            <option value="all">All Years</option>
                                            <option value="2024">2024</option>
                                            <option value="2023">2023</option>
                                            <option value="2022">2022</option>
                                            <option value="2021">2021</option>
                                            <option value="2020">2020</option>
                                        </select>
                                    </div>

                                    {/* Key Metrics */}
                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <div className="text-2xl font-bold text-gray-900">{stats.totalPublications}</div>
                                            <div className="text-sm text-gray-600">Total Publications</div>
                                        </div>
                                        <div className="bg-blue-50 p-4 rounded-lg">
                                            <div className="text-2xl font-bold text-blue-900">{stats.journalArticles}</div>
                                            <div className="text-sm text-blue-600">Journal Articles</div>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <div className="text-2xl font-bold text-gray-900">{stats.conferencePapers}</div>
                                            <div className="text-sm text-gray-600">Conference Papers</div>
                                        </div>
                                        <div className="bg-green-50 p-4 rounded-lg">
                                            <div className="text-2xl font-bold text-green-900">{stats.q1Publications}</div>
                                            <div className="text-sm text-green-600">Q1 Publications</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Quartile Distribution Chart */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold mb-4">Journal Quartile Distribution</h3>

                                    <div className="space-y-4">
                                        {/* Q1 Bar */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium">Q1</span>
                                                <span className="text-sm text-gray-600">
                                                    {stats.q1Publications} ({calculatePercentage(stats.q1Publications, stats.journalArticles)}%)
                                                </span>
                                            </div>
                                            <div className="h-8 bg-gray-200 rounded-lg overflow-hidden flex">
                                                {stats.q1FirstAuthor > 0 && (
                                                    <div
                                                        className="bg-green-700 flex items-center justify-center text-white text-xs"
                                                        style={{ width: `${(stats.q1FirstAuthor / stats.q1Publications) * 100}%` }}
                                                    >
                                                        {stats.q1FirstAuthor > 0 && `1st: ${stats.q1FirstAuthor}`}
                                                    </div>
                                                )}
                                                {stats.q1Corresponding > 0 && (
                                                    <div
                                                        className="bg-green-500 flex items-center justify-center text-white text-xs"
                                                        style={{ width: `${(stats.q1Corresponding / stats.q1Publications) * 100}%` }}
                                                    >
                                                        {stats.q1Corresponding > 0 && `Corr: ${stats.q1Corresponding}`}
                                                    </div>
                                                )}
                                                {stats.q1CoAuthor > 0 && (
                                                    <div
                                                        className="bg-green-300 flex items-center justify-center text-green-900 text-xs"
                                                        style={{ width: `${(stats.q1CoAuthor / stats.q1Publications) * 100}%` }}
                                                    >
                                                        {stats.q1CoAuthor > 0 && `Co: ${stats.q1CoAuthor}`}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Q2 Bar */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium">Q2</span>
                                                <span className="text-sm text-gray-600">
                                                    {stats.q2Publications} ({calculatePercentage(stats.q2Publications, stats.journalArticles)}%)
                                                </span>
                                            </div>
                                            <div className="h-8 bg-gray-200 rounded-lg overflow-hidden flex">
                                                {stats.q2FirstAuthor > 0 && (
                                                    <div
                                                        className="bg-blue-700 flex items-center justify-center text-white text-xs"
                                                        style={{ width: `${(stats.q2FirstAuthor / stats.q2Publications) * 100}%` }}
                                                    >
                                                        {stats.q2FirstAuthor > 0 && `1st: ${stats.q2FirstAuthor}`}
                                                    </div>
                                                )}
                                                {stats.q2Corresponding > 0 && (
                                                    <div
                                                        className="bg-blue-500 flex items-center justify-center text-white text-xs"
                                                        style={{ width: `${(stats.q2Corresponding / stats.q2Publications) * 100}%` }}
                                                    >
                                                        {stats.q2Corresponding > 0 && `Corr: ${stats.q2Corresponding}`}
                                                    </div>
                                                )}
                                                {stats.q2CoAuthor > 0 && (
                                                    <div
                                                        className="bg-blue-300 flex items-center justify-center text-blue-900 text-xs"
                                                        style={{ width: `${(stats.q2CoAuthor / stats.q2Publications) * 100}%` }}
                                                    >
                                                        {stats.q2CoAuthor > 0 && `Co: ${stats.q2CoAuthor}`}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Q3 Bar */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium">Q3</span>
                                                <span className="text-sm text-gray-600">
                                                    {stats.q3Publications} ({calculatePercentage(stats.q3Publications, stats.journalArticles)}%)
                                                </span>
                                            </div>
                                            <div className="h-8 bg-gray-200 rounded-lg overflow-hidden flex">
                                                {stats.q3FirstAuthor > 0 && (
                                                    <div
                                                        className="bg-orange-700 flex items-center justify-center text-white text-xs"
                                                        style={{ width: `${(stats.q3FirstAuthor / stats.q3Publications) * 100}%` }}
                                                    >
                                                        {stats.q3FirstAuthor > 0 && `1st: ${stats.q3FirstAuthor}`}
                                                    </div>
                                                )}
                                                {stats.q3Corresponding > 0 && (
                                                    <div
                                                        className="bg-orange-500 flex items-center justify-center text-white text-xs"
                                                        style={{ width: `${(stats.q3Corresponding / stats.q3Publications) * 100}%` }}
                                                    >
                                                        {stats.q3Corresponding > 0 && `Corr: ${stats.q3Corresponding}`}
                                                    </div>
                                                )}
                                                {stats.q3CoAuthor > 0 && (
                                                    <div
                                                        className="bg-orange-300 flex items-center justify-center text-orange-900 text-xs"
                                                        style={{ width: `${(stats.q3CoAuthor / stats.q3Publications) * 100}%` }}
                                                    >
                                                        {stats.q3CoAuthor > 0 && `Co: ${stats.q3CoAuthor}`}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Q4 Bar */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium">Q4</span>
                                                <span className="text-sm text-gray-600">
                                                    {stats.q4Publications} ({calculatePercentage(stats.q4Publications, stats.journalArticles)}%)
                                                </span>
                                            </div>
                                            <div className="h-8 bg-gray-200 rounded-lg overflow-hidden flex">
                                                {stats.q4FirstAuthor > 0 && (
                                                    <div
                                                        className="bg-red-700 flex items-center justify-center text-white text-xs"
                                                        style={{ width: `${(stats.q4FirstAuthor / stats.q4Publications) * 100}%` }}
                                                    >
                                                        {stats.q4FirstAuthor > 0 && `1st: ${stats.q4FirstAuthor}`}
                                                    </div>
                                                )}
                                                {stats.q4Corresponding > 0 && (
                                                    <div
                                                        className="bg-red-500 flex items-center justify-center text-white text-xs"
                                                        style={{ width: `${(stats.q4Corresponding / stats.q4Publications) * 100}%` }}
                                                    >
                                                        {stats.q4Corresponding > 0 && `Corr: ${stats.q4Corresponding}`}
                                                    </div>
                                                )}
                                                {stats.q4CoAuthor > 0 && (
                                                    <div
                                                        className="bg-red-300 flex items-center justify-center text-red-900 text-xs"
                                                        style={{ width: `${(stats.q4CoAuthor / stats.q4Publications) * 100}%` }}
                                                    >
                                                        {stats.q4CoAuthor > 0 && `Co: ${stats.q4CoAuthor}`}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex gap-4 text-xs text-gray-600">
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-gray-700 rounded"></div>
                                            <span>1st Author</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-gray-500 rounded"></div>
                                            <span>Corresponding</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-gray-300 rounded"></div>
                                            <span>Co-author</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, TrendingDown, Users, Briefcase, Building2, ChevronDown, ChevronUp } from 'lucide-react';

interface ComparisonResult {
    year1: number;
    year2: number;
    summary: {
        totalStaffYear1: number;
        totalStaffYear2: number;
        netChange: number;
        promotions: number;
        demotions: number;
        lateralMoves: number;
        adminPostChanges: number;
        newHires: number;
        departures: number;
    };
    positionChanges: any[];
    adminPostChanges: any[];
    facultyCountChanges: any[];
    departmentCountChanges: any[];
    newHires: any[];
    departures: any[];
}

export default function StaffComparisonPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [comparison, setComparison] = useState<ComparisonResult | null>(null);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetchComparison();
    }, []);

    const fetchComparison = async () => {
        try {
            // Compare 2025 with current (which is also 2025 for now, so should show 0 changes)
            const res = await fetch('/api/admin/staff-comparison?year1=2025&year2=current');
            if (res.ok) {
                const data = await res.json();
                setComparison(data);
            }
        } catch (error) {
            console.error('Failed to load comparison', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    if (loading) {
        return <div className="p-8 text-center">Loading comparison...</div>;
    }

    if (!comparison) {
        return <div className="p-8 text-center text-red-400">Failed to load comparison data</div>;
    }

    const { summary } = comparison;

    return (
        <div className="min-h-screen bg-background p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="w-6 h-6 text-primary" />
                        Year-over-Year Staff Comparison
                    </h1>
                    <p className="text-muted-foreground">
                        Comparing {comparison.year1} vs {comparison.year2}
                    </p>
                </div>
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Total Staff</h3>
                        <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-3xl font-bold">{summary.totalStaffYear2}</div>
                    <div className={`text-sm mt-2 flex items-center gap-1 ${summary.netChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {summary.netChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {summary.netChange >= 0 ? '+' : ''}{summary.netChange} from {comparison.year1}
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">New Hires</h3>
                        <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="text-3xl font-bold text-green-400">{summary.newHires}</div>
                    <div className="text-sm text-muted-foreground mt-2">
                        Staff in {comparison.year2} but not in {comparison.year1}
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Departures</h3>
                        <TrendingDown className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="text-3xl font-bold text-red-400">{summary.departures}</div>
                    <div className="text-sm text-muted-foreground mt-2">
                        Staff in {comparison.year1} but not in {comparison.year2}
                    </div>
                </Card>
            </div>

            {/* Position Changes */}
            <Card className="p-6">
                <button
                    onClick={() => toggleSection('positions')}
                    className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                >
                    <div className="flex items-center gap-3">
                        <Briefcase className="w-5 h-5 text-purple-400" />
                        <div className="text-left">
                            <h2 className="text-xl font-bold">Position Changes</h2>
                            <p className="text-sm text-muted-foreground">
                                {summary.promotions} promotions, {summary.demotions} demotions, {summary.lateralMoves} lateral moves
                            </p>
                        </div>
                    </div>
                    {expandedSections['positions'] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>

                {expandedSections['positions'] && (
                    <div className="mt-6 space-y-4">
                        {comparison.positionChanges.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No position changes detected</p>
                        ) : (
                            <div className="space-y-2">
                                {comparison.positionChanges.map((change, idx) => (
                                    <div key={idx} className="bg-muted/30 p-4 rounded-lg">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="font-semibold">{change.name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {change.faculty} - {change.department}
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${change.changeType === 'promotion' ? 'bg-green-500/20 text-green-400' :
                                                    change.changeType === 'demotion' ? 'bg-red-500/20 text-red-400' :
                                                        'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                {change.changeType}
                                            </span>
                                        </div>
                                        <div className="mt-2 text-sm">
                                            <span className="text-muted-foreground">{change.oldDesignation}</span>
                                            <span className="mx-2">→</span>
                                            <span className="font-medium">{change.newDesignation}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* Administrative Post Changes */}
            <Card className="p-6">
                <button
                    onClick={() => toggleSection('adminPosts')}
                    className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                >
                    <div className="flex items-center gap-3">
                        <Briefcase className="w-5 h-5 text-amber-400" />
                        <div className="text-left">
                            <h2 className="text-xl font-bold">Administrative Post Changes</h2>
                            <p className="text-sm text-muted-foreground">
                                {summary.adminPostChanges} staff with administrative post changes
                            </p>
                        </div>
                    </div>
                    {expandedSections['adminPosts'] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>

                {expandedSections['adminPosts'] && (
                    <div className="mt-6 space-y-4">
                        {comparison.adminPostChanges.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No administrative post changes detected</p>
                        ) : (
                            <div className="space-y-2">
                                {comparison.adminPostChanges.map((change, idx) => (
                                    <div key={idx} className="bg-muted/30 p-4 rounded-lg">
                                        <div className="font-semibold">{change.name}</div>
                                        <div className="text-sm text-muted-foreground mb-2">
                                            {change.faculty} - {change.department}
                                        </div>
                                        {change.added.length > 0 && (
                                            <div className="text-sm mb-1">
                                                <span className="text-green-400">+ Added:</span> {change.added.join(', ')}
                                            </div>
                                        )}
                                        {change.removed.length > 0 && (
                                            <div className="text-sm">
                                                <span className="text-red-400">- Removed:</span> {change.removed.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* Faculty Count Changes */}
            <Card className="p-6">
                <button
                    onClick={() => toggleSection('facultyCounts')}
                    className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                >
                    <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-cyan-400" />
                        <div className="text-left">
                            <h2 className="text-xl font-bold">Faculty Staff Count Changes</h2>
                            <p className="text-sm text-muted-foreground">
                                Changes in staff numbers by faculty
                            </p>
                        </div>
                    </div>
                    {expandedSections['facultyCounts'] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>

                {expandedSections['facultyCounts'] && (
                    <div className="mt-6 space-y-4">
                        {comparison.facultyCountChanges.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No faculty count changes detected</p>
                        ) : (
                            <div className="space-y-2">
                                {comparison.facultyCountChanges.map((change, idx) => (
                                    <div key={idx} className="bg-muted/30 p-4 rounded-lg flex items-center justify-between">
                                        <div>
                                            <div className="font-semibold">{change.unit}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {change.oldCount} → {change.newCount}
                                            </div>
                                        </div>
                                        <div className={`text-lg font-bold ${change.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {change.change >= 0 ? '+' : ''}{change.change}
                                            <span className="text-sm ml-1">({change.percentChange.toFixed(1)}%)</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* Department Count Changes */}
            <Card className="p-6">
                <button
                    onClick={() => toggleSection('deptCounts')}
                    className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                >
                    <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-indigo-400" />
                        <div className="text-left">
                            <h2 className="text-xl font-bold">Department Staff Count Changes</h2>
                            <p className="text-sm text-muted-foreground">
                                Changes in staff numbers by department
                            </p>
                        </div>
                    </div>
                    {expandedSections['deptCounts'] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>

                {expandedSections['deptCounts'] && (
                    <div className="mt-6 space-y-4">
                        {comparison.departmentCountChanges.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No department count changes detected</p>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {comparison.departmentCountChanges.map((change, idx) => (
                                    <div key={idx} className="bg-muted/30 p-4 rounded-lg flex items-center justify-between">
                                        <div>
                                            <div className="font-semibold text-sm">{change.unit}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {change.oldCount} → {change.newCount}
                                            </div>
                                        </div>
                                        <div className={`text-lg font-bold ${change.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {change.change >= 0 ? '+' : ''}{change.change}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
}

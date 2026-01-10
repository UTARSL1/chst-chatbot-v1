'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Building2, Users, BarChart3, ChevronDown, Lock, Shield, Trash2, Plus, X, Download, Printer } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface StaffMember {
    name: string;
    email: string;
    scopusAuthorId: string;
    scopusStatus: string;
    department: string;
    departmentAcronym: string;
    totalPublications: number;
    publications: Array<{
        year: number;
        count: number;
    }>;
}

interface DepartmentData {
    name: string;
    acronym: string;
    staffCount: number;
}

export default function ScopusPublicationsPage() {
    const router = useRouter();
    const { data: session, status } = useSession();

    // Data State
    const [selectedFaculty, setSelectedFaculty] = useState<string>('LKC FES');
    const [selectedDepartment, setSelectedDepartment] = useState<string>('');
    const [departments, setDepartments] = useState<DepartmentData[]>([]);
    const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'individual' | 'department'>('individual');

    // Permission State
    const [hasAccess, setHasAccess] = useState(false);
    const [permissionLoading, setPermissionLoading] = useState(true);
    const [isChairperson, setIsChairperson] = useState(false);
    const [allowedUsers, setAllowedUsers] = useState<string[]>([]);

    // Management UI State
    const [showAccessModal, setShowAccessModal] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [addingUser, setAddingUser] = useState(false);

    // Year selection
    const [selectedYears, setSelectedYears] = useState<number[]>([2023, 2024, 2025]);

    // Access control
    useEffect(() => {
        if (status === 'loading') return;
        if (!session) {
            router.push('/chat');
        }
    }, [session, status, router]);

    // Load departments when faculty changes
    useEffect(() => {
        if (selectedFaculty) {
            loadDepartments(selectedFaculty);
        }
    }, [selectedFaculty]);

    // Load staff AND check permissions when department/faculty changes
    useEffect(() => {
        if (selectedDepartment && selectedFaculty) {
            checkAccessAndLoadData(selectedFaculty, selectedDepartment);
        } else {
            setStaffMembers([]);
            setHasAccess(false);
        }
    }, [selectedDepartment, selectedFaculty]);

    const checkAccessAndLoadData = async (faculty: string, department: string) => {
        setPermissionLoading(true);
        try {
            // Check permissions first
            const accessRes = await fetch(`/api/scopus-publications/access?faculty=${encodeURIComponent(faculty)}&department=${encodeURIComponent(department)}`);
            const accessData = await accessRes.json();

            setIsChairperson(accessData.isChairperson);
            setHasAccess(accessData.hasAccess);

            if (accessData.allowedUsers) {
                setAllowedUsers(accessData.allowedUsers);
            }

            // Only load data if allowed
            if (accessData.hasAccess) {
                setLoading(true);
                const staffRes = await fetch(`/api/scopus-publications/staff?department=${encodeURIComponent(department)}`);
                const staffData = await staffRes.json();

                if (staffData.success) {
                    setStaffMembers(staffData.staff);
                }
            } else {
                setStaffMembers([]);
            }
        } catch (error) {
            console.error('Error checking access:', error);
            setHasAccess(false);
        } finally {
            setPermissionLoading(false);
            setLoading(false);
        }
    };

    const loadDepartments = async (faculty: string) => {
        try {
            const res = await fetch(`/api/scopus-publications/departments?faculty=${encodeURIComponent(faculty)}`);
            const data = await res.json();

            if (data.success) {
                setDepartments(data.departments);
                // Auto-select first department
                if (data.departments.length > 0) {
                    setSelectedDepartment(data.departments[0].acronym);
                }
            }
        } catch (error) {
            console.error('Error loading departments:', error);
        }
    };

    const handleGrantAccess = async () => {
        if (!newEmail.trim()) return;

        setAddingUser(true);
        try {
            const res = await fetch('/api/scopus-publications/access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    faculty: selectedFaculty,
                    department: selectedDepartment,
                    email: newEmail.trim()
                })
            });

            const data = await res.json();
            if (data.success) {
                setAllowedUsers(data.allowedUsers);
                setNewEmail('');
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error('Error granting access:', error);
        } finally {
            setAddingUser(false);
        }
    };

    const handleRevokeAccess = async (email: string) => {
        if (!confirm(`Are you sure you want to remove access for ${email}?`)) return;

        try {
            const res = await fetch('/api/scopus-publications/access', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    faculty: selectedFaculty,
                    department: selectedDepartment,
                    email
                })
            });

            const data = await res.json();
            if (data.success) {
                setAllowedUsers(data.allowedUsers);
            }
        } catch (error) {
            console.error('Error revoking access:', error);
        }
    };

    const toggleYear = (year: number) => {
        setSelectedYears(prev =>
            prev.includes(year)
                ? prev.filter(y => y !== year)
                : [...prev, year].sort()
        );
    };

    // Calculate statistics for selected years
    const calculateStats = useMemo(() => {
        if (!hasAccess) return null;

        // Filter staff who have a valid Scopus ID (ignoring the unreliable scopusStatus field)
        const filteredStaff = staffMembers.filter(s => s.scopusAuthorId && s.scopusAuthorId !== 'NA');

        const totalPublications = filteredStaff.reduce((sum, staff) => {
            if (!staff.publications) return sum;
            const yearPubs = staff.publications
                .filter(p => selectedYears.includes(p.year))
                .reduce((s, p) => s + p.count, 0);
            return sum + yearPubs;
        }, 0);

        const staffWithPublications = filteredStaff.filter(staff => {
            if (!staff.publications) return false;
            const yearPubs = staff.publications
                .filter(p => selectedYears.includes(p.year))
                .reduce((s, p) => s + p.count, 0);
            return yearPubs > 0;
        }).length;

        const publicationsByYear = selectedYears.map(year => ({
            year,
            count: filteredStaff.reduce((sum, staff) => {
                if (!staff.publications) return sum;
                const pub = staff.publications.find(p => p.year === year);
                return sum + (pub?.count || 0);
            }, 0)
        }));

        return {
            totalStaff: staffMembers.length,
            staffWithScopus: filteredStaff.length,
            staffWithPublications,
            totalPublications,
            publicationsByYear,
            averagePerStaff: filteredStaff.length > 0 ? (totalPublications / filteredStaff.length).toFixed(2) : '0.00'
        };
    }, [staffMembers, selectedYears, hasAccess]);

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
                <div className="text-lg text-gray-300">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Back Link */}
                <div className="mb-6 print:hidden">
                    <Link href="/chat" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                        <span>Back to Chat</span>
                    </Link>
                </div>

                {/* Header */}
                <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-[#818cf8] mb-2">
                            Scopus Publications Dashboard
                        </h1>
                        <p className="text-gray-300">
                            View and analyze Scopus publication data by faculty and department
                        </p>
                    </div>

                    {/* Print Only Header */}
                    <div className="hidden print:block text-black mb-8">
                        <h1 className="text-2xl font-bold">{selectedDepartment}</h1>
                        <p className="text-gray-600">Publications Analysis: {selectedYears.join(', ')}</p>
                    </div>

                    {/* Permission Message or Button */}
                    {selectedDepartment && hasAccess && (
                        <div className="flex items-center gap-2 print:hidden">
                            {isChairperson ? (
                                <button
                                    onClick={() => setShowAccessModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-blue-300 transition-colors"
                                >
                                    <Shield className="w-4 h-4" />
                                    Manage Access
                                </button>
                            ) : (
                                <span className="flex items-center gap-2 px-3 py-1 bg-green-900/30 text-green-400 border border-green-800 rounded-full text-xs">
                                    <Lock className="w-3 h-3" /> Access Granted
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Faculty and Department Selection */}
                <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
                    {/* Faculty Dropdown */}
                    <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-4 shadow-[0_0_15px_rgba(255,255,255,0.07)]">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            <Building2 className="inline w-4 h-4 mr-2" />
                            Faculty
                        </label>
                        <div className="relative">
                            <select
                                value={selectedFaculty}
                                onChange={(e) => setSelectedFaculty(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                            >
                                <option value="LKC FES">LKC FES - Lee Kong Chian Faculty of Engineering and Science</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Department Dropdown */}
                    <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-4 shadow-[0_0_15px_rgba(255,255,255,0.07)]">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            <Users className="inline w-4 h-4 mr-2" />
                            Department ({departments.length} available)
                        </label>
                        <div className="relative">
                            <select
                                value={selectedDepartment}
                                onChange={(e) => setSelectedDepartment(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                                disabled={departments.length === 0}
                            >
                                {departments.map(dept => (
                                    <option key={dept.acronym} value={dept.acronym}>
                                        {dept.acronym} - {dept.name} ({dept.staffCount} staff)
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                {selectedDepartment && (
                    <>
                        {permissionLoading ? (
                            <div className="bg-slate-900/80 rounded-lg border border-white/20 p-12 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                                    <p className="text-gray-400">Verifying access permissions...</p>
                                </div>
                            </div>
                        ) : !hasAccess ? (
                            <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-red-500/20 p-12 text-center shadow-[0_0_15px_rgba(220,38,38,0.05)]">
                                <Lock className="w-16 h-16 text-red-500 mx-auto mb-4 opacity-50" />
                                <h3 className="text-xl font-semibold text-white mb-2">Access Denied</h3>
                                <p className="text-gray-400 max-w-md mx-auto">
                                    You do not have permission to view the Scopus data for <strong>{selectedDepartment}</strong>.
                                    Please contact the RC Chairperson to request access.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Year Selection */}
                                <div className="mb-6 bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-4 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:hidden">
                                    <label className="block text-sm font-medium text-gray-300 mb-3">
                                        <BarChart3 className="inline w-4 h-4 mr-2" />
                                        Select Years to Analyze
                                    </label>
                                    <div className="flex gap-3">
                                        {[2023, 2024, 2025].map(year => (
                                            <label key={year} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedYears.includes(year)}
                                                    onChange={() => toggleYear(year)}
                                                    className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                                                />
                                                <span className="text-white font-medium">{year}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {selectedYears.length === 0 && (
                                        <p className="mt-2 text-sm text-amber-400">Please select at least one year</p>
                                    )}
                                </div>

                                {/* Tabs */}
                                {selectedYears.length > 0 && (
                                    <>
                                        <div className="mb-8 border-b border-white/10 print:hidden">
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => setActiveTab('individual')}
                                                    className={`px-6 py-3 font-medium transition-all ${activeTab === 'individual'
                                                        ? 'text-blue-400 border-b-2 border-blue-400'
                                                        : 'text-gray-400 hover:text-gray-300'
                                                        }`}
                                                >
                                                    Individual Staff
                                                </button>
                                                <button
                                                    onClick={() => setActiveTab('department')}
                                                    className={`px-6 py-3 font-medium transition-all ${activeTab === 'department'
                                                        ? 'text-blue-400 border-b-2 border-blue-400'
                                                        : 'text-gray-400 hover:text-gray-300'
                                                        }`}
                                                >
                                                    Department Overview
                                                </button>
                                            </div>
                                        </div>

                                        {/* Tab Content */}
                                        {activeTab === 'individual' && (
                                            <IndividualStaffTab
                                                staffMembers={staffMembers}
                                                selectedYears={selectedYears}
                                                loading={loading}
                                                departmentName={departments.find(d => d.acronym === selectedDepartment)?.name || selectedDepartment}
                                            />
                                        )}

                                        {activeTab === 'department' && calculateStats && (
                                            <DepartmentOverviewTab
                                                stats={calculateStats}
                                                selectedYears={selectedYears}
                                                departmentName={departments.find(d => d.acronym === selectedDepartment)?.name || ''}
                                            />
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </>
                )}

                {/* Empty State */}
                {!selectedDepartment && (
                    <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-12 text-center shadow-[0_0_15px_rgba(255,255,255,0.07)]">
                        <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-300 mb-2">Select a Department</h3>
                        <p className="text-gray-400">Choose a faculty and department to view Scopus publication data</p>
                    </div>
                )}
            </div>

            {/* Manage Access Modal */}
            {showAccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
                            <h3 className="font-semibold text-white flex items-center gap-2">
                                <Shield className="w-4 h-4 text-blue-400" />
                                Manage Access: {selectedDepartment}
                            </h3>
                            <button
                                onClick={() => setShowAccessModal(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="text-sm text-gray-400 mb-4">
                                Enter the email address of the user you want to grant view access to for this department.
                            </p>

                            <div className="flex gap-2 mb-6">
                                <input
                                    type="email"
                                    placeholder="user@utar.edu.my"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={handleGrantAccess}
                                    disabled={addingUser || !newEmail.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {addingUser ? 'Adding...' : 'Add'}
                                </button>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Authorized Users</h4>
                                {allowedUsers.length === 0 ? (
                                    <div className="text-center py-4 bg-slate-950/50 rounded border border-slate-800 border-dashed">
                                        <p className="text-sm text-gray-500">No users granted access yet.</p>
                                    </div>
                                ) : (
                                    <div className="max-h-48 overflow-y-auto space-y-1">
                                        {allowedUsers.map(email => (
                                            <div key={email} className="flex items-center justify-between p-2 rounded bg-slate-800/50 border border-slate-700/50">
                                                <span className="text-sm text-gray-300">{email}</span>
                                                <button
                                                    onClick={() => handleRevokeAccess(email)}
                                                    className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                    title="Revoke access"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Individual Staff Tab Component
function IndividualStaffTab({ staffMembers, selectedYears, loading, departmentName }: {
    staffMembers: StaffMember[];
    selectedYears: number[];
    loading: boolean;
    departmentName: string;
}) {
    if (loading) {
        return (
            <div className="bg-slate-900/80 rounded-lg border border-white/20 p-12 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading staff data...</p>
                </div>
            </div>
        );
    }

    const staffWithPublications = staffMembers.map(staff => {
        const yearPublications = staff.publications
            .filter(p => selectedYears.includes(p.year))
            .reduce((sum, p) => sum + p.count, 0);

        return {
            ...staff,
            yearPublications
        };
    }).sort((a, b) => b.yearPublications - a.yearPublications);

    const handleExportCSV = () => {
        const csvContent = [
            ['Name', `"Publications (${selectedYears.join(', ')})"`],
            ...staffWithPublications.map(staff => {
                // Sanitize name: Remove 'Â' artifacts and replace non-breaking spaces
                const cleanName = staff.name.replace(/Â/g, '').replace(/\u00A0/g, ' ').trim();
                return [`"${cleanName}"`, staff.yearPublications];
            })
        ].map(e => e.join(',')).join('\n');

        // Add BOM (\uFEFF) for Excel to correctly recognize UTF-8
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${departmentName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_publications_${selectedYears.join('-')}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.07)]">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">
                        Individual Staff Publications ({staffWithPublications.length} staff)
                    </h3>
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors print:hidden"
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Name</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Scopus ID</th>

                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-300">Publications ({selectedYears.join(', ')})</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staffWithPublications.map((staff, idx) => (
                                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="py-3 px-4 text-sm text-white">{staff.name}</td>
                                    <td className="py-3 px-4 text-sm text-gray-400 font-mono">
                                        {staff.scopusAuthorId !== 'NA' ? staff.scopusAuthorId : '-'}
                                    </td>

                                    <td className="py-3 px-4 text-right">
                                        <span className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                                            {staff.yearPublications}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Department Overview Tab Component
function DepartmentOverviewTab({ stats, selectedYears, departmentName }: {
    stats: any;
    selectedYears: number[];
    departmentName: string;
}) {
    return (
        <div className="space-y-6">
            <div className="flex justify-end gap-2 print:hidden -mb-4">
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                >
                    <Printer className="w-4 h-4" /> Export PDF
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300 print:shadow-none">
                    <div className="text-sm text-gray-400 mb-1 print:text-gray-600">Total Staff</div>
                    <div className="text-3xl font-bold text-white print:text-black">{stats.totalStaff}</div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300 print:shadow-none">
                    <div className="text-sm text-gray-400 mb-1 print:text-gray-600">With Scopus Data</div>
                    <div className="text-3xl font-bold text-emerald-400 print:text-emerald-700">{stats.staffWithScopus}</div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300 print:shadow-none">
                    <div className="text-sm text-gray-400 mb-1 print:text-gray-600">Total Publications</div>
                    <div className="text-3xl font-bold text-blue-400 print:text-blue-700">{stats.totalPublications}</div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300 print:shadow-none">
                    <div className="text-sm text-gray-400 mb-1 print:text-gray-600">Average per Staff</div>
                    <div className="text-3xl font-bold text-purple-400 print:text-purple-700">{stats.averagePerStaff}</div>
                </div>
            </div>

            {/* Publications by Year Chart */}
            <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300 print:shadow-none">
                <h3 className="text-xl font-bold text-white mb-6 print:text-black">Publications by Year</h3>

                <div className="flex items-end gap-8 h-64">
                    {stats.publicationsByYear.map((yearData: any) => {
                        const maxCount = Math.max(...stats.publicationsByYear.map((y: any) => y.count));
                        // Use 70% of container height to leave room for labels
                        const height = maxCount > 0 ? (yearData.count / maxCount) * 70 : 0;

                        return (
                            <div key={yearData.year} className="flex-1 h-full flex flex-col items-center justify-end gap-3">
                                <div className="text-2xl font-bold text-blue-300 print:text-blue-700">{yearData.count}</div>
                                <div
                                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-500 print:bg-blue-600"
                                    style={{
                                        height: `${height}%`,
                                        minHeight: '10px',
                                        // @ts-ignore
                                        printColorAdjust: 'exact',
                                        WebkitPrintColorAdjust: 'exact'
                                    }}
                                />
                                <div className="text-sm font-semibold text-gray-300 print:text-gray-700">{yearData.year}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

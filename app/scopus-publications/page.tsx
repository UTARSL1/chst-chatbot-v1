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
    hIndex?: number;
    citationCount?: number;
}

interface DepartmentData {
    name: string;
    acronym: string;
    staffCount: number;
}

const FACULTY_FULL_NAMES: Record<string, string> = {
    'LKC FES': 'Lee Kong Chian Faculty of Engineering and Science',
    'FAM': 'Faculty of Accountancy and Management',
    'FCI': 'Faculty of Creative Industries',
    'FSc': 'Faculty of Science',
    'FEGT': 'Faculty of Engineering and Green Technology',
    'FMHS': 'Faculty of Medicine and Health Sciences',
    'FBF': 'Faculty of Business and Finance',
    'FAS': 'Faculty of Arts and Social Science',
    'ICS': 'Institute of Chinese Studies'
};

export default function ScopusPublicationsPage() {
    const router = useRouter();
    const { data: session, status } = useSession();

    // Data State
    const [selectedFaculty, setSelectedFaculty] = useState<string>('LKC FES');
    const [selectedDepartment, setSelectedDepartment] = useState<string>('');
    const [departments, setDepartments] = useState<DepartmentData[]>([]);
    const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'individual' | 'department' | 'faculty'>('individual');

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

    // Column visibility for Individual Staff table
    const [visibleColumns, setVisibleColumns] = useState<string[]>(['scopusId', 'hIndex', 'citations', 'publications']);

    // Faculty-level data
    const [facultyStaffData, setFacultyStaffData] = useState<{ [key: string]: StaffMember[] }>({});

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
        <div className="min-h-screen bg-slate-950 p-6 print:p-2 print:bg-white">
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
                    <div className="hidden print:block text-black mb-8 print:mb-4">
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
                                                <button
                                                    onClick={() => setActiveTab('faculty')}
                                                    className={`px-6 py-3 font-medium transition-all ${activeTab === 'faculty'
                                                        ? 'text-blue-400 border-b-2 border-blue-400'
                                                        : 'text-gray-400 hover:text-gray-300'
                                                        }`}
                                                >
                                                    Faculty Overview
                                                </button>
                                            </div>
                                        </div>

                                        {/* Tab Content */}
                                        {activeTab === 'individual' && (
                                            <>
                                                {/* Column Selection for Individual Staff */}
                                                <div className="mb-6 bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-4 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:hidden">
                                                    <label className="block text-sm font-medium text-gray-300 mb-3">
                                                        <Users className="inline w-4 h-4 mr-2" />
                                                        Select Columns to Display
                                                    </label>
                                                    <div className="flex flex-wrap gap-3">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={visibleColumns.includes('scopusId')}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setVisibleColumns([...visibleColumns, 'scopusId']);
                                                                    } else {
                                                                        setVisibleColumns(visibleColumns.filter(c => c !== 'scopusId'));
                                                                    }
                                                                }}
                                                                className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                                                            />
                                                            <span className="text-sm text-gray-300">Scopus ID</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={visibleColumns.includes('hIndex')}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setVisibleColumns([...visibleColumns, 'hIndex']);
                                                                    } else {
                                                                        setVisibleColumns(visibleColumns.filter(c => c !== 'hIndex'));
                                                                    }
                                                                }}
                                                                className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                                                            />
                                                            <span className="text-sm text-gray-300">H-Index</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={visibleColumns.includes('citations')}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setVisibleColumns([...visibleColumns, 'citations']);
                                                                    } else {
                                                                        setVisibleColumns(visibleColumns.filter(c => c !== 'citations'));
                                                                    }
                                                                }}
                                                                className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                                                            />
                                                            <span className="text-sm text-gray-300">Citations</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={visibleColumns.includes('publications')}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setVisibleColumns([...visibleColumns, 'publications']);
                                                                    } else {
                                                                        setVisibleColumns(visibleColumns.filter(c => c !== 'publications'));
                                                                    }
                                                                }}
                                                                className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                                                            />
                                                            <span className="text-sm text-gray-300">Publications ({selectedYears.join(', ')})</span>
                                                        </label>
                                                    </div>
                                                </div>

                                                <IndividualStaffTab
                                                    staffMembers={staffMembers}
                                                    selectedYears={selectedYears}
                                                    loading={loading}
                                                    departmentName={departments.find(d => d.acronym === selectedDepartment)?.name || selectedDepartment}
                                                    visibleColumns={visibleColumns}
                                                />
                                            </>
                                        )}

                                        {activeTab === 'department' && calculateStats && (
                                            <DepartmentOverviewTab
                                                staffMembers={staffMembers}
                                                departments={departments}
                                                selectedYears={selectedYears}
                                                departmentName={departments.find(d => d.acronym === selectedDepartment)?.name || ''}
                                                departmentAcronym={selectedDepartment}
                                            />
                                        )}

                                        {activeTab === 'faculty' && (
                                            <FacultyOverviewTab
                                                facultyName={FACULTY_FULL_NAMES[selectedFaculty] || selectedFaculty}
                                                facultyAcronym={selectedFaculty}
                                                departments={departments}
                                                selectedYears={selectedYears}
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
function IndividualStaffTab({ staffMembers, selectedYears, loading, departmentName, visibleColumns }: {
    staffMembers: StaffMember[];
    selectedYears: number[];
    loading: boolean;
    departmentName: string;
    visibleColumns: string[];
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
        // Build CSV headers based on visible columns
        const headers = ['Name'];
        if (visibleColumns.includes('scopusId')) headers.push('Scopus ID');
        if (visibleColumns.includes('hIndex')) headers.push('H-Index');
        if (visibleColumns.includes('citations')) headers.push('Total Citations');
        if (visibleColumns.includes('publications')) headers.push(`"Publications (${selectedYears.join(', ')})"`);

        // Build CSV rows based on visible columns
        const rows = staffWithPublications.map(staff => {
            // Sanitize name: Remove 'Â' artifacts and replace non-breaking spaces
            const cleanName = staff.name.replace(/Â/g, '').replace(/\u00A0/g, ' ').trim();
            const row = [`"${cleanName}"`];

            if (visibleColumns.includes('scopusId')) {
                row.push(staff.scopusAuthorId !== 'NA' ? staff.scopusAuthorId : '-');
            }
            if (visibleColumns.includes('hIndex')) {
                row.push(staff.hIndex !== undefined ? staff.hIndex.toString() : '-');
            }
            if (visibleColumns.includes('citations')) {
                row.push(staff.citationCount !== undefined ? staff.citationCount.toString() : '-');
            }
            if (visibleColumns.includes('publications')) {
                row.push(staff.yearPublications.toString());
            }

            return row;
        });

        const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');

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
                                {visibleColumns.includes('scopusId') && (
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Scopus ID</th>
                                )}
                                {visibleColumns.includes('hIndex') && (
                                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-300">H-Index</th>
                                )}
                                {visibleColumns.includes('citations') && (
                                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-300">Citations</th>
                                )}
                                {visibleColumns.includes('publications') && (
                                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-300">Publications ({selectedYears.join(', ')})</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {staffWithPublications.map((staff, idx) => (
                                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="py-3 px-4 text-sm text-white">{staff.name}</td>
                                    {visibleColumns.includes('scopusId') && (
                                        <td className="py-3 px-4 text-sm text-gray-400 font-mono">
                                            {staff.scopusAuthorId !== 'NA' ? staff.scopusAuthorId : '-'}
                                        </td>
                                    )}
                                    {visibleColumns.includes('hIndex') && (
                                        <td className="py-3 px-4 text-sm text-gray-300 text-right font-mono">
                                            {staff.hIndex ?? '-'}
                                        </td>
                                    )}
                                    {visibleColumns.includes('citations') && (
                                        <td className="py-3 px-4 text-sm text-gray-300 text-right font-mono">
                                            {staff.citationCount !== undefined ? staff.citationCount.toLocaleString() : '-'}
                                        </td>
                                    )}
                                    {visibleColumns.includes('publications') && (
                                        <td className="py-3 px-4 text-right">
                                            <span className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                                                {staff.yearPublications}
                                            </span>
                                        </td>
                                    )}
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
function DepartmentOverviewTab({ staffMembers, departments, selectedYears, departmentName, departmentAcronym }: {
    staffMembers: StaffMember[];
    departments: DepartmentData[];
    selectedYears: number[];
    departmentName: string;
    departmentAcronym: string;
}) {
    // Calculate stats
    const publicationsByYear = selectedYears.map(year => {
        // Filter valid staff first
        const validStaff = staffMembers.filter(s => s.scopusAuthorId && s.scopusAuthorId !== 'NA');
        const n = validStaff.length || 1;

        // Get counts for this year
        const staffCounts = validStaff.map(staff => {
            const pub = staff.publications?.find(p => p.year === year);
            return pub ? pub.count : 0;
        });

        const count = staffCounts.reduce((a, b) => a + b, 0);
        const avg = count / n;

        return { year, count, avg };
    }).sort((a, b) => a.year - b.year);

    const totalPublications = staffMembers.reduce((sum, staff) => {
        return sum + (staff.publications
            ?.filter(p => selectedYears.includes(p.year))
            .reduce((s, p) => s + p.count, 0) || 0);
    }, 0);

    const staffWithScopusCount = staffMembers.filter(staff =>
        staff.scopusAuthorId && staff.scopusAuthorId !== 'NA'
    ).length;

    const averagePerStaff = staffWithScopusCount > 0
        ? (totalPublications / staffWithScopusCount).toFixed(2)
        : '0.00';

    // Calculate standard deviation of publications across staff with valid Scopus IDs
    const staffPublications = staffMembers
        .filter(staff => staff.scopusAuthorId && staff.scopusAuthorId !== 'NA')
        .map(staff => {
            return staff.publications
                ?.filter(p => selectedYears.includes(p.year))
                .reduce((s, p) => s + p.count, 0) || 0;
        });

    const stdDeviation = staffWithScopusCount > 1 ? (() => {
        const mean = totalPublications / staffWithScopusCount;
        const squaredDiffs = staffPublications.map(pub => Math.pow(pub - mean, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / staffWithScopusCount;
        return Math.sqrt(variance).toFixed(2);
    })() : '0.00';

    return (
        <div className="space-y-6 print:space-y-4">
            <div className="flex justify-end gap-2 print:hidden -mb-4">
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                    <Printer size={16} />
                    Export PDF
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300 print:shadow-none print:p-3">
                    <div className="text-sm text-gray-400 mb-1 print:text-gray-600">Department</div>
                    <div className="text-lg font-bold text-white print:text-black leading-tight mb-1">{departmentName}</div>
                    <div className="text-sm font-mono text-cyan-400 print:text-cyan-700">{departmentAcronym}</div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300 print:shadow-none print:p-3">
                    <div className="text-sm text-gray-400 mb-1 print:text-gray-600">Total Academic Staff</div>
                    <div className="text-3xl font-bold text-white print:text-black print:text-xl">{staffMembers.length}</div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300 print:shadow-none print:p-3">
                    <div className="text-sm text-gray-400 mb-1 print:text-gray-600">Total Publications</div>
                    <div className="text-3xl font-bold text-blue-400 print:text-blue-700 print:text-xl">{totalPublications}</div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300 print:shadow-none print:p-3">
                    <div className="text-sm text-gray-400 mb-1 print:text-gray-600">Average per Staff</div>
                    <div className="text-3xl font-bold text-purple-400 print:text-purple-700 print:text-xl">{averagePerStaff}</div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300 print:shadow-none print:p-3">
                    <div className="text-sm text-gray-400 mb-1 print:text-gray-600">Std Deviation</div>
                    <div className="text-3xl font-bold text-orange-400 print:text-orange-700 print:text-xl">{stdDeviation}</div>
                </div>
            </div>

            {/* Comparison Chart */}
            <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300 print:shadow-none">
                <div className="p-6 print:p-4">
                    <h3 className="text-xl font-bold text-white mb-6 print:text-black print:mb-4">Publications by Year</h3>

                    <div className="flex items-end justify-between gap-4 h-64 print:h-48 w-full px-4">
                        {publicationsByYear.map((yearData: any) => {
                            const maxCount = Math.max(...publicationsByYear.map((y: any) => y.count));
                            const maxAvg = Math.max(...publicationsByYear.map((y: any) => y.avg));

                            // Height percentages
                            const countHeight = maxCount > 0 ? (yearData.count / maxCount) * 70 : 0;
                            const avgHeight = maxAvg > 0 ? (yearData.avg / maxAvg) * 70 : 0;

                            return (
                                <div key={yearData.year} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
                                    <div className="w-full flex gap-2 items-end justify-center h-full max-w-[200px]">
                                        {/* Total Publications Bar */}
                                        <div className="flex-1 flex flex-col items-center justify-end gap-1 h-full group relative">
                                            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 text-xs bg-black text-white px-2 py-1 rounded transition-opacity whitespace-nowrap z-10">Total: {yearData.count}</div>
                                            <div className="text-xs font-bold text-blue-300 print:text-blue-700">{yearData.count}</div>
                                            <div
                                                className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all duration-500 print:bg-blue-600 hover:from-blue-500 hover:to-blue-300"
                                                style={{
                                                    height: `${countHeight}%`,
                                                    minHeight: '4px',
                                                    // @ts-ignore
                                                    printColorAdjust: 'exact',
                                                    WebkitPrintColorAdjust: 'exact'
                                                }}
                                            />
                                        </div>

                                        {/* Average Bar */}
                                        <div className="flex-1 flex flex-col items-center justify-end gap-1 h-full group relative">
                                            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 text-xs bg-black text-white px-2 py-1 rounded transition-opacity whitespace-nowrap z-10">Avg: {yearData.avg.toFixed(2)}</div>
                                            <div className="text-xs font-bold text-purple-300 print:text-purple-700">{yearData.avg.toFixed(2)}</div>
                                            <div
                                                className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t transition-all duration-500 print:bg-purple-600 hover:from-purple-500 hover:to-purple-300"
                                                style={{
                                                    height: `${avgHeight}%`,
                                                    minHeight: '4px',
                                                    // @ts-ignore
                                                    printColorAdjust: 'exact',
                                                    WebkitPrintColorAdjust: 'exact'
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-sm font-semibold text-gray-300 print:text-gray-700 mt-2">{yearData.year}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="flex justify-center gap-6 mt-6 border-t border-white/10 pt-4 print:border-gray-300">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gradient-to-t from-blue-600 to-blue-400 rounded print:bg-blue-600"></div>
                            <span className="text-sm text-gray-300 print:text-gray-700">Total Publications</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gradient-to-t from-purple-600 to-purple-400 rounded print:bg-purple-600"></div>
                            <span className="text-sm text-gray-300 print:text-gray-700">Average per Staff</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Faculty Overview Tab Component
function FacultyOverviewTab({ facultyName, facultyAcronym, departments, selectedYears }: {
    facultyName: string;
    facultyAcronym: string;
    departments: DepartmentData[];
    selectedYears: number[];
}) {
    const [departmentStats, setDepartmentStats] = useState<any[]>([]);
    const [publicationsByYear, setPublicationsByYear] = useState<{ year: number, count: number, avg: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadFacultyData = async () => {
            setLoading(true);
            const stats: any[] = [];
            const yearlyTotals: { [key: number]: number } = {};
            const yearlyStaffCounts: { [key: number]: number[] } = {}; // Store raw counts for SD calculation

            selectedYears.forEach(y => {
                yearlyTotals[y] = 0;
                yearlyStaffCounts[y] = [];
            });

            let totalFacultyStaff = 0;
            let totalFacultyStaffWithScopus = 0;

            for (const dept of departments) {
                try {
                    const res = await fetch(`/api/scopus-publications/staff?department=${encodeURIComponent(dept.acronym)}`);
                    const data = await res.json();

                    if (data.success && data.staff) {
                        // Count total staff for faculty average
                        totalFacultyStaff += data.staff.length;

                        const staffWithScopus = data.staff.filter((s: StaffMember) => s.scopusAuthorId && s.scopusAuthorId !== 'NA');
                        totalFacultyStaffWithScopus += staffWithScopus.length;

                        const totalPubs = staffWithScopus.reduce((sum: number, staff: StaffMember) => {
                            // Sum publications for all selected years
                            const staffPubs = staff.publications?.filter(p => selectedYears.includes(p.year)) || [];

                            // Add to faculty yearly totals AND staff counts
                            staffPubs.forEach(p => {
                                if (yearlyTotals[p.year] !== undefined) {
                                    yearlyTotals[p.year] += p.count;
                                }
                            });

                            // For SD calculation: ensure we record count for EACH year for EACH staff
                            selectedYears.forEach(year => {
                                const pub = staff.publications?.find(p => p.year === year);
                                yearlyStaffCounts[year].push(pub ? pub.count : 0);
                            });

                            const yearPubs = staffPubs.reduce((s, p) => s + p.count, 0) || 0;
                            return sum + yearPubs;
                        }, 0);

                        stats.push({
                            name: dept.name,
                            acronym: dept.acronym,
                            totalStaff: data.staff.length,
                            staffWithScopus: staffWithScopus.length,
                            totalPublications: totalPubs,
                            averagePerStaff: staffWithScopus.length > 0 ? (totalPubs / staffWithScopus.length).toFixed(2) : '0.00'
                        });
                    }
                } catch (error) {
                    console.error(`Error loading data for ${dept.acronym}:`, error);
                }
            }

            setDepartmentStats(stats);
            setPublicationsByYear(Object.entries(yearlyTotals).map(([yearStr, count]) => {
                const year = parseInt(yearStr);
                const counts = yearlyStaffCounts[year] || [];
                const n = counts.length || 1;
                const avg = counts.reduce((a, b) => a + b, 0) / n;

                return {
                    year,
                    count,
                    avg: totalFacultyStaffWithScopus > 0 ? count / totalFacultyStaffWithScopus : 0
                };
            }).sort((a, b) => a.year - b.year));
            setLoading(false);
        };

        if (departments.length > 0) {
            loadFacultyData();
        }
    }, [departments, selectedYears]);

    const totalPublications = departmentStats.reduce((acc, curr) => acc + curr.totalPublications, 0);
    const totalFacultyStaff = departmentStats.reduce((acc, curr) => acc + curr.totalStaff, 0);
    const staffWithScopusCount = departmentStats.reduce((acc, curr) => acc + curr.staffWithScopus, 0);
    const averagePerStaff = staffWithScopusCount > 0
        ? (totalPublications / staffWithScopusCount).toFixed(2)
        : '0.00';

    // Calculate standard deviation of publications across departments
    const deptPublicationCounts = departmentStats.map(dept => dept.totalPublications);
    const stdDeviation = departmentStats.length > 1 ? (() => {
        const mean = totalPublications / departmentStats.length;
        const squaredDiffs = deptPublicationCounts.map(pub => Math.pow(pub - mean, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / departmentStats.length;
        return Math.sqrt(variance).toFixed(2);
    })() : '0.00';

    if (loading) {
        return (
            <div className="bg-slate-900/80 rounded-lg border border-white/20 p-12 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading faculty data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 print:space-y-4">
            <div className="flex justify-end gap-2 print:hidden -mb-4">
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                    <Printer size={16} />
                    Export PDF
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300 print:shadow-none print:p-3">
                    <div className="text-sm text-gray-400 mb-1 print:text-gray-600">Faculty</div>
                    <div className="text-lg font-bold text-white print:text-black leading-tight mb-1">{facultyName}</div>
                    <div className="text-sm font-mono text-cyan-400 print:text-cyan-700">{facultyAcronym}</div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300 print:shadow-none print:p-3">
                    <div className="text-sm text-gray-400 mb-1 print:text-gray-600">Total Academic Staff</div>
                    <div className="text-3xl font-bold text-white print:text-black print:text-xl">{totalFacultyStaff}</div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300 print:shadow-none print:p-3">
                    <div className="text-sm text-gray-400 mb-1 print:text-gray-600">Total Publications</div>
                    <div className="text-3xl font-bold text-blue-400 print:text-blue-700 print:text-xl">{totalPublications}</div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300 print:shadow-none print:p-3">
                    <div className="text-sm text-gray-400 mb-1 print:text-gray-600">Average per Staff</div>
                    <div className="text-3xl font-bold text-purple-400 print:text-purple-700 print:text-xl">{averagePerStaff}</div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300 print:shadow-none print:p-3">
                    <div className="text-sm text-gray-400 mb-1 print:text-gray-600">Std Deviation</div>
                    <div className="text-3xl font-bold text-orange-400 print:text-orange-700 print:text-xl">{stdDeviation}</div>
                </div>
            </div>

            {/* Faculty Publications by Year Chart */}
            <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300 print:shadow-none">
                <div className="p-6 print:p-4">
                    <h3 className="text-xl font-bold text-white mb-6 print:text-black print:mb-4">Faculty Publications by Year</h3>

                    <div className="flex items-end justify-between gap-4 h-64 print:h-48 w-full px-4">
                        {publicationsByYear.map((yearData: any) => {
                            const maxCount = Math.max(...publicationsByYear.map(y => y.count));
                            const maxAvg = Math.max(...publicationsByYear.map(y => y.avg));

                            // Height percentages
                            const countHeight = maxCount > 0 ? (yearData.count / maxCount) * 70 : 0;
                            const avgHeight = maxAvg > 0 ? (yearData.avg / maxAvg) * 70 : 0;

                            return (
                                <div key={yearData.year} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
                                    <div className="w-full flex gap-2 items-end justify-center h-full max-w-[200px]">
                                        {/* Total Publications Bar */}
                                        <div className="flex-1 flex flex-col items-center justify-end gap-1 h-full group relative">
                                            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 text-xs bg-black text-white px-2 py-1 rounded transition-opacity whitespace-nowrap z-10">Total: {yearData.count}</div>
                                            <div className="text-xs font-bold text-blue-300 print:text-blue-700">{yearData.count}</div>
                                            <div
                                                className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all duration-500 print:bg-blue-600 hover:from-blue-500 hover:to-blue-300"
                                                style={{
                                                    height: `${countHeight}%`,
                                                    minHeight: '4px',
                                                    // @ts-ignore
                                                    printColorAdjust: 'exact',
                                                    WebkitPrintColorAdjust: 'exact'
                                                }}
                                            />
                                        </div>

                                        {/* Average Bar */}
                                        <div className="flex-1 flex flex-col items-center justify-end gap-1 h-full group relative">
                                            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 text-xs bg-black text-white px-2 py-1 rounded transition-opacity whitespace-nowrap z-10">Avg: {yearData.avg.toFixed(2)}</div>
                                            <div className="text-xs font-bold text-purple-300 print:text-purple-700">{yearData.avg.toFixed(2)}</div>
                                            <div
                                                className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t transition-all duration-500 print:bg-purple-600 hover:from-purple-500 hover:to-purple-300"
                                                style={{
                                                    height: `${avgHeight}%`,
                                                    minHeight: '4px',
                                                    // @ts-ignore
                                                    printColorAdjust: 'exact',
                                                    WebkitPrintColorAdjust: 'exact'
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-sm font-semibold text-gray-300 print:text-gray-700 mt-2">{yearData.year}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="flex justify-center gap-6 mt-6 border-t border-white/10 pt-4 print:border-gray-300">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gradient-to-t from-blue-600 to-blue-400 rounded print:bg-blue-600"></div>
                            <span className="text-sm text-gray-300 print:text-gray-700">Total Publications</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gradient-to-t from-purple-600 to-purple-400 rounded print:bg-purple-600"></div>
                            <span className="text-sm text-gray-300 print:text-gray-700">Average per Staff</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Department Comparison Chart */}
            <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300 print:shadow-none">
                <div className="p-6 print:p-4">
                    <h3 className="text-xl font-bold text-white mb-6 print:text-black print:mb-4">Department Comparison</h3>

                    <div className="overflow-x-auto">
                        <div className="min-w-[600px] h-96 print:h-80 flex items-end gap-8 pb-12 px-4">
                            {departmentStats
                                .sort((a, b) => b.totalPublications - a.totalPublications)
                                .map((dept, idx) => {
                                    const maxPubs = Math.max(...departmentStats.map(d => d.totalPublications));
                                    const maxAvg = Math.max(...departmentStats.map(d => parseFloat(d.averagePerStaff)));

                                    // Normalize heights to percentage of max
                                    const pubHeight = maxPubs > 0 ? (dept.totalPublications / maxPubs) * 70 : 0;
                                    const avgHeight = maxAvg > 0 ? (parseFloat(dept.averagePerStaff) / maxAvg) * 70 : 0;

                                    return (
                                        <div key={idx} className="flex-1 max-w-[120px] flex flex-col items-center justify-end gap-2 h-full">
                                            <div className="w-full flex gap-2 items-end justify-center h-full">
                                                {/* Total Publications Bar */}
                                                <div className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                                                    <div className="text-xs font-bold text-blue-300 print:text-blue-700">{dept.totalPublications}</div>
                                                    <div
                                                        className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all duration-500 print:bg-blue-600"
                                                        style={{
                                                            height: `${pubHeight}%`,
                                                            minHeight: '10px',
                                                            // @ts-ignore
                                                            printColorAdjust: 'exact',
                                                            WebkitPrintColorAdjust: 'exact'
                                                        }}
                                                        title={`Publications: ${dept.totalPublications}`}
                                                    />
                                                </div>

                                                {/* Average per Staff Bar */}
                                                <div className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                                                    <div className="text-xs font-bold text-purple-300 print:text-purple-700">{dept.averagePerStaff}</div>
                                                    <div
                                                        className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t transition-all duration-500 print:bg-purple-600"
                                                        style={{
                                                            height: `${avgHeight}%`,
                                                            minHeight: '10px',
                                                            // @ts-ignore
                                                            printColorAdjust: 'exact',
                                                            WebkitPrintColorAdjust: 'exact'
                                                        }}
                                                        title={`Average: ${dept.averagePerStaff}`}
                                                    />
                                                </div>
                                            </div>

                                            {/* Department Label */}
                                            <div className="text-xs font-semibold text-gray-300 print:text-gray-700 text-center mt-2">
                                                {dept.acronym}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>

                        {/* Legend */}
                        <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-white/10 print:border-gray-300">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-gradient-to-t from-blue-600 to-blue-400 rounded print:bg-blue-600"></div>
                                <span className="text-sm text-gray-300 print:text-gray-700">Total Publications</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-gradient-to-t from-purple-600 to-purple-400 rounded print:bg-purple-600"></div>
                                <span className="text-sm text-gray-300 print:text-gray-700">Average per Staff</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


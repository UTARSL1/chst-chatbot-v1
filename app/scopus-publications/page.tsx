'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Building2, Users, BarChart3, ChevronDown, ChevronUp, Lock, Shield, Trash2, Plus, X, Download, Printer, Check, Eye } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip as RechartsTooltip, Cell, ReferenceLine } from 'recharts';

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
    lifetimePublications?: number;
    designation?: string;
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
    const [excludeAdjuncts, setExcludeAdjuncts] = useState<boolean>(false);
    const [departments, setDepartments] = useState<DepartmentData[]>([]);
    const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'individual' | 'department' | 'faculty' | 'export'>('individual');

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
    const [visibleColumns, setVisibleColumns] = useState<string[]>(['lifetimePublications', 'publications']);

    // Sub-group selection state
    const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
    const [showingSubGroup, setShowingSubGroup] = useState(false);

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
            // Reset sub-group selection when department changes
            setSelectedStaffIds([]);
            setShowingSubGroup(false);
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
        const filteredStaff = staffMembers.filter(s => {
            if (!s.scopusAuthorId || s.scopusAuthorId === 'NA') return false;
            if (excludeAdjuncts && s.designation && s.designation.toLowerCase().includes('adjunct')) return false;
            return true;
        });

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
            // Fixed: Divide by number of years to get average per staff per year
            averagePerStaff: filteredStaff.length > 0 && selectedYears.length > 0
                ? (totalPublications / filteredStaff.length / selectedYears.length).toFixed(2)
                : '0.00'
        };
    }, [staffMembers, selectedYears, hasAccess, excludeAdjuncts]);

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
                <div className="text-lg text-gray-300">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0B0B10] p-6 print:p-2 print:bg-white">
            <div className="max-w-7xl mx-auto">
                {/* Back Link */}
                <div className="mb-6 print:hidden">
                    <Link href="/chat" className="inline-flex items-center gap-2 text-[#94A3B8] hover:text-white transition-colors font-['JetBrains_Mono',monospace] text-sm uppercase tracking-wide">
                        <ArrowLeft size={20} />
                        <span>// BACK_TO_CHAT</span>
                    </Link>
                </div>

                {/* Header */}
                <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-[#3B82F6] font-['Orbitron',sans-serif] uppercase tracking-[0.1em] mb-2">
                            SCOPUS PUBLICATIONS DASHBOARD
                        </h1>
                        <p className="text-[#94A3B8] font-['JetBrains_Mono',monospace] text-sm">
                            // VIEW_AND_ANALYZE_SCOPUS_DATA
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
                                    className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-[#E5E5E5] font-['Orbitron',sans-serif] font-bold text-xs uppercase tracking-[0.15em] transition-colors"
                                >
                                    <Shield className="w-4 h-4" />
                                    [MANAGE_ACCESS]
                                </button>
                            ) : (
                                <span className="flex items-center gap-2 px-3 py-1 bg-[#10B981] text-black font-['JetBrains_Mono',monospace] text-xs uppercase tracking-wide">
                                    <Lock className="w-3 h-3" /> [ACCESS_GRANTED]
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Faculty and Department Selection */}
                <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
                    {/* Faculty Dropdown */}
                    <div className="bg-[#1A1A1F] border border-[#334155] p-4">
                        <label className="block text-xs font-bold text-white font-['Orbitron',sans-serif] uppercase tracking-[0.1em] mb-2">
                            <Building2 className="inline w-4 h-4 mr-2" />
                            // FACULTY
                        </label>
                        <div className="relative">
                            <select
                                value={selectedFaculty}
                                onChange={(e) => setSelectedFaculty(e.target.value)}
                                className="w-full px-4 py-3 bg-[#0B0B10] border border-[#334155] text-white font-['JetBrains_Mono',monospace] text-sm focus:outline-none focus:border-white appearance-none cursor-pointer"
                            >
                                <option value="LKC FES">LKC FES - Lee Kong Chian Faculty of Engineering and Science</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8] pointer-events-none" />
                        </div>
                    </div>

                    {/* Department Dropdown */}
                    <div className="bg-[#1A1A1F] border border-[#334155] p-4">
                        <label className="block text-xs font-bold text-white font-['Orbitron',sans-serif] uppercase tracking-[0.1em] mb-2">
                            <Users className="inline w-4 h-4 mr-2" />
                            // DEPARTMENT ({departments.length})
                        </label>
                        <div className="relative">
                            <select
                                value={selectedDepartment}
                                onChange={(e) => setSelectedDepartment(e.target.value)}
                                className="w-full px-4 py-3 bg-[#0B0B10] border border-[#334155] text-white font-['JetBrains_Mono',monospace] text-sm focus:outline-none focus:border-white appearance-none cursor-pointer"
                                disabled={departments.length === 0}
                            >
                                {departments.map(dept => (
                                    <option key={dept.acronym} value={dept.acronym}>
                                        {dept.acronym} - {dept.name} ({dept.staffCount} staff)
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8] pointer-events-none" />
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
                                <div className="mb-6 bg-[#1A1A1F] border border-[#334155] p-4 print:hidden">
                                    <label className="block text-xs font-bold text-white font-['Orbitron',sans-serif] uppercase tracking-[0.1em] mb-3">
                                        <BarChart3 className="inline w-4 h-4 mr-2" />
                                        // SELECT_YEARS
                                    </label>
                                    <div className="flex gap-3">
                                        {[2023, 2024, 2025].map(year => (
                                            <label key={year} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedYears.includes(year)}
                                                    onChange={() => toggleYear(year)}
                                                    className="w-4 h-4 bg-[#0B0B10] border-[#334155] text-white focus:ring-0"
                                                />
                                                <span className="text-white font-['JetBrains_Mono',monospace] font-medium text-sm">{year}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {selectedYears.length === 0 && (
                                        <p className="mt-2 text-xs text-[#F59E0B] font-['JetBrains_Mono',monospace]">[ERROR] SELECT_AT_LEAST_ONE_YEAR</p>
                                    )}

                                    {/* Exclude Adjunct Toggle */}
                                    <div className="mt-4 pt-4 border-t border-[#334155] flex items-center gap-3">
                                        <div
                                            onClick={() => setExcludeAdjuncts(!excludeAdjuncts)}
                                            className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${excludeAdjuncts ? 'bg-blue-600' : 'bg-slate-700'}`}
                                        >
                                            <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${excludeAdjuncts ? 'left-6' : 'left-1'}`} />
                                        </div>
                                        <label
                                            onClick={() => setExcludeAdjuncts(!excludeAdjuncts)}
                                            className="text-white font-['JetBrains_Mono',monospace] font-medium text-xs cursor-pointer select-none"
                                        >
                                            EXCLUDE_ADJUNCT_PROFESSOR (DEFAULT: OFF)
                                        </label>
                                    </div>
                                </div>

                                {/* Tabs */}
                                {selectedYears.length > 0 && (
                                    <>
                                        <div className="mb-8 border-b border-[#334155] print:hidden">
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => { setActiveTab('individual'); setShowingSubGroup(false); }}
                                                    className={`px-6 py-3 font-['Orbitron',sans-serif] font-bold text-xs uppercase tracking-[0.1em] transition-all ${activeTab === 'individual' && !showingSubGroup
                                                        ? 'text-white border-b-2 border-white'
                                                        : 'text-[#64748B] hover:text-[#94A3B8]'
                                                        }`}
                                                >
                                                    INDIVIDUAL_STAFF
                                                </button>
                                                {showingSubGroup && (
                                                    <button
                                                        onClick={() => setActiveTab('individual')}
                                                        className={`px-6 py-3 font-['Orbitron',sans-serif] font-bold text-xs uppercase tracking-[0.1em] transition-all ${showingSubGroup
                                                            ? 'text-white border-b-2 border-white'
                                                            : 'text-[#64748B] hover:text-[#94A3B8]'
                                                            }`}
                                                    >
                                                        <Users className="inline w-4 h-4 mr-2" />
                                                        SUB-GROUP ({selectedStaffIds.length})
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setActiveTab('department')}
                                                    className={`px-6 py-3 font-['Orbitron',sans-serif] font-bold text-xs uppercase tracking-[0.1em] transition-all ${activeTab === 'department'
                                                        ? 'text-white border-b-2 border-white'
                                                        : 'text-[#64748B] hover:text-[#94A3B8]'
                                                        }`}
                                                >
                                                    DEPARTMENT_OVERVIEW
                                                </button>
                                                <button
                                                    onClick={() => setActiveTab('faculty')}
                                                    className={`px-6 py-3 font-['Orbitron',sans-serif] font-bold text-xs uppercase tracking-[0.1em] transition-all ${activeTab === 'faculty'
                                                        ? 'text-white border-b-2 border-white'
                                                        : 'text-[#64748B] hover:text-[#94A3B8]'
                                                        }`}
                                                >
                                                    FACULTY_OVERVIEW
                                                </button>
                                                <button
                                                    onClick={() => setActiveTab('export')}
                                                    className={`px-6 py-3 font-['Orbitron',sans-serif] font-bold text-xs uppercase tracking-[0.1em] transition-all ${activeTab === 'export'
                                                        ? 'text-white border-b-2 border-white'
                                                        : 'text-[#64748B] hover:text-[#94A3B8]'
                                                        }`}
                                                >
                                                    <Download className="inline w-4 h-4 mr-2" />
                                                    EXPORT_PUBLICATIONS
                                                </button>
                                            </div>
                                        </div>

                                        {/* Tab Content */}
                                        {activeTab === 'individual' && (
                                            <>
                                                {/* Column Selection for Individual Staff */}
                                                <div className="mb-6 bg-[#1A1A1F] border border-[#334155] p-4 print:hidden">
                                                    <label className="block text-xs font-bold text-white font-['Orbitron',sans-serif] uppercase tracking-[0.1em] mb-3">
                                                        <Users className="inline w-4 h-4 mr-2" />
                                                        // SELECT_COLUMNS
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
                                                                className="w-4 h-4 bg-[#0B0B10] border-[#334155] text-white focus:ring-0"
                                                            />
                                                            <span className="text-sm text-[#94A3B8] font-['JetBrains_Mono',monospace]">Scopus ID</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer group">
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
                                                            <span className="text-sm text-gray-300">H-Index (Lifetime)</span>
                                                            <span className="relative group/tooltip">
                                                                <span className="text-xs text-gray-500 cursor-help">ⓘ</span>
                                                                <span className="invisible group-hover/tooltip:visible absolute left-0 top-6 w-48 bg-slate-800 text-xs text-gray-300 p-2 rounded border border-slate-600 shadow-lg z-10">
                                                                    Lifetime metric - not affected by year selection
                                                                </span>
                                                            </span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer group">
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
                                                            <span className="text-sm text-gray-300">Citations (Lifetime)</span>
                                                            <span className="relative group/tooltip">
                                                                <span className="text-xs text-gray-500 cursor-help">ⓘ</span>
                                                                <span className="invisible group-hover/tooltip:visible absolute left-0 top-6 w-48 bg-slate-800 text-xs text-gray-300 p-2 rounded border border-slate-600 shadow-lg z-10">
                                                                    Lifetime metric - not affected by year selection
                                                                </span>
                                                            </span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer group">
                                                            <input
                                                                type="checkbox"
                                                                checked={visibleColumns.includes('lifetimePublications')}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setVisibleColumns([...visibleColumns, 'lifetimePublications']);
                                                                    } else {
                                                                        setVisibleColumns(visibleColumns.filter(c => c !== 'lifetimePublications'));
                                                                    }
                                                                }}
                                                                className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                                                            />
                                                            <span className="text-sm text-gray-300">Total Publications (Lifetime)</span>
                                                            <span className="relative group/tooltip">
                                                                <span className="text-xs text-gray-500 cursor-help">ⓘ</span>
                                                                <span className="invisible group-hover/tooltip:visible absolute left-0 top-6 w-48 bg-slate-800 text-xs text-gray-300 p-2 rounded border border-slate-600 shadow-lg z-10">
                                                                    Lifetime metric - not affected by year selection
                                                                </span>
                                                            </span>
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

                                                {showingSubGroup ? (
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-lg">
                                                            <div className="flex items-center gap-3">
                                                                <div className="bg-emerald-500/20 p-2 rounded-full">
                                                                    <Users className="w-5 h-5 text-emerald-400" />
                                                                </div>
                                                                <div>
                                                                    <h3 className="text-lg font-semibold text-emerald-100">Custom Sub-group Analysis</h3>
                                                                    <p className="text-emerald-400/80 text-sm">Analyzing {selectedStaffIds.length} selected staff members</p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => setShowingSubGroup(false)}
                                                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm"
                                                            >
                                                                Exit Sub-group View
                                                            </button>
                                                        </div>

                                                        <DepartmentOverviewTab
                                                            staffMembers={staffMembers.filter(s => selectedStaffIds.includes(s.email))}
                                                            departments={[]}
                                                            selectedYears={selectedYears}
                                                            excludeAdjuncts={excludeAdjuncts}
                                                            departmentName={`Custom Sub-group (${selectedStaffIds.length} staff)`}
                                                            departmentAcronym="SUB-GROUP"
                                                        />
                                                    </div>
                                                ) : (
                                                    <IndividualStaffTab
                                                        staffMembers={staffMembers}
                                                        selectedYears={selectedYears}
                                                        loading={loading}
                                                        departmentName={departments.find(d => d.acronym === selectedDepartment)?.name || selectedDepartment}
                                                        visibleColumns={visibleColumns}
                                                        selectedStaffIds={selectedStaffIds}
                                                        onSelectStaff={setSelectedStaffIds}
                                                        onAnalyzeSubGroup={() => setShowingSubGroup(true)}
                                                        excludeAdjuncts={excludeAdjuncts}
                                                    />
                                                )}
                                            </>
                                        )}

                                        {activeTab === 'department' && calculateStats && (
                                            <DepartmentOverviewTab
                                                staffMembers={staffMembers}
                                                departments={departments}
                                                selectedYears={selectedYears}
                                                departmentName={departments.find(d => d.acronym === selectedDepartment)?.name || ''}
                                                departmentAcronym={selectedDepartment}
                                                excludeAdjuncts={excludeAdjuncts}
                                            />
                                        )}

                                        {activeTab === 'faculty' && (
                                            <FacultyOverviewTab
                                                facultyName={FACULTY_FULL_NAMES[selectedFaculty] || selectedFaculty}
                                                facultyAcronym={selectedFaculty}
                                                departments={departments}
                                                selectedYears={selectedYears}
                                                excludeAdjuncts={excludeAdjuncts}
                                            />
                                        )}

                                        {activeTab === 'export' && (
                                            <ExportPublicationsTab
                                                selectedFaculty={selectedFaculty}
                                                selectedDepartment={selectedDepartment}
                                                selectedYears={selectedYears}
                                                staffMembers={staffMembers}
                                                excludeAdjuncts={excludeAdjuncts}
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
function IndividualStaffTab({
    staffMembers,
    selectedYears,
    loading,
    departmentName,
    visibleColumns,
    selectedStaffIds = [],
    onSelectStaff,
    onAnalyzeSubGroup,
    excludeAdjuncts
}: {
    staffMembers: StaffMember[];
    selectedYears: number[];
    loading: boolean;
    departmentName: string;
    visibleColumns: string[];
    selectedStaffIds?: string[];
    onSelectStaff?: (ids: string[]) => void;
    onAnalyzeSubGroup?: () => void;
    excludeAdjuncts?: boolean;
}) {
    // Filter staff based on excludeAdjuncts prop
    const filteredStaffMembers = useMemo(() => {
        if (!excludeAdjuncts) return staffMembers;
        return staffMembers.filter(s => !(s.designation && s.designation.toLowerCase().includes('adjunct')));
    }, [staffMembers, excludeAdjuncts]);

    // Hooks must be called before any conditional returns
    const [sortColumn, setSortColumn] = useState<'name' | 'hIndex' | 'citations' | 'lifetimePublications' | 'publications'>('publications');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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

    const handleSort = (column: typeof sortColumn) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('desc');
        }
    };

    const staffWithPublications = filteredStaffMembers.map(staff => {
        const yearPublications = staff.publications
            .filter(p => selectedYears.includes(p.year))
            .reduce((sum, p) => sum + p.count, 0);

        return {
            ...staff,
            yearPublications
        };
    }).sort((a, b) => {
        let aVal: any, bVal: any;

        switch (sortColumn) {
            case 'name':
                aVal = a.name.toLowerCase();
                bVal = b.name.toLowerCase();
                return sortDirection === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            case 'hIndex':
                aVal = a.hIndex || 0;
                bVal = b.hIndex || 0;
                break;
            case 'citations':
                aVal = a.citationCount || 0;
                bVal = b.citationCount || 0;
                break;
            case 'lifetimePublications':
                aVal = a.lifetimePublications || 0;
                bVal = b.lifetimePublications || 0;
                break;
            case 'publications':
            default:
                aVal = a.yearPublications;
                bVal = b.yearPublications;
                break;
        }

        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // Selection handlers
    const toggleSelection = (email: string) => {
        if (!onSelectStaff) return;
        if (selectedStaffIds.includes(email)) {
            onSelectStaff(selectedStaffIds.filter(id => id !== email));
        } else {
            onSelectStaff([...selectedStaffIds, email]);
        }
    };

    const toggleSelectAll = () => {
        if (!onSelectStaff) return;
        if (selectedStaffIds.length === staffWithPublications.length) {
            onSelectStaff([]);
        } else {
            onSelectStaff(staffWithPublications.map(s => s.email));
        }
    };

    const handleExportCSV = (onlySelected: boolean = false) => {
        // Filter staff if exporting only selected
        const staffToExport = onlySelected
            ? staffWithPublications.filter(s => selectedStaffIds.includes(s.email))
            : staffWithPublications;

        // Build CSV headers based on visible columns
        const headers = ['Name', 'Email'];
        if (visibleColumns.includes('scopusId')) headers.push('Scopus ID');
        if (visibleColumns.includes('hIndex')) headers.push('H-Index (Lifetime)');
        if (visibleColumns.includes('citations')) headers.push('Citations (Lifetime)');
        if (visibleColumns.includes('lifetimePublications')) headers.push('Total Publications (Lifetime)');
        if (visibleColumns.includes('publications')) headers.push(`"Publications (${selectedYears.join(', ')})"`);

        // Build CSV rows based on visible columns
        const rows = staffToExport.map(staff => {
            // Sanitize name: Remove 'Â' artifacts and replace non-breaking spaces
            const cleanName = staff.name.replace(/Â/g, '').replace(/\u00A0/g, ' ').trim();
            const row = [`"${cleanName}"`, staff.email];

            if (visibleColumns.includes('scopusId')) {
                row.push(staff.scopusAuthorId !== 'NA' ? staff.scopusAuthorId : '-');
            }
            if (visibleColumns.includes('hIndex')) {
                row.push(staff.hIndex !== undefined ? staff.hIndex.toString() : '-');
            }
            if (visibleColumns.includes('citations')) {
                row.push(staff.citationCount !== undefined ? staff.citationCount.toString() : '-');
            }
            if (visibleColumns.includes('lifetimePublications')) {
                row.push(staff.lifetimePublications !== undefined ? staff.lifetimePublications.toString() : '-');
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
            const prefix = onlySelected ? 'subgroup' : departmentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            link.setAttribute('download', `${prefix}_publications_${selectedYears.join('-')}.csv`);
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
                    <div className="flex gap-2">
                        {selectedStaffIds.length > 0 && onSelectStaff && onAnalyzeSubGroup && (
                            <div className="flex items-center gap-2 mr-4 bg-emerald-900/30 px-3 py-1 rounded-lg border border-emerald-500/30 animate-in fade-in slide-in-from-right-4">
                                <span className="text-emerald-400 text-sm font-medium">{selectedStaffIds.length} Selected</span>
                                <div className="h-4 w-px bg-emerald-700/50 mx-1"></div>
                                <button
                                    onClick={onAnalyzeSubGroup}
                                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded transition-colors flex items-center gap-1"
                                >
                                    <BarChart3 className="w-3 h-3" /> Analyze
                                </button>
                                <button
                                    onClick={() => handleExportCSV(true)}
                                    className="text-xs bg-emerald-800 hover:bg-emerald-700 text-emerald-100 px-2 py-1 rounded transition-colors flex items-center gap-1"
                                >
                                    <Download className="w-3 h-3" /> CSV
                                </button>
                            </div>
                        )}
                        <button
                            onClick={() => handleExportCSV(false)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors print:hidden"
                        >
                            <Download className="w-4 h-4" /> Export All CSV
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                {onSelectStaff && (
                                    <th className="py-3 px-4 text-left w-10">
                                        <div
                                            onClick={toggleSelectAll}
                                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${selectedStaffIds.length > 0 && selectedStaffIds.length === staffWithPublications.length
                                                ? 'bg-blue-500 border-blue-500'
                                                : selectedStaffIds.length > 0
                                                    ? 'bg-blue-500 border-blue-500'
                                                    : 'border-slate-600 hover:border-slate-400'
                                                }`}
                                        >
                                            {selectedStaffIds.length > 0 && selectedStaffIds.length === staffWithPublications.length && (
                                                <Check className="w-3 h-3 text-white" />
                                            )}
                                            {selectedStaffIds.length > 0 && selectedStaffIds.length < staffWithPublications.length && (
                                                <div className="w-2 h-0.5 bg-white rounded-full" />
                                            )}
                                        </div>
                                    </th>
                                )}
                                <th
                                    className="text-left py-3 px-4 text-sm font-semibold text-gray-300 cursor-pointer hover:text-white transition-colors select-none"
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center gap-1">
                                        Name
                                        {sortColumn === 'name' && (
                                            sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                        )}
                                    </div>
                                </th>
                                {visibleColumns.includes('scopusId') && (
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Scopus ID</th>
                                )}
                                {visibleColumns.includes('hIndex') && (
                                    <th
                                        className="text-right py-3 px-4 text-sm font-semibold text-gray-300 bg-slate-800/30 cursor-pointer hover:text-white transition-colors select-none"
                                        onClick={() => handleSort('hIndex')}
                                    >
                                        <span className="inline-flex items-center gap-1 justify-end">
                                            H-Index (Lifetime)
                                            {sortColumn === 'hIndex' && (
                                                sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                            )}
                                            <span className="relative group/tooltip">
                                                <span className="text-xs text-gray-500 cursor-help">ⓘ</span>
                                                <span className="invisible group-hover/tooltip:visible absolute left-0 top-6 w-48 bg-slate-800 text-xs text-gray-300 p-2 rounded border border-slate-600 shadow-lg z-10">
                                                    Lifetime metric - not affected by year selection
                                                </span>
                                            </span>
                                        </span>
                                    </th>
                                )}
                                {visibleColumns.includes('citations') && (
                                    <th
                                        className="text-right py-3 px-4 text-sm font-semibold text-gray-300 bg-slate-800/30 cursor-pointer hover:text-white transition-colors select-none"
                                        onClick={() => handleSort('citations')}
                                    >
                                        <span className="inline-flex items-center gap-1 justify-end">
                                            Citations (Lifetime)
                                            {sortColumn === 'citations' && (
                                                sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                            )}
                                            <span className="relative group/tooltip">
                                                <span className="text-xs text-gray-500 cursor-help">ⓘ</span>
                                                <span className="invisible group-hover/tooltip:visible absolute left-0 top-6 w-48 bg-slate-800 text-xs text-gray-300 p-2 rounded border border-slate-600 shadow-lg z-10">
                                                    Lifetime metric - not affected by year selection
                                                </span>
                                            </span>
                                        </span>
                                    </th>
                                )}
                                {visibleColumns.includes('lifetimePublications') && (
                                    <th
                                        className="text-right py-3 px-4 text-sm font-semibold text-gray-300 bg-slate-800/30 cursor-pointer hover:text-white transition-colors select-none"
                                        onClick={() => handleSort('lifetimePublications')}
                                    >
                                        <span className="inline-flex items-center gap-1 justify-end">
                                            Total Publications (Lifetime)
                                            {sortColumn === 'lifetimePublications' && (
                                                sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                            )}
                                            <span className="relative group/tooltip">
                                                <span className="text-xs text-gray-500 cursor-help">ⓘ</span>
                                                <span className="invisible group-hover/tooltip:visible absolute left-0 top-6 w-48 bg-slate-800 text-xs text-gray-300 p-2 rounded border border-slate-600 shadow-lg z-10">
                                                    Lifetime metric - not affected by year selection
                                                </span>
                                            </span>
                                        </span>
                                    </th>
                                )}
                                {visibleColumns.includes('publications') && (
                                    <th
                                        className="text-right py-3 px-4 text-sm font-semibold text-gray-300 cursor-pointer hover:text-white transition-colors select-none"
                                        onClick={() => handleSort('publications')}
                                    >
                                        <div className="flex items-center gap-1 justify-end">
                                            Publications ({selectedYears.join(', ')})
                                            {sortColumn === 'publications' && (
                                                sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                            )}
                                        </div>
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {staffWithPublications.map((staff, idx) => {
                                const isSelected = selectedStaffIds.includes(staff.email);
                                return (
                                    <tr key={idx}
                                        onClick={() => onSelectStaff && toggleSelection(staff.email)}
                                        className={`border-b transition-all group ${onSelectStaff ? 'cursor-pointer' : ''
                                            } ${isSelected
                                                ? 'bg-blue-500/10 border-blue-500/30'
                                                : 'border-white/5 hover:bg-white/5'
                                            }`}
                                    >
                                        {onSelectStaff && (
                                            <td className="py-3 px-4">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                                                    ? 'bg-blue-500 border-blue-500'
                                                    : 'border-slate-600 group-hover:border-slate-400'
                                                    }`}>
                                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                            </td>
                                        )}
                                        <td className="py-3 px-4 text-sm">
                                            <span className={`font-medium transition-colors ${isSelected ? 'text-blue-300' : 'text-white'}`}>
                                                {staff.name}
                                            </span>
                                        </td>
                                        {visibleColumns.includes('scopusId') && (
                                            <td className="py-3 px-4 text-sm text-gray-400 font-mono">
                                                {staff.scopusAuthorId !== 'NA' ? staff.scopusAuthorId : '-'}
                                            </td>
                                        )}
                                        {visibleColumns.includes('hIndex') && (
                                            <td className="py-3 px-4 text-sm text-gray-300 text-right font-mono bg-slate-800/20">
                                                {staff.hIndex ?? '-'}
                                            </td>
                                        )}
                                        {visibleColumns.includes('citations') && (
                                            <td className="py-3 px-4 text-sm text-gray-300 text-right font-mono bg-slate-800/20">
                                                {staff.citationCount !== undefined ? staff.citationCount.toLocaleString() : '-'}
                                            </td>
                                        )}
                                        {visibleColumns.includes('lifetimePublications') && (
                                            <td className="py-3 px-4 text-sm text-gray-300 text-right font-mono bg-slate-800/20">
                                                {staff.lifetimePublications !== undefined ? staff.lifetimePublications.toLocaleString() : '-'}
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
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Department Overview Tab Component
function DepartmentOverviewTab({ staffMembers, departments, selectedYears, departmentName, departmentAcronym, excludeAdjuncts }: {
    staffMembers: StaffMember[];
    departments: DepartmentData[];
    selectedYears: number[];
    departmentName: string;
    departmentAcronym: string;
    excludeAdjuncts?: boolean;
}) {
    // Filter staff based on excludeAdjuncts prop (local filter for this tab)
    const filteredStaffMembers = useMemo(() => {
        if (!excludeAdjuncts) return staffMembers;
        return staffMembers.filter(s => !(s.designation && s.designation.toLowerCase().includes('adjunct')));
    }, [staffMembers, excludeAdjuncts]);

    // Calculate stats
    const publicationsByYear = selectedYears.map(year => {
        // Filter valid staff first
        const validStaff = filteredStaffMembers.filter(s => s.scopusAuthorId && s.scopusAuthorId !== 'NA');
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

    const totalPublications = filteredStaffMembers.reduce((sum, staff) => {
        return sum + (staff.publications
            ?.filter(p => selectedYears.includes(p.year))
            .reduce((s, p) => s + p.count, 0) || 0);
    }, 0);

    const staffWithScopusCount = filteredStaffMembers.filter(staff =>
        staff.scopusAuthorId && staff.scopusAuthorId !== 'NA'
    ).length;

    const averagePerStaff = staffWithScopusCount > 0 && selectedYears.length > 0
        ? (totalPublications / staffWithScopusCount / selectedYears.length).toFixed(2)
        : '0.00';

    // Calculate standard deviation of publications across staff with valid Scopus IDs
    const staffPublications = filteredStaffMembers
        .filter(staff => staff.scopusAuthorId && staff.scopusAuthorId !== 'NA')
        .map(staff => {
            return staff.publications
                ?.filter(p => selectedYears.includes(p.year))
                .reduce((s, p) => s + p.count, 0) || 0;
        });



    // NEW METRICS for Phase 1
    // Average H-Index
    const staffWithHIndex = filteredStaffMembers.filter(s => s.hIndex !== undefined && s.hIndex > 0);
    const averageHIndex = staffWithHIndex.length > 0
        ? (staffWithHIndex.reduce((sum, s) => sum + (s.hIndex || 0), 0) / staffWithHIndex.length).toFixed(2)
        : '0.00';

    // Total Citations (for selected years - using lifetime as proxy since we don't have year-specific citations)
    const totalCitations = filteredStaffMembers.reduce((sum, s) => sum + (s.citationCount || 0), 0);

    // Top H-Index staff
    const topHIndexStaff = filteredStaffMembers.reduce((top, staff) => {
        if (!staff.hIndex) return top;
        if (!top || (staff.hIndex > (top.hIndex || 0))) return staff;
        return top;
    }, null as StaffMember | null);

    // Total Lifetime Publications
    const totalLifetimePublications = filteredStaffMembers.reduce((sum, s) => sum + (s.lifetimePublications || 0), 0);

    // Average Lifetime Publications per Staff
    const averageLifetimePerStaff = staffWithScopusCount > 0
        ? (totalLifetimePublications / staffWithScopusCount).toFixed(2)
        : '0.00';

    // Publication Spread (std dev of lifetime publications)
    const staffWithScopus = filteredStaffMembers.filter(s => s.scopusAuthorId && s.scopusAuthorId !== 'NA');
    const lifetimePubCounts = staffWithScopus.map(s => s.lifetimePublications || 0);
    const publicationSpread = staffWithScopus.length > 1 ? (() => {
        const mean = lifetimePubCounts.reduce((sum, val) => sum + val, 0) / staffWithScopus.length;
        const squaredDiffs = lifetimePubCounts.map(pub => Math.pow(pub - mean, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / staffWithScopus.length;
        return Math.sqrt(variance).toFixed(2);
    })() : '0.00';

    // Citation metrics
    const citationCounts = staffWithScopus.map(s => s.citationCount || 0);
    const averageCitationsPerStaff = staffWithScopus.length > 0
        ? (citationCounts.reduce((sum, val) => sum + val, 0) / staffWithScopus.length).toFixed(2)
        : '0.00';
    const citationSpread = staffWithScopus.length > 1 ? (() => {
        const mean = citationCounts.reduce((sum, val) => sum + val, 0) / staffWithScopus.length;
        const squaredDiffs = citationCounts.map(c => Math.pow(c - mean, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / staffWithScopus.length;
        return Math.sqrt(variance).toFixed(2);
    })() : '0.00';

    // H-Index Spread
    const hIndexValues = staffWithScopus
        .filter(s => s.hIndex !== undefined && s.hIndex > 0)
        .map(s => s.hIndex || 0);
    const hIndexSpread = hIndexValues.length > 1 ? (() => {
        const mean = hIndexValues.reduce((sum, val) => sum + val, 0) / hIndexValues.length;
        const squaredDiffs = hIndexValues.map(h => Math.pow(h - mean, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / hIndexValues.length;
        return Math.sqrt(variance).toFixed(2);
    })() : '0.00';

    // Top Performers
    const topPublicationPerformer = staffWithScopus.reduce((top, staff) => {
        if (!top || (staff.lifetimePublications || 0) > (top.lifetimePublications || 0)) return staff;
        return top;
    }, null as StaffMember | null);

    const topCitationPerformer = staffWithScopus.reduce((top, staff) => {
        if (!top || (staff.citationCount || 0) > (top.citationCount || 0)) return staff;
        return top;
    }, null as StaffMember | null);

    const topHIndexPerformer = staffWithScopus.reduce((top, staff) => {
        if (!staff.hIndex) return top;
        if (!top || (staff.hIndex > (top.hIndex || 0))) return staff;
        return top;
    }, null as StaffMember | null);


    // State for visible metrics
    const [visibleMetrics, setVisibleMetrics] = useState({
        // Publications
        lifetimePublications: false,
        avgLifetimePerStaff: false,
        publicationSpread: false,
        topPublicationPerformer: false,
        // Citations
        citations: false,
        avgCitationsPerStaff: false,
        citationSpread: false,
        topCitationPerformer: false,
        // H-Index
        hIndex: false,
        hIndexSpread: false,
        topHIndexPerformer: false
    });

    // State for chart metric selection
    const [chartMetric, setChartMetric] = useState<'publications' | 'avgPublications' | 'combinedPublications' | 'citations' | 'hIndex' | 'lifetimePubs' | 'avgLifetimePubs'>('publications');

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

            {/* Department Header Bar */}
            <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-gray-500 mb-1 print:text-gray-600">Department Overview</div>
                        <h2 className="text-3xl font-bold text-white print:text-black">{departmentName}</h2>
                        <div className="flex items-center gap-4 mt-2">
                            <span className="text-sm font-mono text-cyan-400 print:text-cyan-700">{departmentAcronym}</span>
                            <span className="text-sm text-gray-400 print:text-gray-600">•</span>
                            <span className="text-sm text-gray-400 print:text-gray-600">Reporting Period: {selectedYears.join(', ')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metric Visibility Controls */}
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-lg border border-white/10 p-4 print:hidden">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-3">Optional Metrics</div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Publications Section */}
                    <div>
                        <div className="text-xs font-semibold text-gray-400 mb-2 border-b border-gray-700 pb-1">📊 Publications</div>
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    checked={visibleMetrics.lifetimePublications}
                                    onChange={(e) => setVisibleMetrics({ ...visibleMetrics, lifetimePublications: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600"
                                />
                                Total Lifetime Publications
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    checked={visibleMetrics.avgLifetimePerStaff}
                                    onChange={(e) => setVisibleMetrics({ ...visibleMetrics, avgLifetimePerStaff: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600"
                                />
                                Avg Lifetime Publications
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    checked={visibleMetrics.publicationSpread}
                                    onChange={(e) => setVisibleMetrics({ ...visibleMetrics, publicationSpread: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600"
                                />
                                Publication Spread
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    checked={visibleMetrics.topPublicationPerformer}
                                    onChange={(e) => setVisibleMetrics({ ...visibleMetrics, topPublicationPerformer: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600"
                                />
                                Top Publication Performer
                            </label>
                        </div>
                    </div>

                    {/* Citations Section */}
                    <div>
                        <div className="text-xs font-semibold text-gray-400 mb-2 border-b border-gray-700 pb-1">📚 Citations</div>
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    checked={visibleMetrics.citations}
                                    onChange={(e) => setVisibleMetrics({ ...visibleMetrics, citations: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600"
                                />
                                Total Citations
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    checked={visibleMetrics.avgCitationsPerStaff}
                                    onChange={(e) => setVisibleMetrics({ ...visibleMetrics, avgCitationsPerStaff: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600"
                                />
                                Avg Citations
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    checked={visibleMetrics.citationSpread}
                                    onChange={(e) => setVisibleMetrics({ ...visibleMetrics, citationSpread: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600"
                                />
                                Citation Spread
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    checked={visibleMetrics.topCitationPerformer}
                                    onChange={(e) => setVisibleMetrics({ ...visibleMetrics, topCitationPerformer: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600"
                                />
                                Top Citation Performer
                            </label>
                        </div>
                    </div>

                    {/* H-Index Section */}
                    <div>
                        <div className="text-xs font-semibold text-gray-400 mb-2 border-b border-gray-700 pb-1">🎯 H-Index</div>
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    checked={visibleMetrics.hIndex}
                                    onChange={(e) => setVisibleMetrics({ ...visibleMetrics, hIndex: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600"
                                />
                                Avg H-Index
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    checked={visibleMetrics.hIndexSpread}
                                    onChange={(e) => setVisibleMetrics({ ...visibleMetrics, hIndexSpread: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600"
                                />
                                H-Index Spread
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    checked={visibleMetrics.topHIndexPerformer}
                                    onChange={(e) => setVisibleMetrics({ ...visibleMetrics, topHIndexPerformer: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600"
                                />
                                Top H-Index Performer
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Default Metrics (Always Visible) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300">
                    <div className="text-sm text-gray-400 mb-2 print:text-gray-600">Total Academic Staff</div>
                    <div className="text-4xl font-bold text-white print:text-black print:text-2xl">{staffMembers.length}</div>
                    <div className="text-xs text-gray-500 mt-1 print:text-gray-600">{staffWithScopusCount} with Scopus profiles</div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300">
                    <div className="text-sm text-gray-400 mb-2 print:text-gray-600">Total Publications ({selectedYears.join(', ')})</div>
                    <div className="text-4xl font-bold text-blue-400 print:text-blue-700 print:text-2xl">{totalPublications}</div>
                    <div className="text-xs text-gray-500 mt-1 print:text-gray-600">Recent 3-year output</div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300">
                    <div className="text-sm text-gray-400 mb-2 print:text-gray-600">Avg Publications per Staff ({selectedYears.join(', ')})</div>
                    <div className="text-4xl font-bold text-purple-400 print:text-purple-700 print:text-2xl">{averagePerStaff}</div>
                    <div className="text-xs text-gray-500 mt-1 print:text-gray-600">Per researcher with Scopus</div>
                </div>
            </div>

            {/* Optional Metrics (Conditionally Visible) */}
            {(visibleMetrics.lifetimePublications || visibleMetrics.avgLifetimePerStaff || visibleMetrics.publicationSpread || visibleMetrics.topPublicationPerformer ||
                visibleMetrics.citations || visibleMetrics.avgCitationsPerStaff || visibleMetrics.citationSpread || visibleMetrics.topCitationPerformer ||
                visibleMetrics.hIndex || visibleMetrics.hIndexSpread || visibleMetrics.topHIndexPerformer) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {visibleMetrics.lifetimePublications && (
                            <div className="bg-gradient-to-br from-cyan-900/40 to-cyan-800/40 backdrop-blur-xl rounded-lg border border-cyan-500/30 p-6 shadow-[0_0_15px_rgba(6,182,212,0.15)] print:bg-white print:border print:border-gray-300">
                                <div className="text-sm text-cyan-300 mb-2 print:text-gray-600">Total Lifetime Publications</div>
                                <div className="text-4xl font-bold text-cyan-100 print:text-black print:text-2xl">{totalLifetimePublications.toLocaleString()}</div>
                                <div className="text-xs text-cyan-400 mt-1 print:text-gray-600">All staff combined</div>
                            </div>
                        )}

                        {visibleMetrics.avgLifetimePerStaff && (
                            <div className="bg-gradient-to-br from-cyan-900/40 to-cyan-800/40 backdrop-blur-xl rounded-lg border border-cyan-500/30 p-6 shadow-[0_0_15px_rgba(6,182,212,0.15)] print:bg-white print:border print:border-gray-300">
                                <div className="text-sm text-cyan-300 mb-2 print:text-gray-600">Avg Lifetime Publications</div>
                                <div className="text-4xl font-bold text-cyan-100 print:text-black print:text-2xl">{averageLifetimePerStaff}</div>
                                <div className="text-xs text-cyan-400 mt-1 print:text-gray-600">Per researcher with Scopus</div>
                            </div>
                        )}

                        {visibleMetrics.publicationSpread && (
                            <div className="bg-gradient-to-br from-cyan-900/40 to-cyan-800/40 backdrop-blur-xl rounded-lg border border-cyan-500/30 p-6 shadow-[0_0_15px_rgba(6,182,212,0.15)] print:bg-white print:border print:border-gray-300">
                                <div className="text-sm text-cyan-300 mb-2 print:text-gray-600">Publication Spread</div>
                                <div className="text-4xl font-bold text-cyan-100 print:text-black print:text-2xl">{publicationSpread}</div>
                                <div className="text-xs text-cyan-400 mt-1 print:text-gray-600">Std dev of lifetime pubs</div>
                            </div>
                        )}

                        {visibleMetrics.topPublicationPerformer && (
                            <div className="bg-gradient-to-br from-cyan-900/40 to-cyan-800/40 backdrop-blur-xl rounded-lg border border-cyan-500/30 p-6 shadow-[0_0_15px_rgba(6,182,212,0.15)] print:bg-white print:border print:border-gray-300">
                                <div className="text-sm text-cyan-300 mb-2 print:text-gray-600">Top Publication Performer</div>
                                <div className="text-3xl font-bold text-cyan-100 print:text-black print:text-xl">
                                    {topPublicationPerformer ? topPublicationPerformer.lifetimePublications : '-'}
                                </div>
                                <div className="text-sm text-cyan-200 mt-1 truncate print:text-gray-700 font-medium">
                                    {topPublicationPerformer ? topPublicationPerformer.name : 'N/A'}
                                </div>
                            </div>
                        )}

                        {visibleMetrics.citations && (
                            <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/40 backdrop-blur-xl rounded-lg border border-emerald-500/30 p-6 shadow-[0_0_15px_rgba(16,185,129,0.15)] print:bg-white print:border print:border-gray-300">
                                <div className="text-sm text-emerald-300 mb-2 print:text-gray-600">Total Citations</div>
                                <div className="text-4xl font-bold text-emerald-100 print:text-black print:text-2xl">{totalCitations.toLocaleString()}</div>
                                <div className="text-xs text-emerald-400 mt-1 print:text-gray-600">Lifetime research impact</div>
                            </div>
                        )}

                        {visibleMetrics.avgCitationsPerStaff && (
                            <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/40 backdrop-blur-xl rounded-lg border border-emerald-500/30 p-6 shadow-[0_0_15px_rgba(16,185,129,0.15)] print:bg-white print:border print:border-gray-300">
                                <div className="text-sm text-emerald-300 mb-2 print:text-gray-600">Avg Citations</div>
                                <div className="text-4xl font-bold text-emerald-100 print:text-black print:text-2xl">{averageCitationsPerStaff}</div>
                                <div className="text-xs text-emerald-400 mt-1 print:text-gray-600">Per researcher with Scopus</div>
                            </div>
                        )}

                        {visibleMetrics.citationSpread && (
                            <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/40 backdrop-blur-xl rounded-lg border border-emerald-500/30 p-6 shadow-[0_0_15px_rgba(16,185,129,0.15)] print:bg-white print:border print:border-gray-300">
                                <div className="text-sm text-emerald-300 mb-2 print:text-gray-600">Citation Spread</div>
                                <div className="text-4xl font-bold text-emerald-100 print:text-black print:text-2xl">{citationSpread}</div>
                                <div className="text-xs text-emerald-400 mt-1 print:text-gray-600">Std dev of citations</div>
                            </div>
                        )}

                        {visibleMetrics.topCitationPerformer && (
                            <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/40 backdrop-blur-xl rounded-lg border border-emerald-500/30 p-6 shadow-[0_0_15px_rgba(16,185,129,0.15)] print:bg-white print:border print:border-gray-300">
                                <div className="text-sm text-emerald-300 mb-2 print:text-gray-600">Top Citation Performer</div>
                                <div className="text-3xl font-bold text-emerald-100 print:text-black print:text-xl">
                                    {topCitationPerformer ? topCitationPerformer.citationCount?.toLocaleString() : '-'}
                                </div>
                                <div className="text-sm text-emerald-200 mt-1 truncate print:text-gray-700 font-medium">
                                    {topCitationPerformer ? topCitationPerformer.name : 'N/A'}
                                </div>
                            </div>
                        )}

                        {visibleMetrics.hIndex && (
                            <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 backdrop-blur-xl rounded-lg border border-purple-500/30 p-6 shadow-[0_0_15px_rgba(168,85,247,0.15)] print:bg-white print:border print:border-gray-300">
                                <div className="text-sm text-purple-300 mb-2 print:text-gray-600">Avg H-Index</div>
                                <div className="text-4xl font-bold text-purple-100 print:text-black print:text-2xl">{averageHIndex}</div>
                                <div className="text-xs text-purple-400 mt-1 print:text-gray-600">Research quality indicator</div>
                            </div>
                        )}

                        {visibleMetrics.hIndexSpread && (
                            <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 backdrop-blur-xl rounded-lg border border-purple-500/30 p-6 shadow-[0_0_15px_rgba(168,85,247,0.15)] print:bg-white print:border print:border-gray-300">
                                <div className="text-sm text-purple-300 mb-2 print:text-gray-600">H-Index Spread</div>
                                <div className="text-4xl font-bold text-purple-100 print:text-black print:text-2xl">{hIndexSpread}</div>
                                <div className="text-xs text-purple-400 mt-1 print:text-gray-600">Std dev of H-Index</div>
                            </div>
                        )}

                        {visibleMetrics.topHIndexPerformer && (
                            <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 backdrop-blur-xl rounded-lg border border-purple-500/30 p-6 shadow-[0_0_15px_rgba(168,85,247,0.15)] print:bg-white print:border print:border-gray-300">
                                <div className="text-sm text-purple-300 mb-2 print:text-gray-600">Top H-Index Performer</div>
                                <div className="text-3xl font-bold text-purple-100 print:text-black print:text-xl">
                                    {topHIndexPerformer ? topHIndexPerformer.hIndex : '-'}
                                </div>
                                <div className="text-sm text-purple-200 mt-1 truncate print:text-gray-700 font-medium">
                                    {topHIndexPerformer ? topHIndexPerformer.name : 'N/A'}
                                </div>
                            </div>
                        )}
                    </div>
                )}

            {/* Comparison Chart */}
            <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300 print:shadow-none">
                <div className="p-6 print:p-4">
                    <div className="flex items-center justify-between mb-6 print:mb-4">
                        <h3 className="text-xl font-bold text-white print:text-black">
                            {chartMetric === 'publications' || chartMetric === 'avgPublications' || chartMetric === 'combinedPublications'
                                ? 'Publications by Year'
                                : chartMetric === 'citations' ? 'Top 20 Staff by Citations (Lifetime)'
                                    : chartMetric === 'hIndex' ? 'Top 20 Staff by H-Index'
                                        : 'Top 20 Staff by Lifetime Publications'}
                        </h3>

                        {/* Chart Metric Selector */}
                        <div className="print:hidden">
                            <select
                                value={chartMetric}
                                onChange={(e) => setChartMetric(e.target.value as any)}
                                className="bg-slate-800 text-white border border-white/20 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="publications">Total Publications (Vol)</option>
                                <option value="avgPublications">Average per Staff (Efficiency)</option>
                                <option value="combinedPublications">Combined (Vol + Efficiency)</option>
                                <option value="lifetimePubs">Total Lifetime Publications</option>
                                <option value="avgLifetimePubs">Avg Lifetime Pubs per Staff</option>
                                <option value="citations">Total Citations (Lifetime)</option>
                                <option value="hIndex">Average H-Index (Lifetime)</option>
                            </select>
                        </div>
                    </div>

                    {['publications', 'avgPublications', 'combinedPublications'].includes(chartMetric) ? (
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
                                            {(chartMetric === 'publications' || chartMetric === 'combinedPublications') && (
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
                                            )}

                                            {/* Average Bar */}
                                            {(chartMetric === 'avgPublications' || chartMetric === 'combinedPublications') && (
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
                                            )}
                                        </div>
                                        <div className="text-sm font-semibold text-gray-300 print:text-gray-700 mt-2">{yearData.year}</div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex items-end gap-2 h-64 print:h-48 w-full px-4 overflow-x-auto pb-2">
                            {(() => {
                                const metricKey = chartMetric === 'citations' ? 'citationCount'
                                    : chartMetric === 'hIndex' ? 'hIndex'
                                        : 'lifetimePublications';

                                const sortedStaff = [...staffMembers]
                                    .filter(s => (s[metricKey as keyof StaffMember] as number) > 0)
                                    .sort((a, b) => ((b[metricKey as keyof StaffMember] as number) || 0) - ((a[metricKey as keyof StaffMember] as number) || 0))
                                    .slice(0, 20);

                                const maxValue = Math.max(...sortedStaff.map(s => (s[metricKey as keyof StaffMember] as number) || 0));

                                return sortedStaff.map((staff, idx) => {
                                    const value = (staff[metricKey as keyof StaffMember] as number) || 0;
                                    const height = maxValue > 0 ? (value / maxValue) * 85 : 0;

                                    let barColorFrom = 'from-cyan-600';
                                    let barColorTo = 'to-cyan-400';
                                    let textColor = 'text-cyan-300';
                                    let printColor = 'print:bg-cyan-600';

                                    if (chartMetric === 'citations') {
                                        barColorFrom = 'from-green-600';
                                        barColorTo = 'to-green-400';
                                        textColor = 'text-green-300';
                                        printColor = 'print:bg-green-600';
                                    } else if (chartMetric === 'hIndex') {
                                        barColorFrom = 'from-purple-600';
                                        barColorTo = 'to-purple-400';
                                        textColor = 'text-purple-300';
                                        printColor = 'print:bg-purple-600';
                                    }

                                    // Get initials or short name for x-axis
                                    const shortName = staff.name.split(' ').slice(0, 2).join(' ').substring(0, 10) + (staff.name.length > 10 ? '..' : '');

                                    return (
                                        <div key={staff.scopusAuthorId || idx} className="flex-1 min-w-[40px] flex flex-col items-center justify-end gap-1 h-full group relative">
                                            {/* Tooltip */}
                                            <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 text-xs bg-black text-white px-2 py-1 rounded transition-opacity whitespace-nowrap z-20 pointer-events-none">
                                                {staff.name}: {value}
                                            </div>

                                            <div className={`text-xs font-bold ${textColor} print:text-black`}>{value}</div>
                                            <div
                                                className={`w-full max-w-[40px] bg-gradient-to-t ${barColorFrom} ${barColorTo} rounded-t transition-all duration-500 ${printColor} hover:brightness-110`}
                                                style={{
                                                    height: `${height}%`,
                                                    minHeight: '4px',
                                                    // @ts-ignore
                                                    printColorAdjust: 'exact',
                                                    WebkitPrintColorAdjust: 'exact'
                                                }}
                                            />
                                            <div className="text-[9px] text-gray-400 print:text-gray-700 mt-1 w-full text-center truncate px-1" title={staff.name}>
                                                {shortName}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    )}

                    {/* Legend */}
                    {['publications', 'avgPublications', 'combinedPublications'].includes(chartMetric) ? (
                        <div className="flex justify-center gap-6 mt-6 border-t border-white/10 pt-4 print:border-gray-300">
                            {(chartMetric === 'publications' || chartMetric === 'combinedPublications') && (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-gradient-to-t from-blue-600 to-blue-400 rounded print:bg-blue-600"></div>
                                    <span className="text-sm text-gray-300 print:text-gray-700">Total Publications</span>
                                </div>
                            )}
                            {(chartMetric === 'avgPublications' || chartMetric === 'combinedPublications') && (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-gradient-to-t from-purple-600 to-purple-400 rounded print:bg-purple-600"></div>
                                    <span className="text-sm text-gray-300 print:text-gray-700">Average per Staff</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex justify-center gap-6 mt-6 border-t border-white/10 pt-4 print:border-gray-300">
                            <div className="text-sm text-gray-400 italic">Showing top 20 staff members ranked by {
                                chartMetric === 'citations' ? 'total citations' :
                                    chartMetric === 'hIndex' ? 'H-Index' : 'lifetime publications'
                            }</div>
                        </div>
                    )}
                </div>
            </div>

            {/* NEW: VISUALIZATIONS */}
            <StaffPerformanceBubbleChart staffMembers={filteredStaffMembers} selectedYears={selectedYears} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StaffDistributionChart staffMembers={filteredStaffMembers} metric="hIndex" title="H-Index Distribution" />
                <StaffDistributionChart staffMembers={filteredStaffMembers} metric="citations" title="Citations Distribution" />
            </div>
        </div>
    );
}

// Faculty Overview Tab Component
function FacultyOverviewTab({ facultyName, facultyAcronym, departments, selectedYears, excludeAdjuncts }: {
    facultyName: string;
    facultyAcronym: string;
    departments: DepartmentData[];
    selectedYears: number[];
    excludeAdjuncts?: boolean;
}) {
    const [departmentStats, setDepartmentStats] = useState<any[]>([]);
    const [publicationsByYear, setPublicationsByYear] = useState<{ year: number, count: number, avg: number }[]>([]);
    const [loading, setLoading] = useState(true);

    // NEW: Faculty-wide metrics state
    const [facultyMetrics, setFacultyMetrics] = useState({
        averageHIndex: '0.00',
        hIndexSpread: '0.00',
        totalCitations: 0,
        averageCitationsPerStaff: '0.00',
        citationSpread: '0.00',
        totalLifetimePublications: 0,
        publicationSpread: '0.00',
        topPublicationPerformer: null as StaffMember | null,
        topCitationPerformer: null as StaffMember | null,
        topHIndexPerformer: null as StaffMember | null
    });

    // State for visible metrics
    const [visibleMetrics, setVisibleMetrics] = useState({
        // Publications
        lifetimePublications: false,
        avgLifetimePerStaff: false,
        publicationSpread: false,
        topPublicationPerformer: false,
        // Citations
        citations: false,
        avgCitationsPerStaff: false,
        citationSpread: false,
        topCitationPerformer: false,
        // H-Index
        hIndex: false,
        hIndexSpread: false,
        topHIndexPerformer: false
    });

    // State for chart metric selection
    const [chartMetric, setChartMetric] = useState<'publications' | 'avgPublications' | 'combinedPublications' | 'citations' | 'hIndex' | 'lifetimePubs' | 'avgLifetimePubs'>('publications');

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

            // NEW: Faculty-wide metric accumulators
            let allStaffMembers: StaffMember[] = [];

            for (const dept of departments) {
                try {
                    const res = await fetch(`/api/scopus-publications/staff?department=${encodeURIComponent(dept.acronym)}`);
                    const data = await res.json();

                    if (data.success && data.staff) {
                        // Filter staff if excludeAdjuncts is active
                        let departmentStaff = data.staff;
                        if (excludeAdjuncts) {
                            departmentStaff = departmentStaff.filter((s: StaffMember) => !(s.designation && s.designation.toLowerCase().includes('adjunct')));
                        }

                        // Count total staff for faculty average
                        totalFacultyStaff += departmentStaff.length;

                        // NEW: Collect all staff for faculty metrics
                        allStaffMembers = allStaffMembers.concat(departmentStaff);

                        const staffWithScopus = departmentStaff.filter((s: StaffMember) => s.scopusAuthorId && s.scopusAuthorId !== 'NA');
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

                        // Calculate per-department metrics
                        const deptTotalLifePubs = departmentStaff.reduce((sum: number, s: any) => sum + (s.lifetimePublications || 0), 0);
                        const deptTotalCitations = departmentStaff.reduce((sum: number, s: any) => sum + (s.citationCount || 0), 0);
                        const deptAvgHIndex = staffWithScopus.length > 0
                            ? (staffWithScopus.reduce((sum: number, s: any) => sum + (s.hIndex || 0), 0) / staffWithScopus.length).toFixed(2)
                            : '0.00';

                        stats.push({
                            name: dept.name,
                            acronym: dept.acronym,
                            totalStaff: departmentStaff.length,
                            staffWithScopus: staffWithScopus.length,
                            totalPublications: totalPubs, // Selected Years
                            // Fixed: Divide by number of years to get average per staff per year
                            averagePerStaff: staffWithScopus.length > 0 && selectedYears.length > 0
                                ? (totalPubs / staffWithScopus.length / selectedYears.length).toFixed(2)
                                : '0.00',
                            // Lifetime/Total Metrics for Comparison
                            totalLifetimePublications: deptTotalLifePubs,
                            averageLifetimePerStaff: staffWithScopus.length > 0 ? (deptTotalLifePubs / staffWithScopus.length).toFixed(2) : '0.00',
                            totalCitations: deptTotalCitations,
                            averageHIndex: deptAvgHIndex
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

            // NEW: Calculate faculty-wide metrics
            const staffWithScopus_Faculty = allStaffMembers.filter(s => s.scopusAuthorId && s.scopusAuthorId !== 'NA');
            const totalFacultyStaffWithScopusVal = staffWithScopus_Faculty.length;

            // H-Index Metrics
            const staffWithHIndex = staffWithScopus_Faculty.filter(s => s.hIndex !== undefined && s.hIndex > 0);
            const avgHIndex = staffWithHIndex.length > 0
                ? (staffWithHIndex.reduce((sum, s) => sum + (s.hIndex || 0), 0) / staffWithHIndex.length).toFixed(2)
                : '0.00';

            const hIndexValues = staffWithHIndex.map(s => s.hIndex || 0);
            const hIndexSpread = hIndexValues.length > 1 ? (() => {
                const mean = hIndexValues.reduce((sum, val) => sum + val, 0) / hIndexValues.length;
                const squaredDiffs = hIndexValues.map(h => Math.pow(h - mean, 2));
                const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / hIndexValues.length;
                return Math.sqrt(variance).toFixed(2);
            })() : '0.00';

            // Citation Metrics
            const totalCites = staffWithScopus_Faculty.reduce((sum, s) => sum + (s.citationCount || 0), 0);
            const avgCitations = totalFacultyStaffWithScopusVal > 0
                ? (totalCites / totalFacultyStaffWithScopusVal).toFixed(2)
                : '0.00';

            const citationCounts = staffWithScopus_Faculty.map(s => s.citationCount || 0);
            const citationSpread = citationCounts.length > 1 ? (() => {
                const mean = citationCounts.reduce((sum, val) => sum + val, 0) / citationCounts.length;
                const squaredDiffs = citationCounts.map(c => Math.pow(c - mean, 2));
                const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / citationCounts.length;
                return Math.sqrt(variance).toFixed(2);
            })() : '0.00';

            // Publication Metrics
            const totalLifePubs = staffWithScopus_Faculty.reduce((sum, s) => sum + (s.lifetimePublications || 0), 0);

            const publicationCounts = staffWithScopus_Faculty.map(s => s.lifetimePublications || 0);
            const publicationSpread = publicationCounts.length > 1 ? (() => {
                const mean = publicationCounts.reduce((sum, val) => sum + val, 0) / publicationCounts.length;
                const squaredDiffs = publicationCounts.map(p => Math.pow(p - mean, 2));
                const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / publicationCounts.length;
                return Math.sqrt(variance).toFixed(2);
            })() : '0.00';

            // Top Performers
            const topHIndexPerformer = staffWithScopus_Faculty.reduce((top, staff) => {
                if (!staff.hIndex) return top;
                if (!top || (staff.hIndex > (top.hIndex || 0))) return staff;
                return top;
            }, null as StaffMember | null);

            const topCitationPerformer = staffWithScopus_Faculty.reduce((top, staff) => {
                if (!top || (staff.citationCount || 0) > (top.citationCount || 0)) return staff;
                return top;
            }, null as StaffMember | null);

            const topPublicationPerformer = staffWithScopus_Faculty.reduce((top, staff) => {
                if (!top || (staff.lifetimePublications || 0) > (top.lifetimePublications || 0)) return staff;
                return top;
            }, null as StaffMember | null);

            setFacultyMetrics({
                averageHIndex: avgHIndex,
                hIndexSpread,
                totalCitations: totalCites,
                averageCitationsPerStaff: avgCitations,
                citationSpread,
                totalLifetimePublications: totalLifePubs,
                publicationSpread,
                topPublicationPerformer,
                topCitationPerformer,
                topHIndexPerformer
            });

            setLoading(false);
        };

        if (departments.length > 0) {
            loadFacultyData();
        }
    }, [departments, selectedYears, excludeAdjuncts]);

    const totalPublications = departmentStats.reduce((acc, curr) => acc + curr.totalPublications, 0);
    const totalFacultyStaff = departmentStats.reduce((acc, curr) => acc + curr.totalStaff, 0);
    const staffWithScopusCount = departmentStats.reduce((acc, curr) => acc + curr.staffWithScopus, 0);
    const averagePerStaff = staffWithScopusCount > 0 && selectedYears.length > 0
        ? (totalPublications / staffWithScopusCount / selectedYears.length).toFixed(2)
        : '0.00';

    const averageLifetimePerStaff = staffWithScopusCount > 0
        ? (facultyMetrics.totalLifetimePublications / staffWithScopusCount).toFixed(2)
        : '0.00';

    // Calculate standard deviation of publications across departments
    const deptPublicationCounts = departmentStats.map(dept => dept.totalPublications);


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

            {/* Faculty Header Bar */}
            <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-gray-500 mb-1 print:text-gray-600">Faculty Overview</div>
                        <h2 className="text-3xl font-bold text-white print:text-black">{facultyName}</h2>
                        <div className="flex items-center gap-4 mt-2">
                            <span className="text-sm font-mono text-cyan-400 print:text-cyan-700">{facultyAcronym}</span>
                            <span className="text-sm text-gray-400 print:text-gray-600">•</span>
                            <span className="text-sm text-gray-400 print:text-gray-600">Reporting Period: {selectedYears.join(', ')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metric Visibility Controls */}
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-lg border border-white/10 p-4 print:hidden">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-3">Optional Metrics</div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Publications Section */}
                    <div>
                        <div className="text-xs font-semibold text-gray-400 mb-2 border-b border-gray-700 pb-1">📊 Publications</div>
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    checked={visibleMetrics.lifetimePublications}
                                    onChange={(e) => setVisibleMetrics({ ...visibleMetrics, lifetimePublications: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600"
                                />
                                Total Lifetime Publications
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    checked={visibleMetrics.avgLifetimePerStaff}
                                    onChange={(e) => setVisibleMetrics({ ...visibleMetrics, avgLifetimePerStaff: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600"
                                />
                                Avg Lifetime Publications
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    checked={visibleMetrics.publicationSpread}
                                    onChange={(e) => setVisibleMetrics({ ...visibleMetrics, publicationSpread: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600"
                                />
                                Publication Spread
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    checked={visibleMetrics.topPublicationPerformer}
                                    onChange={(e) => setVisibleMetrics({ ...visibleMetrics, topPublicationPerformer: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600"
                                />
                                Top Publication Performer
                            </label>
                        </div>
                    </div>

                    {/* Citations Section */}
                    <div>
                        <div className="text-xs font-semibold text-gray-400 mb-2 border-b border-gray-700 pb-1">📚 Citations</div>
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    checked={visibleMetrics.citations}
                                    onChange={(e) => setVisibleMetrics({ ...visibleMetrics, citations: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600"
                                />
                                Total Citations
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    checked={visibleMetrics.avgCitationsPerStaff}
                                    onChange={(e) => setVisibleMetrics({ ...visibleMetrics, avgCitationsPerStaff: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600"
                                />
                                Avg Citations
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    checked={visibleMetrics.citationSpread}
                                    onChange={(e) => setVisibleMetrics({ ...visibleMetrics, citationSpread: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600"
                                />
                                Citation Spread
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    checked={visibleMetrics.topCitationPerformer}
                                    onChange={(e) => setVisibleMetrics({ ...visibleMetrics, topCitationPerformer: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600"
                                />
                                Top Citation Performer
                            </label>
                        </div>
                    </div>

                    {/* H-Index Section */}
                    <div>
                        <div className="text-xs font-semibold text-gray-400 mb-2 border-b border-gray-700 pb-1">🎯 H-Index</div>
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    checked={visibleMetrics.hIndex}
                                    onChange={(e) => setVisibleMetrics({ ...visibleMetrics, hIndex: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600"
                                />
                                Avg H-Index
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    checked={visibleMetrics.hIndexSpread}
                                    onChange={(e) => setVisibleMetrics({ ...visibleMetrics, hIndexSpread: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600"
                                />
                                H-Index Spread
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    checked={visibleMetrics.topHIndexPerformer}
                                    onChange={(e) => setVisibleMetrics({ ...visibleMetrics, topHIndexPerformer: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-blue-600"
                                />
                                Top H-Index Performer
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Default Metrics (Always Visible) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300">
                    <div className="text-sm text-gray-400 mb-2 print:text-gray-600">Total Academic Staff</div>
                    <div className="text-4xl font-bold text-white print:text-black print:text-2xl">{totalFacultyStaff}</div>
                    <div className="text-xs text-gray-500 mt-1 print:text-gray-600">{staffWithScopusCount} with Scopus profiles</div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300">
                    <div className="text-sm text-gray-400 mb-2 print:text-gray-600">Total Publications ({selectedYears.join(', ')})</div>
                    <div className="text-4xl font-bold text-blue-400 print:text-blue-700 print:text-2xl">{totalPublications}</div>
                    <div className="text-xs text-gray-500 mt-1 print:text-gray-600">Recent 3-year output</div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300">
                    <div className="text-sm text-gray-400 mb-2 print:text-gray-600">Avg Publications per Staff ({selectedYears.join(', ')})</div>
                    <div className="text-4xl font-bold text-purple-400 print:text-purple-700 print:text-2xl">{averagePerStaff}</div>
                    <div className="text-xs text-gray-500 mt-1 print:text-gray-600">Per researcher with Scopus</div>
                </div>
            </div>

            {/* Optional Metrics (Conditionally Visible) */}
            {(visibleMetrics.lifetimePublications || visibleMetrics.avgLifetimePerStaff || visibleMetrics.publicationSpread || visibleMetrics.topPublicationPerformer ||
                visibleMetrics.citations || visibleMetrics.avgCitationsPerStaff || visibleMetrics.citationSpread || visibleMetrics.topCitationPerformer ||
                visibleMetrics.hIndex || visibleMetrics.hIndexSpread || visibleMetrics.topHIndexPerformer) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {visibleMetrics.lifetimePublications && (
                            <div className="bg-gradient-to-br from-cyan-900/40 to-cyan-800/40 backdrop-blur-xl rounded-lg border border-cyan-500/30 p-6 shadow-[0_0_15px_rgba(6,182,212,0.15)] print:bg-white print:border print:border-gray-300">
                                <div className="text-sm text-cyan-300 mb-2 print:text-gray-600">Total Lifetime Publications</div>
                                <div className="text-4xl font-bold text-cyan-100 print:text-black print:text-2xl">{facultyMetrics.totalLifetimePublications.toLocaleString()}</div>
                                <div className="text-xs text-cyan-400 mt-1 print:text-gray-600">All staff combined</div>
                            </div>
                        )}

                        {visibleMetrics.avgLifetimePerStaff && (
                            <div className="bg-gradient-to-br from-cyan-900/40 to-cyan-800/40 backdrop-blur-xl rounded-lg border border-cyan-500/30 p-6 shadow-[0_0_15px_rgba(6,182,212,0.15)] print:bg-white print:border print:border-gray-300">
                                <div className="text-sm text-cyan-300 mb-2 print:text-gray-600">Avg Lifetime Publications</div>
                                <div className="text-4xl font-bold text-cyan-100 print:text-black print:text-2xl">{averageLifetimePerStaff}</div>
                                <div className="text-xs text-cyan-400 mt-1 print:text-gray-600">Per researcher with Scopus</div>
                            </div>
                        )}

                        {visibleMetrics.publicationSpread && (
                            <div className="bg-gradient-to-br from-cyan-900/40 to-cyan-800/40 backdrop-blur-xl rounded-lg border border-cyan-500/30 p-6 shadow-[0_0_15px_rgba(6,182,212,0.15)] print:bg-white print:border print:border-gray-300">
                                <div className="text-sm text-cyan-300 mb-2 print:text-gray-600">Publication Spread</div>
                                <div className="text-4xl font-bold text-cyan-100 print:text-black print:text-2xl">{facultyMetrics.publicationSpread}</div>
                                <div className="text-xs text-cyan-400 mt-1 print:text-gray-600">Std dev of lifetime pubs</div>
                            </div>
                        )}

                        {visibleMetrics.topPublicationPerformer && (
                            <div className="bg-gradient-to-br from-cyan-900/40 to-cyan-800/40 backdrop-blur-xl rounded-lg border border-cyan-500/30 p-6 shadow-[0_0_15px_rgba(6,182,212,0.15)] print:bg-white print:border print:border-gray-300">
                                <div className="text-sm text-cyan-300 mb-2 print:text-gray-600">Top Publication Performer</div>
                                <div className="text-3xl font-bold text-cyan-100 print:text-black print:text-xl">
                                    {facultyMetrics.topPublicationPerformer ? facultyMetrics.topPublicationPerformer.lifetimePublications : '-'}
                                </div>
                                <div className="text-sm text-cyan-200 mt-1 truncate print:text-gray-700 font-medium">
                                    {facultyMetrics.topPublicationPerformer ? facultyMetrics.topPublicationPerformer.name : 'N/A'}
                                </div>
                            </div>
                        )}

                        {visibleMetrics.citations && (
                            <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/40 backdrop-blur-xl rounded-lg border border-emerald-500/30 p-6 shadow-[0_0_15px_rgba(16,185,129,0.15)] print:bg-white print:border print:border-gray-300">
                                <div className="text-sm text-emerald-300 mb-2 print:text-gray-600">Total Citations</div>
                                <div className="text-4xl font-bold text-emerald-100 print:text-black print:text-2xl">{facultyMetrics.totalCitations.toLocaleString()}</div>
                                <div className="text-xs text-emerald-400 mt-1 print:text-gray-600">Lifetime research impact</div>
                            </div>
                        )}

                        {visibleMetrics.avgCitationsPerStaff && (
                            <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/40 backdrop-blur-xl rounded-lg border border-emerald-500/30 p-6 shadow-[0_0_15px_rgba(16,185,129,0.15)] print:bg-white print:border print:border-gray-300">
                                <div className="text-sm text-emerald-300 mb-2 print:text-gray-600">Avg Citations</div>
                                <div className="text-4xl font-bold text-emerald-100 print:text-black print:text-2xl">{facultyMetrics.averageCitationsPerStaff}</div>
                                <div className="text-xs text-emerald-400 mt-1 print:text-gray-600">Per researcher with Scopus</div>
                            </div>
                        )}

                        {visibleMetrics.citationSpread && (
                            <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/40 backdrop-blur-xl rounded-lg border border-emerald-500/30 p-6 shadow-[0_0_15px_rgba(16,185,129,0.15)] print:bg-white print:border print:border-gray-300">
                                <div className="text-sm text-emerald-300 mb-2 print:text-gray-600">Citation Spread</div>
                                <div className="text-4xl font-bold text-emerald-100 print:text-black print:text-2xl">{facultyMetrics.citationSpread}</div>
                                <div className="text-xs text-emerald-400 mt-1 print:text-gray-600">Std dev of citations</div>
                            </div>
                        )}

                        {visibleMetrics.topCitationPerformer && (
                            <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/40 backdrop-blur-xl rounded-lg border border-emerald-500/30 p-6 shadow-[0_0_15px_rgba(16,185,129,0.15)] print:bg-white print:border print:border-gray-300">
                                <div className="text-sm text-emerald-300 mb-2 print:text-gray-600">Top Citation Performer</div>
                                <div className="text-3xl font-bold text-emerald-100 print:text-black print:text-xl">
                                    {facultyMetrics.topCitationPerformer ? facultyMetrics.topCitationPerformer.citationCount?.toLocaleString() : '-'}
                                </div>
                                <div className="text-sm text-emerald-200 mt-1 truncate print:text-gray-700 font-medium">
                                    {facultyMetrics.topCitationPerformer ? facultyMetrics.topCitationPerformer.name : 'N/A'}
                                </div>
                            </div>
                        )}

                        {visibleMetrics.hIndex && (
                            <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 backdrop-blur-xl rounded-lg border border-purple-500/30 p-6 shadow-[0_0_15px_rgba(168,85,247,0.15)] print:bg-white print:border print:border-gray-300">
                                <div className="text-sm text-purple-300 mb-2 print:text-gray-600">Avg H-Index</div>
                                <div className="text-4xl font-bold text-purple-100 print:text-black print:text-2xl">{facultyMetrics.averageHIndex}</div>
                                <div className="text-xs text-purple-400 mt-1 print:text-gray-600">Research quality indicator</div>
                            </div>
                        )}

                        {visibleMetrics.hIndexSpread && (
                            <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 backdrop-blur-xl rounded-lg border border-purple-500/30 p-6 shadow-[0_0_15px_rgba(168,85,247,0.15)] print:bg-white print:border print:border-gray-300">
                                <div className="text-sm text-purple-300 mb-2 print:text-gray-600">H-Index Spread</div>
                                <div className="text-4xl font-bold text-purple-100 print:text-black print:text-2xl">{facultyMetrics.hIndexSpread}</div>
                                <div className="text-xs text-purple-400 mt-1 print:text-gray-600">Std dev of H-Index</div>
                            </div>
                        )}

                        {visibleMetrics.topHIndexPerformer && (
                            <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 backdrop-blur-xl rounded-lg border border-purple-500/30 p-6 shadow-[0_0_15px_rgba(168,85,247,0.15)] print:bg-white print:border print:border-gray-300">
                                <div className="text-sm text-purple-300 mb-2 print:text-gray-600">Top H-Index Performer</div>
                                <div className="text-3xl font-bold text-purple-100 print:text-black print:text-xl">
                                    {facultyMetrics.topHIndexPerformer ? facultyMetrics.topHIndexPerformer.hIndex : '-'}
                                </div>
                                <div className="text-sm text-purple-200 mt-1 truncate print:text-gray-700 font-medium">
                                    {facultyMetrics.topHIndexPerformer ? facultyMetrics.topHIndexPerformer.name : 'N/A'}
                                </div>
                            </div>
                        )}
                    </div>
                )}

            {/* Faculty Publications by Year Chart */}
            <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300 print:shadow-none">
                <div className="p-6 print:p-4">
                    <h3 className="text-xl font-bold text-white mb-6 print:text-black print:mb-4">Faculty Publications by Year</h3>

                    <div className="flex items-end justify-between gap-4 h-64 print:h-48 w-full px-4">
                        {publicationsByYear.map((yearData: any) => {
                            const maxCount = Math.max(...publicationsByYear.map(y => y.count));

                            // Height percentage
                            const countHeight = maxCount > 0 ? (yearData.count / maxCount) * 80 : 0;

                            return (
                                <div key={yearData.year} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
                                    <div className="w-full flex items-end justify-center h-full max-w-[120px]">
                                        {/* Total Publications Bar */}
                                        <div className="w-full flex flex-col items-center justify-end gap-1 h-full group relative">
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
                    </div>
                </div>
            </div>

            {/* Department Comparison Chart */}
            <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300 print:shadow-none">
                <div className="p-6 print:p-4">
                    <div className="flex items-center justify-between mb-6 print:mb-4">
                        <h3 className="text-xl font-bold text-white print:text-black">
                            {['publications', 'avgPublications', 'combinedPublications'].includes(chartMetric) ? 'Department Comparison (Selected Years)'
                                : chartMetric === 'lifetimePubs' ? 'Department Comparison (Lifetime Pubs)'
                                    : chartMetric === 'avgLifetimePubs' ? 'Department Comparison (Avg Lifetime Pubs)'
                                        : chartMetric === 'citations' ? 'Department Comparison (Total Citations)'
                                            : 'Department Comparison (Avg H-Index)'}
                        </h3>

                        <div className="print:hidden">
                            <select
                                value={chartMetric}
                                onChange={(e) => setChartMetric(e.target.value as any)}
                                className="bg-slate-800 text-white border border-white/20 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="publications">Total Publications (Vol)</option>
                                <option value="avgPublications">Average per Staff (Efficiency)</option>
                                <option value="combinedPublications">Combined (Vol + Efficiency)</option>
                                <option value="lifetimePubs">Total Lifetime Publications</option>
                                <option value="avgLifetimePubs">Avg Lifetime Pubs per Staff</option>
                                <option value="citations">Total Citations (Lifetime)</option>
                                <option value="hIndex">Average H-Index (Lifetime)</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <div className="min-w-[600px] h-96 print:h-80 flex items-end gap-8 pb-12 px-4">
                            {departmentStats
                                .sort((a, b) => {
                                    if (chartMetric === 'publications' || chartMetric === 'combinedPublications') return b.totalPublications - a.totalPublications;
                                    if (chartMetric === 'avgPublications') return parseFloat(b.averagePerStaff) - parseFloat(a.averagePerStaff);
                                    if (chartMetric === 'lifetimePubs') return b.totalLifetimePublications - a.totalLifetimePublications;
                                    if (chartMetric === 'avgLifetimePubs') return parseFloat(b.averageLifetimePerStaff) - parseFloat(a.averageLifetimePerStaff);
                                    if (chartMetric === 'citations') return b.totalCitations - a.totalCitations;
                                    if (chartMetric === 'hIndex') return parseFloat(b.averageHIndex) - parseFloat(a.averageHIndex);
                                    return 0;
                                })
                                .map((dept, idx) => {
                                    // Normalize heights
                                    let maxVal = 0;
                                    let maxAvg = 0;
                                    let val = 0;
                                    let avg = 0;

                                    if (['publications', 'avgPublications', 'combinedPublications'].includes(chartMetric)) {
                                        maxVal = Math.max(...departmentStats.map(d => d.totalPublications));
                                        maxAvg = Math.max(...departmentStats.map(d => parseFloat(d.averagePerStaff)));
                                        val = dept.totalPublications;
                                        avg = parseFloat(dept.averagePerStaff);
                                    } else if (chartMetric === 'lifetimePubs' || chartMetric === 'avgLifetimePubs') {
                                        maxVal = Math.max(...departmentStats.map(d => d.totalLifetimePublications));
                                        maxAvg = Math.max(...departmentStats.map(d => parseFloat(d.averageLifetimePerStaff)));
                                        val = dept.totalLifetimePublications;
                                        avg = parseFloat(dept.averageLifetimePerStaff);
                                    } else if (chartMetric === 'citations') {
                                        maxVal = Math.max(...departmentStats.map(d => d.totalCitations));
                                        val = dept.totalCitations;
                                    } else if (chartMetric === 'hIndex') {
                                        maxAvg = Math.max(...departmentStats.map(d => parseFloat(d.averageHIndex)));
                                        avg = parseFloat(dept.averageHIndex);
                                    }

                                    const valHeight = maxVal > 0 ? (val / maxVal) * 70 : 0;
                                    const avgHeight = maxAvg > 0 ? (avg / maxAvg) * 70 : 0;

                                    return (
                                        <div key={idx} className="flex-1 max-w-[120px] flex flex-col items-center justify-end gap-2 h-full">
                                            <div className="w-full flex gap-2 items-end justify-center h-full">
                                                {/* Primary Bar (Blue/Cyan/Green) */}
                                                {(chartMetric !== 'hIndex' && chartMetric !== 'avgPublications' && chartMetric !== 'avgLifetimePubs') && (
                                                    <div className="flex-1 flex flex-col items-center justify-end gap-1 h-full font-bold text-xs">
                                                        <div className={`
                                                            ${chartMetric === 'citations' ? 'text-green-300 print:text-green-700' :
                                                                chartMetric.includes('lifetime') ? 'text-cyan-300 print:text-cyan-700' :
                                                                    'text-blue-300 print:text-blue-700'}
                                                        `}>{val.toLocaleString()}</div>
                                                        <div
                                                            className={`w-full rounded-t transition-all duration-500 
                                                                ${chartMetric === 'citations' ? 'bg-gradient-to-t from-green-600 to-green-400 print:bg-green-600' :
                                                                    chartMetric.includes('lifetime') ? 'bg-gradient-to-t from-cyan-600 to-cyan-400 print:bg-cyan-600' :
                                                                        'bg-gradient-to-t from-blue-600 to-blue-400 print:bg-blue-600'}
                                                            `}
                                                            style={{
                                                                height: `${valHeight}%`,
                                                                minHeight: '4px',
                                                                // @ts-ignore
                                                                printColorAdjust: 'exact',
                                                                WebkitPrintColorAdjust: 'exact'
                                                            }}
                                                        />
                                                    </div>
                                                )}

                                                {/* Secondary Bar (Purple/Indigo) - for Averages */}
                                                {(chartMetric === 'avgPublications' || chartMetric === 'combinedPublications' || chartMetric === 'avgLifetimePubs' || chartMetric === 'hIndex') && (
                                                    <div className="flex-1 flex flex-col items-center justify-end gap-1 h-full font-bold text-xs">
                                                        <div className={`
                                                            ${chartMetric === 'hIndex' ? 'text-purple-300 print:text-purple-700' :
                                                                chartMetric.includes('lifetime') ? 'text-indigo-300 print:text-indigo-700' :
                                                                    'text-purple-300 print:text-purple-700'}
                                                        `}>{avg.toFixed(2)}</div>
                                                        <div
                                                            className={`w-full rounded-t transition-all duration-500 
                                                                ${chartMetric === 'hIndex' ? 'bg-gradient-to-t from-purple-600 to-purple-400 print:bg-purple-600' :
                                                                    chartMetric.includes('lifetime') ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 print:bg-indigo-600' :
                                                                        'bg-gradient-to-t from-purple-600 to-purple-400 print:bg-purple-600'}
                                                            `}
                                                            style={{
                                                                height: `${avgHeight}%`,
                                                                minHeight: '4px',
                                                                // @ts-ignore
                                                                printColorAdjust: 'exact',
                                                                WebkitPrintColorAdjust: 'exact'
                                                            }}
                                                        />
                                                    </div>
                                                )}
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
                            {(chartMetric !== 'hIndex' && chartMetric !== 'avgPublications' && chartMetric !== 'avgLifetimePubs') && (
                                <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded 
                                        ${chartMetric === 'citations' ? 'bg-green-500' :
                                            chartMetric.includes('lifetime') ? 'bg-cyan-500' :
                                                'bg-blue-500'}`}></div>
                                    <span className="text-sm text-gray-300 print:text-gray-700">
                                        {chartMetric === 'citations' ? 'Total Citations' :
                                            chartMetric.includes('lifetime') ? 'Total Lifetime Pubs' :
                                                'Total Publications'}
                                    </span>
                                </div>
                            )}

                            {(chartMetric === 'avgPublications' || chartMetric === 'combinedPublications' || chartMetric === 'avgLifetimePubs' || chartMetric === 'hIndex') && (
                                <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded 
                                        ${chartMetric.includes('lifetime') ? 'bg-indigo-500' :
                                            'bg-purple-500'}`}></div>
                                    <span className="text-sm text-gray-300 print:text-gray-700">
                                        {chartMetric === 'hIndex' ? 'Average H-Index' :
                                            chartMetric.includes('lifetime') ? 'Avg Lifetime per Staff' :
                                                'Average per Staff'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// NEW: Bubble Chart Component for Staff Performance
function StaffPerformanceBubbleChart({ staffMembers, selectedYears }: { staffMembers: StaffMember[], selectedYears: number[] }) {
    const [hIndexThreshold, setHIndexThreshold] = useState(15);

    const data = staffMembers
        .filter(s => s.scopusAuthorId && s.scopusAuthorId !== 'NA')
        .map(staff => ({
            name: staff.name,
            publications: staff.publications
                ?.filter(p => selectedYears.includes(p.year))
                .reduce((s, p) => s + p.count, 0) || 0,
            citations: staff.citationCount || 0,
            hIndex: staff.hIndex || 0,
            department: staff.departmentAcronym
        }))
        .filter(d => d.publications > 0 || d.citations > 0);

    return (
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300">
            <h3 className="text-xl font-bold text-white mb-2 print:text-black">Staff Performance Matrix</h3>
            <p className="text-sm text-gray-400 mb-2 print:text-gray-600">
                Visualizing Volume (X), Impact (Y), and Consistency (Size/H-Index).
                <br />
                <span className="text-xs text-gray-500">Larger bubbles indicate higher H-Index.</span>
            </p>

            {/* Threshold Control and Legend */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500 opacity-60"></div>
                        <span className="text-gray-400">H-Index &gt; {hIndexThreshold}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500 opacity-60"></div>
                        <span className="text-gray-400">H-Index ≤ {hIndexThreshold}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400">Threshold:</label>
                    <input
                        type="number"
                        min="1"
                        max="100"
                        value={hIndexThreshold}
                        onChange={(e) => setHIndexThreshold(Number(e.target.value) || 15)}
                        className="w-16 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <XAxis
                            type="number"
                            dataKey="publications"
                            name="Publications"
                            label={{ value: `Publications (${selectedYears.join('-')})`, position: 'bottom', offset: 0, fill: '#94a3b8' }}
                            stroke="#475569"
                            tick={{ fill: '#94a3b8' }}
                        />
                        <YAxis
                            type="number"
                            dataKey="citations"
                            name="Citations"
                            label={{ value: 'Total Citations', angle: -90, position: 'left', fill: '#94a3b8' }}
                            stroke="#475569"
                            tick={{ fill: '#94a3b8' }}
                        />
                        <ZAxis type="number" dataKey="hIndex" range={[50, 400]} name="H-Index" />
                        <RechartsTooltip
                            cursor={{ strokeDasharray: '3 3' }}
                            content={({ active, payload }: any) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-slate-800 border border-slate-700 p-3 rounded shadow-xl text-xs">
                                            <p className="font-bold text-white mb-1">{data.name}</p>
                                            <p className="text-cyan-300">{data.department}</p>
                                            <div className="mt-2 space-y-1 text-gray-300">
                                                <p>Pubs: {data.publications}</p>
                                                <p>Cites: {data.citations}</p>
                                                <p className="text-purple-400 font-bold">H-Index: {data.hIndex}</p>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Scatter name="Staff" data={data} fill="#8884d8">
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.hIndex > hIndexThreshold ? '#a855f7' : '#3b82f6'} fillOpacity={0.6} />
                            ))}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// NEW: Beeswarm/Jitter Plot for Distribution
function StaffDistributionChart({ staffMembers, metric, title }: { staffMembers: StaffMember[], metric: 'hIndex' | 'citations' | 'lifetimePublications', title: string }) {
    // Add jitter to X-axis to simulate beeswarm
    const data = staffMembers
        .filter(s => s.scopusAuthorId && s.scopusAuthorId !== 'NA')
        .map((staff, index) => {
            let val = 0;
            if (metric === 'citations') {
                val = staff.citationCount || 0;
            } else if (metric === 'hIndex') {
                val = staff.hIndex || 0;
            } else if (metric === 'lifetimePublications') {
                val = staff.lifetimePublications || 0;
            }

            // Deterministic jitter based on email hash (so dots don't move on re-render)
            const hash = staff.email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const jitter = (hash % 100);

            return {
                name: staff.name,
                value: val,
                jitter: jitter,
                department: staff.departmentAcronym
            };
        })
        .filter(d => d.value > 0);

    return (
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 p-6 shadow-[0_0_15px_rgba(255,255,255,0.07)] print:bg-white print:border print:border-gray-300">
            <h3 className="text-xl font-bold text-white mb-2 print:text-black">{title}</h3>
            <p className="text-sm text-gray-400 mb-6 print:text-gray-600">
                Distribution of staff performance. Each dot represents a staff member.
            </p>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <XAxis
                            type="number"
                            dataKey="jitter"
                            hide={true} // Hide the jitter axis
                            domain={[0, 100]}
                        />
                        <YAxis
                            type="number"
                            dataKey="value"
                            name={metric === 'hIndex' ? 'H-Index' : metric === 'citations' ? 'Citations' : 'Publications'}
                            stroke="#475569"
                            tick={{ fill: '#94a3b8' }}
                            label={{
                                value: metric === 'hIndex' ? 'H-Index' : metric === 'citations' ? 'Citations (Lifetime)' : 'Publications (Lifetime)',
                                angle: -90,
                                position: 'insideLeft',
                                fill: '#94a3b8'
                            }}
                        />
                        <RechartsTooltip
                            cursor={{ strokeDasharray: '3 3' }}
                            content={({ active, payload }: any) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-slate-800 border border-slate-700 p-2 rounded shadow-xl text-xs">
                                            <p className="font-bold text-white mb-1">{data.name}</p>
                                            <p className="text-gray-400">{data.department}</p>
                                            <p className="text-blue-300 font-bold mt-1">Value: {data.value}</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Scatter name="Distribution" data={data} fill="#60a5fa" fillOpacity={0.6}>
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={
                                        metric === 'hIndex' ? '#c084fc' :
                                            metric === 'citations' ? '#4ade80' : '#22d3ee'
                                    }
                                />
                            ))}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// Export Publications Tab Component
function ExportPublicationsTab({
    selectedFaculty,
    selectedDepartment,
    selectedYears,
    staffMembers,
    excludeAdjuncts
}: {
    selectedFaculty: string;
    selectedDepartment: string;
    selectedYears: number[];
    staffMembers: StaffMember[];
    excludeAdjuncts: boolean;
}) {
    const [exportScope, setExportScope] = useState<'individual' | 'department' | 'faculty'>('department');
    const [selectedStaff, setSelectedStaff] = useState<string>('');
    const [includeLifetime, setIncludeLifetime] = useState(false);
    const [includeDuplicates, setIncludeDuplicates] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [exportStatus, setExportStatus] = useState<string>('');
    const [fetchedPublications, setFetchedPublications] = useState<any[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0); // Live timer in seconds
    const [totalStaffCount, setTotalStaffCount] = useState(0); // Total staff being processed

    // Clear preview when scope or staff selection changes
    useEffect(() => {
        setShowPreview(false);
        setFetchedPublications([]);
        setExportStatus('');
    }, [exportScope, selectedStaff, includeLifetime, includeDuplicates]);

    // Live timer - updates every second while fetching
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;

        if (isFetching) {
            setElapsedTime(0); // Reset timer when starting
            interval = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        } else {
            setElapsedTime(0); // Reset when done
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isFetching]);

    // Filter staff based on excludeAdjuncts
    const filteredStaffMembers = useMemo(() => {
        if (!excludeAdjuncts) return staffMembers;
        return staffMembers.filter(s => !(s.designation && s.designation.toLowerCase().includes('adjunct')));
    }, [staffMembers, excludeAdjuncts]);

    // Handle Preview - Fetch data from Scopus API and show preview
    const handlePreview = async () => {
        setIsFetching(true);
        const startTime = performance.now(); // Start timer

        // Calculate estimated time based on scope
        // For faculty scope, we need to get the total count from the API
        let staffCount = 1;

        if (exportScope === 'individual') {
            staffCount = 1;
        } else if (exportScope === 'department') {
            staffCount = filteredStaffMembers.filter(s => s.departmentAcronym === selectedDepartment).length;
        } else {
            // Faculty scope - use cached metadata from lkcfes-scopus-publications.json
            // Total staff: 234, Staff with Scopus profiles: 196 (as shown in Faculty Overview)
            staffCount = excludeAdjuncts ? 196 : 234;
        }

        setTotalStaffCount(staffCount); // Store for progress calculation

        const estimatedSeconds = staffCount * 2; // ~2 seconds per staff member (realistic based on Scopus API response time)
        const estimatedTime = estimatedSeconds > 60
            ? `${Math.ceil(estimatedSeconds / 60)} minute${Math.ceil(estimatedSeconds / 60) > 1 ? 's' : ''}`
            : `${Math.ceil(estimatedSeconds)} seconds`;

        setExportStatus(`Fetching publications for ${staffCount} staff member${staffCount > 1 ? 's' : ''}... This may take ${estimatedTime}.`);

        try {
            // Build API URL
            const params = new URLSearchParams({
                scope: exportScope,
                faculty: selectedFaculty,
                years: includeLifetime ? 'lifetime' : selectedYears.join(',')
            });

            if (exportScope === 'individual') {
                if (!selectedStaff) {
                    alert('Please select a staff member');
                    setIsFetching(false);
                    return;
                }
                params.append('staffEmail', selectedStaff);
                params.append('department', selectedDepartment);
            } else if (exportScope === 'department') {
                params.append('department', selectedDepartment);
            }

            const apiUrl = `/api/scopus-publications/publication-details?${params.toString()}`;
            console.log('[Preview] Fetching from:', apiUrl);

            const response = await fetch(apiUrl);
            const data = await response.json();

            console.log('[Preview] API Response:', data);
            console.log('[Preview] Publications count:', data.publications?.length || 0);

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch publication details');
            }

            if (!data.publications || data.publications.length === 0) {
                setExportStatus(`⚠️ No publications found for the selected criteria`);
                setIsFetching(false);
                return;
            }

            setExportStatus(`Processing ${data.publications.length} publications...`);

            // Import deduplication utility
            const { removeDuplicatePublications } = await import('@/lib/scopus/csv-exporter');

            let publicationsToShow = data.publications;
            console.log('[Preview] Publications before dedup:', publicationsToShow.length);

            // Remove duplicates if requested (only for department/faculty scope)
            if (exportScope !== 'individual' && !includeDuplicates) {
                publicationsToShow = removeDuplicatePublications(publicationsToShow);
                console.log('[Preview] Publications after dedup:', publicationsToShow.length);
            }

            // Calculate elapsed time
            const endTime = performance.now();
            const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(1);

            // Store fetched publications for later export
            setFetchedPublications(publicationsToShow);
            setShowPreview(true);
            setExportStatus(`✅ Found ${publicationsToShow.length} publications in ${elapsedSeconds} seconds. Review below and click "EXPORT TO CSV" to download.`);
            setIsFetching(false);

        } catch (error) {
            console.error('[Preview] Error:', error);
            setExportStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setIsFetching(false);
        }
    };

    // Handle Export - Download CSV (fetch data if needed)
    const handleExport = async () => {
        const startTime = performance.now(); // Start timer

        try {
            let publicationsToExport = fetchedPublications;

            // If no data fetched yet, fetch it now
            if (publicationsToExport.length === 0) {
                // Calculate estimated time
                const staffCount = exportScope === 'individual' ? 1
                    : exportScope === 'department'
                        ? filteredStaffMembers.filter(s => s.departmentAcronym === selectedDepartment).length
                        : (excludeAdjuncts ? 196 : 234); // Faculty scope - use cached metadata

                setTotalStaffCount(staffCount); // Store for progress calculation

                const estimatedSeconds = staffCount * 2; // ~2 seconds per staff member
                const estimatedTime = estimatedSeconds > 60
                    ? `${Math.ceil(estimatedSeconds / 60)} minute${Math.ceil(estimatedSeconds / 60) > 1 ? 's' : ''}`
                    : `${Math.ceil(estimatedSeconds)} seconds`;

                setExportStatus(`Fetching publications for ${staffCount} staff member${staffCount > 1 ? 's' : ''}... This may take ${estimatedTime}.`);

                // Build API URL
                const params = new URLSearchParams({
                    scope: exportScope,
                    faculty: selectedFaculty,
                    years: includeLifetime ? 'lifetime' : selectedYears.join(',')
                });

                if (exportScope === 'individual') {
                    if (!selectedStaff) {
                        alert('Please select a staff member');
                        return;
                    }
                    params.append('staffEmail', selectedStaff);
                    params.append('department', selectedDepartment);
                } else if (exportScope === 'department') {
                    params.append('department', selectedDepartment);
                }

                const apiUrl = `/api/scopus-publications/publication-details?${params.toString()}`;
                console.log('[Export] Fetching from:', apiUrl);

                const response = await fetch(apiUrl);
                const data = await response.json();

                console.log('[Export] API Response:', data);

                if (!data.success) {
                    throw new Error(data.error || 'Failed to fetch publication details');
                }

                if (!data.publications || data.publications.length === 0) {
                    setExportStatus(`⚠️ No publications found for the selected criteria`);
                    return;
                }

                setExportStatus(`Processing ${data.publications.length} publications...`);

                // Import deduplication utility
                const { removeDuplicatePublications } = await import('@/lib/scopus/csv-exporter');

                publicationsToExport = data.publications;

                // Remove duplicates if requested (only for department/faculty scope)
                if (exportScope !== 'individual' && !includeDuplicates) {
                    publicationsToExport = removeDuplicatePublications(publicationsToExport);
                }
            }

            setExportStatus('Generating CSV file...');

            // Import CSV utilities
            const { generatePublicationsCSV, generateCSVFilename, downloadCSV } =
                await import('@/lib/scopus/csv-exporter');

            // Generate CSV
            const csvContent = generatePublicationsCSV(publicationsToExport, true);
            console.log('[Export] CSV length:', csvContent.length);

            // Generate filename
            const identifier = exportScope === 'individual'
                ? filteredStaffMembers.find(s => s.email === selectedStaff)?.name || 'staff'
                : exportScope === 'department'
                    ? selectedDepartment
                    : selectedFaculty;

            const filename = generateCSVFilename(
                exportScope,
                identifier,
                includeLifetime ? 'lifetime' : selectedYears,
                exportScope !== 'individual' ? includeDuplicates : true
            );

            console.log('[Export] Downloading file:', filename);

            // Download CSV
            downloadCSV(csvContent, filename);

            // Calculate elapsed time
            const endTime = performance.now();
            const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(1);

            setExportStatus(`✅ Successfully exported ${publicationsToExport.length} publications in ${elapsedSeconds} seconds!`);

            setTimeout(() => {
                setExportStatus('');
            }, 5000); // Show for 5 seconds so user can see the time

        } catch (error) {
            console.error('[Export] Error:', error);
            setExportStatus(`❌ Export error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-[#1A1A1F] border border-[#334155] p-6">
                <h2 className="text-xl font-bold text-white font-['Orbitron',sans-serif] uppercase tracking-[0.1em] mb-2">
                    <Download className="inline w-5 h-5 mr-2" />
                    EXPORT PUBLICATION DETAILS
                </h2>
                <p className="text-[#94A3B8] font-['JetBrains_Mono',monospace] text-sm">
                    // EXTRACT_COMPLETE_PUBLICATION_METADATA_FROM_SCOPUS_API
                </p>
            </div>

            {/* Export Configuration */}
            <div className="bg-[#1A1A1F] border border-[#334155] p-6 space-y-6">
                {/* Scope Selection */}
                <div>
                    <label className="block text-xs font-bold text-white font-['Orbitron',sans-serif] uppercase tracking-[0.1em] mb-3">
                        // EXPORT_SCOPE
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        <button
                            onClick={() => setExportScope('individual')}
                            className={`px-4 py-3 font-['JetBrains_Mono',monospace] text-sm transition-all ${exportScope === 'individual'
                                ? 'bg-[#3B82F6] text-white border-2 border-[#3B82F6]'
                                : 'bg-[#0B0B10] text-[#94A3B8] border border-[#334155] hover:border-[#3B82F6]'
                                }`}
                        >
                            INDIVIDUAL STAFF
                        </button>
                        <button
                            onClick={() => setExportScope('department')}
                            className={`px-4 py-3 font-['JetBrains_Mono',monospace] text-sm transition-all ${exportScope === 'department'
                                ? 'bg-[#3B82F6] text-white border-2 border-[#3B82F6]'
                                : 'bg-[#0B0B10] text-[#94A3B8] border border-[#334155] hover:border-[#3B82F6]'
                                }`}
                        >
                            DEPARTMENT ({selectedDepartment})
                        </button>
                        <button
                            onClick={() => setExportScope('faculty')}
                            className={`px-4 py-3 font-['JetBrains_Mono',monospace] text-sm transition-all ${exportScope === 'faculty'
                                ? 'bg-[#3B82F6] text-white border-2 border-[#3B82F6]'
                                : 'bg-[#0B0B10] text-[#94A3B8] border border-[#334155] hover:border-[#3B82F6]'
                                }`}
                        >
                            FACULTY ({selectedFaculty})
                        </button>
                    </div>
                </div>

                {/* Individual Staff Selection */}
                {exportScope === 'individual' && (
                    <div>
                        <label className="block text-xs font-bold text-white font-['Orbitron',sans-serif] uppercase tracking-[0.1em] mb-3">
                            // SELECT_STAFF_MEMBER
                        </label>
                        <select
                            value={selectedStaff}
                            onChange={(e) => setSelectedStaff(e.target.value)}
                            className="w-full px-4 py-3 bg-[#0B0B10] border border-[#334155] text-white font-['JetBrains_Mono',monospace] text-sm focus:outline-none focus:border-white"
                        >
                            <option value="">-- Select a staff member --</option>
                            {filteredStaffMembers
                                .filter(s => s.scopusAuthorId && s.scopusAuthorId !== 'NA')
                                .map(staff => (
                                    <option key={staff.email} value={staff.email}>
                                        {staff.name} ({staff.email})
                                    </option>
                                ))}
                        </select>
                    </div>
                )}

                {/* Year Selection */}
                <div>
                    <label className="block text-xs font-bold text-white font-['Orbitron',sans-serif] uppercase tracking-[0.1em] mb-3">
                        // YEAR_RANGE
                    </label>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div
                                onClick={() => setIncludeLifetime(!includeLifetime)}
                                className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${includeLifetime ? 'bg-blue-600' : 'bg-slate-700'}`}
                            >
                                <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${includeLifetime ? 'left-6' : 'left-1'}`} />
                            </div>
                            <label
                                onClick={() => setIncludeLifetime(!includeLifetime)}
                                className="text-white font-['JetBrains_Mono',monospace] font-medium text-sm cursor-pointer select-none"
                            >
                                LIFETIME (ALL YEARS)
                            </label>
                        </div>
                        {!includeLifetime && (
                            <div className="text-[#94A3B8] font-['JetBrains_Mono',monospace] text-sm">
                                Selected years: {selectedYears.join(', ')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Duplicate Handling - Only show for department/faculty scope */}
                {exportScope !== 'individual' && (
                    <div>
                        <label className="block text-xs font-bold text-white font-['Orbitron',sans-serif] uppercase tracking-[0.1em] mb-3">
                            // DUPLICATE_HANDLING
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setIncludeDuplicates(true)}
                                className={`px-4 py-3 font-['JetBrains_Mono',monospace] text-sm transition-all ${includeDuplicates
                                    ? 'bg-[#3B82F6] text-white border-2 border-[#3B82F6]'
                                    : 'bg-[#0B0B10] text-[#94A3B8] border border-[#334155] hover:border-[#3B82F6]'
                                    }`}
                            >
                                WITH DUPLICATES
                                <div className="text-xs mt-1 opacity-75">Shared papers appear multiple times</div>
                            </button>
                            <button
                                onClick={() => setIncludeDuplicates(false)}
                                className={`px-4 py-3 font-['JetBrains_Mono',monospace] text-sm transition-all ${!includeDuplicates
                                    ? 'bg-[#3B82F6] text-white border-2 border-[#3B82F6]'
                                    : 'bg-[#0B0B10] text-[#94A3B8] border border-[#334155] hover:border-[#3B82F6]'
                                    }`}
                            >
                                UNIQUE ONLY
                                <div className="text-xs mt-1 opacity-75">Shared papers appear once</div>
                            </button>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="pt-4 border-t border-[#334155] space-y-3">
                    {/* Preview Button */}
                    <button
                        onClick={handlePreview}
                        disabled={isFetching || (exportScope === 'individual' && !selectedStaff)}
                        className="w-full px-6 py-4 bg-[#1E293B] border-2 border-[#3B82F6] text-[#3B82F6] font-['Orbitron',sans-serif] font-bold text-sm uppercase tracking-[0.15em] hover:bg-[#3B82F6] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                    >
                        {isFetching ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#3B82F6]"></div>
                                FETCHING...
                            </>
                        ) : (
                            <>
                                <Eye className="w-4 h-4" />
                                PREVIEW PUBLICATIONS
                            </>
                        )}
                    </button>

                    {/* Export Button - Always enabled, fetches data if needed */}
                    <button
                        onClick={handleExport}
                        disabled={isFetching || (exportScope === 'individual' && !selectedStaff)}
                        className="w-full px-6 py-4 bg-[#3B82F6] text-white font-['Orbitron',sans-serif] font-bold text-sm uppercase tracking-[0.15em] hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        EXPORT TO CSV
                    </button>
                </div>

                {/* Status Message */}
                {exportStatus && (
                    <div className={`p-4 border ${exportStatus.includes('✅')
                        ? 'bg-green-900/20 border-green-500/30 text-green-400'
                        : exportStatus.includes('❌')
                            ? 'bg-red-900/20 border-red-500/30 text-red-400'
                            : 'bg-blue-900/20 border-blue-500/30 text-blue-400'
                        } font-['JetBrains_Mono',monospace] text-sm space-y-2`}>
                        <div>{exportStatus}</div>
                        {/* Animated progress bar when fetching */}
                        {isFetching && exportStatus.includes('Fetching') && (
                            <>
                                {/* Progress bar with actual percentage */}
                                <div className="w-full bg-[#0B0B10] rounded-full h-3 overflow-hidden relative">
                                    <div
                                        className="h-full bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] transition-all duration-500 ease-out"
                                        style={{
                                            width: `${Math.min(99, (elapsedTime / (totalStaffCount * 2)) * 100)}%`
                                        }}>
                                    </div>
                                    {/* Progress text overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-lg">
                                        {Math.min(99, Math.round((elapsedTime / (totalStaffCount * 2)) * 100))}%
                                    </div>
                                </div>
                                {/* Estimated progress and elapsed time */}
                                <div className="flex justify-between text-xs">
                                    <div className="text-[#60A5FA] font-bold">
                                        📊 Processing ~{Math.min(totalStaffCount, Math.floor(elapsedTime / 2))}/{totalStaffCount} staff members
                                    </div>
                                    <div className="text-[#60A5FA] font-bold">
                                        ⏱️ Elapsed: {elapsedTime}s
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Preview */}
            {showPreview && fetchedPublications.length > 0 && (
                <div className="bg-[#1A1A1F] border border-[#334155] p-6">
                    <h3 className="text-lg font-bold text-white font-['Orbitron',sans-serif] uppercase tracking-[0.1em] mb-4">
                        // PREVIEW (FIRST 10 PUBLICATIONS)
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#334155]">
                                    <th className="text-left py-2 px-3 text-[#94A3B8] font-['JetBrains_Mono',monospace] text-xs">Title</th>
                                    <th className="text-left py-2 px-3 text-[#94A3B8] font-['JetBrains_Mono',monospace] text-xs">Year</th>
                                    <th className="text-left py-2 px-3 text-[#94A3B8] font-['JetBrains_Mono',monospace] text-xs">Authors</th>
                                    <th className="text-left py-2 px-3 text-[#94A3B8] font-['JetBrains_Mono',monospace] text-xs">Citations</th>
                                    <th className="text-left py-2 px-3 text-[#94A3B8] font-['JetBrains_Mono',monospace] text-xs">Staff</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fetchedPublications.slice(0, 10).map((pub: any, idx: number) => (
                                    <tr key={idx} className="border-b border-[#334155]/50 hover:bg-[#0B0B10]">
                                        <td className="py-2 px-3 text-white font-['JetBrains_Mono',monospace] text-xs max-w-md truncate">
                                            {pub.title}
                                        </td>
                                        <td className="py-2 px-3 text-[#94A3B8] font-['JetBrains_Mono',monospace] text-xs">
                                            {pub.publicationYear}
                                        </td>
                                        <td className="py-2 px-3 text-[#94A3B8] font-['JetBrains_Mono',monospace] text-xs max-w-xs truncate">
                                            {pub.authors.slice(0, 3).join(', ')}
                                            {pub.authors.length > 3 && '...'}
                                        </td>
                                        <td className="py-2 px-3 text-[#94A3B8] font-['JetBrains_Mono',monospace] text-xs">
                                            {pub.citationCount}
                                        </td>
                                        <td className="py-2 px-3 text-[#94A3B8] font-['JetBrains_Mono',monospace] text-xs">
                                            {pub.staffName}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Information Panel */}
            <div className="bg-[#1A1A1F] border border-[#334155] p-6">
                <h3 className="text-sm font-bold text-white font-['Orbitron',sans-serif] uppercase tracking-[0.1em] mb-3">
                    // EXPORT_INFORMATION
                </h3>
                <div className="space-y-2 text-[#94A3B8] font-['JetBrains_Mono',monospace] text-xs">
                    <p>• CSV includes all Scopus metadata: title, authors, DOI, citations, abstract, keywords, etc.</p>
                    <p>• WITH DUPLICATES: Co-authored papers appear once per author (useful for individual contribution tracking)</p>
                    <p>• UNIQUE ONLY: Each paper appears once regardless of co-authors (useful for department/faculty totals)</p>
                    <p>• Export time varies by scope: Individual (~2s), Department (~1 minute), Faculty (~7 minutes)</p>
                    <p>• Actual time taken is displayed in the success message for performance tracking</p>
                </div>
            </div>
        </div>
    );
}


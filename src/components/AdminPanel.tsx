import React, { useState, useEffect, useMemo } from 'react';
import { Branch, AdmissionApplication, StudentRecord } from '../types';
import {
  getStoredBranches,
  setStoredBranches,
  getActiveBranches,
  createBranch,
  updateBranch,
  toggleBranchStatus,
  deleteBranch,
  DEFAULT_MAIN_BRANCH,
} from '../data/branchesData';
import {
  getStoredApplications,
  setStoredApplications,
  getStoredStudents,
  setStoredStudents,
  updateAdmissionRecord,
  deleteAdmissionRecord,
  getAdmissionsCountByBranch,
  getStaffPasscode,
  setStaffPasscode,
  resetStaffPasscodeToDefault,
} from '../data/studentsData';
import { getAppsScriptUrl } from '../services/admissionService';
import { COURSES_DATA } from '../data/coursesData';
import { printAdmissionRecord, printBranchWiseReport } from '../utils/printReport';
import {
  fetchBranchesFromCentralDb,
  saveBranchToCentralDb,
  deleteBranchFromCentralDb,
  subscribeToBranches,
  fetchAdmissionsFromCentralDb,
  updateAdmissionInCentralDb,
  deleteAdmissionFromCentralDb,
  migrateExistingDataToSupabase,
} from '../services/centralDbService';
import {
  getStoredSupabaseConfig,
  isSupabaseConfigured,
  saveSupabaseConfig,
  testSupabaseConnection,
  type SupabaseConnectionTestResult,
} from '../services/supabaseClient';
import { DashboardStats } from './DashboardStats';
export { DashboardStats };

interface AdminPanelProps {
  onBackToPortal?: () => void;
}

type AdminTab = 'dashboard' | 'admissions' | 'branches' | 'reports' | 'settings';

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBackToPortal }) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>('');
  const [showPasscode, setShowPasscode] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // Active Admin Sub-tab
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Database Data States
  const [branches, setBranches] = useState<Branch[]>([]);
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);

  // Refresh trigger (Queries Central Database directly)
  const refreshData = async () => {
    // 1. Initial quick load from local cache
    setBranches(getStoredBranches());
    setApplications(getStoredApplications());
    setStudents(getStoredStudents());

    // 2. Authoritative load from Central Database
    try {
      const centralBranches = await fetchBranchesFromCentralDb();
      if (centralBranches && centralBranches.length > 0) {
        setBranches(centralBranches);
        setStoredBranches(centralBranches);
      }
    } catch (e) {
      console.warn('Central branches fetch note:', e);
    }

    try {
      const centralAdmissions = await fetchAdmissionsFromCentralDb();
      if (centralAdmissions && centralAdmissions.length > 0) {
        setApplications(centralAdmissions);
        setStoredApplications(centralAdmissions);
      }
    } catch (e) {
      console.warn('Central admissions fetch note:', e);
    }

    fetch('/api/students')
      .then((r) => r.json())
      .then((res) => {
        if (res && res.success && Array.isArray(res.students)) {
          setStudents(res.students);
          setStoredStudents(res.students);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshData();

    // Realtime live subscription to Supabase public.branches
    const unsubscribe = subscribeToBranches((updatedBranches) => {
      if (updatedBranches && updatedBranches.length > 0) {
        setBranches(updatedBranches);
        setStoredBranches(updatedBranches);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Filter States for Admission List
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Selected item modals
  const [viewingApp, setViewingApp] = useState<AdmissionApplication | null>(null);
  const [editingApp, setEditingApp] = useState<AdmissionApplication | null>(null);
  const [deletingAppId, setDeletingAppId] = useState<string | null>(null);

  // Branch Modal States
  const [isAddBranchOpen, setIsAddBranchOpen] = useState<boolean>(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [lastCreatedBranchId, setLastCreatedBranchId] = useState<string | null>(null);

  // Dedicated useEffect hook to refresh the branch list from Supabase upon successful creation of a new branch
  useEffect(() => {
    if (!lastCreatedBranchId) return;

    let isMounted = true;
    const fetchLatestBranches = async () => {
      try {
        const freshBranches = await fetchBranchesFromCentralDb();
        if (isMounted && freshBranches && freshBranches.length > 0) {
          setBranches(freshBranches);
          setStoredBranches(freshBranches);
        }
      } catch (err) {
        console.warn('Error refreshing branches from Supabase after branch creation:', err);
      }
    };

    fetchLatestBranches();

    return () => {
      isMounted = false;
    };
  }, [lastCreatedBranchId]);

  const [branchForm, setBranchForm] = useState({
    id: '',
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    status: 'Active' as 'Active' | 'Inactive',
  });
  const [branchActionMessage, setBranchActionMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Success Toasts
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Report Filter States
  const [reportBranch, setReportBranch] = useState<string>('all');
  const [reportCourse, setReportCourse] = useState<string>('all');
  const [reportFromDate, setReportFromDate] = useState<string>('');
  const [reportToDate, setReportToDate] = useState<string>('');

  // Document Viewer Modal inside Admin
  const [viewingDoc, setViewingDoc] = useState<{
    title: string;
    studentName: string;
    dataUrl: string;
    fileName: string;
  } | null>(null);

  // Password change state
  const [isChangingPass, setIsChangingPass] = useState<boolean>(false);
  const [currentPass, setCurrentPass] = useState<string>('');
  const [newPass, setNewPass] = useState<string>('');
  const [confirmPass, setConfirmPass] = useState<string>('');
  const [passMessage, setPassMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Apps Script Webhook URL setting state
  const [appsScriptUrlInput, setAppsScriptUrlInput] = useState<string>(() => getAppsScriptUrl());
  const [appsScriptSaveNotice, setAppsScriptSaveNotice] = useState<string | null>(null);

  // Supabase Central Database state & test handlers
  const [supabaseUrlInput, setSupabaseUrlInput] = useState<string>(() => getStoredSupabaseConfig().url);
  const [supabaseKeyInput, setSupabaseKeyInput] = useState<string>(() => getStoredSupabaseConfig().anonKey);
  const [showSupabaseKey, setShowSupabaseKey] = useState<boolean>(false);
  const [isTestingSupabase, setIsTestingSupabase] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<SupabaseConnectionTestResult | null>(null);
  const [supabaseSaveNotice, setSupabaseSaveNotice] = useState<{ text: string; isError: boolean } | null>(null);

  const handleTestSupabase = async () => {
    setIsTestingSupabase(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(supabaseUrlInput, supabaseKeyInput);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        url: supabaseUrlInput,
        message: err?.message || 'Connection test failed',
        checks: {
          credentialsFormat: false,
          ping: false,
          admissionsTable: false,
          branchesTable: false,
          storageBucket: false,
        },
      });
    } finally {
      setIsTestingSupabase(false);
    }
  };

  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = supabaseUrlInput.trim();
    const cleanKey = supabaseKeyInput.trim();
    const saved = saveSupabaseConfig(cleanUrl, cleanKey);
    if (saved) {
      setSupabaseSaveNotice({
        text: cleanUrl
          ? 'Supabase configuration saved & client re-initialized!'
          : 'Custom configuration cleared. Reverted to environment variables.',
        isError: false,
      });
      refreshData();
      handleTestSupabase();
    } else {
      setSupabaseSaveNotice({
        text: 'Failed to save configuration to local storage.',
        isError: true,
      });
    }
    setTimeout(() => setSupabaseSaveNotice(null), 4000);
  };


  // Staff Login Handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = passcode.trim();
    const activePass = getStaffPasscode();
    if (clean === activePass || clean === 'admin' || clean === 'kaliabor') {
      setIsAuthenticated(true);
      setAuthError('');
      refreshData();
    } else {
      setAuthError('Incorrect passcode. Default passcode is iait2025.');
    }
  };

  // Handle Password Change
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage(null);
    const activePass = getStaffPasscode();
    if (currentPass.trim() !== activePass && currentPass.trim() !== 'admin' && currentPass.trim() !== 'kaliabor') {
      setPassMessage({ text: 'Current passcode does not match.', isError: true });
      return;
    }
    if (newPass.trim().length < 4) {
      setPassMessage({ text: 'New passcode must be at least 4 characters long.', isError: true });
      return;
    }
    if (newPass.trim() !== confirmPass.trim()) {
      setPassMessage({ text: 'New passcode and confirmation do not match.', isError: true });
      return;
    }
    const success = setStaffPasscode(newPass.trim());
    if (success) {
      setPassMessage({ text: 'Passcode changed successfully!', isError: false });
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setTimeout(() => {
        setIsChangingPass(false);
        setPassMessage(null);
      }, 1800);
    } else {
      setPassMessage({ text: 'Failed to update passcode.', isError: true });
    }
  };

  // Handle Save Apps Script URL
  const handleSaveAppsScriptUrl = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('iait_apps_script_url', appsScriptUrlInput.trim());
      setAppsScriptSaveNotice('Apps Script Web App URL updated successfully!');
      setTimeout(() => setAppsScriptSaveNotice(null), 3000);
    } catch {
      setAppsScriptSaveNotice('Failed to save to local storage.');
    }
  };

  // Filtered Admissions List
  const filteredAdmissions = useMemo(() => {
    return applications.filter((app) => {
      // Branch filter
      if (selectedBranchFilter !== 'all') {
        const targetB = branches.find(
          (b) => b.id === selectedBranchFilter || b.code === selectedBranchFilter || b.name === selectedBranchFilter
        );
        const matchId = targetB ? targetB.id : selectedBranchFilter;
        const matchCode = targetB ? targetB.code.toUpperCase() : selectedBranchFilter.toUpperCase();
        const matchName = targetB ? targetB.name.toLowerCase() : selectedBranchFilter.toLowerCase();

        const appBranchId = (app.branchId || '').trim();
        const appBranchCode = (app.branchCode || '').trim().toUpperCase();
        const appBranchName = (app.branchName || '').trim().toLowerCase();

        const matches =
          appBranchId === matchId ||
          appBranchCode === matchCode ||
          appBranchName === matchName;

        if (!matches) {
          return false;
        }
      }

      // Course filter
      if (selectedCourseFilter !== 'all') {
        if (app.course !== selectedCourseFilter) {
          return false;
        }
      }

      // Date filter
      if (dateFilter) {
        const appDate = app.admissionDate || app.createdAt.split('T')[0];
        if (appDate !== dateFilter) {
          return false;
        }
      }

      // Search term (name, enrollment, phone, UTR)
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const nameMatch = app.studentName.toLowerCase().includes(q);
        const enrollMatch = (app.enrollmentId || '').toLowerCase().includes(q);
        const phoneMatch = (app.phone || '').includes(q);
        const utrMatch = (app.utrNumber || '').toLowerCase().includes(q);
        if (!nameMatch && !enrollMatch && !phoneMatch && !utrMatch) {
          return false;
        }
      }

      return true;
    });
  }, [applications, selectedBranchFilter, selectedCourseFilter, dateFilter, searchTerm, branches]);

  // Dynamic Dashboard Metrics
  const dashboardStats = useMemo(() => {
    const total = applications.length;
    const mainBranchCount = applications.filter(
      (a) => a.branchId === 'branch-main' || a.branchCode === 'MAIN'
    ).length;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayCount = applications.filter((a) => {
      const d = a.admissionDate || a.createdAt.split('T')[0];
      return d === todayStr;
    }).length;

    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthCount = applications.filter((a) => {
      const d = a.admissionDate || a.createdAt.split('T')[0];
      return d.startsWith(currentYearMonth);
    }).length;

    // Branch breakdown
    const branchBreakdown = branches.map((b) => {
      const count = applications.filter(
        (a) =>
          a.branchId === b.id ||
          a.branchCode?.toUpperCase() === b.code.toUpperCase() ||
          a.branchName?.toLowerCase() === b.name.toLowerCase()
      ).length;
      return {
        branch: b,
        admissionsCount: count,
      };
    });

    // Course breakdown
    const courseCounts: Record<string, number> = {};
    applications.forEach((a) => {
      courseCounts[a.course] = (courseCounts[a.course] || 0) + 1;
    });

    return {
      total,
      mainBranchCount,
      todayCount,
      thisMonthCount,
      branchBreakdown,
      courseCounts,
    };
  }, [applications, branches]);

  // Report admissions
  const reportAdmissions = useMemo(() => {
    return applications.filter((app) => {
      if (reportBranch !== 'all') {
        const targetB = branches.find(
          (b) => b.id === reportBranch || b.code === reportBranch || b.name === reportBranch
        );
        const matchId = targetB ? targetB.id : reportBranch;
        const matchCode = targetB ? targetB.code.toUpperCase() : reportBranch.toUpperCase();
        const matchName = targetB ? targetB.name.toLowerCase() : reportBranch.toLowerCase();

        const appBranchId = (app.branchId || '').trim();
        const appBranchCode = (app.branchCode || '').trim().toUpperCase();
        const appBranchName = (app.branchName || '').trim().toLowerCase();

        const matches =
          appBranchId === matchId ||
          appBranchCode === matchCode ||
          appBranchName === matchName;

        if (!matches) {
          return false;
        }
      }
      if (reportCourse !== 'all') {
        if (app.course !== reportCourse) {
          return false;
        }
      }
      const appDate = app.admissionDate || app.createdAt.split('T')[0];
      if (reportFromDate && appDate < reportFromDate) {
        return false;
      }
      if (reportToDate && appDate > reportToDate) {
        return false;
      }
      return true;
    });
  }, [applications, reportBranch, reportCourse, reportFromDate, reportToDate, branches]);

  // Branch CRUD Handlers
  const openAddBranchModal = () => {
    setEditingBranch(null);
    setBranchForm({
      id: '',
      name: '',
      code: '',
      address: '',
      phone: '',
      email: '',
      status: 'Active',
    });
    setBranchActionMessage(null);
    setIsAddBranchOpen(true);
  };

  const openEditBranchModal = (b: Branch) => {
    setEditingBranch(b);
    setBranchForm({
      id: b.id,
      name: b.name,
      code: b.code,
      address: b.address,
      phone: b.phone,
      email: b.email,
      status: b.status,
    });
    setBranchActionMessage(null);
    setIsAddBranchOpen(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBranchActionMessage(null);

    const branchToSave: Branch = editingBranch
      ? {
          ...editingBranch,
          name: branchForm.name,
          code: branchForm.code,
          address: branchForm.address,
          phone: branchForm.phone,
          email: branchForm.email,
          status: branchForm.status,
        }
      : {
          id: `branch-${branchForm.code.toLowerCase()}-${Date.now().toString().slice(-4)}`,
          name: branchForm.name,
          code: branchForm.code,
          address: branchForm.address,
          phone: branchForm.phone,
          email: branchForm.email,
          status: branchForm.status,
          isDefault: false,
          createdAt: new Date().toISOString(),
        };

    // Save to Central Database
    await saveBranchToCentralDb(branchToSave);

    if (editingBranch) {
      updateBranch(branchToSave);
    } else {
      createBranch(branchToSave);
      setLastCreatedBranchId(branchToSave.id);
    }

    showToast(editingBranch ? 'Branch updated successfully in Central Database!' : 'Branch created successfully in Central Database!');
    setIsAddBranchOpen(false);
    await refreshData();
  };

  const handleToggleStatus = async (branch: Branch) => {
    if (branch.isDefault) {
      alert('The Main Branch must always remain Active.');
      return;
    }
    const newStatus: 'Active' | 'Inactive' = branch.status === 'Active' ? 'Inactive' : 'Active';
    const updated = { ...branch, status: newStatus };
    await saveBranchToCentralDb(updated);
    toggleBranchStatus(branch.id);
    showToast(`Branch "${branch.name}" status updated to ${newStatus}.`);
    refreshData();
  };

  const handleDeleteBranch = async (branch: Branch) => {
    if (branch.isDefault) {
      alert('The Main Branch is the institutional anchor and cannot be deleted.');
      return;
    }
    const count = getAdmissionsCountByBranch(branch.id);
    if (count > 0) {
      alert(
        `Cannot delete branch "${branch.name}" because it currently has ${count} registered admission(s). Please deactivate the branch instead to maintain student record integrity.`
      );
      return;
    }
    if (confirm(`Are you sure you want to permanently delete the branch "${branch.name}"?`)) {
      await deleteBranchFromCentralDb(branch.id);
      deleteBranch(branch.id, count);
      fetch(`/api/branches/${branch.id}`, { method: 'DELETE' }).catch((e) => console.warn('Branch delete API note:', e));
      showToast(`Branch "${branch.name}" deleted successfully.`);
      refreshData();
    }
  };

  // Edit Admission Save Handler
  const handleSaveAdmissionEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp) return;

    let branchObj = branches.find((b) => b.id === editingApp.branchId);
    if (!branchObj && editingApp.branchCode) {
      const c = String(editingApp.branchCode).toUpperCase();
      branchObj = branches.find((b) => b.code.toUpperCase() === c);
    }
    if (!branchObj && editingApp.branchName) {
      const n = String(editingApp.branchName).toLowerCase();
      branchObj = branches.find((b) => b.name.toLowerCase() === n);
    }

    const finalBranchId = branchObj?.id || editingApp.branchId || (branches[0]?.id ?? '');
    const finalBranchName = branchObj?.name || editingApp.branchName || (branches[0]?.name ?? 'Institutional Centre');
    const finalBranchCode = branchObj?.code || editingApp.branchCode || (branches[0]?.code ?? 'IC');

    const updates = {
      studentName: editingApp.studentName,
      guardianName: editingApp.guardianName,
      phone: editingApp.phone,
      email: editingApp.email,
      address: editingApp.address,
      dob: editingApp.dob,
      gender: editingApp.gender,
      course: editingApp.course,
      branchId: finalBranchId,
      branchName: finalBranchName,
      branchCode: finalBranchCode,
      batch: editingApp.batch,
      qualification: editingApp.qualification,
      admissionDate: editingApp.admissionDate,
      utrNumber: editingApp.utrNumber,
      status: editingApp.status,
    };

    // Save to Central Database
    await updateAdmissionInCentralDb(editingApp.id, updates);

    // Sync local state
    updateAdmissionRecord(editingApp.id, updates);

    fetch(`/api/admissions/${editingApp.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...editingApp,
        branchId: finalBranchId,
        branchName: finalBranchName,
        branchCode: finalBranchCode,
      }),
    }).catch((e) => console.warn('Admission update API note:', e));

    showToast('Admission record successfully updated in Central Database!');
    setEditingApp(null);
    refreshData();
  };

  // Delete Admission Handler
  const confirmDeleteAdmission = async () => {
    if (!deletingAppId) return;

    // Delete from Central Database
    await deleteAdmissionFromCentralDb(deletingAppId);

    // Sync local state
    deleteAdmissionRecord(deletingAppId);
    fetch(`/api/admissions/${deletingAppId}`, { method: 'DELETE' }).catch((e) => console.warn('Admission delete API note:', e));

    showToast('Admission record deleted from Central Database.');
    setDeletingAppId(null);
    refreshData();
  };

  // Comprehensive CSV Export for Admissions Roster & Branch Reports (Authorized Admin Only)
  const exportAdmissionsToCSV = (records: AdmissionApplication[], filenamePrefix: string) => {
    const headers = [
      'Institutional Enrollment Number',
      'Application Reference ID',
      'Branch ID',
      'Branch Code',
      'Branch Name',
      'Student Name',
      'Father / Mother / Guardian Name',
      'Date of Birth',
      'Gender',
      'Mobile Number',
      'Email Address',
      'Permanent Residential Address',
      'Course / Program',
      'Educational Qualification',
      'Allotted Batch / Shift',
      'Date of Admission',
      'Certificate Serial Number',
      'Roll Number',
      'Payment / UTR Reference',
      'Payment Status',
      'Admission Status',
      'Candidate Photo File',
      'ID Proof File',
      'Marksheet File',
      'Payment Receipt File',
      'Application Created Timestamp',
    ];

    const escapeCell = (val: any) => {
      const str = val === undefined || val === null ? '' : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    let csvContent = '\uFEFF' + headers.join(',') + '\n';

    records.forEach((a) => {
      const bObj = branches.find((b) => b.id === a.branchId || b.code === a.branchCode);
      const bId = a.branchId || bObj?.id || '';
      const bName = a.branchName || bObj?.name || 'Institutional Centre';
      const bCode = a.branchCode || bObj?.code || 'IC';
      const enrollmentNo = String(a.enrollmentId || a.id || '').trim();
      const admDate = a.admissionDate || (a.createdAt ? a.createdAt.split('T')[0] : '');
      const year = admDate ? new Date(admDate).getFullYear() : new Date().getFullYear();
      const certSerial = `IAIT/PROV/${isNaN(year) ? '2026' : year}/${enrollmentNo}`;
      const rollNo = `${a.course}-${enrollmentNo.length >= 4 ? enrollmentNo.slice(-4) : enrollmentNo}`;
      const paymentStatus =
        a.utrNumber && a.utrNumber !== 'SUBMITTED_PRE_PAYMENT' ? 'Paid / Confirmed' : 'Pending Verification';

      const row = [
        escapeCell(enrollmentNo),
        escapeCell(a.id),
        escapeCell(bId),
        escapeCell(bCode),
        escapeCell(bName),
        escapeCell(a.studentName),
        escapeCell(a.guardianName),
        escapeCell(a.dob || ''),
        escapeCell(a.gender || ''),
        escapeCell(a.phone),
        escapeCell(a.email || ''),
        escapeCell(a.address || ''),
        escapeCell(a.course),
        escapeCell(a.qualification || ''),
        escapeCell(a.batch || ''),
        escapeCell(admDate),
        escapeCell(certSerial),
        escapeCell(rollNo),
        escapeCell(a.utrNumber || ''),
        escapeCell(paymentStatus),
        escapeCell(a.status || 'Approved'),
        escapeCell(a.photoName || (a.photoUrl ? 'affixed_photo.jpg' : '')),
        escapeCell(a.idProofName || (a.idProofUrl ? 'id_proof.jpg' : '')),
        escapeCell(a.marksheetName || (a.marksheetUrl ? 'marksheet.jpg' : '')),
        escapeCell(a.receiptName || (a.receiptUrl ? 'receipt.jpg' : '')),
        escapeCell(a.createdAt || admDate),
      ];

      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  // Export current admissions list (honoring branch and other active filters)
  const handleExportAdmissionsCSV = () => {
    const branchObj = branches.find((b) => b.id === selectedBranchFilter);
    const prefix =
      selectedBranchFilter === 'all'
        ? 'IAIT_All_Branches_Admissions'
        : `IAIT_${branchObj?.code || 'Branch'}_Admissions`;
    exportAdmissionsToCSV(filteredAdmissions, prefix);
  };

  // Export current reports table
  const exportReportCSV = () => {
    const branchObj = branches.find((b) => b.id === reportBranch);
    const prefix =
      reportBranch === 'all'
        ? 'IAIT_All_Branches_Report'
        : `IAIT_${branchObj?.code || 'Branch'}_Report`;
    exportAdmissionsToCSV(reportAdmissions, prefix);
  };

  // Print branch-wise audit report cleanly
  const handlePrintBranchReport = () => {
    const selectedBranchObj = branches.find((b) => b.id === reportBranch);
    const branchInfo =
      reportBranch === 'all'
        ? { isAll: true, name: 'All Institutional Branches', code: 'ALL' }
        : {
            isAll: false,
            name: selectedBranchObj?.name || 'Selected Branch',
            code: selectedBranchObj?.code || 'BR',
          };

    printBranchWiseReport(reportAdmissions, branchInfo, {
      course: reportCourse === 'all' ? undefined : reportCourse,
      fromDate: reportFromDate || undefined,
      toDate: reportToDate || undefined,
    });
  };

  // Helper download file
  const downloadFileLocally = (url: string, fileName: string) => {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(url, '_blank');
    }
  };

  // If Not Authenticated, show login form
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-10 w-full max-w-md mx-auto">
        <div className="w-full bg-white rounded-2xl shadow-xl border border-[#dee8ff] p-6 sm:p-8 flex flex-col gap-5">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#00163d] to-[#0051d5] text-white flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[32px]">admin_panel_settings</span>
            </div>
            <h1 className="font-headline text-xl sm:text-2xl font-bold text-[#00163d]">
              Main Admin Portal
            </h1>
            <p className="text-xs text-[#747780]">
              Multi-Branch Admission Control & Registry Governance
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#111c2d] flex items-center justify-between">
                <span>Enter Admin Security Passcode</span>
                <span className="text-[10px] text-[#0051d5] font-semibold">Master Access</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-[#747780] text-[20px]">
                  key
                </span>
                <input
                  type={showPasscode ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  required
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-sm tracking-widest border border-[#dee8ff] focus:outline-none focus:bg-white focus:border-[#0051d5]"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3 text-[#747780] hover:text-[#111c2d] p-1 cursor-pointer"
                  title="Toggle Visibility"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPasscode ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {authError && (
                <span className="text-[11px] text-[#ba1a1a] font-bold mt-0.5">{authError}</span>
              )}
              <div className="flex items-center justify-between text-[11px] text-[#747780] pt-1">
                <span>Default Passcode: iait2025</span>
                <span>(or kaliabor / admin)</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-[#00163d] hover:bg-[#0051d5] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">login</span>
              <span>Unlock Admin Panel</span>
            </button>

            {onBackToPortal && (
              <button
                type="button"
                onClick={onBackToPortal}
                className="w-full py-2.5 text-xs font-semibold text-[#747780] hover:text-[#00163d] transition-colors cursor-pointer"
              >
                ← Return to Student Website
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-20 space-y-6 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-[#00163d] text-white px-4 py-3 rounded-xl shadow-2xl border border-[#316bf3]/30 flex items-center gap-2.5 animate-in slide-in-from-top-3">
          <span className="material-symbols-outlined text-emerald-400 text-[20px]">check_circle</span>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Admin Header Bar */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#00163d] via-[#0f2b5c] to-[#00163d] text-white p-4 sm:p-6 shadow-md border border-[#316bf3]/20">
        <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-[#316bf3]/10 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ffddb8] text-[#2a1700] text-[10px] font-extrabold uppercase tracking-wide">
                <span className="material-symbols-outlined text-[13px]">shield</span>
                MASTER ADMIN DESK
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/70 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                MULTI-BRANCH ACTIVE
              </span>
            </div>
            <h1 className="font-headline text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
              Institute Multi-Branch Admission Administration
            </h1>
            <p className="text-xs text-[#d8e3fb] max-w-2xl leading-relaxed">
              Centrally manage institutional branches, supervise admission flow, edit candidate dossiers, and generate real-time branch reports.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsChangingPass(!isChangingPass)}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/15"
            >
              <span className="material-symbols-outlined text-[16px]">lock_reset</span>
              <span className="hidden sm:inline">Passcode</span>
            </button>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="px-3.5 py-2 rounded-xl bg-[#ba1a1a] hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Change Password Dropdown Panel */}
      {isChangingPass && (
        <form
          onSubmit={handleChangePassword}
          className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm flex flex-col gap-3 animate-in slide-in-from-top-2 text-xs"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-amber-950 font-bold">
              <span className="material-symbols-outlined text-[18px] text-amber-700">security</span>
              <span>Update Admin Security Passcode</span>
            </div>
            <button
              type="button"
              onClick={() => {
                resetStaffPasscodeToDefault();
                setPassMessage({ text: 'Passcode reset to default (iait2025).', isError: false });
              }}
              className="text-[11px] text-amber-800 underline hover:text-amber-950 cursor-pointer"
            >
              Reset to Default (iait2025)
            </button>
          </div>

          {passMessage && (
            <div
              className={`p-2 rounded-lg text-xs font-semibold ${
                passMessage.isError
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              {passMessage.text}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-[#44464f] uppercase">
                Current Passcode <span className="text-red-600">*</span>
              </label>
              <input
                required
                type="password"
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                placeholder="Current key"
                className="px-3 py-2 rounded-lg bg-white border border-amber-300 text-xs focus:outline-none focus:border-[#0051d5]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-[#44464f] uppercase">
                New Passcode <span className="text-red-600">*</span>
              </label>
              <input
                required
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Min 4 characters"
                className="px-3 py-2 rounded-lg bg-white border border-amber-300 text-xs focus:outline-none focus:border-[#0051d5]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-[#44464f] uppercase">
                Confirm New Passcode <span className="text-red-600">*</span>
              </label>
              <input
                required
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Repeat new key"
                className="px-3 py-2 rounded-lg bg-white border border-amber-300 text-xs focus:outline-none focus:border-[#0051d5]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsChangingPass(false)}
              className="px-3 py-1.5 rounded-lg bg-white text-[#44464f] hover:bg-gray-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-[#00163d] hover:bg-[#0051d5] text-white font-bold transition-colors cursor-pointer"
            >
              Save New Passcode
            </button>
          </div>
        </form>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-[#dee8ff]">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'dashboard'
              ? 'bg-[#00163d] text-white shadow-sm'
              : 'bg-white text-[#44464f] hover:bg-[#f0f3ff] border border-[#dee8ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">dashboard</span>
          <span>Branch-Wise Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('admissions')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'admissions'
              ? 'bg-[#00163d] text-white shadow-sm'
              : 'bg-white text-[#44464f] hover:bg-[#f0f3ff] border border-[#dee8ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
          <span>Admissions Management ({applications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('branches')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'branches'
              ? 'bg-[#00163d] text-white shadow-sm'
              : 'bg-white text-[#44464f] hover:bg-[#f0f3ff] border border-[#dee8ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">domain</span>
          <span>Branch Management ({branches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'reports'
              ? 'bg-[#00163d] text-white shadow-sm'
              : 'bg-white text-[#44464f] hover:bg-[#f0f3ff] border border-[#dee8ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">bar_chart</span>
          <span>Branch-Wise Reports</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'settings'
              ? 'bg-[#00163d] text-white shadow-sm'
              : 'bg-white text-[#44464f] hover:bg-[#f0f3ff] border border-[#dee8ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">settings</span>
          <span>Integrations & Server</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 1. DASHBOARD TAB */}
      {/* ========================================================= */}
      {activeTab === 'dashboard' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-150">
          {/* Top Key KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Admissions */}
            <div className="p-4 rounded-2xl bg-white border border-[#dee8ff] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-[#747780]">
                <span className="text-xs font-bold uppercase tracking-wider">Total Admissions</span>
                <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#0051d5] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">groups</span>
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="font-headline text-2xl sm:text-3xl font-extrabold text-[#00163d]">
                  {dashboardStats.total}
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  All Branches
                </span>
              </div>
            </div>

            {/* Main Branch Admissions */}
            <div className="p-4 rounded-2xl bg-white border border-[#dee8ff] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-[#747780]">
                <span className="text-xs font-bold uppercase tracking-wider">Main Branch</span>
                <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">stars</span>
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="font-headline text-2xl sm:text-3xl font-extrabold text-[#00163d]">
                  {dashboardStats.mainBranchCount}
                </span>
                <span className="text-[11px] text-[#747780] font-medium">
                  Headquarters
                </span>
              </div>
            </div>

            {/* Today's Admissions */}
            <div className="p-4 rounded-2xl bg-white border border-[#dee8ff] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-[#747780]">
                <span className="text-xs font-bold uppercase tracking-wider">Today's Admissions</span>
                <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">today</span>
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="font-headline text-2xl sm:text-3xl font-extrabold text-emerald-700">
                  {dashboardStats.todayCount}
                </span>
                <span className="text-[11px] text-[#747780]">Real-time date</span>
              </div>
            </div>

            {/* This Month's Admissions */}
            <div className="p-4 rounded-2xl bg-white border border-[#dee8ff] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-[#747780]">
                <span className="text-xs font-bold uppercase tracking-wider">This Month</span>
                <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="font-headline text-2xl sm:text-3xl font-extrabold text-[#00163d]">
                  {dashboardStats.thisMonthCount}
                </span>
                <span className="text-[11px] text-[#747780]">Current cycle</span>
              </div>
            </div>
          </div>

          {/* D3 Central Visualizer: Admissions by Course (Last 30 Days from Supabase) */}
          <DashboardStats
            onCourseClick={(courseCode) => {
              setSelectedCourseFilter(courseCode);
              setActiveTab('admissions');
            }}
          />

          {/* Individual Branch Breakdown Cards */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-base font-bold text-[#00163d] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0051d5]">location_city</span>
                <span>Branch-Wise Distribution & Center Records</span>
              </h2>
              <button
                onClick={openAddBranchModal}
                className="px-3 py-1.5 rounded-lg bg-[#0051d5] text-white text-xs font-bold hover:bg-[#316bf3] flex items-center gap-1 transition-all cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>Add Branch</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboardStats.branchBreakdown.map(({ branch, admissionsCount }) => {
                const percent = dashboardStats.total > 0 ? Math.round((admissionsCount / dashboardStats.total) * 100) : 0;
                return (
                  <div
                    key={branch.id}
                    className="p-4 rounded-2xl bg-white border border-[#dee8ff] shadow-xs flex flex-col justify-between gap-3 hover:border-[#0051d5] transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <strong className="text-sm font-bold text-[#00163d] truncate">
                            {branch.name}
                          </strong>
                          {branch.isDefault && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[9px] font-extrabold uppercase shrink-0">
                              Main
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#747780] font-mono mt-0.5">
                          Code: {branch.code}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                          branch.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {branch.status}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 bg-[#f0f3ff] p-2.5 rounded-xl text-[11px] text-[#44464f]">
                      <div className="flex items-center justify-between">
                        <span className="text-[#747780]">Admissions Enrolled:</span>
                        <strong className="text-sm font-bold text-[#00163d]">{admissionsCount}</strong>
                      </div>
                      <div className="w-full bg-white rounded-full h-2 overflow-hidden border border-[#dee8ff]">
                        <div
                          className="bg-[#0051d5] h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#747780] pt-0.5">
                        <span>Share of Institute</span>
                        <span className="font-bold text-[#0051d5]">{percent}%</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-[#747780] flex flex-col gap-1">
                      <div className="flex items-center gap-1 truncate">
                        <span className="material-symbols-outlined text-[14px]">pin_drop</span>
                        <span className="truncate">{branch.address}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-[#dee8ff]">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">call</span>
                          {branch.phone}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedBranchFilter(branch.id);
                            setActiveTab('admissions');
                          }}
                          className="text-[#0051d5] font-bold text-xs hover:underline cursor-pointer"
                        >
                          View Students →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Course-Wise Admissions Breakdown */}
          <div className="p-4 rounded-2xl bg-white border border-[#dee8ff] shadow-xs flex flex-col gap-3">
            <h2 className="font-headline text-base font-bold text-[#00163d] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0051d5]">school</span>
              <span>Course-Wise Admissions Statistics</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
              {COURSES_DATA.map((c) => {
                const count = dashboardStats.courseCounts[c.code] || 0;
                return (
                  <div
                    key={c.code}
                    className="p-3 rounded-xl bg-[#f0f3ff] border border-[#dee8ff] flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#00163d] font-mono">{c.code}</span>
                      <span className="text-[10px] text-[#747780] font-medium">{c.duration}</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] text-[#44464f] truncate">{c.shortTitle}</span>
                      <strong className="text-base font-bold text-[#0051d5] ml-1">{count}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. ADMISSIONS MANAGEMENT TAB */}
      {/* ========================================================= */}
      {activeTab === 'admissions' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          {/* Filter & Search Bar */}
          <div className="p-4 rounded-2xl bg-white border border-[#dee8ff] shadow-xs flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Branch Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#44464f] uppercase flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-[#0051d5]">location_city</span>
                  Filter by Branch
                </label>
                <select
                  value={selectedBranchFilter}
                  onChange={(e) => setSelectedBranchFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#f0f3ff] border border-[#dee8ff] text-xs font-semibold text-[#111c2d] focus:outline-none focus:border-[#0051d5]"
                >
                  <option value="all">All Branches ({applications.length})</option>
                  {branches.map((b) => {
                    const count = applications.filter((a) => a.branchId === b.id || a.branchCode === b.code).length;
                    return (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code}) — {count} student(s)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Course Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#44464f] uppercase flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-[#0051d5]">school</span>
                  Filter by Course
                </label>
                <select
                  value={selectedCourseFilter}
                  onChange={(e) => setSelectedCourseFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#f0f3ff] border border-[#dee8ff] text-xs font-semibold text-[#111c2d] focus:outline-none focus:border-[#0051d5]"
                >
                  <option value="all">All Courses</option>
                  {COURSES_DATA.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.shortTitle}
                    </option>
                  ))}
                </select>
              </div>

              {/* Admission Date Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#44464f] uppercase flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-[#0051d5]">calendar_today</span>
                  Filter by Date
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#f0f3ff] border border-[#dee8ff] text-xs text-[#111c2d] focus:outline-none focus:border-[#0051d5]"
                  />
                  {dateFilter && (
                    <button
                      onClick={() => setDateFilter('')}
                      className="px-2 py-2 text-xs text-[#ba1a1a] hover:bg-red-50 rounded-lg cursor-pointer"
                      title="Clear date"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Search Bar */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#44464f] uppercase flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-[#0051d5]">search</span>
                  Search Candidate
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Name, Enrollment No, Phone..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#f0f3ff] border border-[#dee8ff] text-xs text-[#111c2d] focus:outline-none focus:border-[#0051d5]"
                  />
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-[#747780]">
                    search
                  </span>
                </div>
              </div>
            </div>

            {/* Active Filters Summary & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#747780] pt-2 border-t border-[#dee8ff]">
              <div className="flex items-center gap-3">
                <span>
                  Showing <strong>{filteredAdmissions.length}</strong> matching admission record(s)
                </span>
                {(selectedBranchFilter !== 'all' || selectedCourseFilter !== 'all' || dateFilter || searchTerm) && (
                  <button
                    onClick={() => {
                      setSelectedBranchFilter('all');
                      setSelectedCourseFilter('all');
                      setDateFilter('');
                      setSearchTerm('');
                    }}
                    className="text-[#0051d5] font-bold hover:underline cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportAdmissionsCSV}
                  className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  title="Export Current Filtered Admissions to CSV"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Admission Records Table */}
          <div className="rounded-2xl bg-white border border-[#dee8ff] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#00163d] text-white border-b border-[#00163d]">
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Enrollment No</th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Student Name</th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Branch</th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Course</th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Admission Date</th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Mobile Number</th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Status</th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dee8ff]">
                  {filteredAdmissions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#747780]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-[36px] text-gray-300">
                            inventory_2
                          </span>
                          <span className="font-semibold">No admission records found matching current criteria.</span>
                          <span className="text-[11px]">Try adjusting your search query or branch filter.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAdmissions.map((app) => {
                      const branch = branches.find((b) => b.id === app.branchId || b.code === app.branchCode);
                      return (
                        <tr key={app.id} className="hover:bg-[#f8faff] transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-[#0051d5]">
                            {app.enrollmentId || app.id}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-col">
                              <strong className="text-[#00163d] font-semibold">{app.studentName}</strong>
                              <span className="text-[10px] text-[#747780]">C/o {app.guardianName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-[#00163d] font-medium text-[11px] border border-blue-200">
                              <span className="font-bold text-[#0051d5]">{app.branchCode || branch?.code || 'IC'}</span>
                              <span className="truncate max-w-[120px]">{app.branchName || branch?.name || 'Institutional Centre'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-[#111c2d] bg-gray-100 px-2 py-0.5 rounded">
                              {app.course}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[#44464f]">
                            {app.admissionDate || app.createdAt.split('T')[0]}
                          </td>
                          <td className="py-3 px-3 text-[#111c2d] font-mono">
                            {app.phone}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                app.status === 'Approved' || app.status === 'Active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {app.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const bObj = branches.find((b) => b.id === app.branchId || b.code === app.branchCode);
                                  printAdmissionRecord(app, bObj);
                                }}
                                className="p-1.5 rounded-lg bg-blue-100 text-[#0051d5] hover:bg-[#0051d5] hover:text-white transition-colors cursor-pointer"
                                title="Print Official Admission Slip / Card"
                              >
                                <span className="material-symbols-outlined text-[16px]">print</span>
                              </button>
                              <button
                                onClick={() => setViewingApp(app)}
                                className="p-1.5 rounded-lg bg-[#dee8ff] text-[#00163d] hover:bg-[#0051d5] hover:text-white transition-colors cursor-pointer"
                                title="View Complete Details"
                              >
                                <span className="material-symbols-outlined text-[16px]">visibility</span>
                              </button>
                              <button
                                onClick={() => setEditingApp({ ...app })}
                                className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
                                title="Edit Admission"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                              </button>
                              <button
                                onClick={() => setDeletingAppId(app.id)}
                                className="p-1.5 rounded-lg bg-red-100 text-[#ba1a1a] hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                                title="Delete Admission"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. BRANCH MANAGEMENT TAB */}
      {/* ========================================================= */}
      {activeTab === 'branches' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-[#dee8ff] shadow-xs">
            <div>
              <h2 className="font-headline text-base font-bold text-[#00163d]">
                Branch Center Directory & Control
              </h2>
              <p className="text-xs text-[#747780]">
                Configure all authorized study centers, manage address details, activate/deactivate locations safely.
              </p>
            </div>
            <button
              onClick={openAddBranchModal}
              className="px-4 py-2.5 rounded-xl bg-[#00163d] hover:bg-[#0051d5] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_business</span>
              <span>Create New Branch</span>
            </button>
          </div>

          {/* Branches List Table */}
          <div className="rounded-2xl bg-white border border-[#dee8ff] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#00163d] text-white">
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Branch Name</th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Branch Code</th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Address</th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Contact</th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Admissions</th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Status</th>
                    <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dee8ff]">
                  {branches.map((b) => {
                    const admCount = getAdmissionsCountByBranch(b.id);
                    return (
                      <tr key={b.id} className="hover:bg-[#f8faff] transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <strong className="text-sm font-bold text-[#00163d]">{b.name}</strong>
                              {b.isDefault && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[9px] font-black uppercase">
                                  Default Main Branch
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#747780] font-mono">ID: {b.id}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-[#0051d5]">
                          {b.code}
                        </td>
                        <td className="py-3.5 px-3 text-[#44464f] max-w-xs truncate">
                          {b.address}
                        </td>
                        <td className="py-3.5 px-3 text-[#44464f]">
                          <div className="flex flex-col">
                            <span className="font-semibold text-[#111c2d]">{b.phone}</span>
                            <span className="text-[10px] text-[#747780]">{b.email}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-[#00163d]">
                          <span className="px-2 py-1 rounded bg-[#f0f3ff] border border-[#dee8ff]">
                            {admCount} record(s)
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <button
                            onClick={() => handleToggleStatus(b)}
                            disabled={b.isDefault}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all cursor-pointer ${
                              b.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            } ${b.isDefault ? 'opacity-80 cursor-not-allowed' : ''}`}
                            title={b.isDefault ? 'Main branch cannot be deactivated' : 'Click to toggle status'}
                          >
                            {b.status} {b.isDefault ? '• Locked' : ''}
                          </button>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => openEditBranchModal(b)}
                              className="px-2.5 py-1 rounded-lg bg-[#dee8ff] text-[#00163d] hover:bg-[#0051d5] hover:text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[15px]">edit</span>
                              <span>Edit</span>
                            </button>
                            {!b.isDefault && (
                              <button
                                onClick={() => handleDeleteBranch(b)}
                                className="px-2 py-1 rounded-lg bg-red-100 text-[#ba1a1a] hover:bg-red-700 hover:text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                                title="Delete Branch"
                              >
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. REPORTS TAB */}
      {/* ========================================================= */}
      {activeTab === 'reports' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          {/* Report Filter Controls */}
          <div className="p-4 rounded-2xl bg-white border border-[#dee8ff] shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#dee8ff]">
              <div>
                <h2 className="font-headline text-base font-bold text-[#00163d]">
                  Branch-Wise Admission Roster & Auditing Report
                </h2>
                <p className="text-xs text-[#747780]">
                  Generate filtered admission reports by branch, dates, and course with instant print & export options.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintBranchReport}
                  className="px-3 py-2 rounded-xl bg-[#00163d] text-white text-xs font-bold hover:bg-[#0051d5] flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Print Report</span>
                </button>
                <button
                  type="button"
                  onClick={exportReportCSV}
                  className="px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Branch */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#44464f] uppercase">Branch</label>
                <select
                  value={reportBranch}
                  onChange={(e) => setReportBranch(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#f0f3ff] border border-[#dee8ff] text-xs font-semibold text-[#111c2d]"
                >
                  <option value="all">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Course */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#44464f] uppercase">Course</label>
                <select
                  value={reportCourse}
                  onChange={(e) => setReportCourse(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#f0f3ff] border border-[#dee8ff] text-xs font-semibold text-[#111c2d]"
                >
                  <option value="all">All Courses</option>
                  {COURSES_DATA.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.shortTitle}
                    </option>
                  ))}
                </select>
              </div>

              {/* From Date */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#44464f] uppercase">From Date</label>
                <input
                  type="date"
                  value={reportFromDate}
                  onChange={(e) => setReportFromDate(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#f0f3ff] border border-[#dee8ff] text-xs text-[#111c2d]"
                />
              </div>

              {/* To Date */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#44464f] uppercase">To Date</label>
                <input
                  type="date"
                  value={reportToDate}
                  onChange={(e) => setReportToDate(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#f0f3ff] border border-[#dee8ff] text-xs text-[#111c2d]"
                />
              </div>
            </div>
          </div>

          {/* Report Output Printable Table */}
          <div className="p-4 rounded-2xl bg-white border border-[#dee8ff] shadow-xs flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#dee8ff]">
              <div>
                <span className="text-[11px] text-[#747780] uppercase tracking-wider font-bold">
                  Summary Findings
                </span>
                <h3 className="font-headline text-sm font-bold text-[#00163d]">
                  Branch Scope:{' '}
                  <span className="text-[#0051d5]">
                    {reportBranch === 'all'
                      ? 'All Branches'
                      : `${branches.find((b) => b.id === reportBranch)?.name || 'Branch'} (${branches.find((b) => b.id === reportBranch)?.code || 'CODE'})`}
                  </span>{' '}
                  • Total Verified Admissions:{' '}
                  <span className="text-[#0051d5] text-base">{reportAdmissions.length}</span>
                </h3>
              </div>
              <span className="text-[11px] text-[#747780]">
                Generated on: {new Date().toLocaleDateString('en-GB')}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f0f3ff] text-[#00163d] border-b border-[#dee8ff]">
                    <th className="py-2.5 px-3 font-bold">Sl</th>
                    <th className="py-2.5 px-3 font-bold">Enrollment No</th>
                    <th className="py-2.5 px-3 font-bold">Candidate Name</th>
                    <th className="py-2.5 px-3 font-bold">Branch Name & Code</th>
                    <th className="py-2.5 px-3 font-bold">Course</th>
                    <th className="py-2.5 px-3 font-bold">Admission Date</th>
                    <th className="py-2.5 px-3 font-bold">Mobile</th>
                    <th className="py-2.5 px-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dee8ff]">
                  {reportAdmissions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#747780]">
                        No records match the selected report criteria.
                      </td>
                    </tr>
                  ) : (
                    reportAdmissions.map((a, idx) => {
                      const bObj = branches.find((b) => b.id === a.branchId || b.code === a.branchCode);
                      const bName = a.branchName || bObj?.name || 'Unassigned';
                      const bCode = a.branchCode || bObj?.code || 'N/A';
                      return (
                        <tr key={a.id} className="hover:bg-[#f8faff]">
                          <td className="py-2 px-3 text-[#747780]">{idx + 1}</td>
                          <td className="py-2 px-3 font-mono font-bold text-[#0051d5]">
                            {a.enrollmentId || a.id}
                          </td>
                          <td className="py-2 px-3 font-semibold text-[#00163d]">
                            {a.studentName}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-medium text-[#111c2d]">
                              {bName} ({bCode})
                            </span>
                          </td>
                          <td className="py-2 px-3">{a.course}</td>
                          <td className="py-2 px-3 text-[#44464f]">{a.admissionDate || a.createdAt.split('T')[0]}</td>
                          <td className="py-2 px-3 font-mono">{a.phone}</td>
                          <td className="py-2 px-3">
                            <span className="font-semibold text-[#0051d5]">{a.status}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. SETTINGS & INTEGRATIONS TAB */}
      {/* ========================================================= */}
      {activeTab === 'settings' && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-150">
          {/* Google Apps Script Integration */}
          <div className="p-5 rounded-2xl bg-white border border-[#dee8ff] shadow-xs flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">cloud_sync</span>
              </span>
              <div>
                <h3 className="font-headline text-base font-bold text-[#00163d]">
                  Google Apps Script & Server-Side Enrollment Integration
                </h3>
                <p className="text-xs text-[#747780]">
                  Configure your Google Sheets Web App URL for synchronized remote sheets persistence.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveAppsScriptUrl} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#111c2d]">
                  Apps Script Web App Deployment URL
                </label>
                <input
                  type="url"
                  value={appsScriptUrlInput}
                  onChange={(e) => setAppsScriptUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f0f3ff] border border-[#dee8ff] text-xs font-mono text-[#111c2d] focus:outline-none focus:border-[#0051d5]"
                />
                <span className="text-[11px] text-[#747780]">
                  When active, admission form submits directly to this endpoint with LockService atomic locking. If empty or unreachable, the system uses the robust local authoritative sequence (YY + 4-digit serial starting from 1000).
                </span>
              </div>

              {appsScriptSaveNotice && (
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                  {appsScriptSaveNotice}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#00163d] hover:bg-[#0051d5] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Save Webhook Configuration
                </button>
              </div>
            </form>
          </div>

          {/* Supabase Central Database Status, Credentials & Diagnostics */}
          <div className="p-5 rounded-2xl bg-white border border-[#dee8ff] shadow-xs flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-blue-50 text-[#0051d5] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">database</span>
                </span>
                <div>
                  <h3 className="font-headline text-base font-bold text-[#00163d]">
                    Supabase PostgreSQL Central Database & Storage
                  </h3>
                  <p className="text-xs text-[#747780]">
                    Authoritative cloud database for multi-device admissions, real-time branches, and certificate verification.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                style={{
                  backgroundColor: isSupabaseConfigured() ? '#ecfdf5' : '#fffbeb',
                  borderColor: isSupabaseConfigured() ? '#a7f3d0' : '#fde68a',
                  color: isSupabaseConfigured() ? '#065f46' : '#92400e',
                }}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isSupabaseConfigured() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span>
                  {isSupabaseConfigured() ? 'Active / Configured' : 'Missing Configuration'}
                </span>
              </div>
            </div>

            {/* Save Notice */}
            {supabaseSaveNotice && (
              <div
                className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                  supabaseSaveNotice.isError
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {supabaseSaveNotice.isError ? 'error' : 'check_circle'}
                </span>
                <span>{supabaseSaveNotice.text}</span>
              </div>
            )}

            {/* Test Result Diagnostic Card */}
            {testResult && (
              <div
                className={`p-4 rounded-xl text-xs border flex flex-col gap-2.5 ${
                  testResult.success
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50/90 border-amber-300 text-amber-950'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span className="material-symbols-outlined text-[20px]">
                    {testResult.success ? 'verified' : 'warning'}
                  </span>
                  <span>{testResult.message}</span>
                </div>
                {testResult.details && (
                  <p className="text-xs opacity-90 leading-relaxed">{testResult.details}</p>
                )}

                {/* Individual Component Checks */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-black/10 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className={`material-symbols-outlined text-[16px] ${testResult.checks.credentialsFormat ? 'text-emerald-600' : 'text-red-600'}`}>
                      {testResult.checks.credentialsFormat ? 'check_circle' : 'cancel'}
                    </span>
                    <span>Keys Format</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`material-symbols-outlined text-[16px] ${testResult.checks.ping ? 'text-emerald-600' : 'text-red-600'}`}>
                      {testResult.checks.ping ? 'check_circle' : 'cancel'}
                    </span>
                    <span>Database Ping</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`material-symbols-outlined text-[16px] ${testResult.checks.admissionsTable ? 'text-emerald-600' : 'text-red-600'}`}>
                      {testResult.checks.admissionsTable ? 'check_circle' : 'cancel'}
                    </span>
                    <span>public.admissions</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`material-symbols-outlined text-[16px] ${testResult.checks.branchesTable ? 'text-emerald-600' : 'text-red-600'}`}>
                      {testResult.checks.branchesTable ? 'check_circle' : 'cancel'}
                    </span>
                    <span>public.branches</span>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Configuration Form */}
            <form onSubmit={handleSaveSupabaseConfig} className="flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-[#00163d] flex items-center justify-between">
                  <span>Supabase Project URL</span>
                  <span className="font-mono text-[10px] text-[#747780]">VITE_SUPABASE_URL</span>
                </label>
                <input
                  type="text"
                  value={supabaseUrlInput}
                  onChange={(e) => setSupabaseUrlInput(e.target.value)}
                  placeholder="https://your-project-id.supabase.co"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#dee8ff] focus:border-[#0051d5] focus:outline-hidden font-mono text-xs bg-white text-[#111c2d]"
                />
                <span className="text-[11px] text-[#747780]">
                  Found in your Supabase Dashboard &rarr; Project Settings &rarr; API &rarr; Project URL.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-[#00163d] flex items-center justify-between">
                  <span>Supabase Anon Public API Key</span>
                  <span className="font-mono text-[10px] text-[#747780]">VITE_SUPABASE_ANON_KEY</span>
                </label>
                <div className="relative">
                  <input
                    type={showSupabaseKey ? 'text' : 'password'}
                    value={supabaseKeyInput}
                    onChange={(e) => setSupabaseKeyInput(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[#dee8ff] focus:border-[#0051d5] focus:outline-hidden font-mono text-xs bg-white text-[#111c2d]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSupabaseKey(!showSupabaseKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#747780] hover:text-[#00163d]"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showSupabaseKey ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <span className="text-[11px] text-[#747780]">
                  Found in Supabase Dashboard &rarr; Project Settings &rarr; API &rarr; Project API keys &rarr; <code>anon public</code>.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleTestSupabase}
                  disabled={isTestingSupabase}
                  className="px-4 py-2 rounded-xl bg-blue-50 text-[#0051d5] hover:bg-blue-100 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <span className={`material-symbols-outlined text-[16px] ${isTestingSupabase ? 'animate-spin' : ''}`}>
                    {isTestingSupabase ? 'sync' : 'network_check'}
                  </span>
                  {isTestingSupabase ? 'Testing Connection...' : 'Test Connection'}
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0051d5] text-white hover:bg-[#0041b0] font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  Save & Connect
                </button>

                {(supabaseUrlInput || supabaseKeyInput) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSupabaseUrlInput('');
                      setSupabaseKeyInput('');
                      saveSupabaseConfig('', '');
                      setTestResult(null);
                      setSupabaseSaveNotice({
                        text: 'Custom credentials cleared. Now using default environment variables.',
                        isError: false,
                      });
                      refreshData();
                    }}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-[#747780] hover:text-red-600 hover:bg-red-50 text-xs transition-all cursor-pointer"
                  >
                    Reset to .env Defaults
                  </button>
                )}
              </div>
            </form>

            {/* Vercel Deployment Instructions Box */}
            <div className="p-4 rounded-xl bg-[#f0f3ff] border border-[#dee8ff] flex flex-col gap-3 text-xs">
              <div className="flex items-center gap-2 font-bold text-[#00163d]">
                <span className="material-symbols-outlined text-[18px] text-[#0051d5]">cloud_upload</span>
                <span>How to deploy to Vercel.com with Supabase:</span>
              </div>

              <div className="space-y-2 text-[11px] text-[#44464f] leading-relaxed">
                <div>
                  <strong>Step 1:</strong> Push or import this repository into your Vercel account at{' '}
                  <a href="https://vercel.com/new" target="_blank" rel="noopener noreferrer" className="text-[#0051d5] font-semibold underline">
                    vercel.com/new
                  </a>. Vercel automatically detects the Vite framework and runs <code>npm run build</code>.
                </div>
                <div>
                  <strong>Step 2 (Vercel Environment Variables):</strong> In Vercel Project Settings &rarr; <strong>Environment Variables</strong>, add:
                  <div className="mt-1.5 p-2 bg-white rounded-lg border border-[#dee8ff] font-mono text-[10px] space-y-1">
                    <div><span className="text-[#0051d5] font-bold">VITE_SUPABASE_URL</span> = https://your-project.supabase.co</div>
                    <div><span className="text-[#0051d5] font-bold">VITE_SUPABASE_ANON_KEY</span> = your-supabase-anon-key</div>
                  </div>
                  <span className="text-[10px] text-[#747780] block mt-1">
                    *Select Production, Preview, and Development, then click Save and Redeploy.
                  </span>
                </div>
                <div>
                  <strong>Step 3 (Database Schema in Supabase):</strong> In your Supabase Dashboard, open <strong>SQL Editor</strong> &rarr; click <strong>New Query</strong> &rarr; copy & paste the schema from <code className="font-mono text-[#0051d5] bg-white px-1 py-0.5 rounded border border-[#dee8ff]">supabase/schema.sql</code> &rarr; click <strong>Run</strong>.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: VIEW ADMISSION DOSSIER & DOCUMENTS */}
      {/* ========================================================= */}
      {viewingApp && (
        <div className="fixed inset-0 z-50 bg-[#00163d]/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-[#dee8ff] flex flex-col max-h-[90vh]">
            <div className="bg-[#00163d] text-white p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#afc6ff] uppercase tracking-wider font-bold block">
                  Official Admission Dossier
                </span>
                <h3 className="font-headline text-base font-bold text-white">
                  {viewingApp.studentName} • Enrollment No: {viewingApp.enrollmentId || viewingApp.id}
                </h3>
              </div>
              <button
                onClick={() => setViewingApp(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4 text-xs">
              {/* Photo & Core Bio */}
              <div className="flex items-start gap-4 p-3 rounded-xl bg-[#f0f3ff] border border-[#dee8ff]">
                {viewingApp.photoUrl ? (
                  <img
                    src={viewingApp.photoUrl}
                    alt={viewingApp.studentName}
                    className="w-16 h-16 rounded-xl object-cover border border-[#dee8ff] shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-[#00163d] text-white font-bold flex items-center justify-center text-lg shrink-0">
                    {viewingApp.studentName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#747780] block text-[9px] uppercase font-bold">Student Name</span>
                    <strong className="text-sm text-[#00163d]">{viewingApp.studentName}</strong>
                  </div>
                  <div>
                    <span className="text-[#747780] block text-[9px] uppercase font-bold">Guardian</span>
                    <span className="text-[#111c2d] font-semibold">{viewingApp.guardianName}</span>
                  </div>
                  <div>
                    <span className="text-[#747780] block text-[9px] uppercase font-bold">Assigned Branch</span>
                    <strong className="text-[#0051d5]">
                      {viewingApp.branchName || 'Institutional Centre'} ({viewingApp.branchCode || 'IC'})
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#747780] block text-[9px] uppercase font-bold">Course & Shift</span>
                    <span className="text-[#111c2d] font-semibold">{viewingApp.course} • {viewingApp.batch}</span>
                  </div>
                </div>
              </div>

              {/* Contact & Biodata */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl border border-[#dee8ff]">
                <div>
                  <span className="text-[#747780] block text-[9px] uppercase font-bold">Mobile</span>
                  <span className="font-mono text-[#111c2d] font-semibold">{viewingApp.phone}</span>
                </div>
                <div>
                  <span className="text-[#747780] block text-[9px] uppercase font-bold">Email</span>
                  <span className="text-[#111c2d] truncate block">{viewingApp.email}</span>
                </div>
                <div>
                  <span className="text-[#747780] block text-[9px] uppercase font-bold">DOB & Gender</span>
                  <span className="text-[#111c2d]">{viewingApp.dob} ({viewingApp.gender})</span>
                </div>
                <div>
                  <span className="text-[#747780] block text-[9px] uppercase font-bold">Qualification</span>
                  <span className="text-[#111c2d]">{viewingApp.qualification}</span>
                </div>
                <div>
                  <span className="text-[#747780] block text-[9px] uppercase font-bold">Admission Date</span>
                  <span className="text-[#111c2d]">{viewingApp.admissionDate || viewingApp.createdAt.split('T')[0]}</span>
                </div>
                <div>
                  <span className="text-[#747780] block text-[9px] uppercase font-bold">UTR Reference</span>
                  <span className="font-mono text-emerald-700 font-bold">{viewingApp.utrNumber}</span>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-[#747780] block text-[9px] uppercase font-bold">Permanent Address</span>
                  <span className="text-[#111c2d]">{viewingApp.address}</span>
                </div>
              </div>

              {/* Uploaded Attachments */}
              <div className="flex flex-col gap-2 pt-1 border-t border-[#dee8ff]">
                <span className="text-[10px] font-bold text-[#747780] uppercase tracking-wider">
                  Verification Documents & Attachments:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Photo */}
                  {viewingApp.photoUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setViewingDoc({
                          title: 'Student Passport Photo',
                          studentName: viewingApp.studentName,
                          dataUrl: viewingApp.photoUrl!,
                          fileName: `${viewingApp.studentName}_photo.jpg`,
                        })
                      }
                      className="p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#00163d] flex flex-col items-center gap-1 border border-blue-200 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px] text-[#0051d5]">account_box</span>
                      <span className="font-bold text-[10px]">Photo</span>
                    </button>
                  )}

                  {/* ID Proof */}
                  {viewingApp.idProofUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setViewingDoc({
                          title: 'Government Identity Proof',
                          studentName: viewingApp.studentName,
                          dataUrl: viewingApp.idProofUrl!,
                          fileName: `${viewingApp.studentName}_idproof.jpg`,
                        })
                      }
                      className="p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#00163d] flex flex-col items-center gap-1 border border-blue-200 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px] text-[#0051d5]">badge</span>
                      <span className="font-bold text-[10px] truncate max-w-[90px]">ID Proof</span>
                    </button>
                  )}

                  {/* Marksheet */}
                  {viewingApp.marksheetUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setViewingDoc({
                          title: 'Academic Marksheet',
                          studentName: viewingApp.studentName,
                          dataUrl: viewingApp.marksheetUrl!,
                          fileName: `${viewingApp.studentName}_marksheet.jpg`,
                        })
                      }
                      className="p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#00163d] flex flex-col items-center gap-1 border border-blue-200 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px] text-[#0051d5]">description</span>
                      <span className="font-bold text-[10px] truncate max-w-[90px]">Marksheet</span>
                    </button>
                  )}

                  {/* Receipt */}
                  {viewingApp.receiptUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setViewingDoc({
                          title: 'Fee Payment Receipt',
                          studentName: viewingApp.studentName,
                          dataUrl: viewingApp.receiptUrl!,
                          fileName: `${viewingApp.studentName}_receipt.jpg`,
                        })
                      }
                      className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 flex flex-col items-center gap-1 border border-emerald-200 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px] text-emerald-700">receipt</span>
                      <span className="font-bold text-[10px] truncate max-w-[90px]">Fee Receipt</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3 bg-white border-t border-[#dee8ff] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewingApp(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#44464f] font-semibold text-xs cursor-pointer"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const bObj = branches.find((b) => b.id === viewingApp.branchId || b.code === viewingApp.branchCode);
                    printAdmissionRecord(viewingApp, bObj);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0051d5] font-bold text-xs flex items-center gap-1.5 border border-blue-200 transition-colors cursor-pointer"
                  title="Print Official Admission Slip"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Print Slip / Dossier</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingApp({ ...viewingApp });
                    setViewingApp(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#0051d5] hover:bg-[#316bf3] text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  <span>Edit This Admission</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: EDIT ADMISSION MODAL */}
      {/* ========================================================= */}
      {editingApp && (
        <div className="fixed inset-0 z-50 bg-[#00163d]/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-[#dee8ff] flex flex-col max-h-[90vh]">
            <div className="bg-[#00163d] text-white p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-amber-300 uppercase tracking-wider font-bold block">
                  Modify Admission Record
                </span>
                <h3 className="font-headline text-base font-bold text-white">
                  Edit: {editingApp.studentName} ({editingApp.enrollmentId || editingApp.id})
                </h3>
              </div>
              <button
                onClick={() => setEditingApp(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdmissionEdit} className="p-5 flex-1 overflow-y-auto flex flex-col gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-blue-50 text-[#00163d] border border-blue-200 text-[11px] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#0051d5]">lock</span>
                <span>
                  Original Enrollment ID: <strong className="font-mono">{editingApp.enrollmentId || editingApp.id}</strong> (Preserved & Immutable)
                </span>
              </div>

              {/* Student Name & Guardian */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#44464f]">Student Name *</label>
                  <input
                    required
                    type="text"
                    value={editingApp.studentName}
                    onChange={(e) => setEditingApp({ ...editingApp, studentName: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-[#dee8ff] focus:outline-none focus:border-[#0051d5]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#44464f]">Guardian Name *</label>
                  <input
                    required
                    type="text"
                    value={editingApp.guardianName}
                    onChange={(e) => setEditingApp({ ...editingApp, guardianName: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-[#dee8ff] focus:outline-none focus:border-[#0051d5]"
                  />
                </div>
              </div>

              {/* Branch Assignment */}
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                <label className="text-[11px] font-bold text-[#00163d] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-[#0051d5]">location_city</span>
                  <span>Assigned Branch *</span>
                </label>
                <select
                  required
                  value={(() => {
                    const matched = branches.find(
                      (b) =>
                        b.id === editingApp.branchId ||
                        (editingApp.branchCode && b.code.toUpperCase() === editingApp.branchCode.toUpperCase()) ||
                        (editingApp.branchName && b.name.toLowerCase() === editingApp.branchName.toLowerCase())
                    );
                    return matched?.id || editingApp.branchId || (branches[0]?.id ?? '');
                  })()}
                  onChange={(e) => {
                    const b = branches.find((item) => item.id === e.target.value);
                    if (b) {
                      setEditingApp({
                        ...editingApp,
                        branchId: b.id,
                        branchName: b.name,
                        branchCode: b.code,
                      });
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-white border border-blue-300 font-semibold text-xs text-[#00163d]"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#44464f]">Mobile Number *</label>
                  <input
                    required
                    type="tel"
                    value={editingApp.phone}
                    onChange={(e) => setEditingApp({ ...editingApp, phone: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-[#dee8ff] focus:outline-none focus:border-[#0051d5]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#44464f]">Email Address</label>
                  <input
                    type="email"
                    value={editingApp.email}
                    onChange={(e) => setEditingApp({ ...editingApp, email: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-[#dee8ff] focus:outline-none focus:border-[#0051d5]"
                  />
                </div>
              </div>

              {/* Course & Shift */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#44464f]">Course *</label>
                  <select
                    required
                    value={editingApp.course}
                    onChange={(e) => setEditingApp({ ...editingApp, course: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-[#dee8ff] focus:outline-none focus:border-[#0051d5]"
                  >
                    {COURSES_DATA.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.shortTitle}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#44464f]">Batch Shift</label>
                  <select
                    value={editingApp.batch}
                    onChange={(e) => setEditingApp({ ...editingApp, batch: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-[#dee8ff] focus:outline-none focus:border-[#0051d5]"
                  >
                    <option value="Morning Shift">Morning Shift (8:00 AM - 11:30 AM)</option>
                    <option value="Afternoon Shift">Afternoon Shift (1:30 PM - 5:00 PM)</option>
                  </select>
                </div>
              </div>

              {/* Date & UTR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#44464f]">Admission Date</label>
                  <input
                    type="date"
                    value={editingApp.admissionDate || editingApp.createdAt.split('T')[0]}
                    onChange={(e) => setEditingApp({ ...editingApp, admissionDate: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-[#dee8ff] focus:outline-none focus:border-[#0051d5]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#44464f]">UTR Ref *</label>
                  <input
                    required
                    type="text"
                    value={editingApp.utrNumber}
                    onChange={(e) => setEditingApp({ ...editingApp, utrNumber: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-[#dee8ff] font-mono focus:outline-none focus:border-[#0051d5]"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#44464f]">Application Status</label>
                <select
                  value={editingApp.status}
                  onChange={(e) => setEditingApp({ ...editingApp, status: e.target.value as any })}
                  className="px-3 py-2 rounded-xl border border-[#dee8ff] focus:outline-none focus:border-[#0051d5]"
                >
                  <option value="Approved">Approved</option>
                  <option value="Active">Active</option>
                  <option value="Pending Verification">Pending Verification</option>
                </select>
              </div>

              {/* Address */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#44464f]">Postal Address</label>
                <textarea
                  rows={2}
                  value={editingApp.address}
                  onChange={(e) => setEditingApp({ ...editingApp, address: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-[#dee8ff] focus:outline-none focus:border-[#0051d5]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#dee8ff]">
                <button
                  type="button"
                  onClick={() => setEditingApp(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#44464f] font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0051d5] hover:bg-[#316bf3] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ADD / EDIT BRANCH MODAL */}
      {/* ========================================================= */}
      {isAddBranchOpen && (
        <div className="fixed inset-0 z-50 bg-[#00163d]/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#dee8ff] flex flex-col">
            <div className="bg-[#00163d] text-white p-4 flex items-center justify-between">
              <h3 className="font-headline text-base font-bold text-white">
                {editingBranch ? `Edit Branch: ${editingBranch.name}` : 'Create New Institute Branch'}
              </h3>
              <button
                onClick={() => setIsAddBranchOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="p-5 flex flex-col gap-3.5 text-xs">
              {branchActionMessage && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-semibold ${
                    branchActionMessage.isError
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {branchActionMessage.text}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#44464f]">
                    Branch Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={branchForm.name}
                    onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                    placeholder="e.g. Nagaon Town Branch"
                    className="px-3 py-2 rounded-xl border border-[#dee8ff] focus:outline-none focus:border-[#0051d5]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#44464f]">
                    Branch Code (Unique) <span className="text-red-600">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={branchForm.code}
                    onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. NGN, TEZ, GHY"
                    className="px-3 py-2 rounded-xl border border-[#dee8ff] font-mono uppercase focus:outline-none focus:border-[#0051d5]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#44464f]">
                  Address <span className="text-red-600">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  placeholder="Street / Landmark, City, District, PIN (e.g. Haibargaon, Nagaon - 782002)"
                  className="px-3 py-2 rounded-xl border border-[#dee8ff] focus:outline-none focus:border-[#0051d5]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#44464f]">
                    Contact Number <span className="text-red-600">*</span>
                  </label>
                  <input
                    required
                    type="tel"
                    value={branchForm.phone}
                    onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                    placeholder="9435012399"
                    className="px-3 py-2 rounded-xl border border-[#dee8ff] focus:outline-none focus:border-[#0051d5]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#44464f]">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={branchForm.email}
                    onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                    placeholder="branch@iaitassam.in"
                    className="px-3 py-2 rounded-xl border border-[#dee8ff] focus:outline-none focus:border-[#0051d5]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#44464f]">Branch Status</label>
                <select
                  value={branchForm.status}
                  disabled={editingBranch?.isDefault}
                  onChange={(e) => setBranchForm({ ...branchForm, status: e.target.value as any })}
                  className="px-3 py-2 rounded-xl border border-[#dee8ff] focus:outline-none focus:border-[#0051d5]"
                >
                  <option value="Active">Active (Accepting Admissions)</option>
                  <option value="Inactive">Inactive (Suspended)</option>
                </select>
                {editingBranch?.isDefault && (
                  <span className="text-[10px] text-amber-800 font-semibold">
                    The Main Branch status cannot be set to Inactive.
                  </span>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#dee8ff]">
                <button
                  type="button"
                  onClick={() => setIsAddBranchOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#44464f] font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00163d] hover:bg-[#0051d5] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>{editingBranch ? 'Update Branch' : 'Create Branch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: CONFIRM DELETE ADMISSION MODAL */}
      {/* ========================================================= */}
      {deletingAppId && (
        <div className="fixed inset-0 z-50 bg-[#00163d]/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-red-200 flex flex-col gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-[#ba1a1a] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[28px]">warning</span>
            </div>
            <h3 className="font-headline text-base font-bold text-[#ba1a1a]">
              Confirm Admission Deletion
            </h3>
            <p className="text-xs text-[#44464f] leading-relaxed">
              Are you sure you want to permanently delete this admission record from the database? This action is irreversible.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingAppId(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#44464f] font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAdmission}
                className="px-4 py-2 rounded-xl bg-[#ba1a1a] hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                Yes, Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: DOCUMENT PREVIEW & DOWNLOAD */}
      {/* ========================================================= */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 bg-[#00163d]/70 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#dee8ff] flex flex-col max-h-[90vh]">
            <div className="bg-[#00163d] text-white p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#afc6ff] uppercase tracking-wider font-bold block">
                  {viewingDoc.title}
                </span>
                <h3 className="font-headline text-sm font-bold text-white">
                  {viewingDoc.studentName}
                </h3>
              </div>
              <button
                onClick={() => setViewingDoc(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto flex flex-col items-center justify-center bg-[#f0f3ff] min-h-[260px]">
              <img
                src={viewingDoc.dataUrl}
                alt={viewingDoc.title}
                className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-md border border-[#dee8ff]"
              />
              <span className="text-[11px] text-[#747780] font-mono mt-2">{viewingDoc.fileName}</span>
            </div>

            <div className="p-3 bg-white border-t border-[#dee8ff] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#44464f] font-semibold text-xs cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => downloadFileLocally(viewingDoc.dataUrl, viewingDoc.fileName)}
                className="px-4 py-2 rounded-xl bg-[#0051d5] hover:bg-[#316bf3] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Download Document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

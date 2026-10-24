import { AdmissionApplication, StudentRecord } from '../types';
import { submitAdmissionToCentralDb, AdmissionSubmissionData } from './centralDbService';
import { getBranchById, getStoredBranches } from '../data/branchesData';

export interface AdmissionSubmissionResult {
  success: boolean;
  enrollmentNumber: string;
  applicationId: string;
  admission?: AdmissionApplication;
  student?: StudentRecord;
  error?: string;
}

/**
 * Gets the configured Google Apps Script Web App URL if available.
 * Can be configured via environment variable VITE_GOOGLE_APPS_SCRIPT_URL
 * or via localStorage 'iait_apps_script_url'.
 */
export function getAppsScriptUrl(): string {
  try {
    const fromEnv = (import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL;
    if (fromEnv && fromEnv.trim()) return fromEnv.trim();
    const fromStorage = localStorage.getItem('iait_apps_script_url');
    if (fromStorage && fromStorage.trim()) return fromStorage.trim();
  } catch {
    // Ignore storage errors
  }
  return '';
}

/**
 * Authoritative Central Admission Submission Service
 * 
 * Execution Architecture:
 * 1. Validates and accurately resolves branch metadata without overwriting user selections.
 * 2. Connects to the CENTRAL PERSISTENT DATABASE (Supabase PostgreSQL / Cloud Storage).
 * 3. The Central Database generates the sequential enrollment number (YY1000, YY1001...).
 * 4. Uploads student photo, ID proof, marksheet, and payment receipt to central cloud storage.
 * 5. Saves authoritative records in the central admissions and students tables.
 * 6. Admission is considered successful ONLY after the central database confirms the save.
 * 7. If the central database cannot be reached, raises an explicit error:
 *    "Unable to save admission. Please check your internet connection and try again."
 */
export async function submitAdmissionToServer(
  data: Omit<AdmissionApplication, 'id' | 'enrollmentId' | 'status' | 'createdAt'>,
  metadata?: { admissionYear?: number }
): Promise<AdmissionSubmissionResult> {
  // Validate and accurately resolve branch metadata
  let branchId = data.branchId;
  let branchName = data.branchName;
  let branchCode = data.branchCode;

  if (branchId && (!branchName || !branchCode)) {
    const b = getBranchById(branchId);
    if (b) {
      branchName = branchName || b.name;
      branchCode = branchCode || b.code;
    }
  }
  if (branchCode && (!branchId || !branchName)) {
    const b = getBranchById(branchCode);
    if (b) {
      branchId = branchId || b.id;
      branchName = branchName || b.name;
    }
  }
  if (branchName && (!branchId || !branchCode)) {
    const b = getBranchById(branchName);
    if (b) {
      branchId = branchId || b.id;
      branchCode = branchCode || b.code;
    }
  }

  // Resolve branch dynamically from central database / stored cache
  const resolved = (branchId ? getBranchById(branchId) : null) || (branchCode ? getBranchById(branchCode) : null);
  if (resolved) {
    branchId = branchId || resolved.id;
    branchName = branchName || resolved.name;
    branchCode = branchCode || resolved.code;
  }

  // Fallback only if completely omitted
  if (!branchId && !branchName && !branchCode) {
    const defaultBranch = getStoredBranches().find((b) => b.isDefault) || getStoredBranches()[0];
    branchId = defaultBranch?.id || '';
    branchName = defaultBranch?.name || 'Institutional Centre';
    branchCode = defaultBranch?.code || 'IC';
  } else {
    branchId = branchId || (branchCode ? `branch-${branchCode.toLowerCase()}` : '');
    branchName = branchName || 'Institutional Centre';
    branchCode = branchCode || 'IC';
  }

  console.log(`[AdmissionService] Submitting admission for ${data.studentName} to branch ${branchName} (${branchCode}) via Central Database...`);

  const payload: AdmissionSubmissionData = {
    branchId,
    branchName,
    branchCode,
    studentName: data.studentName.trim(),
    guardianName: data.guardianName.trim() || 'Guardian',
    dob: data.dob || '2005-01-01',
    gender: data.gender || 'Male',
    phone: data.phone.trim(),
    email: data.email.trim(),
    address: data.address.trim() || 'Assam, India',
    course: data.course.trim(),
    qualification: data.qualification || '10+2 (HS Passed)',
    batch: data.batch || 'Morning Shift',
    admissionDate: data.admissionDate || new Date().toISOString().split('T')[0],
    photoUrl: data.photoUrl,
    photoName: data.photoName,
    idProofName: data.idProofName,
    idProofUrl: data.idProofUrl,
    marksheetName: data.marksheetName,
    marksheetUrl: data.marksheetUrl,
    utrNumber: data.utrNumber.trim() || 'SUBMITTED',
    receiptName: data.receiptName,
    receiptUrl: data.receiptUrl,
  };

  try {
    const result = await submitAdmissionToCentralDb(payload, metadata);

    if (result && result.success) {
      // Optional: Background notification to Apps Script if configured
      const scriptUrl = getAppsScriptUrl();
      if (scriptUrl) {
        fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'submitAdmission',
            enrollmentNumber: result.enrollmentNumber,
            applicationId: result.applicationId,
            ...payload,
          }),
        }).catch((e) => console.warn('[AdmissionService] Apps Script background sync note:', e));
      }

      return {
        success: true,
        enrollmentNumber: result.enrollmentNumber,
        applicationId: result.applicationId,
        admission: result.admission,
        student: result.student,
      };
    }

    throw new Error('Database did not return a valid enrollment confirmation.');
  } catch (err: any) {
    console.error('[AdmissionService] Central Database submission failed:', err);
    return {
      success: false,
      enrollmentNumber: '',
      applicationId: '',
      error: err?.message || 'Unable to save admission. Please check your internet connection and try again.',
    };
  }
}

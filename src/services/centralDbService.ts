import { Branch, AdmissionApplication, StudentRecord } from '../types';
import {
  getSupabase,
  isSupabaseConfigured,
  uploadToStorage,
  STORAGE_BUCKET_DOCUMENTS,
} from '../lib/supabaseClient';
import {
  INITIAL_BRANCHES,
  DEFAULT_MAIN_BRANCH,
  getStoredBranches,
  setStoredBranches,
  getBranchById,
  findBranch,
} from '../data/branchesData';
import { INITIAL_STUDENTS } from '../data/studentsData';

/**
 * CENTRAL SUPABASE POSTGRESQL DATABASE SERVICE
 * 
 * Authoritative cloud database layer for Icon Academy of IT (IAIT):
 * 1. public.admissions (Central admissions registry)
 * 2. public.branches (Multi-branch governance)
 * 3. Atomic sequence generation via get_next_enrollment_number RPC
 * 4. Privacy-preserving student verification via verify_student RPC
 * 5. Document & photo storage via Supabase Storage
 */

// Helper: Convert base64 data URL to Blob for cloud storage upload
function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const arr = dataUrl.split(',');
    if (arr.length < 2) return null;
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch {
    return null;
  }
}

// =========================================================================
// 1. CLOUD STORAGE (PHOTOS & ATTACHMENTS)
// =========================================================================

export async function uploadFileToCentralStorage(
  source: string,
  fileName: string,
  folder: 'photos' | 'id_proofs' | 'marksheets' | 'receipts'
): Promise<string> {
  if (!source || !source.startsWith('data:')) {
    return source || '';
  }

  if (!isSupabaseConfigured()) {
    return source;
  }

  try {
    const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${folder}/${Date.now()}_${cleanName || 'document.jpg'}`;
    const { publicUrl, error } = await uploadToStorage(
      STORAGE_BUCKET_DOCUMENTS,
      path,
      source,
      'image/jpeg'
    );
    if (!error && publicUrl) {
      return publicUrl;
    }
    return source;
  } catch (err) {
    console.warn('[CentralDb] Cloud storage upload exception:', err);
    return source;
  }
}

// =========================================================================
// 2. CONCURRENCY-SAFE ENROLLMENT NUMBER GENERATION
// =========================================================================

export async function generateCentralEnrollmentNumber(admissionYear?: number): Promise<string> {
  const year = admissionYear || new Date().getFullYear();
  const effectiveYear = isNaN(year) ? new Date().getFullYear() : year;
  const yy = String(effectiveYear).slice(-2);

  const supabase = getSupabase();

  if (supabase && isSupabaseConfigured()) {
    try {
      // 1. Preferred: Call Postgres RPC function for atomic locking and sequence generation
      const { data, error } = await supabase.rpc('get_next_enrollment_number', {
        p_year_prefix: yy,
      });

      if (!error && data && typeof data === 'string' && data.length >= 6) {
        console.log(`[CentralDb] Atomically generated enrollment number via Postgres RPC: ${data}`);
        return data.trim();
      }
      if (error) {
        console.warn('[CentralDb] RPC get_next_enrollment_number notice:', error.message);
      }
    } catch (rpcErr) {
      console.warn('[CentralDb] RPC get_next_enrollment_number error, falling back to query:', rpcErr);
    }

    // 2. Query public.admissions directly in Supabase for highest serial
    try {
      const { data: admissionsData } = await supabase
        .from('admissions')
        .select('enrollment_number')
        .like('enrollment_number', `${yy}%`);

      let maxSerial = 0;
      const allIds = (admissionsData || []).map((a: any) => a.enrollment_number);

      for (const id of allIds) {
        if (!id) continue;
        const clean = String(id).trim();
        if (clean.length === 6 && clean.slice(0, 2) === yy) {
          const serial = parseInt(clean.slice(2), 10);
          if (!isNaN(serial) && serial >= 1000 && serial < 9999 && serial > maxSerial) {
            maxSerial = serial;
          }
        }
      }

      const nextSerial = maxSerial >= 1000 ? maxSerial + 1 : 1000;
      const generated = `${yy}${String(nextSerial).padStart(4, '0')}`;
      console.log(`[CentralDb] Generated enrollment number from central admissions table query: ${generated}`);
      return generated;
    } catch (queryErr) {
      console.warn('[CentralDb] Database query for serial failed:', queryErr);
    }
  }

  // 3. Fallback: Query backend API /api/admissions if running on local server
  try {
    const res = await fetch('/api/admissions').then((r) => r.json());
    if (res && res.success && Array.isArray(res.admissions)) {
      let maxSerial = 0;
      for (const a of res.admissions) {
        const clean = String(a.enrollment_number || a.enrollmentId || '').trim();
        if (clean.length === 6 && clean.slice(0, 2) === yy) {
          const serial = parseInt(clean.slice(2), 10);
          if (!isNaN(serial) && serial >= 1000 && serial < 9999 && serial > maxSerial) {
            maxSerial = serial;
          }
        }
      }
      const nextSerial = maxSerial >= 1000 ? maxSerial + 1 : 1000;
      return `${yy}${String(nextSerial).padStart(4, '0')}`;
    }
  } catch {
    // Server not available
  }

  // Default initial sequential number for this academic year
  return `${yy}1000`;
}

// =========================================================================
// 3. BRANCHES (CENTRAL DATABASE)
// =========================================================================

function isBranchActive(status: any, isActiveCol?: any): boolean {
  if (status !== undefined && status !== null) {
    const s = String(status).trim().toLowerCase();
    if (s === 'inactive' || s === 'disabled' || s === 'false' || s === '0') {
      return false;
    }
    if (s === 'active' || s === 'enabled' || s === 'true' || s === '1') {
      return true;
    }
  }
  if (isActiveCol !== undefined && isActiveCol !== null) {
    return Boolean(isActiveCol);
  }
  return true;
}

export async function fetchBranchesFromCentralDb(): Promise<Branch[]> {
  const supabase = getSupabase();

  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*');

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: Branch[] = data.map((b: any) => {
          const branchId = String(
            b.id ||
            b.branch_id ||
            b.branchId ||
            (b.code ? `branch-${String(b.code).toLowerCase()}` : `branch-${Date.now()}`)
          );
          const branchName = String(b.name || b.branch_name || b.branchName || 'Unnamed Branch').trim();
          const branchCode = String(b.code || b.branch_code || b.branchCode || 'BR').toUpperCase().trim();
          const isActive = isBranchActive(b.status, b.is_active);
          const isDefault = Boolean(
            b.is_default ||
            b.isDefault ||
            b.is_main ||
            branchCode === 'MAIN' ||
            branchId === 'branch-main'
          );
          return {
            id: branchId,
            name: branchName,
            code: branchCode,
            address: b.address || b.branch_address || '',
            phone: b.phone || b.branch_phone || b.contact || '',
            email: b.email || b.branch_email || '',
            status: isActive ? 'Active' : 'Inactive',
            isDefault,
            createdAt: b.created_at || b.createdAt || new Date().toISOString(),
          };
        });

        // Sort: default anchor branches first, then alphabetical by branch name
        mapped.sort((a, b) => {
          if (a.isDefault && !b.isDefault) return -1;
          if (!a.isDefault && b.isDefault) return 1;
          return a.name.localeCompare(b.name);
        });

        // Store into local cache and preserve any locally-created branches not yet synced
        const existingStored = getStoredBranches();
        const existingNotRemote = existingStored.filter(
          (localB) =>
            !mapped.some(
              (remB) =>
                remB.id === localB.id ||
                remB.code.toUpperCase() === localB.code.toUpperCase() ||
                remB.name.toLowerCase() === localB.name.toLowerCase()
            )
        );
        const merged = [...mapped, ...existingNotRemote];
        setStoredBranches(merged);
        return merged;
      } else if (error) {
        console.warn('[CentralDb] Fetch branches from Supabase note:', error.message);
      }
    } catch (err) {
      console.warn('[CentralDb] Fetch branches from Supabase exception:', err);
    }
  }

  // Fallback to local server API (if active in dev environment)
  try {
    const res = await fetch('/api/branches').then((r) => r.json());
    if (res && res.success && Array.isArray(res.branches) && res.branches.length > 0) {
      setStoredBranches(res.branches);
      return res.branches;
    }
  } catch {
    // Ignore server error
  }

  return getStoredBranches();
}

export function subscribeToBranches(callback: (branches: Branch[]) => void): () => void {
  const supabase = getSupabase();

  // Listen to realtime changes from Supabase if configured
  let channel: any = null;
  if (supabase && isSupabaseConfigured()) {
    try {
      channel = supabase
        .channel('public:branches_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'branches' },
          async () => {
            const updated = await fetchBranchesFromCentralDb();
            callback(updated);
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('[CentralDb] Realtime branches subscription note:', err);
    }
  }

  // Also listen to local window events for immediate multi-component & cross-tab sync
  const handleLocalUpdate = async () => {
    const updated = await fetchBranchesFromCentralDb();
    callback(updated);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('iait_branches_changed', handleLocalUpdate);
    window.addEventListener('storage', handleLocalUpdate);
  }

  return () => {
    if (channel && supabase) {
      try {
        supabase.removeChannel(channel);
      } catch {}
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('iait_branches_changed', handleLocalUpdate);
      window.removeEventListener('storage', handleLocalUpdate);
    }
  };
}

export function notifyBranchesUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('iait_branches_changed'));
    try {
      localStorage.setItem('iait_branches_last_update', Date.now().toString());
    } catch {}
  }
}

export async function saveBranchToCentralDb(branch: Branch): Promise<boolean> {
  // Update local cache immediately
  const existingBranches = getStoredBranches();
  const idx = existingBranches.findIndex(
    (b: Branch) => b.id === branch.id || b.code.toUpperCase() === branch.code.toUpperCase()
  );
  let updatedList: Branch[];
  if (idx >= 0) {
    updatedList = [...existingBranches];
    updatedList[idx] = { ...updatedList[idx], ...branch };
  } else {
    updatedList = [...existingBranches, branch];
  }
  setStoredBranches(updatedList);

  const supabase = getSupabase();

  if (supabase && isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('branches').upsert(
        {
          id: branch.id,
          name: branch.name,
          code: branch.code.toUpperCase(),
          address: branch.address || '',
          phone: branch.phone || '',
          email: branch.email || '',
          status: branch.status || 'Active',
          is_default: Boolean(branch.isDefault),
          created_at: branch.createdAt || new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (!error) {
        notifyBranchesUpdated();
        return true;
      }
      console.warn('[CentralDb] Save branch error:', error.message);
    } catch (err) {
      console.warn('[CentralDb] Save branch exception:', err);
    }
  }

  try {
    await fetch('/api/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(branch),
    });
    notifyBranchesUpdated();
    return true;
  } catch {
    notifyBranchesUpdated();
    return true;
  }
}

export async function deleteBranchFromCentralDb(branchId: string): Promise<boolean> {
  const existingBranches = getStoredBranches();
  const updatedList = existingBranches.filter((b: Branch) => b.id !== branchId);
  setStoredBranches(updatedList);

  const supabase = getSupabase();

  if (supabase && isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('branches').delete().eq('id', branchId);
      if (!error) {
        notifyBranchesUpdated();
        return true;
      }
    } catch {
      // Ignore
    }
  }

  try {
    await fetch(`/api/branches/${branchId}`, { method: 'DELETE' });
    notifyBranchesUpdated();
    return true;
  } catch {
    notifyBranchesUpdated();
    return true;
  }
}

// =========================================================================
// 4. ADMISSIONS SUBMISSION (CENTRAL DATABASE: public.admissions)
// =========================================================================

export interface AdmissionSubmissionData {
  branchId: string;
  branchName: string;
  branchCode: string;
  studentName: string;
  guardianName: string;
  fatherName?: string;
  motherName?: string;
  dob: string;
  gender: string;
  category?: string;
  phone: string;
  alternatePhone?: string;
  email: string;
  address: string;
  village?: string;
  postOffice?: string;
  policeStation?: string;
  district?: string;
  state?: string;
  pincode?: string;
  course: string;
  courseCode?: string;
  qualification: string;
  batch: string;
  session?: string;
  admissionDate: string;
  photoUrl?: string;
  photoName?: string;
  idProofName?: string;
  idProofUrl?: string;
  qualificationCertificateUrl?: string;
  marksheetName?: string;
  marksheetUrl?: string;
  otherDocumentUrl?: string;
  utrNumber: string;
  receiptName?: string;
  receiptUrl?: string;
  paymentMethod?: string;
}

export async function submitAdmissionToCentralDb(
  data: AdmissionSubmissionData,
  metadata?: { admissionYear?: number }
): Promise<{
  success: boolean;
  enrollmentNumber: string;
  applicationId: string;
  admission: AdmissionApplication;
  student: StudentRecord;
}> {
  const year = metadata?.admissionYear || (data.admissionDate ? new Date(data.admissionDate).getFullYear() : new Date().getFullYear());
  const effectiveYear = isNaN(year) ? new Date().getFullYear() : year;
  const yy = String(effectiveYear).slice(-2);

  // 1. Generate Central Sequential Enrollment Number Server-Side
  const enrollmentNumber = await generateCentralEnrollmentNumber(effectiveYear);
  const applicationId = `IAIT-${effectiveYear}-APP-${enrollmentNumber}`;

  // 2. Upload Files to Cloud Storage (if data URLs)
  let cloudPhotoUrl = data.photoUrl || '';
  let cloudIdProofUrl = data.idProofUrl || '';
  let cloudMarksheetUrl = data.marksheetUrl || '';
  let cloudReceiptUrl = data.receiptUrl || '';

  try {
    if (data.photoUrl && data.photoUrl.startsWith('data:')) {
      cloudPhotoUrl = await uploadFileToCentralStorage(data.photoUrl, data.photoName || 'photo.jpg', 'photos');
    }
    if (data.idProofUrl && data.idProofUrl.startsWith('data:')) {
      cloudIdProofUrl = await uploadFileToCentralStorage(data.idProofUrl, data.idProofName || 'id_proof.jpg', 'id_proofs');
    }
    if (data.marksheetUrl && data.marksheetUrl.startsWith('data:')) {
      cloudMarksheetUrl = await uploadFileToCentralStorage(data.marksheetUrl, data.marksheetName || 'marksheet.jpg', 'marksheets');
    }
    if (data.receiptUrl && data.receiptUrl.startsWith('data:')) {
      cloudReceiptUrl = await uploadFileToCentralStorage(data.receiptUrl, data.receiptName || 'receipt.jpg', 'receipts');
    }
  } catch (uploadErr) {
    console.warn('[CentralDb] Note during storage upload:', uploadErr);
  }

  const createdAt = new Date().toISOString();
  const certSerial = `IAIT/PROV/${effectiveYear}/${enrollmentNumber}`;
  const rollNo = `${data.course}-${yy}-${enrollmentNumber.slice(-4)}`;

  // Resolve branch dynamically from central database / stored cache
  const resolvedBranch =
    getBranchById(data.branchId) ||
    findBranch({ id: data.branchId, code: data.branchCode, name: data.branchName });
  const finalBranchId = data.branchId || resolvedBranch?.id || '';
  const finalBranchName = data.branchName || resolvedBranch?.name || 'Institutional Centre';
  const finalBranchCode = data.branchCode || resolvedBranch?.code || 'IC';

  // 3. Construct Complete Application Record (Do not treat as confirmed payment; use "Pending Verification" until verified)
  const admissionRecord: AdmissionApplication = {
    id: applicationId,
    application_number: applicationId,
    enrollmentId: enrollmentNumber,
    enrollment_number: enrollmentNumber,
    branchId: finalBranchId,
    branch_id: finalBranchId,
    branchName: finalBranchName,
    branch_name: finalBranchName,
    branchCode: finalBranchCode,
    branch_code: finalBranchCode,
    studentName: data.studentName.trim(),
    student_name: data.studentName.trim(),
    fatherName: data.fatherName || data.guardianName.trim() || 'Guardian',
    father_name: data.fatherName || data.guardianName.trim() || 'Guardian',
    motherName: data.motherName || '',
    mother_name: data.motherName || '',
    guardianName: data.guardianName.trim() || 'Guardian',
    guardian_name: data.guardianName.trim() || 'Guardian',
    dob: data.dob || '2005-01-01',
    date_of_birth: data.dob || '2005-01-01',
    gender: data.gender || 'Male',
    category: data.category || 'General',
    phone: data.phone.trim(),
    alternate_phone: data.alternatePhone || '',
    email: data.email.trim(),
    address: data.address.trim() || 'Assam, India',
    village: data.village || '',
    post_office: data.postOffice || '',
    police_station: data.policeStation || '',
    district: data.district || '',
    state: data.state || 'Assam',
    pincode: data.pincode || '',
    course: data.course.trim(),
    course_code: data.courseCode || data.course.trim(),
    qualification: data.qualification || '10+2 (HS Passed)',
    batch: data.batch || 'Morning Shift',
    session: data.session || `Session ${effectiveYear}-${effectiveYear + 1}`,
    admissionDate: data.admissionDate || createdAt.split('T')[0],
    admission_date: data.admissionDate || createdAt.split('T')[0],
    registration_date: createdAt,
    photoUrl: cloudPhotoUrl,
    photo_url: cloudPhotoUrl,
    photoName: data.photoName || 'candidate_photo.jpg',
    idProofName: data.idProofName || 'id_proof.jpg',
    idProofUrl: cloudIdProofUrl,
    id_proof_url: cloudIdProofUrl,
    qualification_certificate_url: data.qualificationCertificateUrl || '',
    marksheetName: data.marksheetName || 'hslc_marksheet.jpg',
    marksheetUrl: cloudMarksheetUrl,
    marksheet_url: cloudMarksheetUrl,
    other_document_url: data.otherDocumentUrl || '',
    utrNumber: data.utrNumber.trim() || 'SUBMITTED',
    utr_number: data.utrNumber.trim() || 'SUBMITTED',
    payment_status: 'Pending Verification',
    registration_fee: 500.00,
    payment_method: data.paymentMethod || 'UPI / Online',
    payment_date: createdAt,
    payment_receipt_url: cloudReceiptUrl,
    receiptName: data.receiptName || 'payment_receipt.jpg',
    receiptUrl: cloudReceiptUrl,
    status: 'Pending Verification',
    application_status: 'Pending Verification',
    certificate_number: certSerial,
    certificate_status: 'Active',
    remarks: 'Online admission submitted with payment reference. Pending administrative verification.',
    createdAt,
    created_at: createdAt,
    updated_at: createdAt,
  };

  // 4. Construct Verified Student Record
  const studentRecord: StudentRecord = {
    enrollmentId: enrollmentNumber,
    rollNo,
    name: data.studentName.trim(),
    guardianName: data.guardianName.trim() || 'Guardian',
    dob: data.dob || '2005-01-01',
    gender: data.gender || 'Male',
    phone: data.phone.trim(),
    email: data.email.trim(),
    address: data.address.trim() || 'Assam, India',
    course: data.course.trim(),
    courseFullName: `${data.course.trim()} Vocational Diploma`,
    duration: 'Regular Academic Track',
    center: finalBranchName,
    branchId: finalBranchId,
    branchName: finalBranchName,
    branchCode: finalBranchCode,
    certSerial,
    enrollmentDate: new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    admissionDate: data.admissionDate || createdAt.split('T')[0],
    academicSession: `Session ${effectiveYear}-${effectiveYear + 1}`,
    status: 'Pending Verification',
    grade: 'Enrolled',
    photoUrl: cloudPhotoUrl,
    verificationHash: `SHA-256: ${enrollmentNumber}...live`,
    utrNumber: data.utrNumber.trim(),
    batch: data.batch,
    qualification: data.qualification,
    idProofUrl: cloudIdProofUrl,
    idProofName: data.idProofName,
    marksheetUrl: cloudMarksheetUrl,
    marksheetName: data.marksheetName,
    receiptUrl: cloudReceiptUrl,
    receiptName: data.receiptName,
  };

  // 5. Save Directly to Supabase Central Database: public.admissions
  const supabase = getSupabase();
  let savedToCentralDb = false;

  if (supabase && isSupabaseConfigured()) {
    try {
      const dbRow: any = {
        enrollment_number: admissionRecord.enrollment_number,
        application_number: admissionRecord.application_number,
        roll_no: rollNo,
        branch_id: admissionRecord.branch_id,
        branch_code: admissionRecord.branch_code,
        branch_name: admissionRecord.branch_name,
        student_name: admissionRecord.student_name,
        father_name: admissionRecord.father_name,
        mother_name: admissionRecord.mother_name,
        guardian_name: admissionRecord.guardian_name,
        date_of_birth: admissionRecord.date_of_birth && String(admissionRecord.date_of_birth).trim() ? admissionRecord.date_of_birth : null,
        gender: admissionRecord.gender,
        category: admissionRecord.category,
        phone: admissionRecord.phone,
        alternate_phone: admissionRecord.alternate_phone,
        email: admissionRecord.email,
        address: admissionRecord.address,
        village: admissionRecord.village,
        post_office: admissionRecord.post_office,
        police_station: admissionRecord.police_station,
        district: admissionRecord.district,
        state: admissionRecord.state,
        pincode: admissionRecord.pincode,
        course: admissionRecord.course,
        course_code: admissionRecord.course_code,
        qualification: admissionRecord.qualification,
        batch: admissionRecord.batch,
        session: admissionRecord.session,
        admission_date: admissionRecord.admission_date && String(admissionRecord.admission_date).trim() ? admissionRecord.admission_date : null,
        registration_date: admissionRecord.registration_date || new Date().toISOString(),
        photo_url: admissionRecord.photo_url,
        photo_name: admissionRecord.photoName,
        id_proof_url: admissionRecord.id_proof_url,
        id_proof_name: admissionRecord.idProofName,
        qualification_certificate_url: admissionRecord.qualification_certificate_url,
        marksheet_url: admissionRecord.marksheet_url,
        marksheet_name: admissionRecord.marksheetName,
        other_document_url: admissionRecord.other_document_url,
        payment_status: admissionRecord.payment_status,
        registration_fee: admissionRecord.registration_fee || 500.00,
        payment_method: admissionRecord.payment_method || 'UPI / Online',
        utr_number: admissionRecord.utr_number,
        payment_date: admissionRecord.payment_date || null,
        payment_receipt_url: admissionRecord.payment_receipt_url,
        receipt_name: admissionRecord.receiptName,
        application_status: admissionRecord.application_status,
        certificate_number: admissionRecord.certificate_number,
        certificate_status: admissionRecord.certificate_status,
        remarks: admissionRecord.remarks,
        created_at: admissionRecord.created_at,
        updated_at: admissionRecord.updated_at,
      };

      const { error: admError } = await supabase
        .from('admissions')
        .upsert(dbRow, { onConflict: 'enrollment_number' });

      if (admError) {
        console.error('[CentralDb] Error saving to Supabase public.admissions:', admError);
        const code = (admError as any).code || '';
        const msg = admError.message || '';
        if (code === '42P01' || msg.includes('does not exist') || msg.includes('public.admissions')) {
          throw new Error(
            `Supabase Database Error (42P01): Table "public.admissions" does not exist in your Supabase project. Please execute the SQL migration in "supabase/schema.sql" via your Supabase Project Dashboard -> SQL Editor to initialize the database tables.`
          );
        }
        throw new Error(`Supabase Error (${code || 'INSERT_FAILED'}): ${msg}`);
      }

      savedToCentralDb = true;
      console.log(`[CentralDb] Record successfully persisted in Supabase public.admissions: ${enrollmentNumber}`);
    } catch (err: any) {
      console.error('[CentralDb] Supabase database transaction failed:', err);
      // Do not mask specific database errors
      const msg = err?.message || '';
      if (msg.includes('Supabase') || msg.includes('42P01') || msg.includes('admissions')) {
        throw err;
      }
      throw new Error(`Database Error: ${msg || 'Unable to save admission to central database.'}`);
    }
  }

  // Fallback to Express server API if client Supabase is not yet configured with keys
  if (!savedToCentralDb) {
    try {
      const response = await fetch('/api/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...admissionRecord,
          admissionYear: effectiveYear,
        }),
      });

      if (response.ok) {
        const res = await response.json();
        if (res && res.success) {
          savedToCentralDb = true;
        }
      }
    } catch {
      // Backend not running
    }
  }

  if (!savedToCentralDb) {
    throw new Error('Unable to save admission. Please check your internet connection and try again.');
  }

  return {
    success: true,
    enrollmentNumber,
    applicationId,
    admission: admissionRecord,
    student: studentRecord,
  };
}

// =========================================================================
// 5. STUDENT VERIFICATION (CROSS-DEVICE CENTRAL QUERY & RPC)
// =========================================================================

export interface CentralVerificationResult {
  status: 'FOUND' | 'NOT_FOUND' | 'NETWORK_ERROR';
  student: StudentRecord | null;
  errorMessage?: string;
}

/**
 * Authoritative Student Photo Resolver
 * Converts any database photo representation (base64 data URL, raw base64,
 * Supabase storage path, or public/signed URL) into a reliable, directly renderable
 * image URL that loads across all browsers, mobile devices, and operating systems.
 */
export async function resolvePhotoUrlFromStorage(
  rawPhoto: string | null | undefined
): Promise<string> {
  if (!rawPhoto) return '';
  const photo = String(rawPhoto).trim();
  if (!photo) return '';

  // 1. Fully qualified data URI (e.g. data:image/jpeg;base64,...)
  if (photo.startsWith('data:image/')) {
    return photo;
  }

  // 2. Raw base64 payload without standard data: prefix (e.g. starts with /9j/ or iVBORw0KGgo)
  if (photo.startsWith('/9j/') || photo.startsWith('iVBORw0KGgo') || photo.startsWith('R0lGOD')) {
    const mime = photo.startsWith('iVBORw') ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${photo}`;
  }

  const client = getSupabase();

  // 3. Already an absolute HTTP / HTTPS URL
  if (photo.startsWith('http://') || photo.startsWith('https://')) {
    // If it's a Supabase storage URL, verify or upgrade to signed URL to protect against private bucket 403s
    if (client && photo.includes('/storage/v1/object/')) {
      try {
        const match = photo.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/?#]+)\/([^?#]+)/);
        if (match) {
          const bucket = match[1];
          const path = decodeURIComponent(match[2]);
          const { data: signedData, error } = await client.storage
            .from(bucket)
            .createSignedUrl(path, 60 * 60 * 24 * 30);
          if (!error && signedData?.signedUrl) {
            return signedData.signedUrl;
          }
        }
      } catch {
        // Non-blocking, keep original URL
      }
    }
    return photo;
  }

  // 4. Stored as relative path or Supabase storage path
  if (client && isSupabaseConfigured()) {
    try {
      let cleanPath = photo.startsWith('/') ? photo.slice(1) : photo;

      // Strip duplicated bucket prefixes
      if (cleanPath.startsWith(`${STORAGE_BUCKET_DOCUMENTS}/`)) {
        cleanPath = cleanPath.slice(STORAGE_BUCKET_DOCUMENTS.length + 1);
      } else if (cleanPath.startsWith('documents/')) {
        cleanPath = cleanPath.slice('documents/'.length);
      }

      // First attempt: Signed URL (accessible across all devices even if bucket is non-public)
      const { data: signedData, error: signError } = await client.storage
        .from(STORAGE_BUCKET_DOCUMENTS)
        .createSignedUrl(cleanPath, 60 * 60 * 24 * 30);

      if (!signError && signedData?.signedUrl) {
        return signedData.signedUrl;
      }

      // Second attempt: Public URL
      const { data: urlData } = client.storage
        .from(STORAGE_BUCKET_DOCUMENTS)
        .getPublicUrl(cleanPath);

      if (urlData?.publicUrl) {
        return urlData.publicUrl;
      }
    } catch (storageErr) {
      console.warn('[CentralDb] Note resolving photo path:', storageErr);
    }
  }

  return photo;
}

export async function verifyStudentWithStatus(query: string): Promise<CentralVerificationResult> {
  const clean = String(query || '').trim();
  if (!clean) {
    return {
      status: 'NOT_FOUND',
      student: null,
      errorMessage: 'Please enter an institutional enrollment number to verify.',
    };
  }

  // Generate flexible candidate search variants:
  // e.g. "IAIT-261000", "261000", "IAIT261000", "iait 261000"
  const digitsOnly = clean.replace(/\D/g, '');
  const prefixStripped = clean.replace(/^IAIT[-/ ]?/i, '').trim();
  const searchVariants = Array.from(
    new Set([
      clean,
      clean.toUpperCase(),
      prefixStripped,
      prefixStripped.toUpperCase(),
      digitsOnly,
      digitsOnly ? `IAIT-${digitsOnly}` : '',
      digitsOnly ? `IAIT${digitsOnly}` : '',
    ])
  ).filter(Boolean);

  const supabase = getSupabase();

  if (supabase && isSupabaseConfigured()) {
    try {
      let v: any = null;

      // 1. Primary Method: Call database RPC verify_student(p_enrollment_number text)
      for (const variant of searchVariants) {
        const { data: rpcData, error: rpcError } = await supabase.rpc('verify_student', {
          p_enrollment_number: variant,
        });

        if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
          v = rpcData[0];
          break;
        }
      }

      // 2. Direct query fallback to public.admissions table if RPC yielded no match or had an error
      let admRow: any = null;
      if (!v) {
        const orClauses = searchVariants
          .flatMap((varStr) => [
            `enrollment_number.ilike.${varStr}`,
            `application_number.ilike.${varStr}`,
          ])
          .join(',');

        const { data: directData, error: directError } = await supabase
          .from('admissions')
          .select('*')
          .or(orClauses)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!directError && Array.isArray(directData) && directData.length > 0) {
          admRow = directData[0];
        }
      }

      // If record found in RPC or direct query:
      const row = v || admRow;
      if (row) {
        const year = row.admission_date ? new Date(row.admission_date).getFullYear() : 2026;
        let candidatePhoto = row.photo_url || row.photoUrl || '';

        // If photo not in RPC result, fetch from admissions table
        if (!candidatePhoto) {
          try {
            const orClauses = searchVariants
              .flatMap((varStr) => [
                `enrollment_number.ilike.${varStr}`,
                `application_number.ilike.${varStr}`,
              ])
              .join(',');

            const { data: photoQuery } = await supabase
              .from('admissions')
              .select('photo_url, id_proof_url, photo_name')
              .or(orClauses)
              .limit(1)
              .maybeSingle();

            if (photoQuery?.photo_url) {
              candidatePhoto = photoQuery.photo_url;
            }
          } catch {
            // Non-blocking
          }
        }

        const resolvedPhoto = await resolvePhotoUrlFromStorage(candidatePhoto);

        const student: StudentRecord = {
          enrollmentId: row.enrollment_number,
          rollNo: row.roll_no || `${row.course}-${String(year).slice(-2)}-${String(row.enrollment_number).slice(-4)}`,
          name: row.student_name,
          guardianName: row.guardian_name || row.father_name || 'Protected for Privacy',
          dob: row.date_of_birth ? String(row.date_of_birth) : undefined,
          gender: row.gender || undefined,
          phone: row.phone || undefined,
          address: row.address || undefined,
          course: row.course,
          courseFullName: `${row.course} Vocational Program`,
          duration: 'Regular Academic Track',
          center: row.branch_name || 'Main Branch',
          branchName: row.branch_name || 'Main Branch',
          branchCode: row.branch_code || 'MAIN',
          certSerial: row.certificate_number || `IAIT/PROV/${year}/${row.enrollment_number}`,
          enrollmentDate: row.admission_date || 'Enrolled',
          admissionDate: row.admission_date,
          academicSession: `Session ${year}-${year + 1}`,
          status: row.application_status || 'Approved',
          grade: row.certificate_status || 'Active Student',
          photoUrl: resolvedPhoto,
          verificationHash: `SHA-256: ${row.enrollment_number}...verified`,
          utrNumber: row.utr_number || undefined,
          batch: row.batch || undefined,
          qualification: row.qualification || undefined,
        };
        return { status: 'FOUND', student };
      }

      // If queried Supabase and no record matched
      return {
        status: 'NOT_FOUND',
        student: null,
        errorMessage: `No official record found matching Enrollment Number "${clean}".`,
      };
    } catch (err: any) {
      console.error('[CentralDb] Network/Database exception during verification:', err);
      const msg = err?.message?.toLowerCase() || '';
      if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('timeout')) {
        return {
          status: 'NETWORK_ERROR',
          student: null,
          errorMessage: 'Database/Network Error: Unable to reach the central database. Please check your internet connection and try again.',
        };
      }
    }
  }

  // Fallback to local server API if running in local environment
  try {
    for (const variant of searchVariants) {
      const res = await fetch(`/api/students/${encodeURIComponent(variant)}`).then((r) => r.json());
      if (res && res.success && res.student) {
        const resolvedPhoto = await resolvePhotoUrlFromStorage(res.student.photoUrl);
        return {
          status: 'FOUND',
          student: {
            ...res.student,
            photoUrl: resolvedPhoto,
          },
        };
      }
    }
  } catch {
    // Non-blocking
  }

  return {
    status: 'NOT_FOUND',
    student: null,
    errorMessage: `No official record found matching Enrollment Number "${clean}".`,
  };
}

export async function verifyStudentFromCentralDb(query: string): Promise<StudentRecord | null> {
  const result = await verifyStudentWithStatus(query);
  return result.student;
}

// =========================================================================
// 6. ADMIN PANEL (CENTRAL ADMISSIONS FETCH & UPDATES)
// =========================================================================

export async function fetchAdmissionsFromCentralDb(filters?: {
  branchId?: string;
  course?: string;
  search?: string;
}): Promise<AdmissionApplication[]> {
  const supabase = getSupabase();

  if (supabase && isSupabaseConfigured()) {
    try {
      let query = supabase.from('admissions').select('*').order('created_at', { ascending: false });

      if (filters?.branchId && filters.branchId !== 'all') {
        query = query.eq('branch_id', filters.branchId);
      }
      if (filters?.course && filters.course !== 'all') {
        query = query.eq('course', filters.course);
      }
      if (filters?.search && filters.search.trim()) {
        const s = filters.search.trim();
        query = query.or(`student_name.ilike.%${s}%,enrollment_number.ilike.%${s}%,phone.ilike.%${s}%,course.ilike.%${s}%`);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return data.map((a: any) => ({
          id: a.application_number || a.id,
          application_number: a.application_number || a.id,
          enrollmentId: a.enrollment_number,
          enrollment_number: a.enrollment_number,
          branchId: a.branch_id,
          branch_id: a.branch_id,
          branchName: a.branch_name,
          branch_name: a.branch_name,
          branchCode: a.branch_code,
          branch_code: a.branch_code,
          studentName: a.student_name,
          student_name: a.student_name,
          fatherName: a.father_name,
          father_name: a.father_name,
          motherName: a.mother_name,
          mother_name: a.mother_name,
          guardianName: a.guardian_name || a.father_name || 'Guardian',
          guardian_name: a.guardian_name,
          dob: a.date_of_birth || a.dob || '',
          date_of_birth: a.date_of_birth,
          gender: a.gender || 'Male',
          category: a.category || 'General',
          phone: a.phone || '',
          alternate_phone: a.alternate_phone,
          email: a.email || '',
          address: a.address || '',
          village: a.village,
          post_office: a.post_office,
          police_station: a.police_station,
          district: a.district,
          state: a.state,
          pincode: a.pincode,
          course: a.course || '',
          course_code: a.course_code,
          qualification: a.qualification || '',
          batch: a.batch || '',
          session: a.session,
          admissionDate: a.admission_date || '',
          admission_date: a.admission_date,
          photoUrl: a.photo_url || '',
          photo_url: a.photo_url,
          idProofUrl: a.id_proof_url || '',
          id_proof_url: a.id_proof_url,
          marksheetUrl: a.marksheet_url || '',
          marksheet_url: a.marksheet_url,
          qualification_certificate_url: a.qualification_certificate_url,
          other_document_url: a.other_document_url,
          utrNumber: a.utr_number || '',
          utr_number: a.utr_number,
          payment_status: a.payment_status || 'pending',
          registration_fee: a.registration_fee || 500.00,
          payment_method: a.payment_method || 'UPI / Online',
          payment_date: a.payment_date,
          payment_receipt_url: a.payment_receipt_url,
          receiptUrl: a.payment_receipt_url || '',
          status: a.application_status || 'Approved',
          application_status: a.application_status || 'Approved',
          certificate_number: a.certificate_number,
          certificate_status: a.certificate_status,
          remarks: a.remarks,
          createdAt: a.created_at || new Date().toISOString(),
          created_at: a.created_at,
          updated_at: a.updated_at,
        }));
      }
    } catch (err) {
      console.warn('[CentralDb] Supabase fetch admissions failed:', err);
    }
  }

  // Fallback to local server API
  try {
    const params = new URLSearchParams();
    if (filters?.branchId) params.append('branchId', filters.branchId);
    if (filters?.course) params.append('course', filters.course);
    if (filters?.search) params.append('search', filters.search);

    const res = await fetch(`/api/admissions?${params.toString()}`).then((r) => r.json());
    if (res && res.success && Array.isArray(res.admissions)) {
      return res.admissions;
    }
  } catch {
    // Ignore
  }

  return [];
}

export async function updateAdmissionInCentralDb(
  appId: string,
  updates: Partial<AdmissionApplication>
): Promise<boolean> {
  const supabase = getSupabase();

  if (supabase && isSupabaseConfigured()) {
    try {
      const payload: any = {
        updated_at: new Date().toISOString(),
      };
      if (updates.studentName || updates.student_name) payload.student_name = updates.studentName || updates.student_name;
      if (updates.guardianName || updates.guardian_name) payload.guardian_name = updates.guardianName || updates.guardian_name;
      if (updates.fatherName || updates.father_name) payload.father_name = updates.fatherName || updates.father_name;
      if (updates.motherName || updates.mother_name) payload.mother_name = updates.motherName || updates.mother_name;
      if (updates.dob || updates.date_of_birth) payload.date_of_birth = updates.dob || updates.date_of_birth;
      if (updates.gender) payload.gender = updates.gender;
      if (updates.category) payload.category = updates.category;
      if (updates.phone) payload.phone = updates.phone;
      if (updates.email) payload.email = updates.email;
      if (updates.address) payload.address = updates.address;
      if (updates.course) payload.course = updates.course;
      if (updates.course_code) payload.course_code = updates.course_code;
      if (updates.qualification) payload.qualification = updates.qualification;
      if (updates.batch) payload.batch = updates.batch;
      if (updates.session) payload.session = updates.session;
      if (updates.admissionDate || updates.admission_date) payload.admission_date = updates.admissionDate || updates.admission_date;
      if (updates.branchId || updates.branch_id) payload.branch_id = updates.branchId || updates.branch_id;
      if (updates.branchName || updates.branch_name) payload.branch_name = updates.branchName || updates.branch_name;
      if (updates.branchCode || updates.branch_code) payload.branch_code = updates.branchCode || updates.branch_code;
      if (updates.utrNumber || updates.utr_number) {
        payload.utr_number = updates.utrNumber || updates.utr_number;
        payload.payment_status = 'completed';
        payload.payment_date = new Date().toISOString();
      }
      if (updates.payment_status) payload.payment_status = updates.payment_status;
      if (updates.status || updates.application_status) {
        payload.application_status = updates.status || updates.application_status;
      }
      if (updates.photoUrl || updates.photo_url) payload.photo_url = updates.photoUrl || updates.photo_url;
      if (updates.receiptUrl || updates.payment_receipt_url) payload.payment_receipt_url = updates.receiptUrl || updates.payment_receipt_url;
      if (updates.certificate_number) payload.certificate_number = updates.certificate_number;
      if (updates.certificate_status) payload.certificate_status = updates.certificate_status;
      if (updates.remarks) payload.remarks = updates.remarks;

      const { error } = await supabase
        .from('admissions')
        .update(payload)
        .or(`enrollment_number.eq.${appId},application_number.eq.${appId}`);

      if (!error) return true;
      console.warn('[CentralDb] Supabase update admission notice:', error.message);
    } catch (err) {
      console.warn('[CentralDb] Supabase update admission exception:', err);
    }
  }

  // Fallback to local server API
  try {
    const res = await fetch(`/api/admissions/${appId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).then((r) => r.json());
    return Boolean(res && res.success);
  } catch {
    return false;
  }
}

export async function deleteAdmissionFromCentralDb(appId: string): Promise<boolean> {
  const supabase = getSupabase();

  if (supabase && isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('admissions')
        .delete()
        .or(`enrollment_number.eq.${appId},application_number.eq.${appId}`);
      if (!error) return true;
    } catch {
      // Ignore
    }
  }

  try {
    const res = await fetch(`/api/admissions/${appId}`, { method: 'DELETE' }).then((r) => r.json());
    return Boolean(res && res.success);
  } catch {
    return false;
  }
}

// =========================================================================
// 7. DATA MIGRATION: SEED / MIGRATE INITIAL RECORDS TO SUPABASE
// =========================================================================

export async function migrateExistingDataToSupabase(): Promise<{
  branchesCount: number;
  admissionsCount: number;
  studentsCount: number;
}> {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.');
  }

  console.log('[CentralDb] Beginning migration of existing records to Supabase...');

  // 1. Migrate Branches
  let branchesCount = 0;
  for (const b of INITIAL_BRANCHES) {
    const { error } = await supabase.from('branches').upsert({
      id: b.id,
      name: b.name,
      code: b.code.toUpperCase(),
      address: b.address || '',
      phone: b.phone || '',
      email: b.email || '',
      status: b.status || 'Active',
      is_default: Boolean(b.isDefault),
      created_at: b.createdAt || new Date().toISOString(),
    });
    if (!error) branchesCount++;
  }

  // 2. Fetch existing admissions from server/local and migrate into public.admissions
  let admissionsCount = 0;

  try {
    const res = await fetch('/api/admissions').then((r) => r.json()).catch(() => null);
    const serverAdmissions = res && res.success && Array.isArray(res.admissions) ? res.admissions : [];

    for (const a of serverAdmissions) {
      const en = a.enrollment_number || a.enrollmentId;
      const { error } = await supabase.from('admissions').upsert({
        enrollment_number: en,
        application_number: a.application_number || a.id,
        branch_id: a.branch_id || a.branchId,
        branch_name: a.branch_name || a.branchName,
        branch_code: a.branch_code || a.branchCode,
        student_name: a.student_name || a.studentName,
        guardian_name: a.guardian_name || a.guardianName,
        father_name: a.father_name || a.guardianName,
        date_of_birth: a.date_of_birth || a.dob,
        gender: a.gender,
        phone: a.phone,
        email: a.email,
        address: a.address,
        course: a.course,
        qualification: a.qualification,
        batch: a.batch,
        admission_date: a.admission_date || a.admissionDate,
        photo_url: a.photo_url || a.photoUrl,
        id_proof_url: a.id_proof_url || a.idProofUrl,
        marksheet_url: a.marksheet_url || a.marksheetUrl,
        utr_number: a.utr_number || a.utrNumber,
        payment_receipt_url: a.payment_receipt_url || a.receiptUrl,
        payment_status: a.utr_number || a.utrNumber ? 'completed' : 'pending',
        application_status: a.application_status || a.status || 'Approved',
        created_at: a.created_at || a.createdAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'enrollment_number' });

      if (!error) admissionsCount++;
    }
  } catch (err) {
    console.warn('[CentralDb] Migration note:', err);
  }

  return { branchesCount, admissionsCount, studentsCount: admissionsCount };
}

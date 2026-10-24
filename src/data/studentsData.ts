import { StudentRecord, AdmissionApplication } from '../types';
import { createInstitutionalDocumentSvg } from '../utils/documentPlaceholder';
import { getBranchById, getStoredBranches } from './branchesData';

/**
 * Helper to safely resolve and preserve branch association without overwriting user selections
 */
function resolveBranchFields(item: {
  branchId?: string;
  branchName?: string;
  branchCode?: string;
  center?: string;
}) {
  let branchId = item.branchId?.trim();
  let branchName = item.branchName?.trim();
  let branchCode = item.branchCode?.trim().toUpperCase();

  // 1. Try lookup by branchId
  if (branchId) {
    const b = getBranchById(branchId);
    if (b) {
      branchName = branchName || b.name;
      branchCode = branchCode || b.code;
      branchId = b.id;
    }
  }

  // 2. Try lookup by branchCode
  if (branchCode && (!branchId || !branchName)) {
    const b = getBranchById(branchCode);
    if (b) {
      branchId = branchId || b.id;
      branchName = branchName || b.name;
      branchCode = b.code;
    }
  }

  // 3. Try lookup by branchName or center
  const nameToTry = branchName || item.center;
  if (nameToTry && (!branchId || !branchCode)) {
    const b = getBranchById(nameToTry);
    if (b) {
      branchId = branchId || b.id;
      branchName = b.name;
      branchCode = branchCode || b.code;
    }
  }

  // 4. Resolve branch info preserving custom/newly created branches
  if (!branchId && !branchName && !branchCode) {
    const defaultBranch = getStoredBranches().find((b) => b.isDefault) || getStoredBranches()[0];
    branchId = defaultBranch?.id || 'branch-main';
    branchName = defaultBranch?.name || 'Main Branch';
    branchCode = defaultBranch?.code || 'MAIN';
  } else {
    const resolved = (branchId ? getBranchById(branchId) : null) || (branchCode ? getBranchById(branchCode) : null);
    if (!branchId && branchCode) {
      branchId = resolved?.id || `branch-${branchCode.toLowerCase()}`;
    }
    branchId = branchId || resolved?.id || '';
    branchName = branchName || resolved?.name || item.center || 'Institutional Centre';
    branchCode = branchCode || resolved?.code || 'IC';
  }

  return { branchId, branchName, branchCode };
}

export const INITIAL_STUDENTS: StudentRecord[] = [
  {
    enrollmentId: '241000',
    rollNo: 'ADCA-24-01',
    name: 'Ananya Bora',
    guardianName: 'Pradip Bora',
    dob: '2003-05-14',
    course: 'ADCA',
    courseFullName: 'ADCA (Advanced Diploma in Computer Applications)',
    duration: '1 Year (12 Months Regular)',
    center: 'Main Branch',
    branchId: 'branch-main',
    branchName: 'Main Branch',
    branchCode: 'MAIN',
    certSerial: 'IAIT/CERT/2025/1402',
    enrollmentDate: '12th July 2024',
    status: 'Course Completed',
    grade: 'A+',
    photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA4l60JRJs01bjDglM8ecFaBNdDi12ruIszobwW3sMZws9yQV_8viWdXdrsr_WsTT-fJJY-DymxvQxco-4blys0t1LHKGN-aN4zr4aaC3tH8DDJyAmUfYHsA7F_A-s7tTcF5AGxaqmcOJK5hJUK304Pk-23pYNY7MFBEsGGWWmB7uXCwiN0PF5yJ4v9yP65L6WVNgLFmkCmcVsS0izItHBlJ7VnMSwodUkdAVPToA54-e9wEVlT6J5mLg',
    verificationHash: 'SHA-256: 8f42...e901'
  },
  {
    enrollmentId: '241001',
    rollNo: 'PGDCA-24-02',
    name: 'Bikash Bora',
    guardianName: 'Hemanta Bora',
    dob: '2001-11-20',
    course: 'PGDCA',
    courseFullName: 'PGDCA (Post Graduate Diploma in Computer Applications)',
    duration: '1 Year (2 Semesters)',
    center: 'Main Branch',
    branchId: 'branch-main',
    branchName: 'Main Branch',
    branchCode: 'MAIN',
    certSerial: 'IAIT/CERT/2024/0981',
    enrollmentDate: '15th August 2023',
    status: 'Course Completed',
    grade: 'A',
    photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBJZeF--IRvZDiPhBpJj7e8Bwvyiq8XTylAnFsIObOMJFlH6Ow8Q4gDva24Ixn_Ra3E2JrXxK9SNndQHdcdX2L8awdo0hd6w_J9xMJ-yqp6ju_zbgV5F1OqCUJzYP5TO3W82TH5vTNzMzZMyEeXQnCqCQkwWdBqmmzJ2l5q4M8TzE0-jWket_CjxnE8e_GPExl3E10b2YzhPEj0CMktIVv5MNJJUw4-BxJsYxRdiclhRUMKW7H536fBIA',
    verificationHash: 'SHA-256: 4b11...9a32'
  },
  {
    enrollmentId: '241002',
    rollNo: 'DCA-24-03',
    name: 'Pallabi Saikia',
    guardianName: 'Dulen Saikia',
    dob: '2002-08-05',
    course: 'DCA',
    courseFullName: 'DCA (Diploma in Computer Application)',
    duration: '6 Months Regular',
    center: 'Main Branch',
    branchId: 'branch-main',
    branchName: 'Main Branch',
    branchCode: 'MAIN',
    certSerial: 'IAIT/CERT/2024/1102',
    enrollmentDate: '10th February 2024',
    status: 'Course Completed',
    grade: 'A+',
    photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB-4Jn4_QNVZGUt5wmzufGGVeYfho-hVV0q1oWoiu1qircaL8ldSqn5vE8ESHOq60ySPghoyzkv8MbMYGpGep647re-9zobQlLMz60Xs8OGdORnjiWUVHOxFWrmKD7ovH_XHK7JBH1Y-KQgxfaNqgFPATAdzJXqOEhGoSZpFFqyGeMAWT4d4NCRM9voAXQVUMwGJTSWabjjr4CB6XjFz6Bh2Q4cWq75fqBOXrltHl11jLqQZKY94Zb4Lw',
    verificationHash: 'SHA-256: 7a93...f021'
  },
  {
    enrollmentId: '251002',
    rollNo: 'CCC-25-03',
    name: 'Manabendra Saikia',
    guardianName: 'Pradip Saikia',
    dob: '2004-03-12',
    course: 'CCC',
    courseFullName: 'CCC (Course on Computer Concepts)',
    duration: '3 Months (80 Hrs)',
    center: 'Main Branch',
    branchId: 'branch-main',
    branchName: 'Main Branch',
    branchCode: 'MAIN',
    certSerial: 'IAIT/CERT/2025/1689',
    enrollmentDate: '5th January 2025',
    status: 'Active Student',
    grade: 'A',
    photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA0ptOq7HKDVXdySOwws7DlfBBzBVNRLF-DacP3w7Z3KiMJ3LtjvIrbb5JLc5orJJbXG5fZowmIN2hPBlyKPgxaxDo80-nbNchTaM9QIiivVZvofIEv86V-0w-FomomtRIyb0G_sQ3gX8RABsnrVfKddzYOItoDjMEFWQii1SdytKfc0poGeiw9TWAWFc_Hpl9HPD65-xKH9cq8XEZVsUju81jbRoVmrF2rgX9M2F1yEnlb91Ls0SD3dg',
    verificationHash: 'SHA-256: 3c82...0a8d'
  }
];

export const INITIAL_APPLICATIONS: AdmissionApplication[] = [
  {
    id: 'IAIT-2025-APP-251000',
    studentName: 'Himashree Hazarika',
    guardianName: 'Bipul Hazarika',
    dob: '2005-02-18',
    gender: 'Female',
    phone: '9864210982',
    email: 'hima.haz@gmail.com',
    address: 'Kuwaritol, Kaliabor, Nagaon, Assam - 782137',
    course: 'ADCA',
    qualification: '10+2 (HS Passed)',
    batch: 'Morning Shift',
    admissionDate: '2025-02-10',
    branchId: 'branch-main',
    branchName: 'Main Branch',
    branchCode: 'MAIN',
    enrollmentId: '251000',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&fit=crop&crop=face',
    photoName: 'himashree_photo.jpg',
    idProofName: 'aadhaar_card.jpg',
    idProofUrl: createInstitutionalDocumentSvg('Government ID Proof', 'Himashree Hazarika', 'AADHAAR-8921-3412-9012', 'ADCA'),
    marksheetName: 'hs_marksheet.jpg',
    marksheetUrl: createInstitutionalDocumentSvg('Academic Marksheet', 'Himashree Hazarika', 'AHSEC-2024-HS-88421', 'ADCA'),
    utrNumber: '518293847291',
    receiptName: 'upi_payment_500.jpg',
    receiptUrl: createInstitutionalDocumentSvg('Fee Payment Receipt', 'Himashree Hazarika', 'UTR-518293847291', 'ADCA'),
    status: 'Pending Verification',
    createdAt: '2025-02-10T10:30:00Z'
  },
  {
    id: 'IAIT-2025-APP-251001',
    studentName: 'Rituraj Barman',
    guardianName: 'Nripen Barman',
    dob: '2004-09-03',
    gender: 'Male',
    phone: '9435012399',
    email: 'rituraj.b@gmail.com',
    address: 'Silghat, Kaliabor, Nagaon, Assam - 782143',
    course: 'TALLY',
    qualification: 'Graduate',
    batch: 'Afternoon Shift',
    admissionDate: '2025-02-12',
    branchId: 'branch-main',
    branchName: 'Main Branch',
    branchCode: 'MAIN',
    enrollmentId: '251001',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&fit=crop&crop=face',
    photoName: 'rituraj_photo.jpg',
    idProofName: 'voter_id.jpg',
    idProofUrl: createInstitutionalDocumentSvg('Government ID Proof', 'Rituraj Barman', 'VOTER-AS-091-88421', 'TALLY'),
    marksheetName: 'bcom_degree.jpg',
    marksheetUrl: createInstitutionalDocumentSvg('Academic Marksheet', 'Rituraj Barman', 'GU-BCOM-2024-512', 'TALLY'),
    utrNumber: '518293847990',
    receiptName: 'gpay_receipt_500.jpg',
    receiptUrl: createInstitutionalDocumentSvg('Fee Payment Receipt', 'Rituraj Barman', 'UTR-518293847990', 'TALLY'),
    status: 'Approved',
    createdAt: '2025-02-12T14:15:00Z'
  }
];

/**
 * Helper to ensure Institutional Enrollment Numbers follow the standard format:
 * YY + 4-digit Serial Number (Where YY = 2-digit admission year, Serial starts from 1000).
 * e.g., 2026 -> 261000, 261001... 2027 -> 271000...
 */
const LEGACY_ID_MAP: Record<string, string> = {
  '240088': '241000',
  '240001': '241000',
  '240024': '241001',
  '240002': '241001',
  '240115': '241002',
  '240003': '241002',
  '250108': '251002',
  '250001': '251000',
  '250002': '251001',
  '250003': '251002',
};

export function convertToNewEnrollmentFormat(id: string): string {
  if (!id) return id;
  const trimmed = id.trim();
  if (LEGACY_ID_MAP[trimmed]) {
    return LEGACY_ID_MAP[trimmed];
  }
  // If already exactly 6 digits (YYSSSS) and serial starts from 1000, return directly
  if (/^\d{6}$/.test(trimmed)) {
    const serial = parseInt(trimmed.slice(2), 10);
    if (serial >= 1000) {
      return trimmed;
    }
    const yy = trimmed.slice(0, 2);
    const newSerial = 1000 + Math.max(0, serial - 1);
    return `${yy}${newSerial}`;
  }
  // Extract 2-digit year (e.g. from 2024, 2025, 2026, etc.)
  const yearMatch = trimmed.match(/20(\d{2})/);
  const yy = yearMatch ? yearMatch[1] : new Date().getFullYear().toString().slice(-2);
  
  // Extract trailing serial digits
  const serialMatch = trimmed.match(/(\d{1,4})$/);
  if (serialMatch) {
    let serial = parseInt(serialMatch[1], 10);
    if (serial < 1000) {
      serial = 1000 + Math.max(0, serial - 1);
    }
    return `${yy}${serial}`;
  }
  return trimmed;
}

/**
 * Default Staff Passcode & Custom Staff Passcode management
 */
const DEFAULT_STAFF_PASSCODE = 'iait2025';

export function getStaffPasscode(): string {
  try {
    const saved = localStorage.getItem('iait_staff_passcode');
    return saved && saved.trim() ? saved.trim() : DEFAULT_STAFF_PASSCODE;
  } catch {
    return DEFAULT_STAFF_PASSCODE;
  }
}

export function setStaffPasscode(newPasscode: string): boolean {
  if (!newPasscode || newPasscode.trim().length < 4) {
    return false;
  }
  try {
    localStorage.setItem('iait_staff_passcode', newPasscode.trim());
    return true;
  } catch {
    return false;
  }
}

export function resetStaffPasscodeToDefault(): void {
  try {
    localStorage.removeItem('iait_staff_passcode');
  } catch {
    // Ignore
  }
}

// In-memory counter cache to ensure deterministic atomic increments across environments
const MEMORY_COUNTERS: Record<string, number> = {};

/**
 * Helper to compute highest existing serial for a given 2-digit year.
 * When a new academic year starts, the serial starts from 1000 (e.g. 261000 for 2026, 271000 for 2027).
 * CRITICAL RULE:
 * Existing records from the old generator (e.g. 268541, 268542) remain untouched in the database,
 * and are STRICTLY IGNORED when computing the new 1000-based sequence.
 */
function getHighestSerialForYear(yy: string): number {
  let maxSerial = 0;

  // Check in-memory counter
  if (MEMORY_COUNTERS[yy] && MEMORY_COUNTERS[yy] >= 1000 && MEMORY_COUNTERS[yy] < 8000) {
    if (MEMORY_COUNTERS[yy] > maxSerial) {
      maxSerial = MEMORY_COUNTERS[yy];
    }
  }

  // Check persistent counter stored in localStorage for this year
  try {
    const counterKey = `iait_serial_${yy}`;
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(counterKey) : null;
    if (stored) {
      const storedCounter = parseInt(stored, 10);
      // Purge any legacy counter (>= 8000, like 8541, 8542) left over from the old generator
      if (storedCounter >= 8000) {
        localStorage.removeItem(counterKey);
      } else if (!isNaN(storedCounter) && storedCounter >= 1000 && storedCounter < 8000) {
        if (storedCounter > maxSerial) {
          maxSerial = storedCounter;
        }
      }
    }
  } catch {
    // Ignore storage issues
  }

  const checkAndRecord = (enrollmentId?: string) => {
    if (!enrollmentId) return;
    const clean = enrollmentId.trim().toUpperCase();

    // 1. Direct 6-digit format: YYSSSS (e.g. 261000, 241000, 251000)
    if (clean.length === 6 && /^\d{6}$/.test(clean)) {
      if (clean.slice(0, 2) === yy) {
        const serial = parseInt(clean.slice(2), 10);
        // ONLY serials in the new sequence [1000, 7999] are counted.
        // Old legacy serials (>= 8000, like 8541, 8542) are strictly ignored.
        if (!isNaN(serial) && serial >= 1000 && serial < 8000 && serial > maxSerial) {
          maxSerial = serial;
        }
      }
      return;
    }

    // 2. Prefixed or hyphenated: IAIT-261000, IAIT-2026-APP-261000, etc.
    const match = clean.match(/(?:^|[^0-9])(?:20)?(\d{2})[-/]?(\d{4})(?:$|[^0-9])/);
    if (match && match[1] === yy) {
      const serial = parseInt(match[2], 10);
      if (!isNaN(serial) && serial >= 1000 && serial < 8000 && serial > maxSerial) {
        maxSerial = serial;
      }
    }
  };

  const allStudents = getStoredStudents();
  const allApps = getStoredApplications();

  allStudents.forEach((s) => checkAndRecord(s.enrollmentId));
  allApps.forEach((a) => checkAndRecord(a.enrollmentId));

  return maxSerial;
}

/**
 * Preview the next enrollment number without committing the increment.
 * Format: Year (last two digits) + 4-digit Serial Number (starts from 1000)
 * Example for 2026: '261000' for first candidate, then '261001', '261002'...
 * When the new academic/admission year starts, automatically use the new year's last two digits and restart serial from 1000.
 */
export function peekNextEnrollmentNumber(targetYear?: number): string {
  const year = targetYear || new Date().getFullYear();
  const yy = year.toString().slice(-2);
  const maxSerial = getHighestSerialForYear(yy);
  // Serial number must START FROM 1000 for each new admission year
  const nextSerial = maxSerial >= 1000 ? maxSerial + 1 : 1000;
  const ssss = String(nextSerial).padStart(4, '0');
  return `${yy}${ssss}`;
}

/**
 * Generates sequential Institutional Enrollment Number and commits the auto-increment.
 * Format: Year (last two digits) + 4-digit Serial Number (starts from 1000)
 * Example for 2026:
 * - 1st admission: 261000
 * - 2nd admission: 261001
 * - 3rd admission: 261002
 * When the new academic/admission year starts, automatically restarts from 1000:
 * - 2026 -> 261000
 * - 2027 -> 271000
 * - 2028 -> 281000
 */
export function getNextEnrollmentNumber(targetYear?: number): string {
  const year = targetYear || new Date().getFullYear();
  const yy = year.toString().slice(-2);
  const maxSerial = getHighestSerialForYear(yy);
  // Serial number must START FROM 1000 for each new admission year
  const nextSerial = maxSerial >= 1000 ? maxSerial + 1 : 1000;
  const ssss = String(nextSerial).padStart(4, '0');
  
  // Persist updated serial counter for this academic year
  MEMORY_COUNTERS[yy] = nextSerial;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`iait_serial_${yy}`, String(nextSerial));
    }
  } catch {
    // Ignore storage issues
  }

  return `${yy}${ssss}`;
}

let CACHED_STUDENTS: StudentRecord[] | null = null;
let CACHED_APPLICATIONS: AdmissionApplication[] | null = null;

export function getStoredStudents(): StudentRecord[] {
  if (CACHED_STUDENTS && CACHED_STUDENTS.length > 0) {
    return CACHED_STUDENTS;
  }
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('iait_students') : null;
    let list: StudentRecord[] = INITIAL_STUDENTS;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    }
    // Automatically migrate any existing/cached records to the standard YYSSSS format and ensure branch association
    const processed = list.map((student) => {
      const bInfo = resolveBranchFields(student);
      return {
        ...student,
        enrollmentId: convertToNewEnrollmentFormat(student.enrollmentId),
        branchId: bInfo.branchId,
        branchName: bInfo.branchName,
        branchCode: bInfo.branchCode,
        center: bInfo.branchName || student.center || 'Main Branch',
      };
    });
    CACHED_STUDENTS = processed;
    return processed;
  } catch {
    return INITIAL_STUDENTS;
  }
}

export function setStoredStudents(records: StudentRecord[]): void {
  if (!Array.isArray(records)) return;
  const processed = records.map((student) => {
    const bInfo = resolveBranchFields(student);
    return {
      ...student,
      enrollmentId: convertToNewEnrollmentFormat(student.enrollmentId),
      branchId: bInfo.branchId,
      branchName: bInfo.branchName,
      branchCode: bInfo.branchCode,
      center: bInfo.branchName || student.center,
    };
  });
  CACHED_STUDENTS = processed;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('iait_students', JSON.stringify(processed));
    }
  } catch {
    // In-memory cache is set
  }
}

export function saveStudentRecord(record: StudentRecord): void {
  const current = getStoredStudents();
  const bInfo = resolveBranchFields(record);
  const formattedRecord: StudentRecord = {
    ...record,
    enrollmentId: convertToNewEnrollmentFormat(record.enrollmentId),
    branchId: bInfo.branchId,
    branchName: bInfo.branchName,
    branchCode: bInfo.branchCode,
    center: bInfo.branchName || record.center || 'Main Branch',
  };
  const updated = [formattedRecord, ...current.filter((s) => s && s.enrollmentId && s.enrollmentId !== formattedRecord.enrollmentId)];
  CACHED_STUDENTS = updated;

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('iait_students', JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('Storage quota alert, saving lightweight student record cache:', err);
    try {
      // Fallback with trimmed image blobs if storage exceeds 5MB
      const slimmed = updated.map((s) => ({
        ...s,
        photoUrl: s.photoUrl && s.photoUrl.startsWith('data:') ? '' : s.photoUrl,
        idProofUrl: '',
        marksheetUrl: '',
        receiptUrl: '',
      }));
      localStorage.setItem('iait_students', JSON.stringify(slimmed));
    } catch {
      // In-memory cache is already updated
    }
  }
}

export function getStoredApplications(): AdmissionApplication[] {
  if (CACHED_APPLICATIONS && CACHED_APPLICATIONS.length > 0) {
    return CACHED_APPLICATIONS;
  }
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('iait_applications') : null;
    let list: AdmissionApplication[] = INITIAL_APPLICATIONS;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    }

    // Ensure every record has fully populated branch association and guaranteed downloadable data URLs
    const processed = list.map((app, index) => {
      const enrollment = app.enrollmentId ? convertToNewEnrollmentFormat(app.enrollmentId) : `25100${index}`;
      const safeIdProof =
        app.idProofUrl ||
        createInstitutionalDocumentSvg('Government ID Proof', app.studentName, app.idProofName || 'Govt_ID.jpg', app.course);
      const safeMarksheet =
        app.marksheetUrl ||
        createInstitutionalDocumentSvg('Academic Marksheet', app.studentName, app.marksheetName || 'Marksheet.jpg', app.course);
      const safeReceipt =
        app.receiptUrl ||
        createInstitutionalDocumentSvg('Fee Payment Receipt', app.studentName, `UTR-${app.utrNumber || '518293847291'}`, app.course);

      const bInfo = resolveBranchFields(app);

      return {
        ...app,
        enrollmentId: enrollment,
        branchId: bInfo.branchId,
        branchName: bInfo.branchName,
        branchCode: bInfo.branchCode,
        idProofUrl: safeIdProof,
        idProofName: app.idProofName || 'id_proof.jpg',
        marksheetUrl: safeMarksheet,
        marksheetName: app.marksheetName || 'academic_marksheet.jpg',
        receiptUrl: safeReceipt,
        receiptName: app.receiptName || 'payment_receipt.jpg',
      };
    });
    CACHED_APPLICATIONS = processed;
    return processed;
  } catch {
    return INITIAL_APPLICATIONS;
  }
}

export function setStoredApplications(apps: AdmissionApplication[]): void {
  if (!Array.isArray(apps)) return;
  const processed = apps.map((app, index) => {
    const enrollment = app.enrollmentId ? convertToNewEnrollmentFormat(app.enrollmentId) : `25100${index}`;
    const bInfo = resolveBranchFields(app);
    return {
      ...app,
      enrollmentId: enrollment,
      branchId: bInfo.branchId,
      branchName: bInfo.branchName,
      branchCode: bInfo.branchCode,
    };
  });
  CACHED_APPLICATIONS = processed;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('iait_applications', JSON.stringify(processed));
    }
  } catch {
    // In-memory cache is set
  }
}

export function saveAdmissionApplication(app: AdmissionApplication): void {
  const current = getStoredApplications();
  const bInfo = resolveBranchFields(app);
  const safeApp: AdmissionApplication = {
    ...app,
    branchId: bInfo.branchId,
    branchName: bInfo.branchName,
    branchCode: bInfo.branchCode,
  };
  const updated = [safeApp, ...current.filter((a) => a && a.id && a.id !== safeApp.id)];
  CACHED_APPLICATIONS = updated;

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('iait_applications', JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('Storage quota alert, saving lightweight application cache:', err);
    try {
      const slimmed = updated.map((a) => ({
        ...a,
        photoUrl: a.photoUrl && a.photoUrl.startsWith('data:') ? '' : a.photoUrl,
        idProofUrl: '',
        marksheetUrl: '',
        receiptUrl: '',
      }));
      localStorage.setItem('iait_applications', JSON.stringify(slimmed));
    } catch {
      // In-memory cache is already updated
    }
  }
}

/**
 * Update an existing admission record without creating duplicates.
 * Preserves the original unique admission ID and enrollment number.
 */
export function updateAdmissionRecord(
  appId: string,
  updatedFields: Partial<AdmissionApplication>
): { success: boolean; message: string; updatedApp?: AdmissionApplication } {
  const apps = getStoredApplications();
  const appIndex = apps.findIndex((a) => a && (a.id === appId || a.enrollmentId === appId));
  if (appIndex === -1) {
    return { success: false, message: 'Admission record not found.' };
  }

  const currentApp = apps[appIndex];
  // If branch was changed in updatedFields, resolve branch metadata consistently
  let branchFields = {
    branchId: updatedFields.branchId || currentApp.branchId,
    branchName: updatedFields.branchName || currentApp.branchName,
    branchCode: updatedFields.branchCode || currentApp.branchCode,
  };
  if (updatedFields.branchId || updatedFields.branchCode || updatedFields.branchName) {
    branchFields = resolveBranchFields(branchFields);
  }

  const updatedApp: AdmissionApplication = {
    ...currentApp,
    ...updatedFields,
    ...branchFields,
    id: currentApp.id, // preserve immutable original ID
    enrollmentId: currentApp.enrollmentId, // preserve original enrollment number
    createdAt: currentApp.createdAt, // preserve original creation timestamp
  };

  apps[appIndex] = updatedApp;
  try {
    localStorage.setItem('iait_applications', JSON.stringify(apps));
  } catch (err) {
    console.error('Failed to save updated application:', err);
    return { success: false, message: 'Failed to update database.' };
  }

  // Also synchronize corresponding student record in verified registry if present
  if (currentApp.enrollmentId) {
    const students = getStoredStudents();
    const studentIndex = students.findIndex(
      (s) => s.enrollmentId === currentApp.enrollmentId
    );
    if (studentIndex !== -1) {
      const currStudent = students[studentIndex];
      students[studentIndex] = {
        ...currStudent,
        name: updatedApp.studentName || currStudent.name,
        guardianName: updatedApp.guardianName || currStudent.guardianName,
        course: updatedApp.course || currStudent.course,
        dob: updatedApp.dob || currStudent.dob,
        branchId: updatedApp.branchId,
        branchName: updatedApp.branchName,
        branchCode: updatedApp.branchCode,
        center: updatedApp.branchName || currStudent.center,
        status: updatedApp.status === 'Approved' ? 'Active Student' : currStudent.status,
      };
      try {
        localStorage.setItem('iait_students', JSON.stringify(students));
      } catch (err) {
        console.error('Failed to sync student record:', err);
      }
    }
  }

  return { success: true, message: 'Admission record updated successfully!', updatedApp };
}

/**
 * Delete an admission record safely
 */
export function deleteAdmissionRecord(
  appId: string
): { success: boolean; message: string } {
  const apps = getStoredApplications();
  const target = apps.find((a) => a.id === appId);
  if (!target) {
    return { success: false, message: 'Admission record not found.' };
  }

  const updatedApps = apps.filter((a) => a.id !== appId);
  try {
    localStorage.setItem('iait_applications', JSON.stringify(updatedApps));
  } catch (err) {
    return { success: false, message: 'Failed to delete application from database.' };
  }

  // Also remove from verified students if present
  if (target.enrollmentId) {
    const students = getStoredStudents();
    const updatedStudents = students.filter((s) => s.enrollmentId !== target.enrollmentId);
    try {
      localStorage.setItem('iait_students', JSON.stringify(updatedStudents));
    } catch {
      // Ignore
    }
  }

  return { success: true, message: `Admission for "${target.studentName}" deleted successfully.` };
}

/**
 * Count how many admissions belong to a particular branch
 */
export function getAdmissionsCountByBranch(branchId: string): number {
  const apps = getStoredApplications();
  return apps.filter((a) => a.branchId === branchId).length;
}

export function normalizeLookupKey(key: string): string {
  return key.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function convertAdmissionToStudentRecord(app: AdmissionApplication): StudentRecord {
  const enrollment = String(app.enrollmentId || app.id || '').trim();
  const admDate = app.admissionDate || (app.createdAt ? app.createdAt.split('T')[0] : '');
  const year = admDate ? new Date(admDate).getFullYear() : new Date().getFullYear();
  const academicSession = isNaN(year) ? 'Session 2025-2026' : `Session ${year}-${year + 1}`;
  const bInfo = resolveBranchFields(app);

  return {
    enrollmentId: enrollment,
    rollNo: `${app.course}-${enrollment.length >= 4 ? enrollment.slice(-4) : enrollment}`,
    name: app.studentName,
    guardianName: app.guardianName || 'Guardian',
    dob: app.dob,
    gender: app.gender,
    phone: app.phone,
    email: app.email,
    address: app.address,
    course: app.course,
    courseFullName: `${app.course} Vocational Program`,
    duration: 'Regular Academic Track',
    center: app.branchName || bInfo.branchName || 'Main Branch',
    branchId: app.branchId || bInfo.branchId,
    branchName: app.branchName || bInfo.branchName,
    branchCode: app.branchCode || bInfo.branchCode,
    certSerial: `IAIT/PROV/${isNaN(year) ? '2026' : year}/${enrollment}`,
    enrollmentDate: admDate || (app.createdAt ? app.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
    admissionDate: admDate,
    academicSession: academicSession,
    status: app.status === 'Approved' ? 'Active Student' : (app.status || 'Active Student'),
    grade: 'Enrolled',
    photoUrl: app.photoUrl || '',
    verificationHash: `SHA-256: ${enrollment}...live`,
    utrNumber: app.utrNumber,
    batch: app.batch,
    qualification: app.qualification,
    idProofUrl: app.idProofUrl,
    idProofName: app.idProofName,
    marksheetUrl: app.marksheetUrl,
    marksheetName: app.marksheetName,
    receiptUrl: app.receiptUrl,
    receiptName: app.receiptName,
  };
}

export function findStudentByQuery(query: string): StudentRecord | null {
  if (!query) return null;
  const rawQuery = String(query).trim();
  if (!rawQuery) return null;
  const norm = normalizeLookupKey(rawQuery);

  // 1. Search persistent admission records used by the Admin Panel (One Source of Truth)
  const applications = getStoredApplications();
  for (const app of applications) {
    if (!app) continue;
    const enrollStr = String(app.enrollmentId || '').trim();
    const idStr = String(app.id || '').trim();

    // Exact string match (case-insensitive) - NEVER convert to number
    if (
      (enrollStr && enrollStr.toUpperCase() === rawQuery.toUpperCase()) ||
      (idStr && idStr.toUpperCase() === rawQuery.toUpperCase())
    ) {
      return convertAdmissionToStudentRecord(app);
    }

    // Normalized alphanumeric match
    const normEnroll = normalizeLookupKey(enrollStr);
    const normId = normalizeLookupKey(idStr);
    if ((normEnroll && normEnroll === norm) || (normId && normId === norm)) {
      return convertAdmissionToStudentRecord(app);
    }
  }

  // 2. Also search verified student records if present
  const list = getStoredStudents();
  for (const s of list) {
    if (!s) continue;
    const enrollStr = String(s.enrollmentId || '').trim();
    const rollStr = String(s.rollNo || '').trim();
    const certStr = String(s.certSerial || '').trim();

    if (
      (enrollStr && enrollStr.toUpperCase() === rawQuery.toUpperCase()) ||
      (rollStr && rollStr.toUpperCase() === rawQuery.toUpperCase()) ||
      (certStr && certStr.toUpperCase() === rawQuery.toUpperCase())
    ) {
      return s;
    }

    const normEnrollment = normalizeLookupKey(enrollStr);
    const normRoll = normalizeLookupKey(rollStr);
    const normCert = normalizeLookupKey(certStr);
    if (
      (normEnrollment && normEnrollment === norm) ||
      (normRoll && normRoll === norm) ||
      (normCert && normCert === norm)
    ) {
      return s;
    }
  }

  // If enrollment number does not exist, return null (Student Record Not Found)
  // Do NOT display another student's information!
  return null;
}

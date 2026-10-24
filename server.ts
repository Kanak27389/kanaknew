import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DB_FILE = path.join(__dirname, 'data', 'database.json');

// Interface types
interface BranchRecord {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  status: 'Active' | 'Inactive';
  isDefault?: boolean;
  createdAt: string;
}

interface AdmissionRecord {
  id: string;
  enrollmentId: string;
  branchId: string;
  branchName: string;
  branchCode: string;
  studentName: string;
  guardianName: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  course: string;
  qualification: string;
  batch: string;
  admissionDate: string;
  photoUrl?: string;
  photoName?: string;
  idProofName?: string;
  idProofUrl?: string;
  marksheetName?: string;
  marksheetUrl?: string;
  utrNumber: string;
  receiptName?: string;
  receiptUrl?: string;
  payment_status?: string;
  application_status?: string;
  registration_fee?: number;
  payment_method?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Pending Verification' | string;
  createdAt: string;
}

interface StudentVerificationRecord {
  enrollmentId: string;
  rollNo: string;
  name: string;
  guardianName: string;
  dob: string;
  course: string;
  courseFullName: string;
  duration: string;
  center: string;
  branchId: string;
  branchName: string;
  branchCode: string;
  certSerial: string;
  enrollmentDate: string;
  status: string;
  grade: string;
  photoUrl: string;
  verificationHash: string;
  idProofUrl?: string;
  idProofName?: string;
  marksheetUrl?: string;
  marksheetName?: string;
  receiptUrl?: string;
  receiptName?: string;
}

interface DatabaseSchema {
  branches: BranchRecord[];
  admissions: AdmissionRecord[];
  students: StudentVerificationRecord[];
  counters: Record<string, number>; // yearPrefix -> lastSerial
}

const DEFAULT_BRANCHES: BranchRecord[] = [
  {
    id: 'branch-main',
    name: 'Main Branch',
    code: 'MAIN',
    address: 'Kuwaritol, Kaliabor, Nagaon, Assam - 782137',
    phone: '8638611886',
    email: 'iaitkaliabor@gmail.com',
    status: 'Active',
    isDefault: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'branch-b01',
    name: 'Branch 01',
    code: 'B01',
    address: 'Branch 01 Campus, Assam - 782001',
    phone: '9864011221',
    email: 'branch01@iaitassam.in',
    status: 'Active',
    isDefault: false,
    createdAt: '2025-01-10T00:00:00Z',
  },
  {
    id: 'branch-b02',
    name: 'Branch 02',
    code: 'B02',
    address: 'Branch 02 Campus, Assam - 784001',
    phone: '9864022332',
    email: 'branch02@iaitassam.in',
    status: 'Active',
    isDefault: false,
    createdAt: '2025-02-01T00:00:00Z',
  },
  {
    id: 'branch-nagaon',
    name: 'Nagaon Town Branch',
    code: 'NGN',
    address: 'Haibargaon Main Road, Nagaon, Assam - 782002',
    phone: '9435012399',
    email: 'nagaon@iaitassam.in',
    status: 'Active',
    isDefault: false,
    createdAt: '2025-01-15T00:00:00Z',
  },
  {
    id: 'branch-tezpur',
    name: 'Tezpur City Center',
    code: 'TEZ',
    address: 'Mission Chariali, Tezpur, Sonitpur, Assam - 784001',
    phone: '9864210982',
    email: 'tezpur@iaitassam.in',
    status: 'Active',
    isDefault: false,
    createdAt: '2025-06-01T00:00:00Z',
  },
  {
    id: 'branch-pith01-3101',
    name: 'Pithakhowa',
    code: 'PITH01',
    address: 'TEZPUR, Assam',
    phone: '7002309141',
    email: '',
    status: 'Active',
    isDefault: false,
    createdAt: '2026-10-01T09:56:43.101Z',
  },
  {
    id: 'branch-jakhalabandha',
    name: 'Jakhalabandha Study Center',
    code: 'JKB',
    address: 'Main Market, Jakhalabandha, Nagaon, Assam - 782136',
    phone: '8486950123',
    email: 'jakhalabandha@iait.ac.in',
    status: 'Active',
    isDefault: false,
    createdAt: '2026-10-08T08:15:46.771Z',
  },
  {
    id: 'branch-p01-8228',
    name: 'pp',
    code: 'P01',
    address: 'vill- BORUAATI, Nagaon, Assam',
    phone: '8638611886',
    email: 'sanjib.upadhayaya@gmail.com',
    status: 'Active',
    isDefault: false,
    createdAt: '2026-10-08T09:21:48.229Z',
  },
  {
    id: '09ff27b9-c89f-4452-9c25-27f4eac9cb2b',
    name: 'Jorhat Branch',
    code: '5G',
    address: 'Jorhat, Assam',
    phone: '7856565789',
    email: 'kcd303@gmail.com',
    status: 'Active',
    isDefault: false,
    createdAt: '2026-10-13T10:41:17.680Z',
  },
];

const DEFAULT_STUDENTS: StudentVerificationRecord[] = [
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
    grade: 'A',
    photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCWb8iXp3b33wH8o270g0Pcfb5hN3jQ8R5-yF7uU6E8lW5k5q3m6m6P-g_0',
    verificationHash: 'SHA-256: 7d18...3b21'
  }
];

const DEFAULT_ADMISSIONS: AdmissionRecord[] = [
  {
    id: 'IAIT-2026-APP-261000',
    enrollmentId: '261000',
    branchId: 'branch-main',
    branchName: 'Main Branch',
    branchCode: 'MAIN',
    studentName: 'Rahul Saikia',
    guardianName: 'Bipul Saikia',
    dob: '2004-03-12',
    gender: 'Male',
    phone: '9864012345',
    email: 'rahul.saikia2026@gmail.com',
    address: 'Silghat Road, Kaliabor, Nagaon, Assam - 782143',
    course: 'ADCA',
    qualification: '10+2 (HS Passed)',
    batch: 'Morning Shift',
    admissionDate: '2026-01-10',
    photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA0ptOq7HKDVXdySOwws7DlfBBzBVNRLF-DacP3w7Z3KiMJ3LtjvIrbb5JLc5orJJbXG5fZowmIN2hPBlyKPgxaxDo80-nbNchTaM9QIiivVZvofIEv86V-0w-FomomtRIyb0G_sQ3gX8RABsnrVfKddzYOItoDjMEFWQii1SdytKfc0poGeiw9TWAWFc_Hpl9HPD65-xKH9cq8XEZVsUju81jbRoVmrF2rgX9M2F1yEnlb91Ls0SD3dg',
    photoName: 'rahul_photo.jpg',
    idProofName: 'aadhaar_rahul.jpg',
    marksheetName: 'hs_marksheet.jpg',
    utrNumber: '518293847291',
    receiptName: 'upi_receipt_5182.jpg',
    status: 'Approved',
    createdAt: '2026-01-10T10:30:00Z',
  },
  {
    id: 'IAIT-2026-APP-261001',
    enrollmentId: '261001',
    branchId: 'branch-main',
    branchName: 'Main Branch',
    branchCode: 'MAIN',
    studentName: 'Priyanka Das',
    guardianName: 'Gaurav Das',
    dob: '2005-08-22',
    gender: 'Female',
    phone: '8721998877',
    email: 'priyanka.das@gmail.com',
    address: 'Jakhalabandha, Kaliabor, Nagaon, Assam - 782136',
    course: 'DCA',
    qualification: '10th (HSLC Passed)',
    batch: 'Afternoon Shift',
    admissionDate: '2026-01-14',
    photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCWb8iXp3b33wH8o270g0Pcfb5hN3jQ8R5-yF7uU6E8lW5k5q3m6m6P-g_0',
    photoName: 'priyanka_passport.jpg',
    idProofName: 'voter_id.jpg',
    marksheetName: 'hslc_marksheet.jpg',
    utrNumber: '519284710294',
    receiptName: 'gpay_receipt_5192.jpg',
    status: 'Approved',
    createdAt: '2026-01-14T14:15:00Z',
  },
  {
    id: 'IAIT-2026-APP-261002',
    enrollmentId: '261002',
    branchId: 'branch-nagaon',
    branchName: 'Nagaon Town Branch',
    branchCode: 'NGN',
    studentName: 'Himangshu Hazarika',
    guardianName: 'Nripen Hazarika',
    dob: '2003-11-05',
    gender: 'Male',
    phone: '9435112233',
    email: 'himangshu.haz@gmail.com',
    address: 'Haibargaon, Nagaon, Assam - 782002',
    course: 'PGDCA',
    qualification: 'Graduation in Arts',
    batch: 'Evening Shift',
    admissionDate: '2026-02-02',
    photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA0ptOq7HKDVXdySOwws7DlfBBzBVNRLF-DacP3w7Z3KiMJ3LtjvIrbb5JLc5orJJbXG5fZowmIN2hPBlyKPgxaxDo80-nbNchTaM9QIiivVZvofIEv86V-0w-FomomtRIyb0G_sQ3gX8RABsnrVfKddzYOItoDjMEFWQii1SdytKfc0poGeiw9TWAWFc_Hpl9HPD65-xKH9cq8XEZVsUju81jbRoVmrF2rgX9M2F1yEnlb91Ls0SD3dg',
    photoName: 'himangshu_photo.jpg',
    idProofName: 'pan_card.jpg',
    marksheetName: 'degree_marksheet.jpg',
    utrNumber: '520192837465',
    receiptName: 'phonepe_receipt.jpg',
    status: 'Approved',
    createdAt: '2026-02-02T11:45:00Z',
  }
];

// In-memory atomic lock and database access
let dbCache: DatabaseSchema | null = null;

function loadDatabase(): DatabaseSchema {
  if (dbCache) return dbCache;

  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.branches) && Array.isArray(parsed.admissions)) {
        dbCache = parsed;
        return dbCache!;
      }
    }
  } catch (err) {
    console.error('Error reading database file, initializing defaults:', err);
  }

  // Initialize defaults
  const initialDb: DatabaseSchema = {
    branches: DEFAULT_BRANCHES,
    admissions: DEFAULT_ADMISSIONS,
    students: DEFAULT_STUDENTS,
    counters: { '24': 1002, '25': 1000, '26': 1002 },
  };

  saveDatabase(initialDb);
  dbCache = initialDb;
  return initialDb;
}

function saveDatabase(data: DatabaseSchema): void {
  dbCache = data;
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write database file:', err);
  }
}

/**
 * Server-authoritative sequential enrollment generator:
 * Format: YY + 4-digit serial (starts at 1000 for each new admission year)
 * Unique across ALL branches!
 */
function getNextEnrollmentNumberServer(year: number): string {
  const db = loadDatabase();
  const yy = String(year).slice(-2);

  let maxSerial = 0;

  // Check stored counter
  if (db.counters && db.counters[yy] && db.counters[yy] >= 1000 && db.counters[yy] < 8000) {
    maxSerial = db.counters[yy];
  }

  // Check existing admissions
  for (const app of db.admissions) {
    if (app.enrollmentId && app.enrollmentId.startsWith(yy) && app.enrollmentId.length === 6) {
      const serial = parseInt(app.enrollmentId.slice(2), 10);
      if (!isNaN(serial) && serial >= 1000 && serial < 8000 && serial > maxSerial) {
        maxSerial = serial;
      }
    }
  }

  // Check existing students
  for (const st of db.students) {
    if (st.enrollmentId && st.enrollmentId.startsWith(yy) && st.enrollmentId.length === 6) {
      const serial = parseInt(st.enrollmentId.slice(2), 10);
      if (!isNaN(serial) && serial >= 1000 && serial < 8000 && serial > maxSerial) {
        maxSerial = serial;
      }
    }
  }

  const nextSerial = maxSerial >= 1000 ? maxSerial + 1 : 1000;
  db.counters = db.counters || {};
  db.counters[yy] = nextSerial;
  saveDatabase(db);

  return `${yy}${String(nextSerial).padStart(4, '0')}`;
}

async function startServer() {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Request logger for diagnostic tracing
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // Health and stats
  app.get('/api/health', (req, res) => {
    const db = loadDatabase();
    res.json({
      status: 'healthy',
      branchesCount: db.branches.length,
      admissionsCount: db.admissions.length,
      studentsCount: db.students.length,
      timestamp: new Date().toISOString(),
    });
  });

  // Preview next enrollment number
  app.get('/api/enrollment/next', (req, res) => {
    const yearParam = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
    const effectiveYear = isNaN(yearParam) ? new Date().getFullYear() : yearParam;
    const db = loadDatabase();
    const yy = String(effectiveYear).slice(-2);

    let maxSerial = 0;
    if (db.counters && db.counters[yy] && db.counters[yy] >= 1000 && db.counters[yy] < 8000) {
      maxSerial = db.counters[yy];
    }
    for (const app of db.admissions) {
      if (app.enrollmentId && app.enrollmentId.startsWith(yy) && app.enrollmentId.length === 6) {
        const serial = parseInt(app.enrollmentId.slice(2), 10);
        if (!isNaN(serial) && serial >= 1000 && serial < 8000 && serial > maxSerial) {
          maxSerial = serial;
        }
      }
    }
    const nextSerial = maxSerial >= 1000 ? maxSerial + 1 : 1000;
    const nextEnrollmentId = `${yy}${String(nextSerial).padStart(4, '0')}`;

    res.json({
      success: true,
      year: effectiveYear,
      nextEnrollmentId,
    });
  });

  // ==========================================
  // BRANCHES API
  // ==========================================

  // Get all branches
  app.get('/api/branches', (req, res) => {
    const db = loadDatabase();
    res.json({ success: true, branches: db.branches });
  });

  // Create branch
  app.post('/api/branches', (req, res) => {
    const { name, code, address, phone, email, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Branch name is required.' });
    }
    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, error: 'Branch code is required.' });
    }

    const db = loadDatabase();
    const cleanCode = code.trim().toUpperCase();

    // Check if branch already exists by ID or Code
    const existingIdx = db.branches.findIndex(
      (b) => (req.body.id && b.id === req.body.id) || b.code.toUpperCase() === cleanCode
    );

    if (existingIdx !== -1) {
      db.branches[existingIdx] = {
        ...db.branches[existingIdx],
        name: name.trim(),
        code: cleanCode,
        address: address?.trim() || db.branches[existingIdx].address,
        phone: phone?.trim() || db.branches[existingIdx].phone,
        email: email?.trim() || db.branches[existingIdx].email,
        status: status === 'Inactive' ? 'Inactive' : 'Active',
      };
      saveDatabase(db);
      return res.json({ success: true, branch: db.branches[existingIdx] });
    }

    const newBranch: BranchRecord = {
      id: req.body.id || `branch-${cleanCode.toLowerCase()}-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      code: cleanCode,
      address: address?.trim() || '',
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      status: status === 'Inactive' ? 'Inactive' : 'Active',
      isDefault: false,
      createdAt: new Date().toISOString(),
    };

    db.branches.push(newBranch);
    saveDatabase(db);

    console.log(`[API] Created new branch: ${newBranch.name} (${newBranch.code})`);
    res.status(201).json({ success: true, branch: newBranch });
  });

  // Update branch
  app.put('/api/branches/:id', (req, res) => {
    const branchId = req.params.id;
    const { name, code, address, phone, email, status } = req.body;

    const db = loadDatabase();
    const idx = db.branches.findIndex((b) => b.id === branchId);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Branch not found.' });
    }

    const current = db.branches[idx];

    // Main Branch cannot be deactivated
    if (current.isDefault && status === 'Inactive') {
      return res.status(400).json({ success: false, error: 'Main Branch cannot be deactivated.' });
    }

    // Code uniqueness check
    if (code && code.trim().toUpperCase() !== current.code) {
      const newCode = code.trim().toUpperCase();
      if (db.branches.some((b) => b.id !== branchId && b.code.toUpperCase() === newCode)) {
        return res.status(400).json({ success: false, error: `Branch code "${newCode}" is already in use.` });
      }
      current.code = newCode;
    }

    if (name) current.name = name.trim();
    if (address !== undefined) current.address = address.trim();
    if (phone !== undefined) current.phone = phone.trim();
    if (email !== undefined) current.email = email.trim();
    if (status) current.status = status;

    saveDatabase(db);
    res.json({ success: true, branch: current });
  });

  // Delete branch
  app.delete('/api/branches/:id', (req, res) => {
    const branchId = req.params.id;
    const db = loadDatabase();
    const branch = db.branches.find((b) => b.id === branchId);

    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found.' });
    }
    if (branch.isDefault || branch.id === 'branch-main' || branch.code === 'MAIN') {
      return res.status(400).json({ success: false, error: 'Main Branch cannot be deleted.' });
    }

    // Check existing admissions
    const linkedAdmissions = db.admissions.filter((a) => a.branchId === branchId);
    if (linkedAdmissions.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete branch "${branch.name}". It has ${linkedAdmissions.length} admission record(s) linked to it. Deactivate the branch instead.`,
      });
    }

    db.branches = db.branches.filter((b) => b.id !== branchId);
    saveDatabase(db);

    res.json({ success: true, message: `Branch "${branch.name}" deleted successfully.` });
  });

  // ==========================================
  // ADMISSIONS API
  // ==========================================

  // Get all admissions
  app.get('/api/admissions', (req, res) => {
    const db = loadDatabase();
    let results = db.admissions;

    if (req.query.branchId && req.query.branchId !== 'all') {
      results = results.filter((a) => a.branchId === req.query.branchId);
    }
    if (req.query.course && req.query.course !== 'all') {
      results = results.filter((a) => a.course === req.query.course);
    }
    if (req.query.search) {
      const q = String(req.query.search).toLowerCase();
      results = results.filter(
        (a) =>
          a.studentName.toLowerCase().includes(q) ||
          a.enrollmentId.toLowerCase().includes(q) ||
          a.phone.includes(q)
      );
    }

    res.json({ success: true, admissions: results });
  });

  // Authoritative Admission Submit Endpoint
  app.post('/api/admissions', (req, res) => {
    try {
      const data = req.body;

      // 1. Mandatory Form Validation
      if (!data.studentName || !data.studentName.trim()) {
        return res.status(400).json({ success: false, error: "Validation Error: Student's Full Name is required." });
      }

      const cleanPhone = String(data.phone || '').replace(/[^0-9]/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        return res.status(400).json({ success: false, error: 'Validation Error: A valid 10-digit Active Mobile Number is required.' });
      }

      if (!data.course || !data.course.trim()) {
        return res.status(400).json({ success: false, error: 'Validation Error: Please select an Academic Course.' });
      }

      // Mandatory Payment Validation (Do not allow empty payment details on Final Submission)
      const cleanUtr = String(data.utrNumber || '').trim();
      if (!cleanUtr || cleanUtr.length < 4 || cleanUtr === 'SUBMITTED_PRE_PAYMENT') {
        return res.status(400).json({
          success: false,
          error: 'Validation Error: A valid UTR / Transaction Reference number (minimum 4 characters) is mandatory to submit admission.',
        });
      }

      if (!data.receiptUrl && !data.receiptName) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error: Uploading payment receipt / snapshot is mandatory to submit admission.',
        });
      }

      const db = loadDatabase();

      // 2. Validate Branch
      let targetBranch = db.branches.find((b) => b.id === data.branchId);
      if (!targetBranch && data.branchCode) {
        targetBranch = db.branches.find((b) => b.code.toUpperCase() === String(data.branchCode).toUpperCase());
      }
      if (!targetBranch && data.branchName) {
        targetBranch = db.branches.find((b) => b.name.toLowerCase() === String(data.branchName).toLowerCase());
      }
      if (!targetBranch && (data.branchName || data.branchCode)) {
        // Auto-register dynamically if valid branch name/code provided so it is never lost or overwritten
        const branchName = String(data.branchName || data.branchId || 'Branch').trim();
        const branchCode = String(data.branchCode || 'BR').trim().toUpperCase();
        const newBranch: BranchRecord = {
          id: data.branchId || `branch-${branchCode.toLowerCase()}`,
          name: branchName,
          code: branchCode,
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          status: 'Active',
          isDefault: false,
          createdAt: new Date().toISOString(),
        };
        db.branches.push(newBranch);
        targetBranch = newBranch;
      }
      if (!targetBranch) {
        // Fallback to Main Branch automatically only if no branch specified at all
        targetBranch = db.branches.find((b) => b.isDefault) || db.branches[0] || DEFAULT_BRANCHES[0];
      }

      // 3. Determine Admission Year & Generate Atomic Enrollment Number
      const admissionYear = data.admissionDate ? new Date(data.admissionDate).getFullYear() : new Date().getFullYear();
      const effectiveYear = isNaN(admissionYear) ? new Date().getFullYear() : admissionYear;
      const yy = String(effectiveYear).slice(-2);

      const enrollmentNumber = getNextEnrollmentNumberServer(effectiveYear);
      const applicationId = `IAIT-${effectiveYear}-APP-${enrollmentNumber}`;

      // 4. Construct Admission Record
      const newAdmission: AdmissionRecord = {
        id: applicationId,
        enrollmentId: enrollmentNumber,
        branchId: targetBranch.id,
        branchName: targetBranch.name,
        branchCode: targetBranch.code,
        studentName: data.studentName.trim(),
        guardianName: data.guardianName?.trim() || 'Guardian',
        dob: data.dob || '2005-01-01',
        gender: data.gender || 'Male',
        phone: cleanPhone,
        email: data.email?.trim() || `${data.studentName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
        address: data.address?.trim() || 'Assam, India',
        course: data.course.trim(),
        qualification: data.qualification || '10+2 (HS Passed)',
        batch: data.batch || 'Morning Shift',
        admissionDate: data.admissionDate || new Date().toISOString().split('T')[0],
        photoUrl: data.photoUrl || '',
        photoName: data.photoName || 'candidate_photo.jpg',
        idProofName: data.idProofName || 'id_proof.jpg',
        idProofUrl: data.idProofUrl || '',
        marksheetName: data.marksheetName || 'hslc_marksheet.jpg',
        marksheetUrl: data.marksheetUrl || '',
        utrNumber: cleanUtr,
        receiptName: data.receiptName || 'payment_receipt.jpg',
        receiptUrl: data.receiptUrl || '',
        payment_status: 'Pending Verification',
        application_status: 'Pending Verification',
        registration_fee: 500.00,
        payment_method: data.payment_method || data.paymentMethod || 'UPI / Online',
        status: 'Pending Verification',
        createdAt: new Date().toISOString(),
      };

      // 5. Construct Verified Student Record
      const newStudentRecord: StudentVerificationRecord = {
        enrollmentId: enrollmentNumber,
        rollNo: `${newAdmission.course}-${yy}-${enrollmentNumber.slice(-4)}`,
        name: newAdmission.studentName,
        guardianName: newAdmission.guardianName,
        dob: newAdmission.dob,
        course: newAdmission.course,
        courseFullName: `${newAdmission.course} Vocational Diploma`,
        duration: 'Regular Academic Track',
        center: newAdmission.branchName,
        branchId: newAdmission.branchId,
        branchName: newAdmission.branchName,
        branchCode: newAdmission.branchCode,
        certSerial: `IAIT/PROV/${effectiveYear}/${enrollmentNumber}`,
        enrollmentDate: new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        status: 'Pending Verification',
        grade: 'Enrolled',
        photoUrl: newAdmission.photoUrl || '',
        verificationHash: `SHA-256: ${enrollmentNumber}...live`,
        idProofUrl: newAdmission.idProofUrl,
        idProofName: newAdmission.idProofName,
        marksheetUrl: newAdmission.marksheetUrl,
        marksheetName: newAdmission.marksheetName,
        receiptUrl: newAdmission.receiptUrl,
        receiptName: newAdmission.receiptName,
      };

      // 6. Save to Persistent Database
      // Avoid duplicate by removing existing with same ID
      db.admissions = [newAdmission, ...db.admissions.filter((a) => a.id !== newAdmission.id && a.enrollmentId !== newAdmission.enrollmentId)];
      db.students = [newStudentRecord, ...db.students.filter((s) => s.enrollmentId !== newStudentRecord.enrollmentId)];

      saveDatabase(db);

      console.log(`[API] Successfully saved admission ${applicationId} for branch ${targetBranch.name} (${targetBranch.code})`);

      return res.status(201).json({
        success: true,
        enrollmentNumber,
        applicationId,
        admission: newAdmission,
        student: newStudentRecord,
      });
    } catch (err: any) {
      console.error('[API] Admission save error:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Internal database server error while saving admission.',
      });
    }
  });

  // Update admission (e.g. payment details, edit by admin)
  app.put('/api/admissions/:id', (req, res) => {
    const appId = req.params.id;
    const updates = req.body;
    const db = loadDatabase();

    const idx = db.admissions.findIndex((a) => a.id === appId || a.enrollmentId === appId);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Admission record not found.' });
    }

    const current = db.admissions[idx];
    const updatedAdmission: AdmissionRecord = {
      ...current,
      ...updates,
      id: current.id, // Preserve ID
      enrollmentId: current.enrollmentId, // Preserve enrollment ID
    };

    // If branch updated, validate and sync branch metadata across branchId, branchName, and branchCode
    if (updates.branchId || updates.branchCode || updates.branchName) {
      let b = db.branches.find((br) => br.id === updates.branchId);
      if (!b && updates.branchCode) {
        b = db.branches.find((br) => br.code.toUpperCase() === String(updates.branchCode).toUpperCase());
      }
      if (!b && updates.branchName) {
        b = db.branches.find((br) => br.name.toLowerCase() === String(updates.branchName).toLowerCase());
      }

      if (b) {
        updatedAdmission.branchId = b.id;
        updatedAdmission.branchName = b.name;
        updatedAdmission.branchCode = b.code;
      } else if (updates.branchName || updates.branchCode) {
        if (updates.branchName) updatedAdmission.branchName = updates.branchName;
        if (updates.branchCode) updatedAdmission.branchCode = updates.branchCode.toUpperCase();
        if (updates.branchId) updatedAdmission.branchId = updates.branchId;
      }
    }

    db.admissions[idx] = updatedAdmission;

    // Sync student verification record
    const sIdx = db.students.findIndex((s) => s.enrollmentId === current.enrollmentId);
    if (sIdx !== -1) {
      db.students[sIdx] = {
        ...db.students[sIdx],
        name: updatedAdmission.studentName,
        guardianName: updatedAdmission.guardianName,
        dob: updatedAdmission.dob,
        course: updatedAdmission.course,
        center: updatedAdmission.branchName,
        branchId: updatedAdmission.branchId,
        branchName: updatedAdmission.branchName,
        branchCode: updatedAdmission.branchCode,
        receiptUrl: updatedAdmission.receiptUrl || db.students[sIdx].receiptUrl,
        receiptName: updatedAdmission.receiptName || db.students[sIdx].receiptName,
      };
    }

    saveDatabase(db);
    res.json({ success: true, admission: updatedAdmission });
  });

  // Delete admission
  app.delete('/api/admissions/:id', (req, res) => {
    const appId = req.params.id;
    const db = loadDatabase();

    const target = db.admissions.find((a) => a.id === appId || a.enrollmentId === appId);
    if (!target) {
      return res.status(404).json({ success: false, error: 'Admission record not found.' });
    }

    db.admissions = db.admissions.filter((a) => a.id !== target.id && a.enrollmentId !== target.enrollmentId);
    db.students = db.students.filter((s) => s.enrollmentId !== target.enrollmentId);

    saveDatabase(db);
    res.json({ success: true, message: `Admission for "${target.studentName}" deleted successfully.` });
  });

  // ==========================================
  // STUDENTS API
  // ==========================================
  app.get('/api/students', (req, res) => {
    const db = loadDatabase();
    // Ensure all admissions are represented in students
    const existingEnrollments = new Set(db.students.map((s) => s.enrollmentId.toLowerCase()));
    const synthesized = [...db.students];
    for (const a of db.admissions) {
      if (a.enrollmentId && !existingEnrollments.has(a.enrollmentId.toLowerCase())) {
        synthesized.push({
          enrollmentId: a.enrollmentId,
          rollNo: `${a.course}-${a.enrollmentId.slice(-4)}`,
          name: a.studentName,
          guardianName: a.guardianName,
          dob: a.dob,
          course: a.course,
          courseFullName: `${a.course} Vocational Program`,
          duration: 'Regular Academic Track',
          center: a.branchName,
          branchId: a.branchId,
          branchName: a.branchName,
          branchCode: a.branchCode,
          certSerial: `IAIT/PROV/2026/${a.enrollmentId}`,
          enrollmentDate: a.admissionDate || (a.createdAt ? a.createdAt.split('T')[0] : ''),
          status: a.status === 'Approved' ? 'Active Student' : a.status,
          grade: 'Enrolled',
          photoUrl: a.photoUrl || '',
          verificationHash: `SHA-256: ${a.enrollmentId}...live`,
          receiptUrl: a.receiptUrl,
          receiptName: a.receiptName,
        });
        existingEnrollments.add(a.enrollmentId.toLowerCase());
      }
    }
    res.json({ success: true, students: synthesized });
  });

  app.get('/api/students/:enrollmentId', (req, res) => {
    const db = loadDatabase();
    const enrollment = String(req.params.enrollmentId).trim().toLowerCase();
    const digits = enrollment.replace(/\D/g, '');
    
    // Check in db.students
    let student = db.students.find((s) => {
      const sId = s.enrollmentId.toLowerCase();
      return (
        sId === enrollment ||
        (digits && sId.replace(/\D/g, '') === digits)
      );
    });
    
    // Check in db.admissions
    if (!student) {
      const adm = db.admissions.find(
        (a) => {
          const aEnroll = String(a.enrollmentId || '').toLowerCase();
          const aId = String(a.id || '').toLowerCase();
          return (
            aEnroll === enrollment ||
            aId === enrollment ||
            (digits && aEnroll.replace(/\D/g, '') === digits) ||
            (digits && aId.replace(/\D/g, '') === digits)
          );
        }
      );
      if (adm) {
        student = {
          enrollmentId: adm.enrollmentId,
          rollNo: `${adm.course}-${adm.enrollmentId.slice(-4)}`,
          name: adm.studentName,
          guardianName: adm.guardianName,
          dob: adm.dob,
          course: adm.course,
          courseFullName: `${adm.course} Vocational Program`,
          duration: 'Regular Academic Track',
          center: adm.branchName,
          branchId: adm.branchId,
          branchName: adm.branchName,
          branchCode: adm.branchCode,
          certSerial: `IAIT/PROV/2026/${adm.enrollmentId}`,
          enrollmentDate: adm.admissionDate || (adm.createdAt ? adm.createdAt.split('T')[0] : ''),
          status: adm.status === 'Approved' ? 'Active Student' : adm.status,
          grade: 'Enrolled',
          photoUrl: adm.photoUrl || '',
          verificationHash: `SHA-256: ${adm.enrollmentId}...live`,
          receiptUrl: adm.receiptUrl,
          receiptName: adm.receiptName,
        };
      }
    }

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student record not found.' });
    }
    res.json({ success: true, student });
  });

  // Vite middleware in dev, static serving in production
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.join(__dirname, 'dist'))) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`IAIT Admission System Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

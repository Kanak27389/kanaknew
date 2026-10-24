export type TabType = 'home' | 'courses' | 'admission' | 'verify' | 'contact' | 'admin';

export interface Course {
  id: string;
  code: string;
  title: string;
  shortTitle: string;
  category: 'diploma' | 'certification' | 'financial' | 'tech' | 'design';
  curriculum: string;
  duration: string;
  eligibility: string;
  feeRange: string;
  slots: string;
  description: string;
  bannerImg?: string;
  bannerBadge?: string;
  badge1?: string;
  badge2?: string;
  accentColor: string;
  accentBorder: string;
  icon: string;
  syllabusHighlights: string[];
}

export interface Branch {
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

export interface StudentRecord {
  enrollmentId: string;
  rollNo: string;
  name: string;
  guardianName: string;
  dob?: string;
  course: string;
  courseFullName: string;
  duration: string;
  center: string;
  branchId?: string;
  branchName?: string;
  branchCode?: string;
  branchAddress?: string;
  certSerial: string;
  enrollmentDate: string;
  admissionDate?: string;
  academicSession?: string;
  status: 'Active Student' | 'Course Completed' | 'Under Examination' | 'Approved' | string;
  grade: string;
  photoUrl: string;
  verificationHash: string;
  phone?: string;
  email?: string;
  address?: string;
  gender?: string;
  fatherName?: string;
  motherName?: string;
  utrNumber?: string;
  batch?: string;
  qualification?: string;
  // Attached files for verification
  idProofUrl?: string;
  idProofName?: string;
  marksheetUrl?: string;
  marksheetName?: string;
  receiptUrl?: string;
  receiptName?: string;
}

export interface VerifiedStudentResult {
  enrollment_number: string;
  student_name: string;
  course: string;
  branch_name: string;
  branch_code: string;
  admission_date: string;
  application_status: string;
  certificate_number?: string;
  certificate_status?: string;
  photo_url?: string;
  father_name?: string;
  guardian_name?: string;
  phone?: string;
  address?: string;
  batch?: string;
  qualification?: string;
  utr_number?: string;
  date_of_birth?: string;
  gender?: string;
}

export interface AdmissionApplication {
  id: string;
  studentName: string;
  guardianName: string;
  fatherName?: string;
  motherName?: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  course: string;
  qualification: string;
  batch: string;
  admissionDate: string;
  branchId?: string;
  branchName?: string;
  branchCode?: string;
  enrollmentId?: string;
  photoUrl?: string;
  photoName?: string;
  idProofName?: string;
  idProofUrl?: string;
  marksheetName?: string;
  marksheetUrl?: string;
  utrNumber: string;
  receiptName?: string;
  receiptUrl?: string;
  status: 'Pending Verification' | 'Approved' | 'Active' | string;
  createdAt: string;

  // Supabase PostgreSQL public.admissions column compatibility
  enrollment_number?: string;
  application_number?: string;
  branch_id?: string;
  branch_code?: string;
  branch_name?: string;
  student_name?: string;
  father_name?: string;
  mother_name?: string;
  guardian_name?: string;
  date_of_birth?: string;
  category?: string;
  alternate_phone?: string;
  village?: string;
  post_office?: string;
  police_station?: string;
  district?: string;
  state?: string;
  pincode?: string;
  course_code?: string;
  session?: string;
  admission_date?: string;
  registration_date?: string;
  photo_url?: string;
  id_proof_url?: string;
  qualification_certificate_url?: string;
  marksheet_url?: string;
  other_document_url?: string;
  payment_status?: string;
  registration_fee?: number;
  payment_method?: string;
  utr_number?: string;
  payment_date?: string;
  payment_receipt_url?: string;
  application_status?: string;
  certificate_number?: string;
  certificate_status?: string;
  remarks?: string;
  created_at?: string;
  updated_at?: string;
}

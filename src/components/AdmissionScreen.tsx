import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { TabType, AdmissionApplication, StudentRecord, Branch } from '../types';
import { supabase, isSupabaseConfigured, uploadToStorage, STORAGE_BUCKET_DOCUMENTS } from '../lib/supabaseClient';
import {
  generateCentralEnrollmentNumber,
  submitAdmissionToCentralDb,
  updateAdmissionInCentralDb,
  fetchBranchesFromCentralDb,
  subscribeToBranches,
} from '../services/centralDbService';
import { submitAdmissionToServer } from '../services/admissionService';
import {
  getActiveBranches,
  getBranchById,
  setStoredBranches,
  getStoredBranches,
} from '../data/branchesData';
import { PaymentQrCode } from './PaymentQrCode';
import { printAdmissionRecord } from '../utils/printReport';
import { OfficialAdmissionSlipModal } from './OfficialAdmissionSlipModal';

/**
 * Client-Side Zod Validation Schemas for IAIT Admission Form
 * Strictly validates student and payment data before initiating network transactions to Supabase PostgreSQL.
 */
export const admissionBaseValidationSchema = z.object({
  studentName: z
    .string()
    .trim()
    .min(2, "Validation Error: Please enter Student's Full Name in Step 1 (minimum 2 characters)."),
  phone: z
    .string()
    .transform((val) => (val || '').replace(/[^0-9]/g, ''))
    .refine((val) => val.length >= 10, {
      message: 'Validation Error: Please enter a valid 10-digit Active Mobile Number in Step 1.',
    }),
  email: z
    .string()
    .trim()
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: 'Validation Error: Please enter a valid Email Address in Step 1.',
    })
    .optional(),
  guardianName: z.string().trim().optional(),
  course: z
    .string()
    .trim()
    .min(1, 'Validation Error: Please select an Academic Course in Step 2.'),
  branchId: z
    .string()
    .trim()
    .min(1, 'Validation Error: Please select an active Institutional Branch / Study Centre.'),
  branchName: z.string().optional(),
  branchCode: z.string().optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  qualification: z.string().optional(),
  batch: z.string().optional(),
  address: z.string().optional(),
  admissionDate: z.string().optional(),
});

export const admissionPaymentValidationSchema = z.object({
  utrNumber: z
    .string()
    .trim()
    .min(4, 'Validation Error: Please enter your 12-digit UTR or Transaction Reference number in Step 4 below.'),
  hasReceipt: z.boolean().refine((val) => val === true, {
    message: 'Validation Error: Uploading payment receipt / snapshot is mandatory. Please upload your payment screenshot in Step 4 below.',
  }),
  declaration: z.boolean().refine((val) => val === true, {
    message: 'Validation Error: Please accept the institutional legal declaration checkbox in Step 4 before final submission.',
  }),
});

interface AdmissionScreenProps {
  preselectedCourse?: string;
  setActiveTab: (tab: TabType) => void;
  onViewStudentSlip?: (student: StudentRecord) => void;
}

export const AdmissionScreen: React.FC<AdmissionScreenProps> = ({
  preselectedCourse,
  setActiveTab,
}) => {
  const [step, setStep] = useState<number>(1);
  const [activeBranches, setActiveBranches] = useState<Branch[]>(() => {
    const all = getActiveBranches();
    return all.length > 0 ? all : getStoredBranches();
  });
  const [validationNotice, setValidationNotice] = useState<string | null>(null);

  // Form State - Empty branch selection initially to require user to pick their specific branch
  const [formData, setFormData] = useState(() => ({
    branchId: '',
    branchName: '',
    branchCode: '',
    studentName: '',
    guardianName: '',
    dob: '',
    gender: 'Male',
    phone: '',
    email: '',
    address: '',
    course: preselectedCourse || 'ADCA',
    qualification: '10+2 (HS Passed)',
    batch: 'Morning Shift',
    admissionDate: new Date().toISOString().split('T')[0],
    utrNumber: '',
    declaration: false,
  }));

  useEffect(() => {
    const isItemActive = (b: Branch) => {
      const s = String(b.status || 'Active').trim().toLowerCase();
      return s !== 'inactive' && s !== 'disabled' && s !== 'false';
    };

    // Helper to refresh branches dynamically from Supabase Central DB
    const loadLiveBranches = async () => {
      try {
        const liveBranches = await fetchBranchesFromCentralDb();
        if (liveBranches && liveBranches.length > 0) {
          setStoredBranches(liveBranches);
          const active = liveBranches.filter(isItemActive);
          const available = active.length > 0 ? active : liveBranches;
          setActiveBranches(available);

          // If the user already selected a branch, verify it still exists or sync updated details
          setFormData((prev) => {
            if (prev.branchId) {
              const matched = available.find(
                (b) => b.id === prev.branchId || b.code.toUpperCase() === prev.branchCode.toUpperCase()
              );
              if (matched) {
                return {
                  ...prev,
                  branchId: matched.id,
                  branchName: matched.name,
                  branchCode: matched.code,
                };
              }
            }
            return prev;
          });
        }
      } catch (err) {
        console.warn('Central DB live branches load note:', err);
      }
    };

    // 1. Initial immediate load from Supabase / Central DB
    loadLiveBranches();

    // 2. Subscribe to realtime changes from Supabase public.branches and local dispatch events
    const unsubscribe = subscribeToBranches((updated) => {
      if (updated && updated.length > 0) {
        setStoredBranches(updated);
        const active = updated.filter(isItemActive);
        const available = active.length > 0 ? active : updated;
        setActiveBranches(available);

        setFormData((prev) => {
          if (prev.branchId) {
            const matched = available.find(
              (b) => b.id === prev.branchId || b.code.toUpperCase() === prev.branchCode.toUpperCase()
            );
            if (matched) {
              return {
                ...prev,
                branchId: matched.id,
                branchName: matched.name,
                branchCode: matched.code,
              };
            }
          }
          return prev;
        });
      }
    });

    // 3. Fallback sync on window focus and local storage change
    const handleFocus = () => {
      loadLiveBranches();
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('iait_branches_changed', handleFocus);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('iait_branches_changed', handleFocus);
    };
  }, []);

  const [confirmedRecord, setConfirmedRecord] = useState<AdmissionApplication | null>(null);

  const [photoPreview, setPhotoPreview] = useState<string>(
    'https://lh3.googleusercontent.com/aida-public/AB6AXuA0ptOq7HKDVXdySOwws7DlfBBzBVNRLF-DacP3w7Z3KiMJ3LtjvIrbb5JLc5orJJbXG5fZowmIN2hPBlyKPgxaxDo80-nbNchTaM9QIiivVZvofIEv86V-0w-FomomtRIyb0G_sQ3gX8RABsnrVfKddzYOItoDjMEFWQii1SdytKfc0poGeiw9TWAWFc_Hpl9HPD65-xKH9cq8XEZVsUju81jbRoVmrF2rgX9M2F1yEnlb91Ls0SD3dg'
  );
  const [photoFileName, setPhotoFileName] = useState<string>('');
  const [idProofName, setIdProofName] = useState<string>('');
  const [idProofDataUrl, setIdProofDataUrl] = useState<string>('');
  const [marksheetName, setMarksheetName] = useState<string>('');
  const [marksheetDataUrl, setMarksheetDataUrl] = useState<string>('');
  const [receiptName, setReceiptName] = useState<string>('');
  const [receiptDataUrl, setReceiptDataUrl] = useState<string>('');

  const [payTab, setPayTab] = useState<'upi' | 'bank'>('upi');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedEnrollment, setCopiedEnrollment] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [currentRecordForSlip, setCurrentRecordForSlip] = useState<AdmissionApplication | null>(null);
  const [generatedAppId, setGeneratedAppId] = useState('');
  const [generatedEnrollmentId, setGeneratedEnrollmentId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isApplicationSaved, setIsApplicationSaved] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [savedTimestamp, setSavedTimestamp] = useState<string | null>(null);

  const admissionYear = formData.admissionDate
    ? new Date(formData.admissionDate).getFullYear()
    : new Date().getFullYear();
  const effectiveYear = isNaN(admissionYear) ? new Date().getFullYear() : admissionYear;
  const yy = effectiveYear.toString().slice(-2);

  useEffect(() => {
    if (preselectedCourse) {
      setFormData((prev) => ({ ...prev, course: preselectedCourse }));
    }
  }, [preselectedCourse]);

  const courseDetailsMap: Record<string, string> = {
    DCA: 'DCA (6 Months): Covers Computer Fundamentals, Windows, MS Office Suite, Internet Concepts & Assamese DTP Basics.',
    ADCA: 'ADCA (12 Months): Flagship program including DCA + Web Designing basics, Financial Accounting, Tally Prime, and C/C++ Intro.',
    PGDCA: 'PGDCA (12 Months): University-aligned curriculum for Graduates with Advanced Database, Python, and Software Lab Projects.',
    BCC: 'BCC (3 Months): Essential digital literacy, safe internet banking, operating systems, and official word processing.',
    CCC: 'CCC (3 Months): NIELIT-aligned foundation standard recognized in Assam State Government job requirements.',
    TALLY: 'Tally Prime with GST (3 Months): Professional computerized accounting, voucher entry, inventory, e-way bills, and GST returns.',
    PYTHON: 'Python Programming (4 Months): Scripting fundamentals, OOPs, Data structures, Tkinter GUI, and foundational Data Science.',
    AI: 'Artificial Intelligence (6 Months): Prompt Engineering, LLM workflows, generative graphic pipelines, and automation tools.',
    DTP: 'DTP Graphic Design (3 Months): CorelDraw, PageMaker, Adobe Photoshop with bilingual desktop publishing training.',
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const chosenId = e.target.value;
    const branchObj = activeBranches.find((b) => b.id === chosenId) || getBranchById(chosenId);
    if (branchObj) {
      setFormData((prev) => ({
        ...prev,
        branchId: branchObj.id,
        branchName: branchObj.name,
        branchCode: branchObj.code,
      }));
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const MAX_FILE_SIZE_BYTES = 200 * 1024; // Strict 200 KB limit
  const [fileError, setFileError] = useState<string | null>(null);

  const isJpgOrJpeg = (file: File): boolean => {
    const hasJpgExt = /\.(jpe?g)$/i.test(file.name);
    const isJpgMime = file.type === 'image/jpeg' || file.type === 'image/pjpeg';
    return hasJpgExt || isJpgMime;
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!isJpgOrJpeg(file)) {
        setFileError(
          `Candidate Photo file "${file.name}" is not supported. Upload file must be strictly in .jpg or .jpeg format only.`
        );
        e.target.value = '';
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileError(
          `Photo file "${file.name}" is ${(file.size / 1024).toFixed(1)} KB. Maximum allowed size is 200 KB. Please upload a file of 200 KB or less.`
        );
        e.target.value = '';
        return;
      }
      setPhotoFileName(file.name);
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setPhotoPreview(uploadEvent.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setterName: (name: string) => void,
    setterDataUrl: (url: string) => void,
    fieldLabel: string
  ) => {
    setFileError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!isJpgOrJpeg(file)) {
        setFileError(
          `${fieldLabel} file "${file.name}" is not supported. Upload file must be strictly in .jpg or .jpeg format only.`
        );
        e.target.value = '';
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileError(
          `${fieldLabel} file "${file.name}" is ${(file.size / 1024).toFixed(1)} KB. Maximum allowed size is 200 KB. Please upload a file of 200 KB or less.`
        );
        e.target.value = '';
        return;
      }
      setterName(file.name);
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setterDataUrl(uploadEvent.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText('sanjib.upadhayaya@okaxis').then(() => {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    });
  };

  const showCurriculumHint = () => {
    setValidationNotice(
      'Eligibility Quick Guide: DCA / CCC / BCC / DTP: 10th (HSLC) passed or appearing • ADCA / Tally Prime: 10+2 (HS) passed • PGDCA: Graduation in any discipline'
    );
  };

  // Step Validation Helpers
  const validateStep1 = (): boolean => {
    setValidationNotice(null);
    if (!formData.branchId) {
      setValidationNotice('Validation Error: Please select an Admission Branch to continue.');
      window.scrollTo({ top: 150, behavior: 'smooth' });
      return false;
    }
    if (!formData.studentName.trim()) {
      setValidationNotice("Validation Error: Please enter Student's Full Name in Step 1.");
      window.scrollTo({ top: 200, behavior: 'smooth' });
      return false;
    }
    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setValidationNotice('Validation Error: Please enter a valid 10-digit Active Mobile Number in Step 1.');
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    setValidationNotice(null);
    if (!formData.course) {
      setValidationNotice('Validation Error: Please select an Academic Course in Step 2.');
      window.scrollTo({ top: 150, behavior: 'smooth' });
      return false;
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    setValidationNotice(null);
    if (!idProofDataUrl && !idProofName) {
      setValidationNotice('Validation Error: Please upload Government ID Proof (Aadhaar / Voter ID / PAN) in Step 3 before proceeding.');
      window.scrollTo({ top: 360, behavior: 'smooth' });
      return false;
    }
    if (!marksheetDataUrl && !marksheetName) {
      setValidationNotice('Validation Error: Please upload your Academic Marksheet in Step 3 before proceeding.');
      window.scrollTo({ top: 480, behavior: 'smooth' });
      return false;
    }
    return true;
  };

  // Payment Validation Status (Mandatory for Step 4 Final Submission)
  const isUtrEntered = Boolean(formData.utrNumber && formData.utrNumber.trim().length >= 4);
  const isReceiptUploaded = Boolean(receiptDataUrl || receiptName);
  const isDeclarationAccepted = Boolean(formData.declaration);
  const isPaymentValid = isUtrEntered && isReceiptUploaded && isDeclarationAccepted;

  /**
   * Final Submission to Central Database (Step 4)
   * Strictly verifies payment details before saving.
   * Does NOT treat entered details as confirmed payment; uses "Pending Verification".
   */
  const handleFinalAdmissionSubmission = async () => {
    setSubmissionError(null);
    setValidationNotice(null);

    // 1. Explicit Network Connectivity Check
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSaveStatus('error');
      setSubmissionError('Network Error: Your device appears to be offline. Please verify your internet connection and try again.');
      window.scrollTo({ top: 150, behavior: 'smooth' });
      return;
    }

    // 2. Validate Step 1 (Personal Details)
    if (!validateStep1()) {
      setStep(1);
      return;
    }

    // 3. Validate Step 2 (Academic Track)
    if (!validateStep2()) {
      setStep(2);
      return;
    }

    // 4. Validate Step 3 (Uploads)
    if (!validateStep3()) {
      setStep(3);
      return;
    }

    // 5. Validate Step 4 (Payment Details - Mandatory Validation)
    const paymentValidation = admissionPaymentValidationSchema.safeParse({
      utrNumber: formData.utrNumber,
      hasReceipt: Boolean(receiptDataUrl || receiptName),
      declaration: formData.declaration,
    });

    if (!paymentValidation.success) {
      const firstIssue = paymentValidation.error.issues[0];
      setValidationNotice(firstIssue.message);
      const field = String(firstIssue.path[0] || '');
      if (field === 'utrNumber') {
        window.scrollTo({ top: 380, behavior: 'smooth' });
      } else if (field === 'hasReceipt') {
        window.scrollTo({ top: 430, behavior: 'smooth' });
      }
      return;
    }

    // 6. Prevent Duplicate Submissions
    if (isSubmitting || saveStatus === 'saved') return;
    setIsSubmitting(true);
    setSaveStatus('saving');

    // Resolve target branch dynamically from database / active branches
    let selectedBranch = activeBranches.find((b) => b.id === formData.branchId) || getBranchById(formData.branchId);
    if (!selectedBranch && formData.branchCode) {
      selectedBranch = activeBranches.find((b) => b.code.toUpperCase() === formData.branchCode.toUpperCase()) || getBranchById(formData.branchCode);
    }
    if (!selectedBranch && formData.branchName) {
      selectedBranch = activeBranches.find((b) => b.name.toLowerCase() === formData.branchName.toLowerCase()) || getBranchById(formData.branchName);
    }
    if (!selectedBranch && activeBranches.length > 0) {
      selectedBranch = activeBranches.find((b) => b.isDefault) || activeBranches[0];
    }

    const finalBranchId = selectedBranch?.id || formData.branchId;
    const finalBranchName = selectedBranch?.name || formData.branchName || 'Institutional Centre';
    const finalBranchCode = selectedBranch?.code || formData.branchCode || 'IC';

    try {
      console.log('[AdmissionScreen] Submitting complete admission with verified payment details to Supabase Central DB...');
      const admissionYear = formData.admissionDate
        ? new Date(formData.admissionDate).getFullYear()
        : new Date().getFullYear();
      const effectiveYear = isNaN(admissionYear) ? new Date().getFullYear() : admissionYear;

      // SUBMIT TO CENTRAL DATABASE (public.admissions) WITH CENTRAL SEQUENTIAL ENROLLMENT NUMBER
      const result = await submitAdmissionToCentralDb(
        {
          branchId: finalBranchId,
          branchName: finalBranchName,
          branchCode: finalBranchCode,
          studentName: formData.studentName.trim(),
          guardianName: formData.guardianName.trim() || 'Guardian',
          fatherName: formData.guardianName.trim() || 'Guardian',
          dob: formData.dob || '2005-01-01',
          gender: formData.gender,
          category: 'General',
          phone: formData.phone.trim(),
          email: formData.email.trim() || `${formData.studentName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
          address: formData.address.trim() || 'Assam, India',
          course: formData.course,
          courseCode: formData.course,
          qualification: formData.qualification,
          batch: formData.batch,
          admissionDate: formData.admissionDate,
          photoUrl: photoPreview,
          photoName: photoFileName || 'candidate_photo.jpg',
          idProofName: idProofName || 'id_proof.jpg',
          idProofUrl: idProofDataUrl,
          marksheetName: marksheetName || 'hslc_marksheet.jpg',
          marksheetUrl: marksheetDataUrl,
          utrNumber: formData.utrNumber.trim(),
          receiptName: receiptName || 'payment_receipt.jpg',
          receiptUrl: receiptDataUrl,
          paymentMethod: payTab === 'upi' ? 'UPI / Online' : 'Bank Transfer / NEFT',
        },
        { admissionYear: effectiveYear }
      );

      // Show success ONLY after the database confirms saving
      if (!result || !result.success || !result.enrollmentNumber || !result.applicationId) {
        throw new Error((result as any)?.error || 'Unable to save admission to central database. Please verify connection.');
      }

      console.log(`[AdmissionScreen] Confirmed central admission save: ${result.applicationId} with Enrollment ${result.enrollmentNumber}`);
      setSaveStatus('saved');
      setSavedTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setGeneratedAppId(result.applicationId);
      setGeneratedEnrollmentId(result.enrollmentNumber);
      
      const confirmedAdm: AdmissionApplication = {
        ...(result.admission || {}),
        id: result.applicationId,
        enrollmentId: result.enrollmentNumber,
        enrollment_number: result.enrollmentNumber,
        studentName: formData.studentName.trim(),
        guardianName: formData.guardianName.trim() || 'Guardian',
        course: formData.course,
        branchId: finalBranchId,
        branchName: finalBranchName,
        branchCode: finalBranchCode,
        admissionDate: formData.admissionDate,
        utrNumber: formData.utrNumber.trim(),
        payment_status: 'Pending Verification',
        application_status: 'Pending Verification',
        status: 'Pending Verification',
        registration_fee: 500.00,
        payment_method: payTab === 'upi' ? 'UPI / Online' : 'Bank Transfer / NEFT',
        photoUrl: photoPreview,
        receiptUrl: receiptDataUrl,
        receiptName: receiptName,
        createdAt: new Date().toISOString(),
      };
      setConfirmedRecord(confirmedAdm);
      setCurrentRecordForSlip(confirmedAdm);
      setIsApplicationSaved(true);
      setIsSuccessModalOpen(true);
    } catch (err: any) {
      console.error('[AdmissionScreen] Admission submission error:', err);
      setSaveStatus('error');
      const rawMsg = err?.message || 'Admission submission failed. Please check form details and try again.';
      let userFriendlyError = rawMsg;
      const lower = rawMsg.toLowerCase();
      if (
        lower.includes('failed to fetch') ||
        lower.includes('networkerror') ||
        lower.includes('network error') ||
        lower.includes('timeout') ||
        lower.includes('err_connection')
      ) {
        userFriendlyError = `Network / Connection Error: Unable to communicate with the Supabase central database. Please check your internet connection and verify that your Supabase project is reachable. (${rawMsg})`;
      }
      setSubmissionError(userFriendlyError);
      window.scrollTo({ top: 150, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPrintableRecord = (): AdmissionApplication => {
    if (confirmedRecord) return confirmedRecord;
    const bId = formData.branchId;
    const bObj = activeBranches.find((b) => b.id === bId) || getBranchById(bId);
    return {
      id: generatedAppId || 'PENDING',
      enrollmentId: generatedEnrollmentId || 'PENDING',
      studentName: formData.studentName,
      guardianName: formData.guardianName,
      dob: formData.dob,
      gender: formData.gender,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      course: formData.course,
      qualification: formData.qualification,
      batch: formData.batch,
      admissionDate: formData.admissionDate,
      branchId: bId,
      branchName: formData.branchName || bObj?.name || 'Institutional Centre',
      branchCode: formData.branchCode || bObj?.code || 'IC',
      utrNumber: formData.utrNumber,
      payment_status: 'Pending Verification',
      application_status: 'Pending Verification',
      status: 'Pending Verification',
      registration_fee: 500.00,
      payment_method: payTab === 'upi' ? 'UPI / Online' : 'Bank Transfer / NEFT',
      photoUrl: photoPreview,
      photoName: photoFileName || 'candidate_photo.jpg',
      receiptUrl: receiptDataUrl,
      receiptName: receiptName,
      createdAt: new Date().toISOString(),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      if (validateStep2()) setStep(3);
    } else if (step === 3) {
      if (validateStep3()) setStep(4);
    } else if (step === 4) {
      await handleFinalAdmissionSubmission();
    }
  };

  const resetFormForNewAdmission = () => {
    setFormData({
      branchId: '',
      branchName: '',
      branchCode: '',
      studentName: '',
      guardianName: '',
      dob: '',
      gender: 'Male',
      phone: '',
      email: '',
      address: '',
      course: preselectedCourse || 'ADCA',
      qualification: '10+2 (HS Passed)',
      batch: 'Morning Shift',
      admissionDate: new Date().toISOString().split('T')[0],
      utrNumber: '',
      declaration: false,
    });
    setPhotoFileName('');
    setIdProofName('');
    setIdProofDataUrl('');
    setMarksheetName('');
    setMarksheetDataUrl('');
    setReceiptName('');
    setReceiptDataUrl('');
    setGeneratedAppId('');
    setGeneratedEnrollmentId('');
    setConfirmedRecord(null);
    setIsApplicationSaved(false);
    setSaveStatus('idle');
    setSavedTimestamp(null);
    setValidationNotice(null);
    setSubmissionError(null);
    setStep(1);
    setIsSuccessModalOpen(false);
    setIsSlipModalOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseSlipModal = () => {
    // Closes slip preview and returns to Admission page while keeping Supabase record intact
    setIsSlipModalOpen(false);
  };

  const handleCloseSuccess = () => {
    setIsSuccessModalOpen(false);
    setActiveTab('verify');
  };

  return (
    <div className="flex flex-col w-full pb-20">
      {/* Top Portal Notice Header */}
      <div className="relative overflow-hidden bg-[#00163d] text-white px-4 py-5 shadow-sm">
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-[#316bf3]/20 blur-2xl pointer-events-none" />
        <div className="absolute right-12 bottom-0 w-24 h-24 rounded-full bg-[#ffb95f]/15 blur-xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ffddb8] text-[#2a1700] text-[10px] font-bold">
              <span className="material-symbols-outlined text-[13px]">verified</span>
              SESSION 2025-2026
            </span>
            <span className="text-[#afc6ff] text-xs font-semibold truncate">
              Govt. Recognized Tech Node
            </span>
          </div>
          <h1 className="font-headline text-[24px] sm:text-[28px] text-white font-extrabold tracking-tight">
            Official Online Admission Portal
          </h1>
          <p className="text-xs text-[#d8e3fb] leading-relaxed">
            Fill the form accurately. Upon digital verification, an official Admission Confirmation & Institutional Enrollment Number (YYSSSS) will be generated.
          </p>
        </div>
      </div>

      {/* Progress Stepper for Mobile (< lg) */}
      <div className="px-4 py-3 bg-[#e7eeff] shadow-xs sticky top-[128px] sm:top-[136px] z-30 backdrop-blur-md bg-[#e7eeff]/95 border-b border-[#dee8ff] lg:hidden">
        <div className="flex items-center justify-between relative max-w-md mx-auto">
          {/* Background Connecting Track */}
          <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-[#c4c6d0] -translate-y-1/2 z-0" />
          <div
            className="absolute top-1/2 left-4 h-0.5 bg-[#0051d5] -translate-y-1/2 z-0 transition-all duration-300"
            style={{
              width:
                step === 1 ? '12%' : step === 2 ? '38%' : step === 3 ? '68%' : '95%',
            }}
          />

          {/* Stepper Buttons */}
          {[
            { num: 1, label: 'Personal' },
            { num: 2, label: 'Course' },
            { num: 3, label: 'Uploads' },
            { num: 4, label: 'Payment' },
          ].map((item) => (
            <button
              key={item.num}
              type="button"
              onClick={() => setStep(item.num)}
              className="relative z-10 flex flex-col items-center group cursor-pointer"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                  step === item.num
                    ? 'bg-[#0051d5] text-white scale-105'
                    : step > item.num
                    ? 'bg-[#00163d] text-white'
                    : 'bg-[#dee8ff] text-[#44464f]'
                }`}
              >
                {step > item.num ? (
                  <span className="material-symbols-outlined text-[15px]">check</span>
                ) : (
                  item.num
                )}
              </div>
              <span
                className={`text-[10px] mt-1 font-bold whitespace-nowrap ${
                  step === item.num ? 'text-[#0051d5]' : 'text-[#44464f]'
                }`}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Responsive Container for Laptop/PC & Mobile */}
      <div className="max-w-6xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Desktop Steps, Live Enrollment No. Format Card & Summary (Sticky on Laptop/PC) */}
          <aside className="hidden lg:flex lg:col-span-4 flex-col gap-4 lg:sticky lg:top-[152px]">
            {/* Desktop Step Navigation */}
            <div className="p-4 bg-white rounded-2xl shadow-xs border border-[#dee8ff] flex flex-col gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#747780]">
                Admission Steps
              </span>
              <div className="flex flex-col gap-2">
                {[
                  { num: 1, title: 'Personal Details', desc: 'Trainee biodata & contacts', icon: 'person' },
                  { num: 2, title: 'Course Selection', desc: 'Track & shift selection', icon: 'school' },
                  { num: 3, title: 'Document Uploads', desc: '.jpg/.jpeg format only (max 200KB)', icon: 'upload_file' },
                  { num: 4, title: 'Fee & Verification', desc: 'UTR transaction & submit', icon: 'payments' },
                ].map((s) => (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => setStep(s.num)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer border ${
                      step === s.num
                        ? 'bg-[#e7eeff] border-[#0051d5] shadow-xs'
                        : step > s.num
                        ? 'bg-[#f0f3ff] border-[#dee8ff] text-[#00163d]'
                        : 'bg-white border-transparent text-[#747780] hover:bg-[#f0f3ff]'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        step === s.num
                          ? 'bg-[#0051d5] text-white'
                          : step > s.num
                          ? 'bg-[#00163d] text-white'
                          : 'bg-[#dee8ff] text-[#44464f]'
                      }`}
                    >
                      {step > s.num ? (
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      ) : (
                        s.num
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-[#00163d] truncate">{s.title}</span>
                      <span className="text-[11px] text-[#44464f] truncate">{s.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Course Card */}
            <div className="p-4 bg-[#f0f3ff] rounded-2xl border border-[#dee8ff] shadow-xs flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#747780] uppercase">Selected Track</span>
                <span className="px-2 py-0.5 rounded-full bg-[#0051d5] text-white text-[10px] font-bold font-mono">
                  {formData.course}
                </span>
              </div>
              <p className="text-xs text-[#00163d] font-semibold leading-relaxed">
                {courseDetailsMap[formData.course] || formData.course}
              </p>
              <div className="flex items-center justify-between text-[11px] text-[#44464f] pt-1 border-t border-[#dee8ff]">
                <span>Batch: <strong>{formData.batch}</strong></span>
                <span>Qual: <strong>{formData.qualification}</strong></span>
              </div>
            </div>

            {/* Helpline Assistance */}
            <div className="p-3.5 bg-white rounded-2xl border border-[#dee8ff] shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#dee8ff] text-[#0051d5] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">support_agent</span>
                </div>
                <div className="flex flex-col text-xs">
                  <span className="font-bold text-[#00163d]">Need Form Help?</span>
                  <span className="text-[11px] text-[#747780]">Call Admission Desk</span>
                </div>
              </div>
              <a
                href="tel:+918638611886"
                className="px-3 py-1.5 rounded-xl bg-[#00163d] hover:bg-[#0051d5] text-white text-xs font-bold transition-all"
              >
                8638611886
              </a>
            </div>
          </aside>

          {/* Right Column: Form Fields */}
          <div className="lg:col-span-8 flex flex-col gap-4 w-full">
            {/* Main Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
              {/* Global Prominent In-UI Validation & Error Banners */}
              {validationNotice && (
                <div className="p-3.5 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-900 text-xs flex items-start gap-2.5 shadow-sm animate-in fade-in">
                  <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0 mt-0.5">
                    warning
                  </span>
                  <div className="flex-1">
                    <strong className="font-bold block text-sm mb-0.5">Required Information Needed:</strong>
                    <span>{validationNotice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setValidationNotice(null)}
                    className="text-amber-700 hover:text-amber-950 p-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              )}

              {submissionError && (
                <div className="p-4 rounded-xl bg-red-50 border-2 border-red-400 text-red-950 text-xs flex flex-col gap-2 shadow-sm animate-in fade-in">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-red-600 text-[22px] shrink-0 mt-0.5">
                        error
                      </span>
                      <div>
                        <strong className="font-bold block text-sm mb-0.5">Database / Submission Error:</strong>
                        <span className="font-mono text-[11px] leading-relaxed break-words">{submissionError}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSubmissionError(null)}
                      className="text-red-700 hover:text-red-950 p-1 cursor-pointer shrink-0"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                  {(submissionError.includes('42P01') || submissionError.includes('schema.sql') || submissionError.includes('public.admissions')) && (
                    <div className="mt-1 p-3 rounded-lg bg-white border border-red-200 text-gray-800 text-xs flex flex-col gap-1.5">
                      <span className="font-bold text-red-700 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">database</span>
                        Action Required in Supabase Dashboard:
                      </span>
                      <ol className="list-decimal list-inside space-y-1 text-[11px] text-gray-700">
                        <li>Open your project at <strong>supabase.com/dashboard</strong></li>
                        <li>Click <strong>SQL Editor</strong> on the left navigation bar</li>
                        <li>Copy the contents of <strong>supabase/schema.sql</strong> and paste them into the query editor</li>
                        <li>Click <strong>Run</strong> (Ctrl+Enter) to create table <code>public.admissions</code>, indexes, and RLS policies</li>
                        <li>Return here and submit the admission form again</li>
                      </ol>
                    </div>
                  )}
                </div>
              )}

        {/* STEP 1: PERSONAL DETAILS */}
        {step === 1 && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">
            {/* Step Header */}
            <div className="flex items-center justify-between bg-[#f0f3ff] p-3 rounded-xl shadow-xs border border-[#dee8ff]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#0f2b5c] text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                </div>
                <div>
                  <h2 className="font-headline text-[15px] font-bold text-[#00163d]">
                    Student Identity & Center
                  </h2>
                  <p className="text-xs text-[#44464f]">Step 1 of 4: Branch center, biodata & contacts</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#dee8ff] text-[#00163d] text-[10px] font-bold">
                MANDATORY
              </span>
            </div>

            {/* MANDATORY: Select Branch / Study Center */}
            <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-gradient-to-r from-[#eef4ff] to-[#f8faff] border-2 border-[#0051d5]/30 shadow-xs">
              <label className="text-xs font-bold text-[#00163d] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#0051d5]">location_city</span>
                  Select Admission Branch <span className="text-red-600">*</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0051d5] bg-blue-100 px-2 py-0.5 rounded-full">
                  Mandatory Selection
                </span>
              </label>

              <div className="relative">
                <select
                  required
                  name="branchId"
                  value={formData.branchId}
                  onChange={handleBranchChange}
                  className="w-full appearance-none bg-white text-[#111c2d] rounded-xl pl-10 pr-10 py-3 text-sm font-semibold shadow-xs border border-[#dee8ff] focus:outline-none focus:border-[#0051d5] transition-colors"
                >
                  <option value="" disabled>
                    -- Select Admission Branch / Study Centre --
                  </option>
                  {activeBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#0051d5] text-[20px] pointer-events-none">
                  apartment
                </span>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#747780] pointer-events-none text-[20px]">
                  expand_more
                </span>
              </div>

              {/* Selected Branch Details Preview Card */}
              {(() => {
                const currentBranch = activeBranches.find((b) => b.id === formData.branchId);
                if (!currentBranch) return null;
                return (
                  <div className="bg-white p-2.5 rounded-lg border border-[#dee8ff] text-[11px] text-[#44464f] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="material-symbols-outlined text-[15px] text-[#0051d5] shrink-0">pin_drop</span>
                      <span className="truncate">{currentBranch.address}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-[#00163d] font-semibold">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px] text-emerald-700">call</span>
                        +91 {currentBranch.phone}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[#0051d5] text-[10px] font-bold">
                        Code: {currentBranch.code}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Student Full Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#111c2d] flex items-center justify-between">
                <span>
                  Student's Full Name <span className="text-red-600">*</span>
                </span>
                <span className="text-[#747780] text-[11px] font-normal">
                  As on HSLC Marksheet
                </span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-[#747780] text-[20px]">
                  person
                </span>
                <input
                  required
                  type="text"
                  name="studentName"
                  value={formData.studentName}
                  onChange={handleInputChange}
                  placeholder="e.g. Manabendra Saikia"
                  className="w-full bg-white text-[#111c2d] rounded-xl pl-10 pr-4 py-3 text-sm shadow-xs border border-[#dee8ff] focus:outline-none focus:border-[#0051d5] transition-colors"
                />
              </div>
            </div>

            {/* Guardian Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#111c2d]">
                Father's / Mother's Name <span className="text-red-600">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-[#747780] text-[20px]">
                  family_restroom
                </span>
                <input
                  required
                  type="text"
                  name="guardianName"
                  value={formData.guardianName}
                  onChange={handleInputChange}
                  placeholder="e.g. Pradip Saikia"
                  className="w-full bg-white text-[#111c2d] rounded-xl pl-10 pr-4 py-3 text-sm shadow-xs border border-[#dee8ff] focus:outline-none focus:border-[#0051d5] transition-colors"
                />
              </div>
            </div>

            {/* DOB & Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#111c2d]">
                  Date of Birth <span className="text-red-600">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-[#747780] text-[20px]">
                    calendar_month
                  </span>
                  <input
                    required
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleInputChange}
                    className="w-full bg-white text-[#111c2d] rounded-xl pl-10 pr-4 py-3 text-sm shadow-xs border border-[#dee8ff] focus:outline-none focus:border-[#0051d5] transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-[#111c2d]">
                  Gender <span className="text-red-600">*</span>
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {['Male', 'Female', 'Other'].map((g) => (
                    <label
                      key={g}
                      className={`flex items-center justify-center py-3 px-2 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                        formData.gender === g
                          ? 'bg-[#00163d] text-white border-[#00163d] shadow-xs'
                          : 'bg-white text-[#44464f] border-[#dee8ff] hover:bg-[#f0f3ff]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="gender"
                        value={g}
                        checked={formData.gender === g}
                        onChange={handleInputChange}
                        className="hidden"
                      />
                      <span>{g}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile Number with +91 Indian flag */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#111c2d] flex items-center justify-between">
                <span>
                  Active Mobile Number <span className="text-red-600">*</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#15803d]">
                  <span className="material-symbols-outlined text-[13px]">chat</span> WhatsApp Alerts
                </span>
              </label>
              <div className="flex items-center rounded-xl bg-white shadow-xs border border-[#dee8ff] overflow-hidden">
                <div className="px-3.5 py-3 bg-[#dee8ff] text-[#00163d] text-xs font-bold flex items-center gap-1.5 shrink-0 select-none">
                  <img
                    className="w-4 h-3 object-cover rounded-xs"
                    alt="Indian Tricolor"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7z91pOI34Dzm5cRwiAqL7QLsyKIgql_ywkNFzDc_Ym4rpmhvnesC20sKSUMdNUoCNQKn65oxk3ZyRQxwmQGcLZm3i8g1Yiv5VhSJ4OGvo6sII2st4OFn4icOX1bFmbXbM3e1IX2-ITheUDLA86opKoBhgVo8BFfYPfjxpmBiTnH7cWcti0X6QwQ3TNScgeUgtbjLHFxr825iusC2kalnPXtqHwmJdY0dvw1g9zuM5ZMepfKUQ4Jo4Kw"
                  />
                  <span>+91</span>
                </div>
                <input
                  required
                  type="tel"
                  pattern="[0-9]{10}"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="98765 43210"
                  className="w-full bg-transparent text-[#111c2d] px-3 py-3 text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#111c2d] flex items-center justify-between">
                <span>
                  Email Address <span className="text-red-600">*</span>
                </span>
                <span className="text-[#747780] text-[11px]">
                  For student admit card & credentials
                </span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-[#747780] text-[20px]">
                  mail
                </span>
                <input
                  required
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="name@domain.com"
                  className="w-full bg-white text-[#111c2d] rounded-xl pl-10 pr-4 py-3 text-sm shadow-xs border border-[#dee8ff] focus:outline-none focus:border-[#0051d5] transition-colors"
                />
              </div>
            </div>

            {/* Postal Address */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#111c2d]">
                Permanent Postal Address <span className="text-red-600">*</span>
              </label>
              <textarea
                required
                rows={3}
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Village/Town, PO, Police Station, District (e.g., Kuwaritol, Kaliabor, Nagaon, Assam - 782137)"
                className="w-full bg-white text-[#111c2d] rounded-xl p-3 text-sm shadow-xs border border-[#dee8ff] focus:outline-none focus:border-[#0051d5] transition-colors"
              />
            </div>

            {/* Step 1 Next Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setValidationNotice(null);
                  if (!formData.branchId) {
                    setValidationNotice('Please select an Admission Branch to continue.');
                    window.scrollTo({ top: 150, behavior: 'smooth' });
                    return;
                  }
                  if (!formData.studentName.trim()) {
                    setValidationNotice("Please enter Student's Full Name in Step 1.");
                    window.scrollTo({ top: 200, behavior: 'smooth' });
                    return;
                  }
                  const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
                  if (!cleanPhone || cleanPhone.length < 10) {
                    setValidationNotice('Please enter a valid 10-digit Active Mobile Number in Step 1.');
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                    return;
                  }
                  setStep(2);
                  window.scrollTo({ top: 150, behavior: 'smooth' });
                }}
                className="w-full bg-[#0051d5] hover:bg-[#316bf3] text-white text-sm font-bold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
              >
                <span>Continue to Course & Academics</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: COURSE & ACADEMICS */}
        {step === 2 && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between bg-[#f0f3ff] p-3 rounded-xl shadow-xs border border-[#dee8ff]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#316bf3] text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">school</span>
                </div>
                <div>
                  <h2 className="font-headline text-[15px] font-bold text-[#00163d]">
                    Academic Track
                  </h2>
                  <p className="text-xs text-[#44464f]">Step 2 of 4: Course selection & past studies</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#ffddb8] text-[#2a1700] text-[10px] font-bold">
                FLAGSHIP
              </span>
            </div>

            {/* Course Select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#111c2d] flex items-center justify-between">
                <span>
                  Select Academic Course <span className="text-red-600">*</span>
                </span>
                <button
                  type="button"
                  onClick={showCurriculumHint}
                  className="text-[#0051d5] text-xs font-semibold cursor-pointer hover:underline"
                >
                  View Eligibility
                </button>
              </label>
              <div className="relative">
                <select
                  required
                  name="course"
                  value={formData.course}
                  onChange={handleInputChange}
                  className="w-full appearance-none bg-white text-[#111c2d] rounded-xl pl-4 pr-10 py-3.5 text-sm shadow-xs border border-[#dee8ff] focus:outline-none focus:border-[#0051d5] transition-colors font-medium"
                >
                  <option value="DCA">DCA (Diploma in Computer Applications) • 6 Months</option>
                  <option value="ADCA">ADCA (Advance Diploma in Computer Applications) • 12 Months</option>
                  <option value="PGDCA">PGDCA (Post Graduate Diploma in Computer Applications) • 12 Months</option>
                  <option value="BCC">BCC (Basic Computer Course) • 3 Months</option>
                  <option value="CCC">CCC (Course on Computer Concepts) • 3 Months</option>
                  <option value="TALLY">Tally Prime with GST & E-Filing • 3 Months</option>
                  <option value="PYTHON">Python Programming & Logic Building • 4 Months</option>
                  <option value="AI">Artificial Intelligence & Prompt Engineering • 6 Months</option>
                  <option value="DTP">DTP (Desktop Publishing & Graphics Design) • 3 Months</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#747780] pointer-events-none text-[20px]">
                  expand_more
                </span>
              </div>
            </div>

            {/* Dynamic Course Perk Card */}
            <div className="bg-white p-3.5 rounded-xl shadow-xs border border-[#dee8ff] flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ffddb8]/40 text-[#2a1700] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">workspace_premium</span>
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[10px] font-bold text-[#cf8400] uppercase tracking-wider">
                  Course Accreditation & Syllabus Preview
                </span>
                <p className="text-xs text-[#111c2d] leading-relaxed">
                  {courseDetailsMap[formData.course] ||
                    'Select a program above to preview affiliated certification status, lab allocation, and examination pattern at IAIT Kaliabor campus.'}
                </p>
              </div>
            </div>

            {/* Highest Educational Qualification */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#111c2d]">
                Highest Educational Qualification <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleInputChange}
                  className="w-full appearance-none bg-white text-[#111c2d] rounded-xl pl-4 pr-10 py-3.5 text-sm shadow-xs border border-[#dee8ff] focus:outline-none focus:border-[#0051d5] transition-colors"
                >
                  <option value="Below 10th">Below 10th Standard</option>
                  <option value="HSLC (10th Pass)">10th Pass (HSLC / CBSE / SEBA)</option>
                  <option value="10+2 (HS Passed)">10+2 (HS / AHSEC Passed - Arts/Sci/Comm)</option>
                  <option value="Graduate">Graduate (BA / BSc / BCom / BCA / BTech)</option>
                  <option value="Post Graduate">Post Graduate (MA / MSc / MCom / MCA / Other)</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#747780] pointer-events-none text-[20px]">
                  expand_more
                </span>
              </div>
            </div>

            {/* Preferred Batch Shift */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-[#111c2d]">
                Preferred Lab Batch Timing
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    name: 'Morning Shift',
                    time: '8:00 AM - 11:30 AM',
                    icon: 'light_mode',
                  },
                  {
                    name: 'Afternoon Shift',
                    time: '1:30 PM - 5:00 PM',
                    icon: 'wb_twilight',
                  },
                ].map((b) => (
                  <label
                    key={b.name}
                    className={`flex items-center gap-2 p-3 rounded-xl shadow-xs cursor-pointer border transition-all ${
                      formData.batch === b.name
                        ? 'bg-[#00163d] text-white border-[#00163d]'
                        : 'bg-white text-[#111c2d] border-[#dee8ff] hover:bg-[#f0f3ff]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="batch"
                      value={b.name}
                      checked={formData.batch === b.name}
                      onChange={handleInputChange}
                      className="hidden"
                    />
                    <span className="material-symbols-outlined text-[18px]">{b.icon}</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{b.name}</span>
                      <span className="text-[10px] opacity-75">{b.time}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Date of Admission */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#111c2d]">
                Date of Admission Request <span className="text-red-600">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-[#747780] text-[20px]">
                  today
                </span>
                <input
                  required
                  type="date"
                  name="admissionDate"
                  value={formData.admissionDate}
                  onChange={handleInputChange}
                  className="w-full bg-white text-[#111c2d] rounded-xl pl-10 pr-4 py-3 text-sm shadow-xs border border-[#dee8ff] focus:outline-none focus:border-[#0051d5] transition-colors"
                />
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 bg-[#dee8ff] hover:bg-[#d8e3fb] text-[#00163d] text-xs font-bold py-3.5 rounded-xl shadow-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setValidationNotice(null);
                  if (!formData.course) {
                    setValidationNotice('Please select an Academic Course in Step 2.');
                    window.scrollTo({ top: 150, behavior: 'smooth' });
                    return;
                  }
                  setStep(3);
                  window.scrollTo({ top: 150, behavior: 'smooth' });
                }}
                className="w-2/3 bg-[#0051d5] hover:bg-[#316bf3] text-white text-xs font-bold py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Proceed to Document Uploads</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: DOCUMENT UPLOADS */}
        {step === 3 && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">
            {/* 200 KB File Upload Restriction Alert if triggered */}
            {fileError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 shadow-xs animate-in fade-in">
                <span className="material-symbols-outlined text-red-600 text-[18px] shrink-0 mt-0.5">
                  error
                </span>
                <div className="flex-1">
                  <strong className="font-bold">Upload Notice:</strong> {fileError}
                </div>
                <button
                  type="button"
                  onClick={() => setFileError(null)}
                  className="text-red-500 hover:text-red-800"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            )}

            <div className="flex items-center justify-between bg-[#f0f3ff] p-3 rounded-xl shadow-xs border border-[#dee8ff]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#0f2b5c] text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">upload_file</span>
                </div>
                <div>
                  <h2 className="font-headline text-[15px] font-bold text-[#00163d]">
                    Student Records
                  </h2>
                  <p className="text-xs text-[#44464f]">Step 3 of 4: Verification files (.jpg or .jpeg only, Max 200 KB each)</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#dee8ff] text-[#00163d] text-[10px] font-bold">
                .JPG / .JPEG (MAX 200 KB)
              </span>
            </div>

            {/* 1. Passport Photo */}
            <div className="bg-white p-3.5 rounded-xl shadow-xs border border-[#dee8ff] flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0051d5] text-[20px]">account_box</span>
                  <span className="text-xs font-bold text-[#111c2d]">
                    Passport Size Photo <span className="text-red-600">*</span>
                  </span>
                </div>
                <span className="text-[10px] text-[#747780] font-semibold">.JPG or .JPEG only (Max 200 KB)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-20 h-24 rounded-lg bg-[#dee8ff] flex flex-col items-center justify-center overflow-hidden shrink-0 border border-[#c4c6d0]">
                  <img
                    src={photoPreview}
                    alt="Photo Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <label
                    htmlFor="photo-file"
                    className="cursor-pointer bg-[#dee8ff] hover:bg-[#d8e3fb] text-[#00163d] py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-colors text-center"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
                    <span>{photoFileName ? 'Change Photo' : 'Browse or Capture Photo'}</span>
                  </label>
                  <input
                    id="photo-file"
                    type="file"
                    accept=".jpg,.jpeg,image/jpeg"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <span className="text-[11px] text-[#747780] truncate">
                    {photoFileName ? `Attached: ${photoFileName}` : 'White background recommended (.jpg or .jpeg only, Max 200 KB)'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Govt ID Proof */}
            <div className="bg-white p-3.5 rounded-xl shadow-xs border border-[#dee8ff] flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0051d5] text-[20px]">credit_card</span>
                  <span className="text-xs font-bold text-[#111c2d]">
                    Government ID Proof <span className="text-red-600">*</span>
                  </span>
                </div>
                <span className="text-[10px] text-[#747780] font-semibold">.JPG or .JPEG only (Max 200 KB)</span>
              </div>
              <p className="text-xs text-[#44464f]">
                Aadhaar Card, Voter ID, PAN, or School/College ID
              </p>
              <label
                htmlFor="id-proof-file"
                className="cursor-pointer p-4 rounded-xl bg-[#f0f3ff] hover:bg-[#e7eeff] flex flex-col items-center justify-center gap-1.5 text-center transition-colors border border-dashed border-[#c4c6d0]"
              >
                <div className="w-10 h-10 rounded-full bg-[#dee8ff] text-[#00163d] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">cloud_upload</span>
                </div>
                <span className="text-xs font-bold text-[#00163d]">
                  {idProofName ? `✓ ${idProofName}` : 'Tap to select Aadhaar / Voter ID Document'}
                </span>
                <span className="text-[11px] text-[#747780]">
                  Only .jpg or .jpeg format accepted (Strictly under 200 KB)
                </span>
              </label>
              <input
                id="id-proof-file"
                type="file"
                accept=".jpg,.jpeg,image/jpeg"
                onChange={(e) => handleFileUpload(e, setIdProofName, setIdProofDataUrl, 'Government ID Proof')}
                className="hidden"
              />
            </div>

            {/* 3. Academic Marksheet */}
            <div className="bg-white p-3.5 rounded-xl shadow-xs border border-[#dee8ff] flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0051d5] text-[20px]">history_edu</span>
                  <span className="text-xs font-bold text-[#111c2d]">
                    Latest Academic Marksheet <span className="text-red-600">*</span>
                  </span>
                </div>
                <span className="text-[10px] text-[#747780] font-semibold">.JPG or .JPEG only (Max 200 KB)</span>
              </div>
              <label
                htmlFor="marksheet-file"
                className="cursor-pointer p-4 rounded-xl bg-[#f0f3ff] hover:bg-[#e7eeff] flex flex-col items-center justify-center gap-1.5 text-center transition-colors border border-dashed border-[#c4c6d0]"
              >
                <div className="w-10 h-10 rounded-full bg-[#dee8ff] text-[#00163d] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">description</span>
                </div>
                <span className="text-xs font-bold text-[#00163d]">
                  {marksheetName ? `✓ ${marksheetName}` : 'Tap to upload Qualification Marksheet'}
                </span>
                <span className="text-[11px] text-[#747780]">
                  Original or internet-issued copy in .jpg or .jpeg format (Max 200 KB)
                </span>
              </label>
              <input
                id="marksheet-file"
                type="file"
                accept=".jpg,.jpeg,image/jpeg"
                onChange={(e) => handleFileUpload(e, setMarksheetName, setMarksheetDataUrl, 'Academic Marksheet')}
                className="hidden"
              />
            </div>

            {/* Helper guidance note above proceed */}
            <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-[#003ea8] flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] shrink-0 text-[#0051d5]">info</span>
              <span>Please upload your Government ID and Marksheet (.jpg or .jpeg only, max 200 KB) before proceeding to Fee Payment.</span>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-1/3 bg-[#dee8ff] hover:bg-[#d8e3fb] text-[#00163d] text-xs font-bold py-3.5 rounded-xl shadow-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (validateStep3()) {
                    setStep(4);
                    window.scrollTo({ top: 150, behavior: 'smooth' });
                  }
                }}
                className="w-2/3 bg-[#0051d5] hover:bg-[#316bf3] text-white text-xs font-bold py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Proceed to Fee Payment</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: FEE PAYMENT & CONFIRMATION */}
        {step === 4 && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">
            {/* Database Confirmed Notice if application is already saved */}
            {isApplicationSaved && generatedEnrollmentId && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 text-xs flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-emerald-600 text-[24px]">verified</span>
                  <div>
                    <span className="font-bold text-sm block">Admission Record Registered in Database!</span>
                    <p className="text-[11px] text-emerald-800">
                      Assigned Institutional Enrollment No: <strong className="font-mono text-emerald-950 text-xs">{generatedEnrollmentId}</strong> ({generatedAppId})
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-200 text-emerald-950 text-[10px] font-black uppercase tracking-wider shrink-0">
                  DATABASE CONFIRMED
                </span>
              </div>
            )}

            {/* 200 KB File Upload Restriction Alert if triggered */}
            {fileError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 shadow-xs animate-in fade-in">
                <span className="material-symbols-outlined text-red-600 text-[18px] shrink-0 mt-0.5">
                  error
                </span>
                <div className="flex-1">
                  <strong className="font-bold">Upload Notice:</strong> {fileError}
                </div>
                <button
                  type="button"
                  onClick={() => setFileError(null)}
                  className="text-red-500 hover:text-red-800"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            )}

            <div className="flex items-center justify-between bg-[#f0f3ff] p-3 rounded-xl shadow-xs border border-[#dee8ff]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#422700] text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
                </div>
                <div>
                  <h2 className="font-headline text-[15px] font-bold text-[#00163d]">
                    Fee & Confirmation
                  </h2>
                  <p className="text-xs text-[#44464f]">Step 4 of 4: Direct UPI gateway</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#ffddb8] text-[#2a1700] text-[10px] font-bold">
                FINAL STEP
              </span>
            </div>

            {/* Fee Amount Banner */}
            <div className="bg-[#00163d] text-white p-4 rounded-xl shadow-xs flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#afc6ff] uppercase tracking-wider font-bold">
                  Registration & Prospectus Fee
                </span>
                <span className="font-headline text-[32px] font-extrabold text-white leading-tight">
                  ₹500
                </span>
                <span className="text-xs text-[#c4c6d0]">
                  One-time institute admission processing fee
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-[#ffddb8]">
                <span className="material-symbols-outlined text-[30px]">verified</span>
              </div>
            </div>

            {/* Payment Method Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 bg-[#e7eeff] rounded-xl border border-[#dee8ff]">
              <button
                type="button"
                onClick={() => setPayTab('upi')}
                className={`py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  payTab === 'upi'
                    ? 'bg-white text-[#00163d] shadow-xs'
                    : 'text-[#44464f] hover:text-[#00163d]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                <span>UPI / Scan QR</span>
              </button>
              <button
                type="button"
                onClick={() => setPayTab('bank')}
                className={`py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  payTab === 'bank'
                    ? 'bg-white text-[#00163d] shadow-xs'
                    : 'text-[#44464f] hover:text-[#00163d]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">account_balance</span>
                <span>Net Banking / NEFT</span>
              </button>
            </div>

            {/* UPI Tab Content */}
            {payTab === 'upi' && (
              <div className="bg-white p-4 rounded-xl shadow-xs border border-[#dee8ff] flex flex-col items-center text-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#dbe1ff] text-[#003ea8] text-[10px] font-bold">
                  <span>OFFICIAL GOOGLE PAY & BHARAT QR PAYMENT</span>
                </div>

                {/* Inserted QR Code Component */}
                <PaymentQrCode
                  amount={500}
                  upiId="sanjib.upadhayaya@okaxis"
                  merchantName="Icon Academy of Information Technology"
                  note="IAIT Admission Fee"
                />

                {/* Copyable UPI Handle */}
                <div className="w-full bg-[#f0f3ff] p-2.5 rounded-xl flex items-center justify-between gap-2 border border-[#dee8ff]">
                  <div className="flex items-center gap-2 min-w-0 pl-1">
                    <span className="material-symbols-outlined text-[#0051d5] text-[20px]">
                      account_circle
                    </span>
                    <span className="text-xs font-bold text-[#00163d] truncate font-mono">
                      sanjib.upadhayaya@okaxis
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={copyUpiId}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-[#dee8ff] hover:bg-[#d8e3fb] text-[#00163d] text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    <span>{copiedUpi ? 'Copied!' : 'Copy UPI'}</span>
                  </button>
                </div>

                {/* Supported UPI Apps */}
                <div className="w-full flex items-center justify-around pt-1 text-[#44464f] text-[11px] font-semibold">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#0051d5]" /> GPay
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-600" /> PhonePe
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-sky-500" /> Paytm
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-500" /> BHIM
                  </span>
                </div>
              </div>
            )}

            {/* Bank Transfer Tab Content */}
            {payTab === 'bank' && (
              <div className="bg-white p-4 rounded-xl shadow-xs border border-[#dee8ff] flex flex-col gap-3 text-xs">
                <span className="text-[10px] text-[#747780] font-bold uppercase tracking-wider">
                  Institution Bank Particulars
                </span>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between py-2 bg-[#f0f3ff] px-3 rounded-lg">
                    <span className="text-[#44464f]">Account Name:</span>
                    <strong className="text-[#00163d]">ICON ACADEMY OF IT</strong>
                  </div>
                  <div className="flex justify-between py-2 bg-[#f0f3ff] px-3 rounded-lg">
                    <span className="text-[#44464f]">Account Number:</span>
                    <strong className="text-[#00163d] font-mono">398102010019284</strong>
                  </div>
                  <div className="flex justify-between py-2 bg-[#f0f3ff] px-3 rounded-lg">
                    <span className="text-[#44464f]">IFSC Code:</span>
                    <strong className="text-[#00163d] font-mono">UBIN0539813</strong>
                  </div>
                  <div className="flex justify-between py-2 bg-[#f0f3ff] px-3 rounded-lg">
                    <span className="text-[#44464f]">Branch:</span>
                    <strong className="text-[#00163d]">Kaliabor Branch, Nagaon</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Transaction Reference (UTR) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#111c2d] flex items-center justify-between">
                <span>
                  UTR / Transaction Reference No. <span className="text-red-600">*</span>
                </span>
                <span className="text-[#747780] text-[11px]">12-Digit Ref from receipt</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-[#747780] text-[20px]">
                  pin
                </span>
                <input
                  required
                  type="text"
                  name="utrNumber"
                  value={formData.utrNumber}
                  onChange={handleInputChange}
                  placeholder="e.g. 518293847291"
                  className="w-full bg-white text-[#111c2d] rounded-xl pl-10 pr-4 py-3 text-sm shadow-xs border border-[#dee8ff] font-mono uppercase focus:outline-none focus:border-[#0051d5] transition-colors"
                />
              </div>
            </div>

            {/* Mandatory Receipt Attachment */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#111c2d] flex items-center justify-between">
                <span>
                  Upload Payment Receipt / Snapshot <span className="text-red-600">*</span>
                </span>
                <span className="text-red-600 font-bold text-[11px]">Mandatory</span>
              </label>
              <label
                htmlFor="receipt-file"
                className={`cursor-pointer bg-white p-3 rounded-xl shadow-xs border ${
                  receiptName ? 'border-emerald-500 bg-emerald-50/20' : 'border-[#dee8ff]'
                } flex items-center gap-3 hover:bg-[#f0f3ff] transition-colors`}
              >
                <div
                  className={`w-10 h-10 rounded-lg ${
                    receiptName ? 'bg-emerald-100 text-emerald-700' : 'bg-[#dee8ff] text-[#00163d]'
                  } flex items-center justify-center shrink-0`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {receiptName ? 'check_circle' : 'receipt_long'}
                  </span>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className={`text-xs font-bold ${receiptName ? 'text-emerald-800' : 'text-[#00163d]'} truncate`}>
                    {receiptName ? `✓ ${receiptName}` : 'Upload payment receipt / snapshot (Required)'}
                  </span>
                  <span className="text-[11px] text-[#747780]">.JPG or .JPEG only (Max 200 KB) • Required</span>
                </div>
                <span className="material-symbols-outlined text-[#747780] text-[20px]">
                  attach_file
                </span>
              </label>
              <input
                id="receipt-file"
                type="file"
                required
                accept=".jpg,.jpeg,image/jpeg"
                onChange={(e) => handleFileUpload(e, setReceiptName, setReceiptDataUrl, 'Payment Receipt')}
                className="hidden"
              />
            </div>

            {/* Legal Declaration */}
            <div className="bg-white p-3.5 rounded-xl shadow-xs border border-[#dee8ff] flex items-start gap-3 mt-1">
              <input
                required
                type="checkbox"
                id="declaration"
                name="declaration"
                checked={formData.declaration}
                onChange={handleInputChange}
                className="mt-1 w-4 h-4 rounded text-[#0051d5] cursor-pointer"
              />
              <label
                htmlFor="declaration"
                className="text-xs text-[#44464f] cursor-pointer select-none leading-relaxed"
              >
                I hereby declare that all the information and uploaded documents provided above are genuine to the best of my knowledge. I agree to abide by the academic code and code of conduct of{' '}
                <strong className="text-[#00163d]">Icon Academy of IT (IAIT), Kaliabor</strong>.
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex flex-col gap-3">
              {validationNotice && (
                <div className="p-3.5 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-900 text-xs flex items-start gap-2 shadow-xs animate-in fade-in">
                  <span className="material-symbols-outlined text-amber-600 text-[18px] shrink-0 mt-0.5">warning</span>
                  <div className="flex-1 font-medium">{validationNotice}</div>
                </div>
              )}

              {submissionError && (
                <div className="p-3.5 rounded-xl bg-red-50 border-2 border-red-300 text-red-900 text-xs flex items-start gap-2 shadow-xs animate-in fade-in">
                  <span className="material-symbols-outlined text-red-600 text-[18px] shrink-0 mt-0.5">error</span>
                  <div className="flex-1 font-medium">{submissionError}</div>
                </div>
              )}

              {/* Mandatory Payment Checklist Warning if payment is incomplete */}
              {!isPaymentValid && saveStatus !== 'saved' && (
                <div className="p-3.5 rounded-xl bg-amber-50/90 border-2 border-amber-300 text-amber-950 text-xs flex items-start gap-2.5 shadow-xs animate-in fade-in">
                  <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0 mt-0.5">lock_clock</span>
                  <div className="flex-1">
                    <strong className="font-bold block text-amber-900 mb-0.5">Mandatory Payment Verification Checklist</strong>
                    <p className="text-[11px] text-amber-800 mb-1.5">
                      Final Submission is disabled until all required payment fields are completed and validated:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px]">
                      <span className={`inline-flex items-center gap-1 font-semibold ${isUtrEntered ? 'text-emerald-700' : 'text-red-600'}`}>
                        <span className="material-symbols-outlined text-[15px]">{isUtrEntered ? 'check_circle' : 'cancel'}</span>
                        12-Digit UTR Ref
                      </span>
                      <span className={`inline-flex items-center gap-1 font-semibold ${isReceiptUploaded ? 'text-emerald-700' : 'text-red-600'}`}>
                        <span className="material-symbols-outlined text-[15px]">{isReceiptUploaded ? 'check_circle' : 'cancel'}</span>
                        Payment Receipt
                      </span>
                      <span className={`inline-flex items-center gap-1 font-semibold ${isDeclarationAccepted ? 'text-emerald-700' : 'text-red-600'}`}>
                        <span className="material-symbols-outlined text-[15px]">{isDeclarationAccepted ? 'check_circle' : 'cancel'}</span>
                        Declaration Check
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Post-Save Confirmation / Duplicate Prevention Banner in Step 4 */}
              {saveStatus === 'saved' && generatedEnrollmentId ? (
                <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 flex flex-col gap-3 shadow-sm animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-emerald-600 text-[26px]">task_alt</span>
                    <div>
                      <h4 className="font-bold text-sm text-[#00163d]">Admission Successfully Logged!</h4>
                      <p className="text-xs text-emerald-800">
                        Enrollment Number: <strong className="font-mono text-emerald-950 text-sm font-black">{generatedEnrollmentId}</strong> • Status: <strong className="text-amber-800">Pending Verification</strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const recordToPrint = getPrintableRecord();
                        printAdmissionRecord(recordToPrint, activeBranches.find((b) => b.id === recordToPrint.branchId) || getBranchById(recordToPrint.branchId));
                      }}
                      className="flex-1 bg-[#0051d5] hover:bg-[#316bf3] text-white text-xs font-bold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">print</span>
                      <span>Print Admission Slip</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const recordToPrint = getPrintableRecord();
                        setCurrentRecordForSlip(recordToPrint);
                        setIsSlipModalOpen(true);
                      }}
                      className="bg-white hover:bg-slate-100 text-[#00163d] border border-slate-300 text-xs font-bold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      <span>Preview Slip</span>
                    </button>
                    <button
                      type="button"
                      onClick={resetFormForNewAdmission}
                      className="bg-white hover:bg-slate-100 text-[#00163d] border border-slate-300 text-xs font-bold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">person_add</span>
                      <span>Submit Another Student</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="submit"
                  onClick={(e) => {
                    e.preventDefault();
                    handleFinalAdmissionSubmission();
                  }}
                  disabled={isSubmitting || saveStatus === 'saved' || !isPaymentValid}
                  className={`w-full text-white text-base font-bold py-4 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer ${
                    !isPaymentValid
                      ? 'bg-slate-400 hover:bg-slate-400 opacity-60 cursor-not-allowed shadow-none'
                      : 'bg-[#0051d5] hover:bg-[#316bf3]'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing Admission & Payment... Please wait</span>
                    </>
                  ) : !isPaymentValid ? (
                    <>
                      <span className="material-symbols-outlined text-[20px]">lock</span>
                      <span>Complete Payment Details to Enable Final Submission</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[24px]">verified</span>
                      <span>Submit Admission Application & Pay</span>
                    </>
                  )}
                </button>
              )}
              <div className="flex items-center justify-center gap-1.5 text-center text-[#747780] text-[11px]">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                <span>Encrypted 256-bit transmission to IAIT Central Registrar Registry</span>
              </div>
            </div>
          </div>
        )}
      </form>

        {/* Help Desk Callout */}
        <div className="p-3.5 rounded-xl bg-[#f0f3ff] shadow-xs flex items-center justify-between gap-3 border border-[#dee8ff] w-full lg:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#dbe1ff] text-[#003ea8] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">support_agent</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-[#00163d]">Admission Help Desk</span>
              <span className="text-[11px] text-[#44464f] truncate">
                Need assistance with application?
              </span>
            </div>
          </div>
          <a
            className="shrink-0 px-3.5 py-2 rounded-lg bg-[#00163d] hover:bg-[#0051d5] text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all"
            href="tel:+918638611886"
          >
            <span className="material-symbols-outlined text-[16px]">call</span>
            <span>8638611886</span>
          </a>
        </div>
      </div>
    </div>
  </div>

      {/* Submission Success Modal */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#00163d]/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 flex flex-col items-center text-center gap-4 border border-[#dee8ff] animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-md animate-bounce">
              <span className="material-symbols-outlined text-[36px]">task_alt</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold mx-auto tracking-wider uppercase">
                ADMISSION LOGGED & CONFIRMED
              </span>
              <h3 className="font-headline text-[20px] font-bold text-[#00163d] mt-1">
                Admission Form Submitted!
              </h3>
              <p className="text-xs text-[#44464f] leading-relaxed">
                Your admission application has been registered successfully. The Institutional Enrollment Number has been generated and auto-incremented in the official database.
              </p>
            </div>

            <div className="w-full bg-[#f0f3ff] p-4 rounded-xl flex flex-col gap-3 text-left border border-[#dee8ff]">
              {/* Highlighted Official Institutional Enrollment Number Box */}
              <div className="bg-white p-3.5 rounded-xl border-2 border-[#0051d5]/40 shadow-xs flex flex-col gap-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#dee8ff]">
                  <span className="text-xs text-[#00163d] font-extrabold uppercase tracking-wider">
                    Institutional Enrollment No.:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedEnrollmentId);
                      setCopiedEnrollment(true);
                      setTimeout(() => setCopiedEnrollment(false), 2000);
                    }}
                    className="no-print px-2.5 py-1 rounded-md bg-[#dee8ff] hover:bg-[#0051d5] hover:text-white text-[#00163d] text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                    title="Copy Enrollment Number"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {copiedEnrollment ? 'check' : 'content_copy'}
                    </span>
                    <span>{copiedEnrollment ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="flex items-baseline justify-between pt-0.5">
                  <span className="font-headline text-[26px] sm:text-[30px] text-[#0051d5] font-black font-mono tracking-wider">
                    {generatedEnrollmentId}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold tracking-wide uppercase">
                    OFFICIAL • ACTIVE
                  </span>
                </div>
              </div>

              {/* Format Breakdown Info Tag */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-[#dee8ff] text-[11px]">
                <span className="material-symbols-outlined text-[#0051d5] text-[16px] shrink-0">info</span>
                <span className="text-[#44464f]">
                  <strong>Format:</strong> Year (<strong>{generatedEnrollmentId.slice(0, 2)}</strong>) + Serial No (<strong>{generatedEnrollmentId.slice(2)}</strong>) [Sequential from 1000]
                </span>
              </div>

              <div className="flex flex-col gap-1 text-[11px] text-[#44464f]">
                <div className="flex items-center justify-between">
                  <span className="text-[#747780]">Application ID:</span>
                  <span className="font-mono font-semibold text-[#111c2d]">{generatedAppId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#747780]">Candidate:</span>
                  <strong className="text-[#111c2d]">{formData.studentName}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#747780]">Assigned Branch:</span>
                  <strong className="text-[#0051d5]">
                    {confirmedRecord?.branchName || formData.branchName} ({confirmedRecord?.branchCode || formData.branchCode})
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#747780]">Course & Batch:</span>
                  <span className="font-medium text-[#111c2d]">{formData.course} • {formData.batch}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#747780]">Admission Date:</span>
                  <span className="font-medium text-[#111c2d]">{formData.admissionDate || new Date().toISOString().split('T')[0]}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#747780]">Registration Fee:</span>
                  <strong className="text-[#00163d]">₹500.00 (Online)</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#747780]">UTR Ref:</span>
                  <span className="font-mono text-[#0051d5] font-semibold">{formData.utrNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#747780]">Payment Status:</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                    Pending Verification
                  </span>
                </div>
              </div>
            </div>

            <div className="no-print flex flex-col w-full gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const recordToPrint = getPrintableRecord();
                  printAdmissionRecord(recordToPrint, activeBranches.find((b) => b.id === recordToPrint.branchId) || getBranchById(recordToPrint.branchId));
                }}
                className="w-full bg-[#0051d5] hover:bg-[#316bf3] text-white text-xs font-bold py-3 px-4 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                <span>Print Official Admission Slip</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const recordToPrint = getPrintableRecord();
                  setCurrentRecordForSlip(recordToPrint);
                  setIsSlipModalOpen(true);
                }}
                className="w-full bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">visibility</span>
                <span>Preview & Download Slip (PDF)</span>
              </button>
              <button
                type="button"
                onClick={handleCloseSuccess}
                className="w-full bg-[#00163d] hover:bg-[#002d73] text-white text-xs font-bold py-3 px-4 rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>Lookup in Student Verification Portal</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSuccessModalOpen(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-[#00163d] text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-300"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>← Back to Admission</span>
              </button>
              <button
                type="button"
                onClick={resetFormForNewAdmission}
                className="w-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                <span>Submit Another Student Admission</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Admission Slip Print / PDF Modal */}
      {currentRecordForSlip && (
        <OfficialAdmissionSlipModal
          isOpen={isSlipModalOpen}
          onClose={handleCloseSlipModal}
          record={currentRecordForSlip}
          branch={activeBranches.find((b) => b.id === currentRecordForSlip.branchId) || getBranchById(currentRecordForSlip.branchId)}
        />
      )}
    </div>
  );
};

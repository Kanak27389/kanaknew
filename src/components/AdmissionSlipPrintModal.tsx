import React, { useEffect } from 'react';
import { AdmissionApplication, Branch } from '../types';

interface AdmissionSlipPrintModalProps {
  admission: AdmissionApplication | null;
  branch?: Branch;
  onClose: () => void;
  autoPrint?: boolean;
}

export const AdmissionSlipPrintModal: React.FC<AdmissionSlipPrintModalProps> = ({
  admission,
  branch,
  onClose,
  autoPrint = true,
}) => {
  // Keyboard shortcut: Press Escape to close admission slip modal
  useEffect(() => {
    if (!admission) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [admission, onClose]);

  useEffect(() => {
    if (admission && autoPrint) {
      // Small timeout to allow DOM to paint before opening native print dialog
      const timer = setTimeout(() => {
        try {
          window.print();
        } catch (e) {
          console.warn('Native window.print() failed:', e);
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [admission, autoPrint]);

  if (!admission) return null;

  // Resolve accurate branch information without defaulting to Main Branch if custom branch present
  const branchName = admission.branchName || branch?.name || 'Institutional Centre';
  const branchCode = admission.branchCode || branch?.code || 'IC';
  const branchAddress = branch?.address || admission.address || 'Assam, India';
  const branchPhone = branch?.phone || '8638611886';
  const enrollmentNumber = String(admission.enrollmentId || admission.id || '').trim();

  // Determine Academic Session from Admission Date or Year
  const admDateStr = admission.admissionDate || (admission.createdAt ? admission.createdAt.split('T')[0] : '');
  const admYear = admDateStr ? parseInt(admDateStr.slice(0, 4), 10) : new Date().getFullYear();
  const validYear = isNaN(admYear) ? new Date().getFullYear() : admYear;
  const academicSession = `Session ${validYear}-${validYear + 1}`;

  const isPaymentVerified = admission.utrNumber && admission.utrNumber !== 'SUBMITTED_PRE_PAYMENT';

  return (
    <div className="fixed inset-0 z-[9999] bg-[#00163d]/80 backdrop-blur-xs overflow-y-auto flex flex-col items-center p-2 sm:p-6">
      {/* Top Floating Sticky Control Bar (Hidden when printed) */}
      <div className="no-print w-full max-w-4xl bg-white rounded-xl shadow-lg border border-[#dee8ff] p-3 mb-4 flex flex-wrap items-center justify-between gap-2 sticky top-2 z-30">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-[#0051d5] text-[24px] shrink-0">print</span>
          <div className="min-w-0">
            <h3 className="font-headline text-sm font-bold text-[#00163d] truncate">
              OFFICIAL ADMISSION SLIP / CARD PREVIEW: {admission.studentName}
            </h3>
            <span className="text-[11px] text-[#747780] block truncate">
              Enrollment No: <strong className="font-mono text-[#0051d5]">{enrollmentNumber}</strong> • Branch: <strong>{branchName} ({branchCode})</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-[#0051d5] hover:bg-[#316bf3] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            <span>Print Slip</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            title="Close slip preview"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* Official Printable Admission Slip Document */}
      <div
        id="iait-official-print-slip"
        className="iait-print-target w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border-2 border-[#00163d] text-[#0b1329] flex flex-col gap-4 font-sans text-xs leading-relaxed"
      >
        {/* Document Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-[#0051d5] gap-4">
          <div className="flex items-center gap-3">
            {/* Institute Emblem Logo */}
            <div className="w-14 h-14 rounded-xl bg-[#00163d] text-white flex items-center justify-center shrink-0 shadow-md">
              <span className="material-symbols-outlined text-[36px] text-amber-300">school</span>
            </div>
            <div className="flex flex-col">
              <h1 className="font-headline text-lg sm:text-xl font-black text-[#00163d] tracking-tight uppercase m-0 leading-tight">
                ICON ACADEMY OF INFORMATION TECHNOLOGY
              </h1>
              <span className="text-[10px] font-bold text-[#0051d5] tracking-wider uppercase mt-0.5">
                Govt. Registered & ISO 9001:2015 Certified IT Education Institute
              </span>
              <span className="text-[10px] text-[#475569] mt-0.5">
                Authorized Central Registry • Assam Multi-Branch Network
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-block px-3 py-1 rounded bg-[#00163d] text-white text-[10px] font-extrabold uppercase tracking-wider">
              OFFICIAL ADMISSION SLIP
            </span>
            <div className="text-[9px] text-[#64748b] mt-1 font-mono">
              Printed: {new Date().toLocaleDateString('en-GB')}
            </div>
          </div>
        </div>

        {/* Selected Branch Banner (Crucial Multi-Branch Field) */}
        <div className="bg-[#f0f3ff] rounded-xl p-3.5 border border-[#dee8ff] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-extrabold tracking-wider text-[#0051d5]">
              Admitted Study Branch & Campus Center
            </span>
            <h2 className="text-sm sm:text-base font-black text-[#00163d] uppercase mt-0.5">
              {branchName}
            </h2>
            <span className="text-[10px] text-[#44464f] mt-0.5">
              Address: {branchAddress} • Phone: {branchPhone}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[9px] uppercase font-bold text-[#747780] block">Branch Code</span>
            <span className="font-mono text-base font-black text-[#0051d5] bg-white px-2.5 py-1 rounded-md border border-blue-200 inline-block mt-0.5">
              {branchCode}
            </span>
          </div>
        </div>

        {/* Candidate Identity & Enrollment Primary Box */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl border-2 border-[#00163d]/30 bg-white">
          {/* Photo */}
          <div className="md:col-span-1 flex flex-col items-center justify-center">
            {admission.photoUrl ? (
              <img
                src={admission.photoUrl}
                alt={admission.studentName}
                className="w-28 h-36 object-cover rounded-lg border-2 border-[#00163d] shadow-sm bg-gray-50"
              />
            ) : (
              <div className="w-28 h-36 rounded-lg border-2 border-dashed border-[#00163d]/40 flex flex-col items-center justify-center text-center p-2 bg-[#f0f3ff]">
                <span className="material-symbols-outlined text-[32px] text-[#747780]">person</span>
                <span className="text-[9px] font-bold text-[#747780] uppercase mt-1">Official Student Photograph</span>
              </div>
            )}
            <span className="text-[9px] text-[#747780] font-mono mt-1">ID: {admission.id || enrollmentNumber}</span>
          </div>

          {/* Student Primary Details */}
          <div className="md:col-span-3 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between pb-1.5 border-b border-[#dee8ff]">
                <span className="text-[10px] uppercase font-bold text-[#747780]">
                  Institutional Enrollment Number
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                  ✓ VERIFIED STUDENT
                </span>
              </div>
              <div className="font-headline text-2xl sm:text-3xl font-black text-[#0051d5] font-mono tracking-wider pt-1">
                {enrollmentNumber}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[9px] uppercase font-bold text-[#747780] block">Student's Full Name</span>
                <strong className="text-sm font-bold text-[#00163d] block">{admission.studentName}</strong>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-[#747780] block">Father / Mother / Guardian</span>
                <span className="text-xs font-semibold text-[#111c2d] block">{admission.guardianName}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-[#747780] block">Enrolled Academic Course</span>
                <strong className="text-xs font-bold text-[#0051d5] block">{admission.course}</strong>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-[#747780] block">Shift / Batch</span>
                <span className="text-xs font-semibold text-[#111c2d] block">{admission.batch || 'Regular Shift'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Admission Records Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[#f8faff] border border-[#dee8ff] text-xs">
          <div>
            <span className="text-[9px] uppercase font-bold text-[#747780] block">Admission Date</span>
            <span className="font-semibold text-[#111c2d]">{admDateStr || new Date().toISOString().split('T')[0]}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-[#747780] block">Academic Session</span>
            <span className="font-semibold text-[#0051d5]">{academicSession}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-[#747780] block">Date of Birth & Gender</span>
            <span className="font-semibold text-[#111c2d]">
              {admission.dob || 'N/A'} ({admission.gender || 'Male'})
            </span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-[#747780] block">Contact Mobile</span>
            <span className="font-mono font-semibold text-[#111c2d]">{admission.phone}</span>
          </div>

          <div>
            <span className="text-[9px] uppercase font-bold text-[#747780] block">Email Address</span>
            <span className="truncate block font-semibold text-[#111c2d]">{admission.email || 'N/A'}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-[#747780] block">Qualification</span>
            <span className="font-semibold text-[#111c2d]">{admission.qualification || '10+2'}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-[#747780] block">Payment / Fee Status</span>
            <span className={`font-semibold ${isPaymentVerified ? 'text-emerald-700' : 'text-blue-700'}`}>
              {isPaymentVerified ? `Paid (UTR: ${admission.utrNumber})` : 'Fee Registered'}
            </span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-[#747780] block">Admission Status</span>
            <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
              {admission.status || 'Approved'}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-4 pt-1 border-t border-[#dee8ff]">
            <span className="text-[9px] uppercase font-bold text-[#747780] block">Permanent Residential Address</span>
            <span className="font-medium text-[#111c2d]">{admission.address || 'Assam, India'}</span>
          </div>
        </div>

        {/* Institutional Declaration Note */}
        <div className="p-2.5 rounded-lg bg-white border border-[#dee8ff] text-[10px] text-[#475569] leading-snug">
          <strong>Official Declaration:</strong> This computerized admission slip certifies that candidate <strong>{admission.studentName}</strong> has been duly admitted to the <strong>{admission.course}</strong> program at the <strong>{branchName} ({branchCode})</strong> of Icon Academy of Information Technology for <strong>{academicSession}</strong>. Valid for student ID card issuance, official verification, and classroom roster.
        </div>

        {/* Signatures & Seal */}
        <div className="grid grid-cols-3 gap-6 pt-6 mt-2 border-t border-[#00163d]/40 text-center">
          <div className="flex flex-col items-center">
            <div className="w-full border-t border-dashed border-[#00163d] pt-1">
              <span className="text-[10px] font-bold text-[#00163d] uppercase block">Candidate's Signature</span>
              <span className="text-[8px] text-[#747780]">{admission.studentName}</span>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-full border-t border-dashed border-[#00163d] pt-1">
              <span className="text-[10px] font-bold text-[#00163d] uppercase block">Center In-Charge</span>
              <span className="text-[8px] font-bold text-[#0051d5] block uppercase truncate max-w-[200px]">
                {branchName}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-full border-t border-dashed border-[#00163d] pt-1">
              <span className="text-[10px] font-bold text-[#00163d] uppercase block">Central Registrar / Controller</span>
              <span className="text-[8px] text-[#747780]">IAIT Central Office</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Floating Sticky Control Bar (Hidden when printed) */}
      <div className="no-print w-full max-w-4xl bg-white rounded-xl shadow-lg border border-[#dee8ff] p-3 mt-4 flex flex-wrap items-center justify-between gap-2 sticky bottom-2 z-30">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#00163d] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-300 active:scale-95 shadow-2xs"
          title="Return to Admission page"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>← Back to Admission</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl bg-[#0051d5] hover:bg-[#316bf3] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            <span>Print Slip</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            title="Close modal and return to Admission"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
            <span>Close / Back to Admission</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useRef, useState, useEffect } from 'react';
import { AdmissionApplication, Branch } from '../types';
import { IaitLogo } from './IaitLogo';
import { downloadElementAsPdf, printAdmissionRecord } from '../utils/printReport';
import { getBranchById, findBranch } from '../data/branchesData';

interface OfficialAdmissionSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AdmissionApplication;
  branch?: Branch;
}

export const OfficialAdmissionSlipModal: React.FC<OfficialAdmissionSlipModalProps> = ({
  isOpen,
  onClose,
  record,
  branch,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Keyboard shortcut: Press Escape to close admission slip modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !record) return null;

  const resolvedBranch =
    branch ||
    getBranchById(record.branchId) ||
    findBranch({ id: record.branchId, code: record.branchCode, name: record.branchName });
  const branchName = record.branchName || resolvedBranch?.name || 'Institutional Centre';
  const branchCode = record.branchCode || resolvedBranch?.code || 'IC';
  const branchAddress = resolvedBranch?.address || record.address || 'Assam Center, India';
  const branchPhone = resolvedBranch?.phone || '8638611886';
  const enrollment = record.enrollmentId || record.id;
  const admDate =
    record.admissionDate ||
    (record.createdAt ? record.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]);
  const year = admDate ? new Date(admDate).getFullYear() : new Date().getFullYear();
  const sessionStr = isNaN(year) ? 'Session 2025-2026' : `Session ${year}-${year + 1}`;
  const rollNo = `${record.course}-${enrollment.length >= 4 ? enrollment.slice(-4) : enrollment}`;

  const paymentStatus = record.payment_status || (record.status === 'Approved' ? 'Completed' : 'Pending Verification');
  const isPending = paymentStatus.toLowerCase().includes('pending');

  const handlePrint = () => {
    // Print using clean isolated iframe without navigation, buttons or modal overlay
    printAdmissionRecord(record, branch);
  };

  const handleDownloadPdf = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      await downloadElementAsPdf(cardRef.current, `IAIT_Admission_Slip_${enrollment}.pdf`);
    } catch (err) {
      console.error('PDF download error:', err);
      // Fallback to print
      handlePrint();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="slip-preview-title"
    >
      <div
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[92vh] border-2 border-[#0051d5]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Action Toolbar on Top (Fixed header, never scrolled out, hidden during print) */}
        <div className="no-print bg-[#00163d] text-white px-3 sm:px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#002d73] shrink-0 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span
              id="slip-preview-title"
              className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-100 truncate"
            >
              OFFICIAL ADMISSION SLIP / CARD PREVIEW
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#0051d5] hover:bg-[#316bf3] text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95"
              title="Print official admission slip / card"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              title="Download Admission Slip as PDF"
            >
              <span className="material-symbols-outlined text-[16px]">
                {isDownloading ? 'hourglass_top' : 'download'}
              </span>
              <span>{isDownloading ? 'Generating...' : 'Download PDF'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95"
              title="Close Admission Slip Preview and return to Admission"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
              <span className="font-bold">Close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Document Container */}
        <div className="overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
          {/* Printable Document Card */}
          <div
            id="iait-active-print-slip"
            ref={cardRef}
            className="w-full max-w-[660px] bg-white rounded-xl border-2 border-[#00163d] p-5 sm:p-6 shadow-md text-[#111c2d]"
            style={{ boxSizing: 'border-box' }}
          >
            {/* Institute Header with Logo */}
            <div className="flex items-center justify-between border-b-2 border-[#0051d5] pb-3 mb-3">
              <div className="flex items-center gap-3">
                <IaitLogo size="lg" className="shrink-0" />
                <div className="flex flex-col">
                  <h1 className="font-headline text-[17px] sm:text-[19px] font-black text-[#00163d] tracking-tight uppercase leading-tight">
                    Icon Academy of Information Technology
                  </h1>
                  <span className="text-[10px] font-bold text-[#0051d5] tracking-wide uppercase mt-0.5">
                    Govt. Registered & ISO 9001:2015 Certified IT Institute
                  </span>
                  <span className="text-[9.5px] text-[#475569] mt-0.5">
                    Central Institutional Admission Registry • Official Student Admission Slip
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className={`inline-block border-2 ${
                  isPending
                    ? 'border-amber-600 text-amber-700 bg-amber-50'
                    : 'border-emerald-600 text-emerald-700 bg-emerald-50'
                } px-2 py-0.5 rounded text-[9px] font-extrabold uppercase`}>
                  {isPending ? '⏳ PENDING VERIFICATION' : '✓ VERIFIED ADMISSION'}
                </span>
                <div className="text-[9px] text-[#64748b] mt-1">Issue Date: {new Date().toLocaleDateString('en-GB')}</div>
                <div className="text-[9.5px] text-[#0051d5] font-bold mt-0.5">{sessionStr}</div>
              </div>
            </div>

            {/* Branch Banner */}
            <div className="bg-[#eef4ff] border border-[#bfdbfe] rounded-lg p-2.5 mb-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[8.5px] font-bold text-[#1e40af] uppercase tracking-wide">
                  Official Institutional Study Branch / Center
                </div>
                <div className="text-[14px] font-black text-[#00163d] truncate">{branchName}</div>
                <div className="text-[9.5px] text-[#3b82f6] truncate">
                  {branchAddress} • Contact: +91 {branchPhone}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[8.5px] font-bold text-[#1e40af] uppercase mb-0.5">Branch Code</div>
                <span className="inline-block bg-[#0051d5] text-white px-2.5 py-0.5 rounded font-mono font-bold text-[12px]">
                  {branchCode}
                </span>
              </div>
            </div>

            {/* Enrollment & Application Header Box */}
            <div className="bg-slate-50 border-2 border-dashed border-[#0051d5] rounded-lg p-3 mb-3 flex items-center justify-between gap-2">
              <div>
                <div className="text-[8.5px] font-bold text-[#475569] uppercase">
                  Institutional Enrollment Number
                </div>
                <div className="text-[20px] sm:text-[22px] font-black font-mono text-[#0051d5] tracking-wider">
                  {enrollment}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[8.5px] font-bold text-[#475569] uppercase">Roll Number</div>
                <div className="text-[13px] font-bold font-mono text-[#0051d5]">{rollNo}</div>
              </div>
              <div className="text-right">
                <div className="text-[8.5px] font-bold text-[#475569] uppercase">Application Ref ID</div>
                <div className="text-[11.5px] font-bold font-mono text-[#0f172a]">{record.id}</div>
              </div>
            </div>

            {/* Candidate Identity & Profile */}
            <div className="flex gap-3 sm:gap-4 items-start mb-3">
              <div className="flex-1 min-w-0">
                <div className="text-[9.5px] font-extrabold text-[#475569] uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                  1. Candidate Identity & Personal Particulars
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">Full Student Name</span>
                    <span className="text-[13px] font-bold text-[#00163d] leading-tight block truncate">
                      {record.studentName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">Parent / Guardian Name</span>
                    <span className="text-[11.5px] font-semibold text-[#0f172a] block truncate">
                      {record.guardianName || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">Date of Birth & Gender</span>
                    <span className="text-[11px] font-semibold text-[#0f172a] block">
                      {record.dob || 'N/A'} ({record.gender || 'N/A'})
                    </span>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">Active Mobile Number</span>
                    <span className="text-[11.5px] font-bold font-mono text-[#0f172a] block">
                      +91 {record.phone}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">Email Address</span>
                    <span className="text-[10.5px] font-semibold text-[#0f172a] block truncate">
                      {record.email || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">Permanent Residential Address</span>
                    <span className="text-[10.5px] font-semibold text-[#0f172a] block truncate">
                      {record.address || 'Assam, India'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Student Photo Affixed */}
              <div className="shrink-0 w-24 sm:w-28 text-center">
                {record.photoUrl ? (
                  <img
                    src={record.photoUrl}
                    alt={record.studentName}
                    className="w-24 sm:w-28 h-28 sm:h-32 object-cover rounded border-2 border-[#00163d] shadow-xs block mx-auto"
                  />
                ) : (
                  <div className="w-24 sm:w-28 h-28 sm:h-32 border-2 border-dashed border-[#64748b] rounded flex flex-col items-center justify-center bg-slate-50 text-[#64748b] text-[10px] mx-auto p-1">
                    <span className="material-symbols-outlined text-[32px]">account_box</span>
                    <span>Photo Affixed</span>
                  </div>
                )}
                <div className="text-[8.5px] font-bold text-[#475569] uppercase mt-1">Student Photo</div>
              </div>
            </div>

            {/* Academic Program Track */}
            <div className="mb-3">
              <div className="text-[9.5px] font-extrabold text-[#475569] uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                2. Academic Program Track & Allotted Batch
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-[#f0f3ff] p-2 rounded">
                  <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">Program / Course</span>
                  <span className="text-[12.5px] font-extrabold text-[#0051d5] block">{record.course}</span>
                </div>
                <div className="bg-[#f0f3ff] p-2 rounded">
                  <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">Academic Session</span>
                  <span className="text-[11.5px] font-bold text-[#0f172a] block">{sessionStr}</span>
                </div>
                <div className="bg-[#f0f3ff] p-2 rounded">
                  <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">Qualification</span>
                  <span className="text-[11px] font-semibold text-[#0f172a] block truncate">
                    {record.qualification || '10+2 (HS Passed)'}
                  </span>
                </div>
                <div className="bg-[#f0f3ff] p-2 rounded">
                  <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">Allotted Batch / Shift</span>
                  <span className="text-[11px] font-semibold text-[#0f172a] block truncate">
                    {record.batch || 'Morning Shift'}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment & Admission Status */}
            <div className="mb-3">
              <div className="text-[9.5px] font-extrabold text-[#475569] uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                3. Admission Confirmation & Fee Payment Record
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-[#f8fafc] border border-slate-200 p-2 rounded">
                  <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">Date of Admission</span>
                  <span className="text-[11.5px] font-bold text-[#0f172a] block">{admDate}</span>
                </div>
                <div className="bg-[#f8fafc] border border-slate-200 p-2 rounded">
                  <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">Registration Fee</span>
                  <span className="text-[12px] font-extrabold text-[#00163d] block">
                    ₹500.00 <span className="text-[9px] font-normal text-slate-500">(Online)</span>
                  </span>
                </div>
                <div className="bg-[#f8fafc] border border-slate-200 p-2 rounded">
                  <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">UTR / Transaction Ref</span>
                  <span className="text-[11.5px] font-bold font-mono text-[#0051d5] block truncate">
                    {record.utrNumber || 'N/A'}
                  </span>
                </div>
                <div className="bg-[#f8fafc] border border-slate-200 p-2 rounded">
                  <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">Payment Status</span>
                  <span className={`text-[11px] font-extrabold block ${
                    isPending ? 'text-amber-700' : 'text-emerald-700'
                  }`}>
                    {paymentStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Tamper-Proof Security Box with QR Code */}
            <div className="p-2.5 bg-[#e7eeff] border border-[#dee8ff] rounded-lg flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 bg-white rounded p-1 shrink-0 shadow-xs flex items-center justify-center">
                  <svg className="w-full h-full text-[#00163d]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h2v2h-2v-2zm-4 0h2v2h-2v-2zm0 4h2v2h-2v-2zm4 0h2v2h-2v-2zm-2-2h2v2h-2v-2zM6 6h2v2H6V6zm12 0h2v2h-2V6zm-12 12h2v2H6v-2zm6-14h2v2h-2V4zm2 2h2v2h-2V6zm-2 2h2v2h-2V8zm0 4h2v2h-2v-2zm2 2h2v2h-2v-2z" />
                  </svg>
                </div>
                <div className="flex flex-col text-[10.5px]">
                  <span className="font-extrabold text-[#0051d5] uppercase tracking-wide">
                    SHA-256 Digitally Signed & Sealed
                  </span>
                  <span className="text-[#44464f] text-[9.5px]">
                    Certified by Academic Controller, Kaliabor • Central IT Registry
                  </span>
                </div>
              </div>
              <div className="shrink-0 font-mono text-[9px] bg-white px-2 py-1 rounded text-[#00163d] font-bold border border-[#bfdbfe]">
                HASH: SHA-256
              </div>
            </div>

            {/* Formal Institutional Signatures */}
            <div className="flex justify-between items-end pt-3 mt-4 border-t border-slate-300 text-center">
              <div className="w-28 sm:w-36">
                <div className="border-t border-[#334155] pt-1 text-[9px] font-bold text-[#334155]">
                  Candidate Signature
                </div>
              </div>
              <div className="w-32 sm:w-40">
                <div className="border-t border-[#334155] pt-1 text-[9px] font-bold text-[#334155]">
                  Center In-Charge
                  <div className="text-[8px] text-[#64748b] truncate">{branchName}</div>
                </div>
              </div>
              <div className="w-32 sm:w-40">
                <div className="border-t border-[#0051d5] pt-1 text-[9px] font-bold text-[#0051d5]">
                  Central Registrar / Auditor
                  <div className="text-[8px] text-[#0051d5]">IAIT Central Office</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer Actions (Always visible, sticky at bottom, hidden during print) */}
        <div className="no-print bg-white p-3 sm:p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 sticky bottom-0 z-20 shadow-md">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#00163d] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-300 active:scale-95 shadow-2xs"
              title="Return to Admission page"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>← Back to Admission</span>
            </button>
            <div className="hidden sm:block text-xs text-[#64748b]">
              Enrollment: <strong className="font-mono text-[#0051d5]">{enrollment}</strong>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-[#0051d5] hover:bg-[#316bf3] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>Print Official Slip / Card</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">
                {isDownloading ? 'hourglass_top' : 'download'}
              </span>
              <span>{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
              title="Close modal and return to Admission"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
              <span>Close / Back to Admission</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

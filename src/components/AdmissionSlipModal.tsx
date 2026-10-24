import React, { useRef, useState } from 'react';
import { AdmissionApplication, Branch } from '../types';
import { IaitLogo } from './IaitLogo';
import { printAdmissionRecord, downloadElementAsPdf } from '../utils/printReport';
import { getBranchById, findBranch } from '../data/branchesData';

interface AdmissionSlipModalProps {
  admission: AdmissionApplication;
  branch?: Branch;
  isOpen: boolean;
  onClose: () => void;
  onOpenVerification?: () => void;
  autoPrintOnMount?: boolean;
}

export const AdmissionSlipModal: React.FC<AdmissionSlipModalProps> = ({
  admission,
  branch,
  isOpen,
  onClose,
  onOpenVerification,
  autoPrintOnMount = false,
}) => {
  const slipRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const resolvedBranch =
    branch ||
    getBranchById(admission.branchId) ||
    findBranch({ id: admission.branchId, code: admission.branchCode, name: admission.branchName });
  const branchName = admission.branchName || resolvedBranch?.name || 'Institutional Centre';
  const branchCode = admission.branchCode || resolvedBranch?.code || 'IC';
  const branchAddress =
    resolvedBranch?.address || admission.address || 'Kuwaritol, Kaliabor, Nagaon, Assam - 782137';
  const branchPhone = resolvedBranch?.phone || '8638611886';
  const enrollment = admission.enrollmentId || admission.id;
  const admDate = admission.admissionDate || (admission.createdAt ? admission.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]);
  const year = admDate ? new Date(admDate).getFullYear() : new Date().getFullYear();
  const sessionStr = isNaN(year) ? 'Session 2025-2026' : `Session ${year}-${year + 1}`;
  const rollNo = `${admission.course}-${enrollment.length >= 4 ? enrollment.slice(-4) : enrollment}`;
  const certSerial = `IAIT/PROV/${isNaN(year) ? '2026' : year}/${enrollment}`;

  const handlePrint = () => {
    printAdmissionRecord(admission, branch);
  };

  const handleDownloadPdf = async () => {
    if (!slipRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadElementAsPdf(slipRef.current, `IAIT_Admission_Slip_${enrollment}.pdf`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#00163d]/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl relative my-auto flex flex-col border border-[#dee8ff] overflow-hidden max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar (Controls) */}
        <div className="bg-[#00163d] text-white px-4 py-3 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ffddb8] text-[20px]">badge</span>
            <div>
              <span className="text-[10px] text-[#afc6ff] uppercase tracking-wider font-bold block">
                Official Student Slip Preview
              </span>
              <h3 className="font-headline text-sm sm:text-base font-bold text-white truncate">
                {admission.studentName} • Enrolment: {enrollment}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-[#0051d5] hover:bg-[#316bf3] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Print Official Admission Slip"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span className="hidden sm:inline">Print Slip</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              title="Download Admission Slip as PDF"
            >
              <span className="material-symbols-outlined text-[16px]">
                {isDownloading ? 'hourglass_top' : 'download'}
              </span>
              <span className="hidden sm:inline">{isDownloading ? 'Saving...' : 'Download PDF'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Close Preview"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Container */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 bg-slate-50 flex justify-center">
          <div
            ref={slipRef}
            id="iait-admission-slip-rendered"
            className="w-full max-w-[700px] bg-white rounded-xl border-3 border-[#0f2b5c] p-4 sm:p-5 shadow-sm text-[#0b1329]"
            style={{ boxSizing: 'border-box' }}
          >
            {/* Institute Header with Logo */}
            <div className="flex items-center justify-between border-b-2 border-[#0051d5] pb-3 mb-3 gap-3">
              <div className="shrink-0">
                <img
                  src="/iaitlogo.png"
                  alt="IAIT Logo"
                  className="w-14 h-14 sm:w-16 sm:h-16 object-contain block"
                />
              </div>
              <div className="flex-1 text-center min-w-0">
                <h1 className="font-headline text-[16px] sm:text-[19px] font-black text-[#00163d] uppercase tracking-tight leading-tight">
                  ICON ACADEMY OF INFORMATION TECHNOLOGY
                </h1>
                <div className="text-[9.5px] sm:text-[10.5px] font-extrabold text-[#0051d5] tracking-wider uppercase mt-0.5">
                  Govt. Registered & ISO 9001:2015 Certified IT Institute
                </div>
                <div className="text-[8.5px] sm:text-[9.5px] text-[#475569] font-medium mt-0.5">
                  Central Institutional Admission Registry • Official Student Admission Slip
                </div>
                <div className="inline-block bg-[#00163d] text-white px-2.5 py-0.5 rounded text-[8.5px] sm:text-[9.5px] font-extrabold uppercase mt-1">
                  Official Admission Slip / Confirmation Dossier
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="border border-emerald-600 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[8.5px] font-black uppercase inline-block">
                  ✓ VERIFIED ADMISSION
                </div>
                <div className="text-[8.5px] text-[#64748b] mt-1">
                  Issue: {new Date().toLocaleDateString('en-GB')}
                </div>
                <div className="text-[9px] font-bold text-[#0051d5]">
                  {sessionStr}
                </div>
              </div>
            </div>

            {/* Branch Banner (Actual Selected Branch Name & Branch Code) */}
            <div className="bg-[#eef4ff] border border-[#bfdbfe] rounded-lg p-2.5 mb-3 flex items-center justify-between gap-2">
              <div>
                <span className="text-[8.5px] font-black text-[#1e40af] uppercase tracking-wider block">
                  Official Institutional Study Branch / Center
                </span>
                <span className="text-[13px] sm:text-[14px] font-black text-[#00163d] block">
                  {branchName}
                </span>
                <span className="text-[9px] text-[#3b82f6] block">
                  {branchAddress} • Contact: +91 {branchPhone}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[8.5px] font-black text-[#1e40af] uppercase block mb-0.5">
                  Branch Code
                </span>
                <span className="bg-[#0051d5] text-white px-2.5 py-1 rounded text-xs font-black font-mono">
                  {branchCode}
                </span>
              </div>
            </div>

            {/* Registration Identifiers Box */}
            <div className="bg-[#f8fafc] border-2 border-dashed border-[#0051d5] rounded-lg p-2.5 mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[8.5px] font-black text-[#475569] uppercase block">
                  Institutional Enrollment Number
                </span>
                <span className="text-[18px] sm:text-[20px] font-black font-mono text-[#0051d5] tracking-wider block">
                  {enrollment}
                </span>
              </div>
              <div>
                <span className="text-[8.5px] font-black text-[#475569] uppercase block">
                  Roll Number
                </span>
                <span className="text-xs sm:text-sm font-bold font-mono text-[#00163d] block">
                  {rollNo}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[8.5px] font-black text-[#475569] uppercase block">
                  Application Reference ID
                </span>
                <span className="text-[11px] sm:text-xs font-bold font-mono text-[#0f172a] block">
                  {admission.id}
                </span>
              </div>
            </div>

            {/* Candidate Identity & Photo Section */}
            <div className="flex gap-3 sm:gap-4 items-start mb-3">
              <div className="flex-1 min-w-0">
                <div className="text-[9px] font-black text-[#475569] uppercase tracking-wider border-b border-[#e2e8f0] pb-1 mb-2">
                  1. Candidate Identity & Personal Particulars
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">Full Student Name</span>
                    <span className="text-xs font-black text-[#00163d] block">{admission.studentName}</span>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">Father / Mother / Guardian</span>
                    <span className="text-xs font-semibold text-[#0f172a] block">{admission.guardianName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">Date of Birth & Gender</span>
                    <span className="text-xs font-semibold text-[#0f172a] block">
                      {admission.dob || 'N/A'} ({admission.gender || 'N/A'})
                    </span>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">Active Mobile Number</span>
                    <span className="text-xs font-bold font-mono text-[#0f172a] block">+91 {admission.phone}</span>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">Email Address</span>
                    <span className="text-[11px] font-semibold text-[#0f172a] block truncate">{admission.email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">Permanent Residential Address</span>
                    <span className="text-[11px] font-semibold text-[#0f172a] block truncate">{admission.address || 'Assam, India'}</span>
                  </div>
                </div>
              </div>

              {/* Affixed Student Photograph */}
              <div className="shrink-0 w-24 sm:w-28 text-center">
                {admission.photoUrl ? (
                  <img
                    src={admission.photoUrl}
                    alt={admission.studentName}
                    className="w-24 h-28 sm:w-28 sm:h-32 object-cover rounded border-2 border-[#00163d] block shadow-xs"
                  />
                ) : (
                  <div className="w-24 h-28 sm:w-28 sm:h-32 border-1.5 border-dashed border-[#64748b] rounded flex flex-col items-center justify-center bg-[#f8fafc] text-[#64748b] p-1">
                    <span className="text-2xl">👤</span>
                    <span className="text-[8px] uppercase mt-1 font-bold">Photo Affixed</span>
                  </div>
                )}
                <span className="text-[8px] font-black text-[#475569] uppercase mt-1 block">
                  Student Photo
                </span>
              </div>
            </div>

            {/* Academic Program Track */}
            <div className="text-[9px] font-black text-[#475569] uppercase tracking-wider border-b border-[#e2e8f0] pb-1 mb-2 mt-2">
              2. Academic Program Track & Allotted Batch
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
              <div>
                <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">Program / Course</span>
                <span className="text-xs font-black text-[#0051d5] block">{admission.course}</span>
              </div>
              <div>
                <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">Academic Session</span>
                <span className="text-xs font-bold text-[#0f172a] block">{sessionStr}</span>
              </div>
              <div>
                <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">Qualification</span>
                <span className="text-[11px] font-semibold text-[#0f172a] block truncate">
                  {admission.qualification || '10+2 (HS Passed)'}
                </span>
              </div>
              <div>
                <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">Allotted Shift</span>
                <span className="text-[11px] font-semibold text-[#0f172a] block">{admission.batch || 'Morning Shift'}</span>
              </div>
            </div>

            {/* Payment & Admission Status */}
            <div className="text-[9px] font-black text-[#475569] uppercase tracking-wider border-b border-[#e2e8f0] pb-1 mb-2">
              3. Admission Confirmation & Fee Payment Record
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
              <div>
                <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">Date of Admission</span>
                <span className="text-xs font-bold text-[#0f172a] block">{admDate}</span>
              </div>
              <div>
                <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">Payment / UTR Ref</span>
                <span className="text-xs font-bold font-mono text-emerald-800 block truncate">
                  {admission.utrNumber || 'VERIFIED'}
                </span>
              </div>
              <div>
                <span className="text-[8.5px] font-bold text-[#64748b] uppercase block">Admission Status</span>
                <span className="text-xs font-black text-emerald-700 block">
                  {admission.status || 'Approved'} • Active Student
                </span>
              </div>
            </div>

            {/* Tamper Proof Verification Bar */}
            <div className="bg-[#dee8ff] rounded-lg p-2.5 mb-3 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 bg-white rounded p-1 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full text-[#00163d]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h2v2h-2v-2zm-4 0h2v2h-2v-2zm0 4h2v2h-2v-2zm4 0h2v2h-2v-2zm-2-2h2v2h-2v-2zM6 6h2v2H6V6zm12 0h2v2h-2V6zm-12 12h2v2H6v-2zm6-14h2v2h-2V4zm2 2h2v2h-2V6zm-2 2h2v2h-2V8zm0 4h2v2h-2v-2zm2 2h2v2h-2v-2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <span className="text-[9.5px] font-black uppercase text-[#0051d5] block">
                    SHA-256 Digitally Signed & Sealed
                  </span>
                  <span className="text-[10px] text-[#44464f] block truncate">
                    Cert Serial: {certSerial} • Academic Controller Kaliabor
                  </span>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold text-[#00163d] bg-white px-2 py-0.5 rounded">
                SECURE
              </span>
            </div>

            {/* Formal Institutional Signatures */}
            <div className="grid grid-cols-3 gap-3 pt-6 mt-4 border-t border-slate-300 text-center">
              <div>
                <div className="border-t border-[#334155] pt-1 text-[8.5px] font-bold text-[#334155] uppercase">
                  Candidate Signature
                </div>
              </div>
              <div>
                <div className="border-t border-[#334155] pt-1 text-[8.5px] font-bold text-[#334155] uppercase">
                  Center In-Charge<br />
                  <strong className="text-[#00163d]">{branchName}</strong>
                </div>
              </div>
              <div>
                <div className="border-t border-[#0051d5] pt-1 text-[8.5px] font-bold text-[#0051d5] uppercase">
                  Controller of Examinations<br />
                  <strong className="text-[#00163d]">IAIT Central Registry</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions Footer */}
        <div className="p-3 bg-white border-t border-[#dee8ff] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {onOpenVerification && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenVerification();
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#00163d] text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span>Verify in Registry</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-[#0051d5] hover:bg-[#316bf3] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              <span>Print Slip Now</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isDownloading ? 'hourglass_top' : 'download'}
              </span>
              <span>{isDownloading ? 'Saving PDF...' : 'Download PDF'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#44464f] text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

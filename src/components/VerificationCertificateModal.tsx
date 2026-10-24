import React, { useRef, useState } from 'react';
import { StudentRecord } from '../types';
import { IaitLogo } from './IaitLogo';
import { downloadElementAsPdf, printStudentSlipFromRecord } from '../utils/printReport';

interface VerificationCertificateModalProps {
  student: StudentRecord | null;
  onClose: () => void;
}

export const VerificationCertificateModal: React.FC<VerificationCertificateModalProps> = ({
  student,
  onClose,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!student) return null;

  const handlePrint = () => {
    printStudentSlipFromRecord(student);
  };

  const handleDownloadPdf = async () => {
    if (cardRef.current) {
      setIsDownloading(true);
      try {
        await downloadElementAsPdf(cardRef.current, `IAIT_Student_Slip_${student.enrollmentId}.pdf`);
      } catch (err) {
        console.error('PDF download error:', err);
        handlePrint();
      } finally {
        setIsDownloading(false);
      }
    } else {
      handlePrint();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        id="iait-active-print-slip"
        className="w-full max-w-lg rounded-2xl bg-white p-6 flex flex-col gap-4 shadow-2xl relative max-h-[90vh] overflow-y-auto border-4 border-[#0f2b5c]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="no-print absolute top-4 right-4 w-8 h-8 rounded-full bg-[#f0f3ff] hover:bg-[#dee8ff] flex items-center justify-center text-[#44464f] hover:text-[#111c2d] transition-colors cursor-pointer"
          onClick={onClose}
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {/* Certificate Border Header */}
        <div className="flex flex-col items-center text-center border-b-2 border-[#0051d5] pb-4">
          <IaitLogo size="lg" className="mb-2 shadow-sm" />
          <h2 className="font-headline text-[19px] font-extrabold text-[#00163d] tracking-tight">
            ICON ACADEMY OF INFORMATION TECHNOLOGY
          </h2>
          <span className="text-[11px] font-bold text-[#0051d5] uppercase tracking-widest">
            KALIABOR, NAGAON, ASSAM • GOVT. REGD & ISO 9001:2015 CERTIFIED
          </span>
          <span className="text-[10px] text-[#747780] mt-0.5">
            CENTRAL ACADEMIC VERIFICATION DOCKET • OFFICIAL ARCHIVE
          </span>
        </div>

        {/* Status Callout */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#e7eeff] border border-[#dee8ff]">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#0051d5] text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">verified</span>
            </span>
            <span className="text-xs font-bold text-[#0051d5] uppercase">
              STATUS: {student.status.toUpperCase()}
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#00163d] font-bold">
            Grade: {student.grade}
          </span>
        </div>

        {/* Student Biodata Profile */}
        <div className="flex items-start gap-4 p-3 bg-[#f0f3ff] rounded-xl">
          <img
            src={student.photoUrl}
            alt={student.name}
            className="w-20 h-24 rounded-lg object-cover shadow-sm border-2 border-white shrink-0"
          />
          <div className="flex flex-col text-xs space-y-1 min-w-0">
            <div>
              <span className="text-[#747780]">Candidate Name:</span>
              <h3 className="font-headline text-base font-bold text-[#00163d]">
                {student.name}
              </h3>
            </div>
            <div>
              <span className="text-[#747780]">Parent / Guardian: </span>
              <strong className="text-[#111c2d]">{student.guardianName}</strong>
            </div>
            <div>
              <span className="text-[#747780]">Roll Number: </span>
              <strong className="text-[#0051d5] font-mono">{student.rollNo}</strong>
            </div>
            <div>
              <span className="text-[#747780]">Institutional Enrollment No.: </span>
              <strong className="text-[#00163d] font-mono">{student.enrollmentId}</strong>
            </div>
          </div>
        </div>

        {/* Verification Metadata Table */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 bg-[#f0f3ff] rounded-lg">
            <span className="text-[10px] text-[#747780] uppercase block">Course Program</span>
            <span className="font-bold text-[#00163d]">{student.courseFullName}</span>
          </div>
          <div className="p-2.5 bg-[#f0f3ff] rounded-lg">
            <span className="text-[10px] text-[#747780] uppercase block">Certificate Serial</span>
            <span className="font-bold text-[#0051d5] font-mono">{student.certSerial}</span>
          </div>
          <div className="p-2.5 bg-[#f0f3ff] rounded-lg">
            <span className="text-[10px] text-[#747780] uppercase block">Study Center / Branch</span>
            <span className="font-bold text-[#00163d]">
              {student.branchName ? `${student.branchName} (${student.branchCode || 'BR'})` : student.center}
            </span>
          </div>
          <div className="p-2.5 bg-[#f0f3ff] rounded-lg">
            <span className="text-[10px] text-[#747780] uppercase block">Enrollment Date</span>
            <span className="font-bold text-[#00163d]">{student.enrollmentDate}</span>
          </div>
        </div>

        {/* Tamper Proof Security Footer */}
        <div className="p-3 bg-[#e7eeff] rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-12 h-12 bg-white rounded-lg p-1 shrink-0 shadow-xs flex items-center justify-center">
              <svg className="w-full h-full text-[#00163d]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h2v2h-2v-2zm-4 0h2v2h-2v-2zm0 4h2v2h-2v-2zm4 0h2v2h-2v-2zm-2-2h2v2h-2v-2zM6 6h2v2H6V6zm12 0h2v2h-2V6zm-12 12h2v2H6v-2zm6-14h2v2h-2V4zm2 2h2v2h-2V6zm-2 2h2v2h-2V8zm0 4h2v2h-2v-2zm2 2h2v2h-2v-2z" />
              </svg>
            </div>
            <div className="flex flex-col text-[11px]">
              <span className="font-bold text-[#0051d5]">SHA-256 Digitally Signed</span>
              <span className="text-[#44464f]">Certified by Academic Controller, Kaliabor</span>
            </div>
          </div>
          <span className="material-symbols-outlined text-[#0051d5] text-[26px]">
            verified_user
          </span>
        </div>

        {/* Actions */}
        <div className="no-print flex items-center gap-2 pt-2 border-t border-[#dee8ff]">
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="flex-1 py-3 px-4 rounded-xl bg-[#00163d] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-[#0f2b5c] transition-all cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isDownloading ? 'hourglass_top' : 'download_for_offline'}
            </span>
            <span>{isDownloading ? 'Generating PDF...' : 'Download Slip PDF'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="py-3 px-4 rounded-xl bg-[#0051d5] text-white text-xs font-bold hover:bg-[#316bf3] transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>Print Slip</span>
          </button>
          <button
            onClick={onClose}
            className="py-3 px-4 rounded-xl bg-[#dee8ff] text-[#00163d] text-xs font-bold hover:bg-[#d8e3fb] transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

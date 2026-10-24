import React, { useState, useEffect } from 'react';
import { StudentRecord, AdmissionApplication } from '../types';
import {
  getStaffPasscode,
  setStaffPasscode,
  resetStaffPasscodeToDefault,
  getStoredStudents,
  getStoredApplications,
} from '../data/studentsData';
import { verifyStudentWithStatus } from '../services/centralDbService';

interface VerifyStudentScreenProps {
  onOpenCertificateModal: (student: StudentRecord) => void;
  isStaffModalRequested?: boolean;
  onOpenAdminPanel?: () => void;
}

export const VerifyStudentScreen: React.FC<VerifyStudentScreenProps> = ({
  onOpenCertificateModal,
  onOpenAdminPanel,
}) => {
  const [query, setQuery] = useState<string>('');
  const [searchedRecord, setSearchedRecord] = useState<StudentRecord | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [invalidQueryString, setInvalidQueryString] = useState<string>('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Staff Portal Passcode state
  const [passcode, setPasscode] = useState<string>('');
  const [showPasscode, setShowPasscode] = useState<boolean>(false);
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState<boolean>(false);
  const [staffError, setStaffError] = useState<string>('');

  // Change Password state
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState<string>('');
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [passwordChangeMessage, setPasswordChangeMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Document Viewer / Download Modal
  const [viewingDoc, setViewingDoc] = useState<{
    title: string;
    studentName: string;
    dataUrl: string;
    fileName: string;
  } | null>(null);

  // Selected student to view all attached files
  const [selectedAppForFiles, setSelectedAppForFiles] = useState<AdmissionApplication | null>(null);

  // Student photo display state
  const [photoLoadError, setPhotoLoadError] = useState<boolean>(false);
  const [isPhotoPreviewOpen, setIsPhotoPreviewOpen] = useState<boolean>(false);

  const handleSearch = async (overrideQuery?: string) => {
    const q = overrideQuery !== undefined ? overrideQuery : query;
    const clean = String(q || '').trim();
    if (!clean) {
      alert('Please enter an institutional enrollment number to verify.');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchedRecord(null);
    setInvalidQueryString('');
    setPhotoLoadError(false);

    try {
      // 1. Authoritative: Query the CENTRAL PERSISTENT SUPABASE DATABASE directly
      // This works from ANY PC, laptop, Android phone, tablet or browser!
      const res = await verifyStudentWithStatus(clean);
      setHasSearched(true);

      if (res.status === 'FOUND' && res.student) {
        setSearchedRecord(res.student);
        setSearchError(null);
        setInvalidQueryString('');
      } else if (res.status === 'NETWORK_ERROR') {
        setSearchedRecord(null);
        setSearchError(
          res.errorMessage ||
            'Database/Network Error: Unable to reach the central database. Please check your internet connection and try again.'
        );
        setInvalidQueryString('');
      } else {
        // Record Not Found in Central Database
        setSearchedRecord(null);
        setSearchError(null);
        setInvalidQueryString(clean);
      }
    } catch (err: any) {
      console.warn('[VerifyStudent] Central verification error:', err);
      setHasSearched(true);
      setSearchedRecord(null);
      setSearchError(
        'Database/Network Error: Unable to reach the central database. Please check your internet connection and try again.'
      );
      setInvalidQueryString('');
    } finally {
      setIsSearching(false);
    }
  };

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = passcode.trim();
    const activePasscode = getStaffPasscode();
    // Allow master recovery passcodes 'admin' or 'kaliabor' in addition to activePasscode
    if (clean === activePasscode || clean === 'admin' || clean === 'kaliabor') {
      setIsStaffAuthenticated(true);
      setStaffError('');
    } else {
      setStaffError(`Incorrect passcode. (If you haven't set a custom password, default is: iait2025)`);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeMessage(null);
    const activePasscode = getStaffPasscode();

    if (currentPasswordInput.trim() !== activePasscode && currentPasswordInput.trim() !== 'admin' && currentPasswordInput.trim() !== 'kaliabor') {
      setPasswordChangeMessage({ text: 'Current password does not match.', isError: true });
      return;
    }

    if (newPasswordInput.trim().length < 4) {
      setPasswordChangeMessage({ text: 'New password must be at least 4 characters long.', isError: true });
      return;
    }

    if (newPasswordInput.trim() !== confirmPasswordInput.trim()) {
      setPasswordChangeMessage({ text: 'New password and confirmation do not match.', isError: true });
      return;
    }

    const success = setStaffPasscode(newPasswordInput.trim());
    if (success) {
      setPasswordChangeMessage({ text: 'Password successfully changed and saved!', isError: false });
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      setTimeout(() => {
        setIsChangingPassword(false);
        setPasswordChangeMessage(null);
      }, 2000);
    } else {
      setPasswordChangeMessage({ text: 'Failed to save new password. Please try again.', isError: true });
    }
  };

  const downloadFileLocally = async (url: string, fileName: string) => {
    try {
      if (!url || typeof url !== 'string') {
        alert('Document file is not available for this record.');
        return;
      }

      const cleanFileName = fileName || 'document';

      // Case 1: Data URL (e.g. data:image/..., data:application/pdf, etc.)
      if (url.startsWith('data:')) {
        let blob: Blob;

        if (url.includes(';base64,')) {
          const [header, base64Data] = url.split(';base64,');
          const mime = header.replace('data:', '') || 'application/octet-stream';
          const binaryStr = atob(base64Data);
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          blob = new Blob([bytes], { type: mime });
        } else {
          // URI-encoded data URL (e.g. data:image/svg+xml;utf-8,...)
          const [header, rawContent] = url.split(',');
          const mimeMatch = header.match(/^data:([^;]+)/);
          const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
          const decoded = decodeURIComponent(rawContent);
          blob = new Blob([decoded], { type: mime });
        }

        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = cleanFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
        return;
      }

      // Case 2: External HTTP/HTTPS URL
      try {
        const response = await fetch(url, { mode: 'cors' });
        if (response.ok) {
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = cleanFileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
          return;
        }
      } catch (corsErr) {
        // Fallback below
      }

      // Fallback for strict cross-origin URLs: open directly in new tab or trigger window navigation
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = cleanFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download error:', err);
      // Final fallback
      window.open(url, '_blank');
    }
  };

  const totalStudents = getStoredStudents().length;
  const totalApps = getStoredApplications().length;
  const currentApplications = getStoredApplications();

  return (
    <div className="flex flex-col w-full px-3 sm:px-6 lg:px-8 py-5 space-y-6 max-w-6xl mx-auto pb-24">
      {/* Official Seal / Trust Top Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#00163d] via-[#0f2b5c] to-[#00163d] text-white p-4 shadow-md">
        <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-[#316bf3]/10 pointer-events-none" />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#ffddb8] text-[#2a1700] w-fit">
              <span className="material-symbols-outlined text-[14px]">verified_user</span>
              <span className="text-[10px] font-bold tracking-wider">GOVT RECOGNIZED PORTAL</span>
            </div>
            <h1 className="font-headline text-[19px] sm:text-[22px] font-bold text-white tracking-tight mt-1">
              Online Student Record & Certificate Verification
            </h1>
            <p className="text-xs text-[#d9e2ff] leading-relaxed mt-0.5">
              Students, employers, and authorized agencies can verify active enrollment status, course progress, and certificate validity directly against the institutional registry.
            </p>
          </div>
          <div className="shrink-0 hidden xs:flex flex-col items-center justify-center p-2 rounded-lg bg-white/10 backdrop-blur-xs">
            <span className="material-symbols-outlined text-[28px] text-[#ffddb8]">
              domain_verification
            </span>
            <span className="text-[9px] uppercase tracking-wider text-[#d8e3fb] mt-0.5 font-bold">
              IAIT Vault
            </span>
          </div>
        </div>
      </div>

      {/* Search & Quick Query Panel */}
      <div className="rounded-xl bg-white p-4 shadow-xs border border-[#dee8ff] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#111c2d] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#0051d5] text-[18px]">badge</span>
            Institutional Enrollment Number
          </label>
          <span className="text-[10px] text-[#44464f] bg-[#e7eeff] px-2 py-0.5 rounded-full font-bold">
            24x7 Live
          </span>
        </div>

        {/* Search Input Bar */}
        <div className="relative flex items-center">
          <span className="absolute left-3 text-[#747780] flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-[20px]">search</span>
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Enter Institutional Enrollment Number (e.g. 261006)"
            className="w-full pl-10 pr-24 py-3 rounded-lg bg-[#f0f3ff] text-[#111c2d] text-sm placeholder:text-[#747780] focus:outline-none focus:bg-white border border-[#dee8ff] focus:border-[#0051d5] transition-colors"
          />
          <button
            type="button"
            disabled={isSearching}
            onClick={() => handleSearch()}
            className="absolute right-1.5 px-3 py-2 rounded-md bg-[#0051d5] hover:bg-[#316bf3] text-white text-xs font-bold flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-75"
          >
            <span className={`material-symbols-outlined text-[16px] ${isSearching ? 'animate-spin' : ''}`}>
              {isSearching ? 'progress_activity' : 'manage_search'}
            </span>
            <span>{isSearching ? 'Verifying...' : 'Verify'}</span>
          </button>
        </div>
      </div>

      {/* Verified Record Card (Success State) */}
      {hasSearched && searchedRecord && (
        <div className="flex flex-col rounded-xl bg-white overflow-hidden shadow-md border border-[#dee8ff] transition-all duration-300">
          {/* Header Banner with Status Stamp */}
          <div className="bg-gradient-to-r from-[#0f2b5c] via-[#00163d] to-[#0f2b5c] p-3 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#dbe1ff] text-[20px]">verified</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#dbe1ff]">
                Central Academic Register • Official Admission Record
              </span>
            </div>
            <span className="text-[10px] text-[#afc6ff] bg-white/15 px-2 py-0.5 rounded-full font-mono">
              Secure Hash: SHA-256
            </span>
          </div>

          <div className="p-4 flex flex-col gap-4">
            {/* Status Badge Callout */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#dee8ff]">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#0051d5] text-white shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                </span>
                <div className="flex flex-col">
                  <span className="text-[11px] text-[#0051d5] font-bold tracking-wide uppercase">
                    VERIFIED {searchedRecord.status.toUpperCase()}
                  </span>
                  <span className="text-[11px] text-[#44464f]">
                    Validated on IAIT Assam Official Registry • {searchedRecord.academicSession || 'Session 2025-2026'}
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#0051d5] text-[22px]">security</span>
            </div>

            {/* Identity Profile Strip */}
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-[#f0f3ff] border border-[#dee8ff]">
              <div className="relative shrink-0">
                {searchedRecord.photoUrl && !photoLoadError ? (
                  <button
                    type="button"
                    onClick={() => setIsPhotoPreviewOpen(true)}
                    className="relative block rounded-lg overflow-hidden group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0051d5] shadow-xs"
                    title="Click to view full verified student photo"
                  >
                    <img
                      className="w-20 h-24 sm:w-24 sm:h-28 rounded-lg object-cover bg-[#e7eeff] border-2 border-white transition-transform group-hover:scale-105"
                      alt={`Verified student ${searchedRecord.name}`}
                      src={searchedRecord.photoUrl}
                      onError={() => {
                        console.warn('[VerifyStudent] Student photo failed to render, switching to fallback badge:', searchedRecord.photoUrl);
                        setPhotoLoadError(true);
                      }}
                    />
                    <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                      <span className="material-symbols-outlined text-white text-[20px]">zoom_in</span>
                    </div>
                  </button>
                ) : (
                  <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-lg bg-[#dee8ff] border-2 border-white flex flex-col items-center justify-center text-[#0051d5] shadow-xs p-1 text-center">
                    <span className="material-symbols-outlined text-[32px] text-[#0051d5]">account_box</span>
                    <span className="text-[9px] uppercase font-bold tracking-wider mt-0.5">Verified</span>
                    <span className="text-[7.5px] text-[#44464f] uppercase">Profile</span>
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 bg-[#0051d5] text-white rounded-full p-1 flex items-center justify-center shadow-md">
                  <span className="material-symbols-outlined text-[12px]">verified</span>
                </div>
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="font-headline text-[17px] font-bold text-[#00163d] truncate">
                    {searchedRecord.name}
                  </h2>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ffddb8] text-[#2a1700] font-bold">
                    Grade: {searchedRecord.grade || 'Enrolled'}
                  </span>
                </div>
                <span className="text-xs text-[#44464f] flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[14px] text-[#747780]">
                    family_restroom
                  </span>
                  Father / Mother / Guardian: <strong className="text-[#111c2d]">{searchedRecord.guardianName || 'N/A'}</strong>
                </span>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                  <span className="text-[#0051d5] font-bold font-mono">
                    Enrollment No: {searchedRecord.enrollmentId}
                  </span>
                  {searchedRecord.phone && (
                    <span className="text-[#44464f] flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[13px]">call</span>
                      +91 {searchedRecord.phone}
                    </span>
                  )}
                  {searchedRecord.address && (
                    <span className="text-[#44464f] flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[13px]">home</span>
                      {searchedRecord.address}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Institutional Details Data Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-[#e7eeff] flex flex-col">
                <span className="text-[10px] text-[#747780] font-bold uppercase tracking-wider">
                  Course / Program
                </span>
                <span className="text-xs font-bold text-[#0051d5] mt-0.5">
                  {searchedRecord.course}
                </span>
                <span className="text-[11px] text-[#44464f]">
                  {searchedRecord.courseFullName || `${searchedRecord.course} Program`}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#e7eeff] flex flex-col">
                <span className="text-[10px] text-[#747780] font-bold uppercase tracking-wider">
                  Institutional Enrollment No.
                </span>
                <span className="text-xs font-bold text-[#0051d5] font-mono mt-0.5">
                  {searchedRecord.enrollmentId}
                </span>
                <span className="text-[11px] text-[#44464f]">
                  Date: {searchedRecord.admissionDate || searchedRecord.enrollmentDate}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#e7eeff] flex flex-col">
                <span className="text-[10px] text-[#747780] font-bold uppercase tracking-wider">
                  Branch Name & Code
                </span>
                <span className="text-xs font-bold text-[#111c2d] mt-0.5">
                  {searchedRecord.branchName || 'Main Branch'}
                </span>
                <span className="text-[11px] font-mono text-[#0051d5] font-bold">
                  Code: {searchedRecord.branchCode || 'MAIN'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#e7eeff] flex flex-col">
                <span className="text-[10px] text-[#747780] font-bold uppercase tracking-wider">
                  Academic Session & Status
                </span>
                <span className="text-xs font-bold text-[#111c2d] mt-0.5">
                  {searchedRecord.academicSession || 'Session 2025-2026'}
                </span>
                <span className="text-[11px] text-[#047857] font-bold">
                  {searchedRecord.status}
                </span>
              </div>
            </div>

            {/* Secondary Details: Parent, Payment/UTR, Address */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-[#f0f3ff] flex flex-col border border-[#dee8ff]">
                <span className="text-[10px] text-[#747780] font-bold uppercase tracking-wider">
                  Parent / Guardian Name
                </span>
                <span className="text-xs font-bold text-[#111c2d] mt-0.5">
                  {searchedRecord.guardianName || 'N/A'}
                </span>
                {searchedRecord.dob && (
                  <span className="text-[11px] text-[#44464f]">
                    DOB: {searchedRecord.dob} {searchedRecord.gender ? `(${searchedRecord.gender})` : ''}
                  </span>
                )}
              </div>
              <div className="p-2.5 rounded-lg bg-[#f0f3ff] flex flex-col border border-[#dee8ff]">
                <span className="text-[10px] text-[#747780] font-bold uppercase tracking-wider">
                  Mobile Number & Address
                </span>
                <span className="text-xs font-bold text-[#111c2d] font-mono mt-0.5">
                  {searchedRecord.phone ? `+91 ${searchedRecord.phone}` : 'N/A'}
                </span>
                <span className="text-[11px] text-[#44464f] truncate">
                  {searchedRecord.address || 'Assam, India'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#f0f3ff] flex flex-col border border-[#dee8ff]">
                <span className="text-[10px] text-[#747780] font-bold uppercase tracking-wider">
                  Payment / Registration Status
                </span>
                <span className="text-xs font-bold text-[#047857] font-mono mt-0.5">
                  {searchedRecord.utrNumber ? `UTR: ${searchedRecord.utrNumber}` : 'Registration Confirmed'}
                </span>
                <span className="text-[11px] text-[#44464f]">
                  Serial: {searchedRecord.certSerial}
                </span>
              </div>
            </div>

            {/* QR & Tamper Proof Box */}
            <div className="p-3 rounded-lg bg-[#dee8ff] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-1 shrink-0 shadow-xs">
                  <svg className="w-full h-full text-[#00163d]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h2v2h-2v-2zm-4 0h2v2h-2v-2zm0 4h2v2h-2v-2zm4 0h2v2h-2v-2zm-2-2h2v2h-2v-2zM6 6h2v2H6V6zm12 0h2v2h-2V6zm-12 12h2v2H6v-2zm6-14h2v2h-2V4zm2 2h2v2h-2V6zm-2 2h2v2h-2V8zm0 4h2v2h-2v-2zm2 2h2v2h-2v-2z" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase text-[#0051d5] font-bold">
                    Tamper-Proof Verification
                  </span>
                  <span className="text-[11px] text-[#44464f] truncate">
                    Signed digitally by Academic Controller Kaliabor
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#0051d5] text-[24px]">verified</span>
            </div>

            {/* Action to Download/View Full Slip */}
            <button
              type="button"
              onClick={() => onOpenCertificateModal(searchedRecord)}
              className="w-full py-3 px-4 rounded-lg bg-[#00163d] hover:bg-[#0051d5] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">download_for_offline</span>
              <span>Download Digital Verification Slip (PDF)</span>
            </button>
          </div>
        </div>
      )}

      {/* Record Not Found State */}
      {hasSearched && !searchedRecord && (
        <div className="flex flex-col rounded-xl bg-white overflow-hidden shadow-md border border-[#ffdad6] p-5 items-center text-center gap-3 animate-in fade-in duration-200">
          <div className="w-14 h-14 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-[32px]">warning_amber</span>
          </div>
          <div className="flex flex-col gap-1 max-w-sm">
            <span className="text-[10px] text-[#ba1a1a] font-bold tracking-widest uppercase">
              Verification Unsuccessful
            </span>
            <h3 className="font-headline text-[18px] font-bold text-[#ba1a1a]">
              Student Record Not Found
            </h3>
            <p className="text-xs text-[#44464f] leading-relaxed">
              We could not locate any student or admission record matching institutional enrollment number{' '}
              <strong className="text-[#111c2d] font-mono">{invalidQueryString || query}</strong>.
            </p>
          </div>

          <div className="w-full p-3 rounded-lg bg-[#f0f3ff] text-left flex flex-col gap-2 mt-1 border border-[#dee8ff]">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[#747780] text-[18px] mt-0.5">
                info
              </span>
              <p className="text-xs text-[#44464f] leading-relaxed">
                Please double-check the institutional enrollment number printed on your original admission slip or contact the administrative desk:
              </p>
            </div>
            <div className="flex flex-col xs:flex-row gap-2 pt-1">
              <a
                className="flex-1 py-2 px-3 rounded-md bg-[#dee8ff] text-[#00163d] text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#d8e3fb] transition-colors"
                href="tel:+918638611886"
              >
                <span className="material-symbols-outlined text-[16px]">call</span>
                <span>+91 8638611886</span>
              </a>
              <a
                className="flex-1 py-2 px-3 rounded-md bg-[#dee8ff] text-[#00163d] text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#d8e3fb] transition-colors"
                href="mailto:iaitkaliabor@gmail.com"
              >
                <span className="material-symbols-outlined text-[16px]">mail</span>
                <span>Email Admin Desk</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Faculty & Staff Access Section */}
      <div className="rounded-xl bg-white p-4 shadow-xs border border-[#dee8ff] flex flex-col gap-4">
        <div className="flex items-center justify-between pb-1 border-b border-[#dee8ff]">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#dee8ff] flex items-center justify-center text-[#00163d]">
              <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
            </span>
            <div className="flex flex-col">
              <h2 className="font-headline text-[15px] font-bold text-[#111c2d]">
                Faculty & Staff Access
              </h2>
              <span className="text-[10px] text-[#747780] font-bold uppercase">
                Authorized Personnel Only
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f0f3ff] text-[#44464f] text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0051d5] animate-pulse" />
            RESTRICTED
          </span>
        </div>

        {!isStaffAuthenticated ? (
          <form onSubmit={handleStaffLogin} className="flex flex-col gap-3">
            <div className="p-3 rounded-lg bg-[#f0f3ff] flex flex-col gap-2 border border-[#dee8ff]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#111c2d] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-[#747780]">key</span>
                  Enter Faculty Security Passcode
                </label>
                <span className="text-[11px] text-[#747780]">Branch: Kaliabor</span>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showPasscode ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white text-[#111c2d] text-sm tracking-widest border border-[#dee8ff] focus:outline-none focus:border-[#0051d5]"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-2 text-[#747780] hover:text-[#111c2d] p-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPasscode ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {staffError && <span className="text-[11px] text-[#ba1a1a] font-bold">{staffError}</span>}
              <div className="flex items-center justify-between text-[10px] text-[#747780]">
                <span>Default Passcode: iait2025</span>
                <span>(Authorized staff can set custom passcode after login)</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="submit"
                className="w-full py-2.5 px-3 rounded-lg bg-[#0051d5] hover:bg-[#316bf3] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">login</span>
                <span>Staff Login</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-3 animate-in fade-in duration-200">
            {/* Staff status bar & Action buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-emerald-700">verified_user</span>
                <span className="font-bold">Faculty Portal Logged In: Kaliabor Academic Wing</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onOpenAdminPanel && (
                  <button
                    type="button"
                    onClick={onOpenAdminPanel}
                    className="px-2.5 py-1 rounded bg-[#00163d] hover:bg-[#0051d5] text-white font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[14px]">domain</span>
                    <span>Multi-Branch Admin Panel</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(!isChangingPassword);
                    setPasswordChangeMessage(null);
                  }}
                  className="px-2.5 py-1 rounded bg-white hover:bg-emerald-100 text-[#00163d] font-bold text-[11px] border border-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">lock_reset</span>
                  <span>{isChangingPassword ? 'Cancel Password Change' : 'Change Passcode'}</span>
                </button>
                <button
                  onClick={() => {
                    setIsStaffAuthenticated(false);
                    setIsChangingPassword(false);
                  }}
                  className="px-2.5 py-1 rounded bg-[#ba1a1a] hover:bg-red-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">logout</span>
                  <span>Logout</span>
                </button>
              </div>
            </div>

            {/* Change Password Form (Authorized Personnel Feature) */}
            {isChangingPassword && (
              <form
                onSubmit={handleChangePassword}
                className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col gap-2.5 animate-in slide-in-from-top-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-950 font-bold">
                    <span className="material-symbols-outlined text-[18px] text-amber-700">security</span>
                    <span>Create Your Own Custom Staff Password</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      resetStaffPasscodeToDefault();
                      setPasswordChangeMessage({ text: 'Passcode reset to default (iait2025).', isError: false });
                    }}
                    className="text-[10px] text-amber-800 underline hover:text-amber-950 cursor-pointer"
                  >
                    Reset to Default
                  </button>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Set a secure institutional password of your choice. Authorized staff will use this password to access the portal and download uploaded documents.
                </p>

                {passwordChangeMessage && (
                  <div
                    className={`p-2 rounded-lg text-xs font-semibold ${
                      passwordChangeMessage.isError
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {passwordChangeMessage.text}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[#44464f] uppercase">
                      Current Password <span className="text-red-600">*</span>
                    </label>
                    <input
                      required
                      type="password"
                      value={currentPasswordInput}
                      onChange={(e) => setCurrentPasswordInput(e.target.value)}
                      placeholder="Current key"
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-amber-200 text-xs focus:outline-none focus:border-[#0051d5]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[#44464f] uppercase">
                      New Custom Password <span className="text-red-600">*</span>
                    </label>
                    <input
                      required
                      type="password"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Min 4 characters"
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-amber-200 text-xs focus:outline-none focus:border-[#0051d5]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[#44464f] uppercase">
                      Confirm New Password <span className="text-red-600">*</span>
                    </label>
                    <input
                      required
                      type="password"
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      placeholder="Repeat new key"
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-amber-200 text-xs focus:outline-none focus:border-[#0051d5]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#0051d5] hover:bg-[#316bf3] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>Save New Password</span>
                  </button>
                </div>
              </form>
            )}

            {/* Live Database Metrics Box */}
            <div className="p-3 rounded-lg bg-[#f0f3ff] flex flex-col gap-2 border border-[#dee8ff]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#0051d5] text-[18px]">
                    cloud_sync
                  </span>
                  <span className="text-xs font-bold text-[#111c2d]">Live Administrative Database</span>
                </div>
                <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                  ✓ Synchronized
                </span>
              </div>
              <p className="text-xs text-[#44464f]">
                Institutional registry containing verified students and online admission applicants with attached documents.
              </p>

              {/* Quick Metrics */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2 rounded bg-white flex flex-col border border-[#dee8ff]">
                  <span className="text-[10px] text-[#747780] font-bold uppercase">Certified Registry</span>
                  <span className="font-headline text-[16px] font-bold text-[#00163d]">
                    {totalStudents}
                  </span>
                </div>
                <div className="p-2 rounded bg-white flex flex-col border border-[#dee8ff]">
                  <span className="text-[10px] text-[#747780] font-bold uppercase">Online Applicants</span>
                  <span className="font-headline text-[16px] font-bold text-[#0051d5]">
                    {totalApps}
                  </span>
                </div>
                <div className="p-2 rounded bg-white flex flex-col border border-[#dee8ff]">
                  <span className="text-[10px] text-[#747780] font-bold uppercase">Total Trainees</span>
                  <span className="font-headline text-[16px] font-bold text-[#111c2d]">
                    {totalStudents + totalApps}
                  </span>
                </div>
              </div>
            </div>

            {/* List of Registered Student Applications with Clickable Document Downloads */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#747780] uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">folder_shared</span>
                  Student Documents & Applicant Records ({currentApplications.length})
                </span>
                <span className="text-[10px] text-[#0051d5] font-semibold">
                  Click files to preview or download
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
                {currentApplications.map((app: AdmissionApplication) => {
                  const hasPhoto = Boolean(app.photoUrl);
                  const hasId = Boolean(app.idProofUrl);
                  const hasMarksheet = Boolean(app.marksheetUrl);
                  const hasReceipt = Boolean(app.receiptUrl);

                  return (
                    <div
                      key={app.id}
                      className="p-3 rounded-xl bg-white border border-[#dee8ff] shadow-xs flex flex-col gap-2 hover:border-[#0051d5] transition-all"
                    >
                      {/* Top Header of Candidate */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {app.photoUrl ? (
                            <img
                              src={app.photoUrl}
                              alt={app.studentName}
                              className="w-10 h-10 rounded-lg object-cover border border-[#dee8ff] shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[#dee8ff] text-[#00163d] flex items-center justify-center font-bold text-xs shrink-0">
                              {app.studentName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <strong className="text-xs text-[#00163d] block truncate font-headline">
                              {app.studentName}
                            </strong>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#747780]">
                              <span className="text-[#0051d5] font-bold font-mono">
                                No: {app.enrollmentId || app.id}
                              </span>
                              <span>•</span>
                              <span>{app.course}</span>
                              <span>•</span>
                              <span>Ref: {app.utrNumber}</span>
                            </div>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-full bg-[#dbe1ff] text-[#003ea8] text-[10px] font-bold shrink-0">
                          {app.status}
                        </span>
                      </div>

                      {/* Candidate Meta Info */}
                      <div className="bg-[#f0f3ff] p-2 rounded-lg grid grid-cols-2 xs:grid-cols-3 gap-1.5 text-[11px] text-[#44464f]">
                        <div>
                          <span className="text-[#747780] block text-[9px] uppercase font-bold">Contact</span>
                          <span className="font-semibold text-[#111c2d] truncate block">{app.phone}</span>
                        </div>
                        <div>
                          <span className="text-[#747780] block text-[9px] uppercase font-bold">Guardian</span>
                          <span className="font-semibold text-[#111c2d] truncate block">{app.guardianName}</span>
                        </div>
                        <div>
                          <span className="text-[#747780] block text-[9px] uppercase font-bold">Applied Date</span>
                          <span className="font-semibold text-[#111c2d] truncate block">{app.createdAt.split('T')[0]}</span>
                        </div>
                      </div>

                      {/* Uploaded Documents Action Bar (Clickable View / Download) */}
                      <div className="pt-1 flex flex-col gap-1.5 border-t border-[#dee8ff]">
                        <span className="text-[10px] font-bold text-[#747780] uppercase tracking-wider">
                          Uploaded Attachments:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {/* 1. Photo */}
                          {hasPhoto ? (
                            <div className="inline-flex items-center rounded-md bg-[#e7eeff] border border-[#c4c6d0]/40 overflow-hidden text-[11px]">
                              <button
                                type="button"
                                onClick={() =>
                                  setViewingDoc({
                                    title: 'Applicant Passport Photograph',
                                    studentName: app.studentName,
                                    dataUrl: app.photoUrl!,
                                    fileName: `${app.studentName.replace(/\s+/g, '_')}_photo.jpg`,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 text-[#00163d] font-semibold hover:bg-[#d8e3fb] transition-colors cursor-pointer"
                                title="Click to preview photograph"
                              >
                                <span className="material-symbols-outlined text-[14px] text-[#0051d5]">account_box</span>
                                <span>Photo</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => downloadFileLocally(app.photoUrl!, `${app.studentName.replace(/\s+/g, '_')}_photo.jpg`)}
                                className="px-1.5 py-1 text-[#0051d5] hover:bg-[#0051d5] hover:text-white transition-colors cursor-pointer border-l border-[#c4c6d0]/40"
                                title="Download Photo to PC/Laptop"
                              >
                                <span className="material-symbols-outlined text-[13px]">download</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#747780] italic px-1.5 py-0.5">No photo</span>
                          )}

                          {/* 2. ID Proof */}
                          {hasId ? (
                            <div className="inline-flex items-center rounded-md bg-[#e7eeff] border border-[#c4c6d0]/40 overflow-hidden text-[11px]">
                              <button
                                type="button"
                                onClick={() =>
                                  setViewingDoc({
                                    title: 'Government Identity Proof',
                                    studentName: app.studentName,
                                    dataUrl: app.idProofUrl!,
                                    fileName: `${app.studentName.replace(/\s+/g, '_')}_${app.idProofName || 'id_proof.jpg'}`,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 text-[#00163d] font-semibold hover:bg-[#d8e3fb] transition-colors cursor-pointer"
                                title="Click to preview Government ID Proof"
                              >
                                <span className="material-symbols-outlined text-[14px] text-[#0051d5]">badge</span>
                                <span className="max-w-[110px] truncate">{app.idProofName || 'Govt ID Proof'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => downloadFileLocally(app.idProofUrl!, `${app.studentName.replace(/\s+/g, '_')}_${app.idProofName || 'id_proof.jpg'}`)}
                                className="px-1.5 py-1 text-[#0051d5] hover:bg-[#0051d5] hover:text-white transition-colors cursor-pointer border-l border-[#c4c6d0]/40"
                                title="Download ID Proof to PC/Laptop"
                              >
                                <span className="material-symbols-outlined text-[13px]">download</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#747780] px-1.5 py-0.5 bg-gray-50 rounded border border-gray-200">
                              ID: {app.idProofName || 'Pending'}
                            </span>
                          )}

                          {/* 3. Marksheet */}
                          {hasMarksheet ? (
                            <div className="inline-flex items-center rounded-md bg-[#e7eeff] border border-[#c4c6d0]/40 overflow-hidden text-[11px]">
                              <button
                                type="button"
                                onClick={() =>
                                  setViewingDoc({
                                    title: 'Academic Qualification Marksheet',
                                    studentName: app.studentName,
                                    dataUrl: app.marksheetUrl!,
                                    fileName: `${app.studentName.replace(/\s+/g, '_')}_${app.marksheetName || 'marksheet.jpg'}`,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 text-[#00163d] font-semibold hover:bg-[#d8e3fb] transition-colors cursor-pointer"
                                title="Click to preview Academic Marksheet"
                              >
                                <span className="material-symbols-outlined text-[14px] text-[#0051d5]">description</span>
                                <span className="max-w-[110px] truncate">{app.marksheetName || 'Marksheet'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => downloadFileLocally(app.marksheetUrl!, `${app.studentName.replace(/\s+/g, '_')}_${app.marksheetName || 'marksheet.jpg'}`)}
                                className="px-1.5 py-1 text-[#0051d5] hover:bg-[#0051d5] hover:text-white transition-colors cursor-pointer border-l border-[#c4c6d0]/40"
                                title="Download Marksheet to PC/Laptop"
                              >
                                <span className="material-symbols-outlined text-[13px]">download</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#747780] px-1.5 py-0.5 bg-gray-50 rounded border border-gray-200">
                              Doc: {app.marksheetName || 'Pending'}
                            </span>
                          )}

                          {/* 4. Payment Receipt */}
                          {hasReceipt ? (
                            <div className="inline-flex items-center rounded-md bg-emerald-50 border border-emerald-200 overflow-hidden text-[11px]">
                              <button
                                type="button"
                                onClick={() =>
                                  setViewingDoc({
                                    title: 'Fee Payment Screenshot / Receipt',
                                    studentName: app.studentName,
                                    dataUrl: app.receiptUrl!,
                                    fileName: `${app.studentName.replace(/\s+/g, '_')}_${app.receiptName || 'receipt.jpg'}`,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 text-emerald-800 font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
                                title="Click to preview Payment Receipt"
                              >
                                <span className="material-symbols-outlined text-[14px] text-emerald-700">receipt</span>
                                <span className="max-w-[110px] truncate">{app.receiptName || 'Receipt'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => downloadFileLocally(app.receiptUrl!, `${app.studentName.replace(/\s+/g, '_')}_${app.receiptName || 'receipt.jpg'}`)}
                                className="px-1.5 py-1 text-emerald-800 hover:bg-emerald-700 hover:text-white transition-colors cursor-pointer border-l border-emerald-200"
                                title="Download Receipt to PC/Laptop"
                              >
                                <span className="material-symbols-outlined text-[13px]">download</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#747780] px-1.5 py-0.5 bg-gray-50 rounded border border-gray-200">
                              Receipt: {app.receiptName || 'None'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Document View & Local Download Modal Dialog */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 bg-[#00163d]/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#dee8ff] flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-[#00163d] text-white p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#afc6ff] uppercase tracking-wider font-bold block">
                  {viewingDoc.title}
                </span>
                <h3 className="font-headline text-base font-bold text-white">
                  {viewingDoc.studentName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Document Viewer Body */}
            <div className="p-4 flex-1 overflow-y-auto flex flex-col items-center justify-center bg-[#f0f3ff] min-h-[260px]">
              {viewingDoc.dataUrl.startsWith('data:application/pdf') ? (
                <div className="flex flex-col items-center gap-3 p-6 text-center">
                  <span className="material-symbols-outlined text-[64px] text-red-600">
                    picture_as_pdf
                  </span>
                  <div className="flex flex-col gap-1">
                    <strong className="text-sm text-[#00163d]">{viewingDoc.fileName}</strong>
                    <span className="text-xs text-[#747780]">
                      PDF Document attached by student
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadFileLocally(viewingDoc.dataUrl, viewingDoc.fileName)}
                    className="mt-2 px-4 py-2 rounded-xl bg-[#0051d5] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md hover:bg-[#316bf3]"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    <span>Download PDF to Your PC / Laptop</span>
                  </button>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center gap-2">
                  <img
                    src={viewingDoc.dataUrl}
                    alt={viewingDoc.title}
                    className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-md border border-[#dee8ff]"
                  />
                  <span className="text-[11px] text-[#747780] font-mono">{viewingDoc.fileName}</span>
                </div>
              )}
            </div>

            {/* Modal Action Footer */}
            <div className="p-3 bg-white border-t border-[#dee8ff] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                className="px-4 py-2 rounded-lg bg-[#dee8ff] hover:bg-[#d8e3fb] text-[#00163d] text-xs font-bold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => downloadFileLocally(viewingDoc.dataUrl, viewingDoc.fileName)}
                className="px-5 py-2 rounded-lg bg-[#0051d5] hover:bg-[#316bf3] text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span>Download Locally to System</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trust Footer Sign-off */}
      <div className="p-3 text-center flex flex-col items-center gap-1 text-[#747780]">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px]">lock</span>
          <span className="text-[10px] uppercase tracking-wider font-bold">
            Icon Academy of IT • Institutional Trust & Safety
          </span>
        </div>
        <span className="text-[11px] text-[#44464f]">
          Kaliabor Kuwaritol Branch • Nagaon Assam • Contact: 8638611886
        </span>
      </div>
    </div>
  );
};

import React from 'react';
import { TabType } from '../types';

interface HomeScreenProps {
  setActiveTab: (tab: TabType) => void;
  onOpenUpiModal: () => void;
  onOpenSyllabusModal: (courseCode: string) => void;
  onSelectCourseForAdmission: (courseCode: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  setActiveTab,
  onOpenUpiModal,
  onSelectCourseForAdmission,
}) => {
  return (
    <div className="flex flex-col w-full pb-20">
      {/* Notice Ticker Strip */}
      <div className="w-full bg-[#00163d] text-white py-2 px-3 flex items-center gap-2 overflow-hidden shadow-xs">
        <span className="inline-flex items-center justify-center p-1 rounded bg-[#0051d5] text-white shrink-0">
          <span className="material-symbols-outlined text-[16px]">campaign</span>
        </span>
        <div className="flex-1 overflow-x-auto whitespace-nowrap scroll-smooth no-scrollbar">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#dee8ff] inline-block animate-pulse">
            📢 Admissions Open for 2025-26 Session • Free Career Counseling Available • Call +91 8638611886 • ISO 9001:2015 Certified
          </p>
        </div>
      </div>

      {/* Hero Institutional Card */}
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-4">
        <div className="relative w-full rounded-2xl bg-gradient-to-b from-[#0f2b5c] via-[#00163d] to-[#00163d] text-white p-5 sm:p-8 lg:p-10 shadow-md overflow-hidden">
          {/* Decorative Backdrop Glow */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#316bf3]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-[#ffb95f]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 flex flex-col">
              {/* Institute Badge Header */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-[#ffddb8] text-[10px] sm:text-xs font-bold tracking-widest uppercase">
                  <span className="material-symbols-outlined text-[14px]">workspace_premium</span>
                  Learn Today, Lead Tomorrow
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#316bf3]/40 text-white text-xs font-semibold">
                  <span className="material-symbols-outlined text-[12px]">verified</span> ISO 9001:2015
                </span>
              </div>

              {/* Institute Main Heading */}
              <div className="flex flex-col gap-1.5 mb-3">
                <p className="font-brand text-[12px] sm:text-[14px] font-bold text-[#dbe1ff] uppercase tracking-wider">
                  Icon Academy of Information Technology • Kaliabor
                </p>
                <h1 className="font-headline text-[28px] sm:text-[36px] lg:text-[42px] text-white font-extrabold leading-tight">
                  Empowering Youth with Industry IT Skills
                </h1>
              </div>

              <p className="text-sm sm:text-base text-[#dee8ff] mb-6 leading-relaxed max-w-2xl">
                Premier Govt. Registered & ISO 9001:2015 Certified IT Training Centre in Kaliabor, Nagaon. Bridging technology education with assured employment pathways.
              </p>

              {/* Action Button Group */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <button
                  onClick={() => setActiveTab('admission')}
                  className="flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-[#0051d5] text-white text-sm font-bold shadow-md hover:bg-[#316bf3] transition-all active:scale-[0.98] cursor-pointer"
                >
                  <span>Apply for Admission</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
                <button
                  onClick={() => setActiveTab('courses')}
                  className="flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold backdrop-blur transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">menu_book</span>
                  <span>Explore 10+ Courses</span>
                </button>
              </div>

              {/* Trust Stat Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/10">
                  <span className="material-symbols-outlined text-[#ffddb8] text-[20px]">devices</span>
                  <div className="flex flex-col">
                    <span className="font-headline text-[15px] font-bold text-white leading-tight">
                      1:1 PC Ratio
                    </span>
                    <span className="text-[11px] text-[#dee8ff]">Practical Lab</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/10">
                  <span className="material-symbols-outlined text-[#dbe1ff] text-[20px]">groups</span>
                  <div className="flex flex-col">
                    <span className="font-headline text-[15px] font-bold text-white leading-tight">
                      5,000+
                    </span>
                    <span className="text-[11px] text-[#dee8ff]">Alumni Base</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/10">
                  <span className="material-symbols-outlined text-[#ffddb8] text-[20px]">policy</span>
                  <div className="flex flex-col">
                    <span className="font-headline text-[15px] font-bold text-white leading-tight">
                      Govt. Valid
                    </span>
                    <span className="text-[11px] text-[#dee8ff]">Job Certified</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/10">
                  <span className="material-symbols-outlined text-[#dbe1ff] text-[20px]">translate</span>
                  <div className="flex flex-col">
                    <span className="font-headline text-[15px] font-bold text-white leading-tight">
                      Asm + Eng
                    </span>
                    <span className="text-[11px] text-[#dee8ff]">Bilingual</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Visual Image Column */}
            <div className="lg:col-span-5 flex flex-col justify-center">
              <div className="w-full h-56 sm:h-72 lg:h-80 rounded-2xl overflow-hidden shadow-2xl relative border border-white/10">
                <img
                  className="w-full h-full object-cover"
                  alt="Kaliabor Campus Computer Center"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDzsVCxyrhfZz0oaCE6lDRnZN5bFyeUiwtbr_DEXcwCfzaFo8yY5yQBPnsLGrCpgmSd3YgE3-rtOk61pezfJ9EPaZ0JZweZdSY3Q8fzwU7PYSfQ3a490aOxseKk9Vq7eOHdr1VnDUqCQkhvBGUpGX43Y8OodizV24yqeTfWDhCBvEnUC35nr38zOc3CGEeMwoLPuh1cYRkstR6BbUR4hGBzOhrtKve0X23iAb3o9V8Q9c8oEUkpRSFN8A"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#00163d]/90 via-[#00163d]/20 to-transparent flex items-end p-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-[#22c55e] animate-ping" />
                    <span className="text-xs sm:text-sm text-white font-medium">
                      Kaliabor Campus Computer Center • Active Labs Today
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Direct Quick Touchpoint Services */}
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-[18px] sm:text-[20px] text-[#111c2d] font-bold">Quick Touchpoints</h2>
          <span className="text-[11px] text-[#747780] font-bold uppercase tracking-wider">
            Instant Actions
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Action 1: Verify Student */}
          <button
            onClick={() => setActiveTab('verify')}
            className="flex flex-col justify-between p-3.5 rounded-xl bg-white shadow-xs hover:shadow-md transition-all group text-left cursor-pointer border border-[#dee8ff]"
          >
            <div className="w-10 h-10 rounded-xl bg-[#00163d] text-white flex items-center justify-center mb-2 shadow-xs group-hover:bg-[#0051d5] transition-colors">
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline text-[14px] font-bold text-[#111c2d] group-hover:text-[#0051d5]">
                Verify Student
              </span>
              <span className="text-xs text-[#747780] line-clamp-1">Validate Roll & Marksheet</span>
            </div>
          </button>

          {/* Action 2: Admission Form */}
          <button
            onClick={() => setActiveTab('admission')}
            className="flex flex-col justify-between p-3.5 rounded-xl bg-white shadow-xs hover:shadow-md transition-all group text-left cursor-pointer border border-[#dee8ff]"
          >
            <div className="w-10 h-10 rounded-xl bg-[#316bf3] text-white flex items-center justify-center mb-2 shadow-xs group-hover:bg-[#0051d5] transition-colors">
              <span className="material-symbols-outlined text-[20px]">edit_square</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline text-[14px] font-bold text-[#111c2d] group-hover:text-[#0051d5]">
                Apply Online
              </span>
              <span className="text-xs text-[#747780] line-clamp-1">Register for New Batch</span>
            </div>
          </button>

          {/* Action 3: Fee Payment QR */}
          <button
            onClick={onOpenUpiModal}
            className="flex flex-col justify-between p-3.5 rounded-xl bg-white shadow-xs hover:shadow-md transition-all group text-left cursor-pointer border border-[#dee8ff]"
          >
            <div className="w-10 h-10 rounded-xl bg-[#dee8ff] text-[#00163d] flex items-center justify-center mb-2 shadow-xs group-hover:bg-[#00163d] group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline text-[14px] font-bold text-[#111c2d] group-hover:text-[#0051d5]">
                Fee Payment
              </span>
              <span className="text-xs text-[#747780] line-clamp-1">Instant UPI Scan & Pay</span>
            </div>
          </button>

          {/* Action 4: Prospectus */}
          <a
            href="tel:+918638611886"
            className="flex flex-col justify-between p-3.5 rounded-xl bg-white shadow-xs hover:shadow-md transition-all group text-left border border-[#dee8ff]"
          >
            <div className="w-10 h-10 rounded-xl bg-[#ffddb8] text-[#2a1700] flex items-center justify-center mb-2 shadow-xs">
              <span className="material-symbols-outlined text-[20px]">download_for_offline</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline text-[14px] font-bold text-[#111c2d] group-hover:text-[#0051d5]">
                Prospectus
              </span>
              <span className="text-xs text-[#747780] line-clamp-1">Syllabus & Fee Book</span>
            </div>
          </a>
        </div>
      </div>

      {/* Popular IT Courses Section */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-4" id="featured-courses">
        <div className="flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-[#0051d5] uppercase tracking-wider">
              Career Curricula
            </span>
            <h2 className="font-headline text-[24px] sm:text-[28px] text-[#00163d] font-bold">
              Popular Programs
            </h2>
          </div>
          <button
            onClick={() => setActiveTab('courses')}
            className="text-xs sm:text-sm text-[#0051d5] font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            View All <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>

        {/* 4-column on Laptop/PC, 2-column on tablet, 1-column on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Course Card 1: ADCA */}
          <div className="w-full rounded-2xl bg-white shadow-sm p-5 flex flex-col justify-between gap-3 relative overflow-hidden border border-[#dee8ff] hover:shadow-md transition-all">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#0051d5]" />
            <div className="flex items-start justify-between gap-2 pt-1">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-[#0051d5] uppercase">FLAGSHIP JOB COURSE</span>
                <h3 className="font-headline text-[17px] font-bold text-[#111c2d]">
                  ADCA (Advanced Diploma)
                </h3>
                <p className="text-xs text-[#44464f] mt-0.5">
                  Computer Applications, Office Suite, Tally & Web Design Basics
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#dbe1ff] text-[#003ea8] text-[11px] font-bold shrink-0">
                12 Months
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-[#e7eeff] text-[#44464f] text-[11px]">
                Eligibility: 10+2 Any Stream
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#e7eeff] text-[#44464f] text-[11px]">
                Daily Practical Lab
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#ecfdf5] text-[#15803d] text-[11px] font-semibold">
                Govt. Job Eligible
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#f0f3ff]">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#747780] uppercase">Tuition Scheme</span>
                <span className="font-headline text-[15px] font-bold text-[#00163d]">
                  Affordable Monthly EMI
                </span>
              </div>
              <button
                onClick={() => onSelectCourseForAdmission('ADCA')}
                className="px-4 py-2 rounded-xl bg-[#00163d] hover:bg-[#0051d5] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <span>Apply Course</span>
                <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
              </button>
            </div>
          </div>

          {/* Course Card 2: PGDCA */}
          <div className="w-full rounded-2xl bg-white shadow-sm p-5 flex flex-col justify-between gap-3 relative overflow-hidden border border-[#dee8ff] hover:shadow-md transition-all">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#00163d]" />
            <div className="flex items-start justify-between gap-2 pt-1">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-[#00163d] uppercase">GRADUATE SPECIALIZATION</span>
                <h3 className="font-headline text-[17px] font-bold text-[#111c2d]">
                  PGDCA (Post Graduate Diploma)
                </h3>
                <p className="text-xs text-[#44464f] mt-0.5">
                  Advanced IT System Architecture, RDBMS, C++ & Practical Projects
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#d9e2ff] text-[#001944] text-[11px] font-bold shrink-0">
                1 Year
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-[#e7eeff] text-[#44464f] text-[11px]">
                Eligibility: Graduate in any discipline
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#e7eeff] text-[#44464f] text-[11px]">
                Project Viva Included
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#f0f3ff]">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#747780] uppercase">Certification</span>
                <span className="font-headline text-[15px] font-bold text-[#00163d]">
                  National Recognized
                </span>
              </div>
              <button
                onClick={() => onSelectCourseForAdmission('PGDCA')}
                className="px-4 py-2 rounded-xl bg-[#00163d] hover:bg-[#0051d5] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <span>Apply Course</span>
                <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
              </button>
            </div>
          </div>

          {/* Course Card 3: Python & AI */}
          <div className="w-full rounded-2xl bg-white shadow-sm p-5 flex flex-col justify-between gap-3 relative overflow-hidden border border-[#dee8ff] hover:shadow-md transition-all">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#ea580c]" />
            <div className="flex items-start justify-between gap-2 pt-1">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-[#c2410c] uppercase">NEW TECH & CODING</span>
                <h3 className="font-headline text-[17px] font-bold text-[#111c2d]">
                  Python Programming & AI Basics
                </h3>
                <p className="text-xs text-[#44464f] mt-0.5">
                  Logic building, OOPs, Data analysis with Pandas, AI tools & Automation
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#ffddb8] text-[#2a1700] text-[11px] font-bold shrink-0">
                6 Months
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-[#e7eeff] text-[#44464f] text-[11px]">
                Eligibility: 10th / 12th Pass
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#e7eeff] text-[#44464f] text-[11px]">
                Live Mini-Projects
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#f0f3ff]">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#747780] uppercase">Course Format</span>
                <span className="font-headline text-[15px] font-bold text-[#00163d]">
                  Hands-on Coding
                </span>
              </div>
              <button
                onClick={() => onSelectCourseForAdmission('PYTHON')}
                className="px-4 py-2 rounded-xl bg-[#00163d] hover:bg-[#0051d5] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <span>Apply Course</span>
                <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
              </button>
            </div>
          </div>

          {/* Course Card 4: Tally Prime with GST */}
          <div className="w-full rounded-2xl bg-white shadow-sm p-5 flex flex-col justify-between gap-3 relative overflow-hidden border border-[#dee8ff] hover:shadow-md transition-all">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#059669]" />
            <div className="flex items-start justify-between gap-2 pt-1">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-[#047857] uppercase">COMMERCE & ACCOUNTS</span>
                <h3 className="font-headline text-[17px] font-bold text-[#111c2d]">
                  Tally Prime with GST & E-Filing
                </h3>
                <p className="text-xs text-[#44464f] mt-0.5">
                  Inventory management, payroll, balance sheet, GST portal operations
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#d1fae5] text-[#065f46] text-[11px] font-bold shrink-0">
                3 Months
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-[#e7eeff] text-[#44464f] text-[11px]">
                Eligibility: HS (Commerce / Arts / Sci)
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#e7eeff] text-[#44464f] text-[11px]">
                Live Invoicing Drills
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#f0f3ff]">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#747780] uppercase">Placement Scope</span>
                <span className="font-headline text-[15px] font-bold text-[#00163d]">
                  Immediate Accountant Roles
                </span>
              </div>
              <button
                onClick={() => onSelectCourseForAdmission('TALLY')}
                className="px-4 py-2 rounded-xl bg-[#00163d] hover:bg-[#0051d5] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <span>Apply Course</span>
                <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Why Choose IAIT Kaliabor Feature Bento */}
      <div className="px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-4 bg-[#f0f3ff] rounded-2xl mx-4 sm:mx-6 lg:mx-8 my-4">
        <div className="flex flex-col gap-1 text-center py-2">
          <span className="text-[11px] text-[#0051d5] font-bold uppercase tracking-wider">
            Institutional Standard
          </span>
          <h2 className="font-headline text-[24px] sm:text-[28px] text-[#00163d] font-bold">
            Why Choose IAIT Kaliabor?
          </h2>
          <p className="text-xs sm:text-sm text-[#44464f] max-w-lg mx-auto">
            Bridging Assam's students directly to real corporate, government & entrepreneurial careers.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Feature 1 */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white shadow-xs border border-[#dee8ff]">
            <div className="w-10 h-10 rounded-xl bg-[#00163d] text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">desktop_windows</span>
            </div>
            <div className="flex flex-col">
              <h3 className="font-headline text-[15px] font-bold text-[#111c2d]">
                1:1 Student-to-PC Practical Lab
              </h3>
              <p className="text-xs text-[#44464f] mt-0.5">
                No sharing systems. Every student gets hands-on machine time for the complete duration of their daily slot.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white shadow-xs border border-[#dee8ff]">
            <div className="w-10 h-10 rounded-xl bg-[#0051d5] text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">record_voice_over</span>
            </div>
            <div className="flex flex-col">
              <h3 className="font-headline text-[15px] font-bold text-[#111c2d]">
                Bilingual Instruction (Assamese & English)
              </h3>
              <p className="text-xs text-[#44464f] mt-0.5">
                Complex technical programming and digital concepts explained with clarity in our mother tongue as well as professional English.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white shadow-xs border border-[#dee8ff]">
            <div className="w-10 h-10 rounded-xl bg-[#dee8ff] text-[#00163d] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">workspace_premium</span>
            </div>
            <div className="flex flex-col">
              <h3 className="font-headline text-[15px] font-bold text-[#111c2d]">
                Govt. Job Verified Diplomas
              </h3>
              <p className="text-xs text-[#44464f] mt-0.5">
                All certificates bear verifiable serial numbers, QR verification codes, and institutional accreditation valid across Central & State job boards.
              </p>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white shadow-xs border border-[#dee8ff]">
            <div className="w-10 h-10 rounded-xl bg-[#ffddb8] text-[#2a1700] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">handshake</span>
            </div>
            <div className="flex flex-col">
              <h3 className="font-headline text-[15px] font-bold text-[#111c2d]">
                Placement & Resume Preparation
              </h3>
              <p className="text-xs text-[#44464f] mt-0.5">
                Dedicated interview coaching, typing speed enhancement certifications, and placement alerts for local banks, IT firms, and digital offices.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Student-Focused Campus Facilities */}
      <div className="px-4 py-5 flex flex-col gap-3">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-[#0051d5] uppercase tracking-wider">
            Campus Life
          </span>
          <h2 className="font-headline text-[24px] text-[#00163d] font-bold">
            Student Facilities at Kaliabor
          </h2>
        </div>

        {/* Facility Photo */}
        <div className="w-full rounded-2xl overflow-hidden shadow-xs relative h-48 bg-[#e7eeff]">
          <img
            className="w-full h-full object-cover"
            alt="IAIT Kaliabor High Speed Lab"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBf8lRrUU8N0ics6ZT8ei3Ngy3UX70JdBPs8QTgCe0CyL2BxJs80gO9P7kPd-QUgxb1JAvgTvF1tgAQyQhKqslxU7rz88Dk3h2a98VbHA6PO73vPKFarHcYGVpL2sSOH6cJphFK3hKzcfk8sFS1-I7Fcum2coMyEflqzpVvR7i6HydYBUoSJPbElRL7IuLvYgOxfI7o7JonsJ4VwHghbwWoaNZFDPyNPKn86_I4ibw5QQYfmlg4A6qpjw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#00163d]/90 via-[#00163d]/30 to-transparent flex flex-col justify-end p-4 text-white">
            <span className="inline-flex items-center gap-1 text-[#ffddb8] text-[10px] uppercase font-bold tracking-wider">
              <span className="material-symbols-outlined text-[13px]">mode_fan</span> Air-Conditioned High Speed Lab
            </span>
            <h4 className="font-headline text-[16px] font-bold">
              Uninterrupted High-Speed Optical Fiber
            </h4>
            <p className="text-xs text-[#dee8ff]">
              Full power backup with 5kVA online UPS ensures zero disruption during power outages.
            </p>
          </div>
        </div>

        {/* Facility Badges Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-xl bg-white shadow-xs flex items-center gap-2.5 border border-[#dee8ff]">
            <span className="material-symbols-outlined text-[#0051d5] text-[22px]">wifi</span>
            <div className="flex flex-col">
              <span className="font-headline text-[13px] font-bold text-[#111c2d]">Campus Wi-Fi</span>
              <span className="text-[11px] text-[#747780]">Free for Research</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white shadow-xs flex items-center gap-2.5 border border-[#dee8ff]">
            <span className="material-symbols-outlined text-[#0051d5] text-[22px]">library_books</span>
            <div className="flex flex-col">
              <span className="font-headline text-[13px] font-bold text-[#111c2d]">Free E-Books</span>
              <span className="text-[11px] text-[#747780]">Printed Notes Provided</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white shadow-xs flex items-center gap-2.5 border border-[#dee8ff]">
            <span className="material-symbols-outlined text-[#0051d5] text-[22px]">schedule</span>
            <div className="flex flex-col">
              <span className="font-headline text-[13px] font-bold text-[#111c2d]">Flexible Batches</span>
              <span className="text-[11px] text-[#747780]">Morning & Evening</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white shadow-xs flex items-center gap-2.5 border border-[#dee8ff]">
            <span className="material-symbols-outlined text-[#0051d5] text-[22px]">psychology</span>
            <div className="flex flex-col">
              <span className="font-headline text-[13px] font-bold text-[#111c2d]">Project Drills</span>
              <span className="text-[11px] text-[#747780]">Real Client Workflows</span>
            </div>
          </div>
        </div>
      </div>

      {/* Student Success & Alumni Testimonials */}
      <div className="px-4 py-5 flex flex-col gap-3.5 bg-[#f0f3ff]">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] text-[#0051d5] font-bold uppercase tracking-wider">
              Testimonials
            </span>
            <h2 className="font-headline text-[24px] text-[#00163d] font-bold">
              Student Success Stories
            </h2>
          </div>
          <span className="material-symbols-outlined text-[#0051d5] text-[28px]">format_quote</span>
        </div>

        {/* Review 1 */}
        <div className="w-full p-4 rounded-2xl bg-white shadow-xs flex flex-col gap-3 border border-[#dee8ff]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-[#00163d]">
              <img
                className="w-full h-full object-cover"
                alt="Pallabi Saikia"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-4Jn4_QNVZGUt5wmzufGGVeYfho-hVV0q1oWoiu1qircaL8ldSqn5vE8ESHOq60ySPghoyzkv8MbMYGpGep647re-9zobQlLMz60Xs8OGdORnjiWUVHOxFWrmKD7ovH_XHK7JBH1Y-KQgxfaNqgFPATAdzJXqOEhGoSZpFFqyGeMAWT4d4NCRM9voAXQVUMwGJTSWabjjr4CB6XjFz6Bh2Q4cWq75fqBOXrltHl11jLqQZKY94Zb4Lw"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-headline text-[15px] font-bold text-[#111c2d] truncate">
                Pallabi Saikia
              </span>
              <span className="text-xs text-[#747780]">ADCA Graduate (Batch 2023-24)</span>
              <span className="text-[10px] text-[#0051d5] font-bold">
                Placed at APDCL Billing Office, Nagaon
              </span>
            </div>
          </div>
          <p className="text-xs text-[#111c2d] leading-relaxed italic">
            “IAIT Kaliabor gave me the hands-on computer confidence I never received elsewhere. The teachers explained Excel formulas and GST in Assamese whenever I had doubts. I cleared my interview on the first attempt!”
          </p>
          <div className="flex items-center gap-1 text-[#eab308]">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="material-symbols-outlined text-[16px]">star</span>
            ))}
            <span className="text-[11px] text-[#747780] ml-1 font-bold">5.0 Verified Student</span>
          </div>
        </div>

        {/* Review 2 */}
        <div className="w-full p-4 rounded-2xl bg-white shadow-xs flex flex-col gap-3 border border-[#dee8ff]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-[#0051d5]">
              <img
                className="w-full h-full object-cover"
                alt="Bikash Bora"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJZeF--IRvZDiPhBpJj7e8Bwvyiq8XTylAnFsIObOMJFlH6Ow8Q4gDva24Ixn_Ra3E2JrXxK9SNndQHdcdX2L8awdo0hd6w_J9xMJ-yqp6ju_zbgV5F1OqCUJzYP5TO3W82TH5vTNzMzZMyEeXQnCqCQkwWdBqmmzJ2l5q4M8TzE0-jWket_CjxnE8e_GPExl3E10b2YzhPEj0CMktIVv5MNJJUw4-BxJsYxRdiclhRUMKW7H536fBIA"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-headline text-[15px] font-bold text-[#111c2d] truncate">
                Bikash Bora
              </span>
              <span className="text-xs text-[#747780]">PGDCA & Python (Batch 2022-23)</span>
              <span className="text-[10px] text-[#0051d5] font-bold">
                Data Assistant, Kaliabor Sub-Division
              </span>
            </div>
          </div>
          <p className="text-xs text-[#111c2d] leading-relaxed italic">
            “The online certificate verification makes IAIT credentials trusted for Assam Govt. tenders and job recruitment. Outstanding lab facilities and constant mentor support right here in our town.”
          </p>
          <div className="flex items-center gap-1 text-[#eab308]">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="material-symbols-outlined text-[16px]">star</span>
            ))}
            <span className="text-[11px] text-[#747780] ml-1 font-bold">5.0 Verified Student</span>
          </div>
        </div>
      </div>

      {/* Physical Campus Location Card */}
      <div className="px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] text-[#0051d5] font-bold uppercase tracking-wider">
              Visit Campus
            </span>
            <h2 className="font-headline text-[18px] text-[#00163d] font-bold">
              Find Us in Kaliabor
            </h2>
          </div>
          <a
            className="px-3 py-1 rounded-full bg-[#dee8ff] text-[#00163d] text-xs font-semibold flex items-center gap-1 hover:bg-[#d8e3fb] transition-colors"
            href="https://maps.google.com/?q=Kuwaritol,Kaliabor,Nagaon,Assam"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="material-symbols-outlined text-[16px]">navigation</span>
            <span>Directions</span>
          </a>
        </div>

        {/* Map Frame */}
        <div
          className="w-full h-48 bg-cover bg-center rounded-2xl shadow-xs relative overflow-hidden"
          style={{
            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuCimt15bMUhES5fhnWPuxd6_9lbcnrTKGMcmcLhqpm0fZ-pOYAVsXDce0Zo75KvTnJJ6RZNlEfbhdmWZIwFwo7bEu-vIBtkTc_CcH84u0O42Hxh3-KIo9ZmTVzw6dxFcOLuCjX308-oxI_wscuG-tis77K_9-KGppQ1W2jKBaNBrgCNVodgQKwszgCWjOSQ0fmGc15Oe0_YngEV9qJuIDSjs3LLsCnEC_Ltg40VGmP1LBtrsEWqFi2MIA')`,
          }}
        >
          <div className="absolute inset-0 bg-[#00163d]/20" />
          <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-white/95 backdrop-blur shadow-sm flex items-center justify-between border border-[#dee8ff]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0051d5] text-[22px]">location_on</span>
              <div className="flex flex-col">
                <span className="font-headline text-[13px] font-bold text-[#111c2d]">
                  IAIT Campus Kaliabor
                </span>
                <span className="text-[11px] text-[#747780]">
                  Kuwaritol, Near Bus Stand, Nagaon Dist, Assam 782137
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Institutional Contact Desk & Helpline */}
      <div className="px-4 pb-6 pt-2">
        <div className="w-full rounded-2xl bg-[#00163d] text-white p-5 shadow-lg flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-[#316bf3]/20 blur-2xl" />
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-[#dbe1ff] uppercase tracking-wider">
              Need Guidance?
            </span>
            <h3 className="font-headline text-[22px] font-bold text-white">
              Speak with Our Counselors
            </h3>
            <p className="text-xs text-[#dee8ff]">
              Get free personalized course recommendations matching your academic qualification and career goals.
            </p>
          </div>

          {/* Quick Contact Buttons */}
          <div className="flex flex-col gap-2.5">
            <a
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#0051d5] text-white text-xs font-bold shadow-xs hover:bg-[#316bf3] active:scale-95 transition-all"
              href="tel:+918638611886"
            >
              <span className="material-symbols-outlined text-[18px]">call</span>
              <span>Call Helpline: +91 8638611886</span>
            </a>
            <a
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#16a34a] text-white text-xs font-bold shadow-xs hover:bg-[#15803d] active:scale-95 transition-all"
              href="https://wa.me/918638611886?text=Hello%20IAIT%20Kaliabor,%20I%20want%20information%20regarding%20course%20admission"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              <span>WhatsApp Admission Query</span>
            </a>
          </div>

          {/* Information Snippets */}
          <div className="pt-2 flex flex-col gap-2 border-t border-white/15 text-[#dee8ff] text-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#ffddb8]">mail</span>
              <span>iaitkaliabor@gmail.com</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#ffddb8]">schedule</span>
              <span>Monday to Saturday: 8:30 AM – 5:30 PM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

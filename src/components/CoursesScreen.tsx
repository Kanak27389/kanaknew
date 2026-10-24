import React, { useState } from 'react';
import { COURSES_DATA, BATCH_TIMINGS } from '../data/coursesData';
import { Course } from '../types';

interface CoursesScreenProps {
  onSelectCourseForAdmission: (courseCode: string) => void;
  onOpenSyllabusModal: (course: Course) => void;
}

export const CoursesScreen: React.FC<CoursesScreenProps> = ({
  onSelectCourseForAdmission,
  onOpenSyllabusModal,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredCourses = activeCategory === 'all'
    ? COURSES_DATA
    : COURSES_DATA.filter((c) => c.category === activeCategory);

  const triggerToast = (courseName: string) => {
    setToastMessage(`${courseName} Syllabus & Curriculum Details`);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleSyllabusClick = (course: Course) => {
    triggerToast(course.title);
    onOpenSyllabusModal(course);
  };

  return (
    <div className="flex flex-col w-full pb-24">
      {/* Top Banner / Informational Teaser */}
      <div className="px-4 sm:px-6 lg:px-8 py-3 bg-[#e7eeff] flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#0051d5] text-white flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
          </div>
          <div className="flex flex-col truncate">
            <span className="font-headline text-[13px] leading-tight text-[#00163d] font-bold truncate">
              Govt. Recognised Certifications
            </span>
            <span className="text-[11px] text-[#44464f] truncate">
              Assam Skill Mission & National IT Standards Aligned
            </span>
          </div>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-[#ffddb8] text-[#2a1700] text-[10px] shrink-0 font-bold">
          2025-26
        </span>
      </div>

      {/* Page Introduction & Academic Highlights Bento Strip */}
      <div className="px-4 sm:px-6 lg:px-8 pt-5 pb-2 flex flex-col gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-[#0051d5] text-[11px] font-bold tracking-wider mb-1">
            <span className="material-symbols-outlined text-[14px]">auto_stories</span>
            <span>ACADEMIC CURRICULUM</span>
          </div>
          <h1 className="font-headline text-[26px] sm:text-[32px] text-[#00163d] font-extrabold leading-tight">
            Vocational IT & Professional Programs
          </h1>
          <p className="text-xs sm:text-sm text-[#44464f] mt-1 leading-relaxed max-w-3xl">
            Explore certified diploma and specialized computer courses curated for regional competitive exams, corporate office roles, and high-demand tech careers in Kaliabor & beyond.
          </p>
        </div>

        {/* Quick Stats Cards (2-column on mobile, 4-column on desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
          <div className="p-3 bg-[#f0f3ff] rounded-xl flex items-center gap-2.5 shadow-xs border border-[#dee8ff]">
            <div className="w-9 h-9 rounded-lg bg-[#dee8ff] text-[#0051d5] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">schedule</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-headline text-[13px] text-[#00163d] font-bold">
                Flexible Batches
              </span>
              <span className="text-[11px] text-[#44464f] leading-tight">
                Morning, Eve & Wknd
              </span>
            </div>
          </div>
          <div className="p-3 bg-[#f0f3ff] rounded-xl flex items-center gap-2.5 shadow-xs border border-[#dee8ff]">
            <div className="w-9 h-9 rounded-lg bg-[#ffddb8] text-[#2a1700] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">workspace_premium</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-headline text-[13px] text-[#00163d] font-bold">
                100% Practical
              </span>
              <span className="text-[11px] text-[#44464f] leading-tight">
                1:1 Dedicated PC Lab
              </span>
            </div>
          </div>
          <div className="p-3 bg-[#f0f3ff] rounded-xl flex items-center gap-2.5 shadow-xs border border-[#dee8ff]">
            <div className="w-9 h-9 rounded-lg bg-[#dee8ff] text-[#00163d] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">assured_workload</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-headline text-[13px] text-[#00163d] font-bold">
                ISO Certified
              </span>
              <span className="text-[11px] text-[#44464f] leading-tight">
                ISO 9001:2015 Node
              </span>
            </div>
          </div>
          <div className="p-3 bg-[#f0f3ff] rounded-xl flex items-center gap-2.5 shadow-xs border border-[#dee8ff]">
            <div className="w-9 h-9 rounded-lg bg-[#d1fae5] text-[#047857] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">support_agent</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-headline text-[13px] text-[#00163d] font-bold">
                Counseling
              </span>
              <span className="text-[11px] text-[#44464f] leading-tight">
                Free Career Guidance
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs (Horizontal Scrollable) */}
      <div className="sticky top-32 sm:top-[132px] z-30 bg-[#f9f9ff]/95 backdrop-blur-md py-2.5 px-4 sm:px-6 lg:px-8 shadow-[0_4px_12px_rgba(15,43,92,0.03)] border-b border-[#dee8ff]/50">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-[#00163d] text-white shadow-xs'
                : 'bg-[#e7eeff] text-[#44464f] hover:text-[#00163d]'
            }`}
            onClick={() => setActiveCategory('all')}
          >
            <span className="material-symbols-outlined text-[15px]">apps</span>
            <span>All Courses ({COURSES_DATA.length})</span>
          </button>
          <button
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeCategory === 'diploma'
                ? 'bg-[#00163d] text-white shadow-xs'
                : 'bg-[#e7eeff] text-[#44464f] hover:text-[#00163d]'
            }`}
            onClick={() => setActiveCategory('diploma')}
          >
            <span className="material-symbols-outlined text-[15px]">school</span>
            <span>Diplomas (DCA/ADCA/PGDCA)</span>
          </button>
          <button
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeCategory === 'certification'
                ? 'bg-[#00163d] text-white shadow-xs'
                : 'bg-[#e7eeff] text-[#44464f] hover:text-[#00163d]'
            }`}
            onClick={() => setActiveCategory('certification')}
          >
            <span className="material-symbols-outlined text-[15px]">badge</span>
            <span>Certification (BCC/CCC)</span>
          </button>
          <button
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeCategory === 'financial'
                ? 'bg-[#00163d] text-white shadow-xs'
                : 'bg-[#e7eeff] text-[#44464f] hover:text-[#00163d]'
            }`}
            onClick={() => setActiveCategory('financial')}
          >
            <span className="material-symbols-outlined text-[15px]">receipt_long</span>
            <span>Financial IT (Tally)</span>
          </button>
          <button
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeCategory === 'tech'
                ? 'bg-[#00163d] text-white shadow-xs'
                : 'bg-[#e7eeff] text-[#44464f] hover:text-[#00163d]'
            }`}
            onClick={() => setActiveCategory('tech')}
          >
            <span className="material-symbols-outlined text-[15px]">terminal</span>
            <span>Advanced Tech (Python/AI)</span>
          </button>
          <button
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeCategory === 'design'
                ? 'bg-[#00163d] text-white shadow-xs'
                : 'bg-[#e7eeff] text-[#44464f] hover:text-[#00163d]'
            }`}
            onClick={() => setActiveCategory('design')}
          >
            <span className="material-symbols-outlined text-[15px]">palette</span>
            <span>Design (DTP)</span>
          </button>
        </div>
      </div>

      {/* Course Listings Stream - Responsive Grid (1-col mobile, 2-col tablet, 3-col laptop/desktop) */}
      <div className="px-4 sm:px-6 lg:px-8 pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCourses.map((course) => (
          <div
            key={course.id}
            className="w-full bg-white rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative border border-[#dee8ff]"
          >
            {/* Top Color Accent */}
            <div className={`h-1.5 w-full ${course.accentColor}`} />

            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    {course.badge1 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#ffddb8] text-[#2a1700] text-[10px] font-bold">
                        {course.badge1}
                      </span>
                    )}
                    {course.badge2 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#e7eeff] text-[#44464f] text-[10px] font-semibold">
                        {course.badge2}
                      </span>
                    )}
                  </div>
                  <h2 className="font-headline text-[17px] font-bold text-[#00163d]">
                    {course.title}
                  </h2>
                  <span className="text-[12px] text-[#0051d5] font-semibold">
                    Curriculum: {course.curriculum}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#dee8ff] flex items-center justify-center shrink-0 text-[#00163d]">
                  <span className="material-symbols-outlined text-[24px]">
                    {course.icon}
                  </span>
                </div>
              </div>

              {/* Banner Image with Overlay if Present */}
              {course.bannerImg && (
                <div className="relative w-full h-32 rounded-lg overflow-hidden shadow-xs">
                  <img
                    className="w-full h-full object-cover"
                    alt={course.title}
                    src={course.bannerImg}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#00163d]/80 via-transparent to-transparent flex items-end p-2.5">
                    <span className="text-white text-[11px] font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">stars</span>
                      {course.bannerBadge}
                    </span>
                  </div>
                </div>
              )}

              <p className="text-xs text-[#44464f] leading-relaxed">
                {course.description}
              </p>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-2 bg-[#f0f3ff] p-2.5 rounded-lg text-xs border border-[#dee8ff]/60">
                <div className="flex items-center gap-1.5 text-[#111c2d]">
                  <span className="material-symbols-outlined text-[16px] text-[#0051d5]">timelapse</span>
                  <span><strong>Duration:</strong> {course.duration}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#111c2d]">
                  <span className="material-symbols-outlined text-[16px] text-[#0051d5]">school</span>
                  <span><strong>Eligibility:</strong> {course.eligibility}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#111c2d]">
                  <span className="material-symbols-outlined text-[16px] text-[#0051d5]">payments</span>
                  <span><strong>Fee Range:</strong> {course.feeRange}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#111c2d]">
                  <span className="material-symbols-outlined text-[16px] text-[#0051d5]">access_time</span>
                  <span><strong>Slots:</strong> {course.slots}</span>
                </div>
              </div>

              {/* Action Row */}
              <div className="flex items-center gap-2 pt-1 border-t border-[#f0f3ff]">
                <button
                  className="flex-1 h-11 bg-[#00163d] hover:bg-[#0051d5] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98] transition-all cursor-pointer"
                  onClick={() => onSelectCourseForAdmission(course.code)}
                >
                  <span>Apply Now</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
                <button
                  className="px-3.5 h-11 bg-[#dee8ff] hover:bg-[#d8e3fb] text-[#00163d] rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 active:scale-[0.98] transition-all cursor-pointer"
                  onClick={() => handleSyllabusClick(course)}
                >
                  <span className="material-symbols-outlined text-[18px]">download_for_offline</span>
                  <span>Syllabus PDF</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Batch Schedule Quick Summary Card */}
      <div className="px-4 mt-6">
        <div className="bg-[#00163d] text-white rounded-xl p-4 shadow-md flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ffddb8] text-[24px]">calendar_clock</span>
            <div>
              <h3 className="font-headline text-[16px] font-bold">Standard Batch Timings</h3>
              <span className="text-xs text-[#d9e2ff]">
                Choose a slot that aligns with your college or work
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            {BATCH_TIMINGS.map((slot, idx) => (
              <div key={idx} className="bg-[#0f2b5c] p-2.5 rounded-lg flex flex-col border border-white/5">
                <span className="font-bold text-[#ffddb8]">{slot.name}</span>
                <span className="text-[#dee8ff] text-[11px]">{slot.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Institutional Verification Badge Strip */}
      <div className="px-4 mt-4 flex items-center justify-center gap-2 py-3 bg-[#f0f3ff] rounded-xl mx-4 border border-[#dee8ff]">
        <span className="material-symbols-outlined text-[#0051d5] text-[20px]">policy</span>
        <span className="text-xs text-[#44464f] font-medium text-center">
          Original Marksheet & QR-coded Certificate issued upon course completion.
        </span>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 inset-x-4 z-50 bg-[#263143] text-white p-3 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-8 h-8 rounded-full bg-[#0051d5] flex items-center justify-center shrink-0 text-white">
            <span className="material-symbols-outlined text-[18px]">download_done</span>
          </div>
          <div className="flex flex-col min-w-0 flex-1 text-xs">
            <span className="font-bold truncate">{toastMessage}</span>
            <span className="text-[#d8e3fb] text-[11px] truncate">
              Complete curriculum specification initiated.
            </span>
          </div>
        </div>
      )}

      {/* Sticky Floating Counselor Dial Banner */}
      <div className="fixed bottom-16 inset-x-0 z-40 px-3 py-2 bg-white/95 backdrop-blur-md shadow-[0_-4px_16px_rgba(0,22,61,0.08)] border-t border-[#dee8ff]">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#ffddb8] text-[#2a1700] flex items-center justify-center shrink-0 animate-pulse">
              <span className="material-symbols-outlined text-[18px]">support_agent</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] text-[#111c2d] font-bold truncate">
                Confused which course to take?
              </span>
              <span className="text-[10px] text-[#747780] truncate">
                Free Kaliabor Counselor Desk
              </span>
            </div>
          </div>
          <a
            className="shrink-0 px-3 py-1.5 bg-[#00163d] hover:bg-[#0051d5] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs active:scale-95 transition-all"
            href="tel:+918638611886"
          >
            <span className="material-symbols-outlined text-[14px]">call</span>
            <span>8638611886</span>
          </a>
        </div>
      </div>
    </div>
  );
};

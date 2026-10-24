import React from 'react';
import { Course } from '../types';

interface SyllabusModalProps {
  course: Course | null;
  onClose: () => void;
  onApply: (courseId: string) => void;
}

export const SyllabusModal: React.FC<SyllabusModalProps> = ({ course, onClose, onApply }) => {
  if (!course) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[#ffffff] p-5 flex flex-col gap-4 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#dee8ff] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0f2b5c] text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">{course.icon}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#0051d5] font-bold uppercase tracking-wider">
                Official Curriculum Syllabus
              </span>
              <h3 className="font-headline text-[17px] font-bold text-[#00163d]">
                {course.title}
              </h3>
            </div>
          </div>
          <button
            className="w-8 h-8 rounded-full bg-[#f0f3ff] hover:bg-[#dee8ff] flex items-center justify-center text-[#44464f] hover:text-[#111c2d] transition-colors cursor-pointer shrink-0"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Quick Meta */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-[#f0f3ff] p-3 rounded-xl">
          <div>
            <span className="text-[#747780]">Duration: </span>
            <strong className="text-[#00163d]">{course.duration}</strong>
          </div>
          <div>
            <span className="text-[#747780]">Eligibility: </span>
            <strong className="text-[#00163d]">{course.eligibility}</strong>
          </div>
          <div>
            <span className="text-[#747780]">Fee Range: </span>
            <strong className="text-[#0051d5]">{course.feeRange}</strong>
          </div>
          <div>
            <span className="text-[#747780]">Batches: </span>
            <strong className="text-[#00163d]">{course.slots}</strong>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-[#44464f] leading-relaxed">
          {course.description}
        </p>

        {/* Syllabus Highlights Breakdown */}
        <div className="flex flex-col gap-2">
          <h4 className="font-headline text-[13px] font-bold text-[#00163d] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-[#0051d5]">menu_book</span>
            Module Breakdown & Practical Drills
          </h4>
          <div className="space-y-1.5">
            {course.syllabusHighlights.map((mod, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2 rounded-lg bg-[#f0f3ff] text-xs text-[#111c2d]"
              >
                <span className="w-5 h-5 rounded-full bg-[#dee8ff] text-[#0051d5] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-snug">{mod}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Certification Details */}
        <div className="p-3 rounded-xl bg-[#ffddb8]/30 border border-[#ffddb8] flex items-center gap-2.5">
          <span className="material-symbols-outlined text-[#cf8400] text-[22px]">verified</span>
          <div className="flex flex-col text-xs">
            <span className="font-bold text-[#2a1700]">Govt. Job & Private Sector Recognized</span>
            <span className="text-[#653e00]">
              Original ISO 9001:2015 Certificate & Marksheet with QR verification awarded upon passing the end-term practical lab exam.
            </span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#dee8ff]">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-3 rounded-xl bg-[#dee8ff] hover:bg-[#d8e3fb] text-[#00163d] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">print</span>
            <span>Print Syllabus PDF</span>
          </button>
          <button
            onClick={() => {
              onClose();
              onApply(course.code);
            }}
            className="flex-1 py-2.5 px-3 rounded-xl bg-[#0051d5] hover:bg-[#316bf3] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <span>Apply For {course.code}</span>
            <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};

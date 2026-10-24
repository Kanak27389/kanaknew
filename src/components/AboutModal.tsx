import React from 'react';
import { IaitLogo } from './IaitLogo';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToCourses: () => void;
  onNavigateToAdmission: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  onNavigateToCourses,
  onNavigateToAdmission,
}) => {
  if (!isOpen) return null;

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
        <div className="flex items-start justify-between border-b border-[#dee8ff] pb-3">
          <div className="flex items-center gap-2.5">
            <IaitLogo size="md" />
            <div>
              <h3 className="font-brand text-[15px] sm:text-[17px] font-extrabold text-[#00163d] leading-tight">
                Icon Academy of Information Technology
              </h3>
              <span className="text-[11px] text-[#0051d5] font-bold uppercase tracking-wider">
                Kaliabor, Assam • Govt. Certified IT Education
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f0f3ff] hover:bg-[#dee8ff] flex items-center justify-center text-[#44464f] hover:text-[#111c2d] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Hero image of academy */}
        <div className="w-full h-36 rounded-xl overflow-hidden relative shadow-sm">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBf8lRrUU8N0ics6ZT8ei3Ngy3UX70JdBPs8QTgCe0CyL2BxJs80gO9P7kPd-QUgxb1JAvgTvF1tgAQyQhKqslxU7rz88Dk3h2a98VbHA6PO73vPKFarHcYGVpL2sSOH6cJphFK3hKzcfk8sFS1-I7Fcum2coMyEflqzpVvR7i6HydYBUoSJPbElRL7IuLvYgOxfI7o7JonsJ4VwHghbwWoaNZFDPyNPKn86_I4ibw5QQYfmlg4A6qpjw"
            alt="IAIT Kaliabor Computer Laboratory"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#00163d]/80 via-transparent to-transparent flex items-end p-3">
            <span className="text-white text-xs font-semibold">
              State-of-the-Art Technical Campus • Kaliabor, Nagaon
            </span>
          </div>
        </div>

        {/* About Content */}
        <div className="space-y-2.5 text-xs text-[#44464f] leading-relaxed">
          <p>
            <strong>Icon Academy of Information Technology (IAIT)</strong> is a premier Govt. Registered and ISO 9001:2015 Certified computer training institution located at Kaliabor (Kuwaritol), Nagaon District, Assam.
          </p>
          <p>
            Established with a vision to eliminate the digital divide in regional and rural Assam, IAIT has successfully graduated over <strong>5,000+ students</strong> who now work across Assam State Government departments, regional banking networks, IT development firms, and corporate commerce hubs.
          </p>
        </div>

        {/* Pillars */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 bg-[#f0f3ff] rounded-xl flex items-start gap-2">
            <span className="material-symbols-outlined text-[#0051d5] text-[18px]">verified_user</span>
            <div>
              <strong className="block text-[#00163d]">Govt. Certified</strong>
              <span className="text-[11px] text-[#747780]">Valid for Central & State employment</span>
            </div>
          </div>
          <div className="p-2.5 bg-[#f0f3ff] rounded-xl flex items-start gap-2">
            <span className="material-symbols-outlined text-[#0051d5] text-[18px]">translate</span>
            <div>
              <strong className="block text-[#00163d]">Bilingual Classes</strong>
              <span className="text-[11px] text-[#747780]">Assamese and English instructions</span>
            </div>
          </div>
          <div className="p-2.5 bg-[#f0f3ff] rounded-xl flex items-start gap-2">
            <span className="material-symbols-outlined text-[#0051d5] text-[18px]">devices</span>
            <div>
              <strong className="block text-[#00163d]">1:1 Dedicated PC</strong>
              <span className="text-[11px] text-[#747780]">No sharing systems in practical lab</span>
            </div>
          </div>
          <div className="p-2.5 bg-[#f0f3ff] rounded-xl flex items-start gap-2">
            <span className="material-symbols-outlined text-[#0051d5] text-[18px]">electric_bolt</span>
            <div>
              <strong className="block text-[#00163d]">100% Power Backup</strong>
              <span className="text-[11px] text-[#747780]">5kVA online UPS uninterrupted lab</span>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#dee8ff]">
          <button
            onClick={() => {
              onClose();
              onNavigateToCourses();
            }}
            className="flex-1 py-2.5 px-3 rounded-xl bg-[#dee8ff] hover:bg-[#d8e3fb] text-[#00163d] text-xs font-bold text-center transition-all cursor-pointer"
          >
            Explore Courses
          </button>
          <button
            onClick={() => {
              onClose();
              onNavigateToAdmission();
            }}
            className="flex-1 py-2.5 px-3 rounded-xl bg-[#0051d5] hover:bg-[#316bf3] text-white text-xs font-bold text-center transition-all shadow-sm cursor-pointer"
          >
            Apply Online
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { TabType } from '../types';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-safe bg-[#ffffff]/98 backdrop-blur-xl shadow-[0_-2px_12px_rgba(15,43,92,0.06)] border-t border-[#8e125b]/20 md:hidden">
      <div className="flex justify-around items-center h-16 px-2 max-w-md mx-auto">
        {/* Home */}
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center min-w-[56px] h-12 gap-0.5 transition-colors cursor-pointer ${
            activeTab === 'home'
              ? 'text-[#8e125b] font-bold'
              : 'text-[#44464f] hover:text-[#8e125b]'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">home</span>
          <span className="text-[11px]">Home</span>
        </button>

        {/* Courses */}
        <button
          onClick={() => setActiveTab('courses')}
          className={`flex flex-col items-center justify-center min-w-[56px] h-12 gap-0.5 transition-colors cursor-pointer ${
            activeTab === 'courses'
              ? 'text-[#8e125b] font-bold'
              : 'text-[#44464f] hover:text-[#8e125b]'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">school</span>
          <span className="text-[11px]">Courses</span>
        </button>

        {/* Admission */}
        <button
          onClick={() => setActiveTab('admission')}
          className={`flex flex-col items-center justify-center min-w-[56px] h-12 gap-0.5 transition-colors relative cursor-pointer ${
            activeTab === 'admission'
              ? 'text-[#8e125b] font-bold'
              : 'text-[#44464f] hover:text-[#8e125b]'
          }`}
        >
          <span className="absolute -top-1 right-2 px-1 py-0.2 bg-[#ffddb8] text-[#2a1700] text-[9px] font-bold rounded-full">
            APPLY
          </span>
          <span className="material-symbols-outlined text-[22px]">edit_note</span>
          <span className="text-[11px]">Admission</span>
        </button>

        {/* Verify */}
        <button
          onClick={() => setActiveTab('verify')}
          className={`flex flex-col items-center justify-center min-w-[56px] h-12 gap-0.5 transition-colors cursor-pointer ${
            activeTab === 'verify'
              ? 'text-[#8e125b] font-bold'
              : 'text-[#44464f] hover:text-[#8e125b]'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">verified</span>
          <span className="text-[11px]">Verify</span>
        </button>

        {/* Contact */}
        <button
          onClick={() => setActiveTab('contact')}
          className={`flex flex-col items-center justify-center min-w-[56px] h-12 gap-0.5 transition-colors cursor-pointer ${
            activeTab === 'contact'
              ? 'text-[#8e125b] font-bold'
              : 'text-[#44464f] hover:text-[#8e125b]'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">contact_phone</span>
          <span className="text-[11px]">Contact</span>
        </button>
      </div>
    </nav>
  );
};

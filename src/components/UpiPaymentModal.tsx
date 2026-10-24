import React, { useState } from 'react';

interface UpiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpiPaymentModal: React.FC<UpiPaymentModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const upiId = 'sanjib.upadhayaya@okaxis';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(upiId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-[#ffffff] p-5 flex flex-col gap-4 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#f0f3ff] hover:bg-[#dee8ff] flex items-center justify-center text-[#44464f] hover:text-[#111c2d] transition-colors cursor-pointer"
          onClick={onClose}
          type="button"
          aria-label="Close Modal"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#0051d5] text-white flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
          </div>
          <div className="flex flex-col">
            <h4 className="font-headline text-[16px] font-bold text-[#111c2d]">
              Official Fee Portal
            </h4>
            <span className="text-[10px] text-[#747780] font-bold uppercase tracking-wider">
              IAIT Kaliabor Official Account
            </span>
          </div>
        </div>

        {/* Bharat UPI QR Presentation */}
        <div className="p-4 rounded-xl bg-[#f0f3ff] flex flex-col items-center justify-center text-center gap-3">
          <div className="w-48 h-48 bg-[#ffffff] p-2 rounded-xl shadow-inner flex items-center justify-center border border-[#dee8ff]">
            <img
              src="/admission_qr.svg"
              alt="IAIT Official Google Pay UPI QR Code"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center justify-center gap-1.5">
              <span className="font-headline text-[14px] font-bold text-[#111c2d]">
                UPI ID: {upiId}
              </span>
              <button
                onClick={copyToClipboard}
                className="text-xs px-2 py-0.5 rounded bg-[#dee8ff] hover:bg-[#d8e3fb] text-[#0051d5] font-bold cursor-pointer transition-colors"
                title="Copy UPI ID"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <span className="text-[12px] text-[#44464f]">
              Merchant: <strong className="text-[#00163d]">Icon Academy of Information Technology</strong>
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <a
            className="w-full py-2.5 px-4 rounded-xl bg-[#0051d5] text-white text-xs font-bold text-center hover:bg-[#316bf3] active:scale-98 transition-all shadow-sm"
            href={`upi://pay?pa=${upiId}&pn=Icon%20Academy%20of%20IT`}
          >
            Open in PhonePe / GPay / Paytm
          </a>
          <a
            className="w-full py-2.5 px-4 rounded-xl bg-[#dee8ff] text-[#00163d] text-xs font-bold text-center flex items-center justify-center gap-1.5 hover:bg-[#d8e3fb] active:scale-98 transition-all"
            href="https://wa.me/918638611886?text=Here%20is%20my%20course%20fee%20payment%20screenshot%20for%20IAIT%20Kaliabor"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="material-symbols-outlined text-[16px] text-[#15803d]">upload_file</span>
            <span>Send Receipt on WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';

interface PaymentQrCodeProps {
  amount?: number;
  upiId?: string;
  merchantName?: string;
  note?: string;
  className?: string;
}

export const PaymentQrCode: React.FC<PaymentQrCodeProps> = ({
  amount = 500,
  upiId = 'sanjib.upadhayaya@okaxis',
  merchantName = 'Icon Academy of Information Technology',
  note = 'IAIT Admission Fee',
  className = '',
}) => {
  const [isZoomed, setIsZoomed] = useState(false);

  // Official UPI intent URI
  const upiIntent = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
    merchantName
  )}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

  return (
    <div className={`flex flex-col items-center gap-3 w-full ${className}`}>
      {/* QR Code Frame */}
      <div className="relative p-3.5 bg-white rounded-2xl shadow-sm border-2 border-[#dee8ff] hover:border-[#0051d5] transition-all group flex flex-col items-center">
        {/* Scanner Corner Guides */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#0051d5] rounded-tl" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#0051d5] rounded-tr" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#0051d5] rounded-bl" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#0051d5] rounded-br" />

        {/* Clickable QR Area */}
        <div
          onClick={() => setIsZoomed(true)}
          className="w-56 h-56 max-w-full bg-white rounded-xl p-1 flex items-center justify-center cursor-pointer relative overflow-hidden"
          title="Click to Enlarge QR Code"
        >
          <img
            src="/admission_qr.svg"
            alt="Official Admission Payment QR Code - GPay UPI"
            className="w-full h-full object-contain"
          />

          {/* Hover Overlay Hint */}
          <div className="absolute inset-0 bg-[#00163d]/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="px-2.5 py-1 rounded-full bg-[#00163d]/85 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm backdrop-blur-xs">
              <span className="material-symbols-outlined text-[14px]">zoom_in</span>
              Enlarge QR
            </span>
          </div>
        </div>

        {/* Live Terminal Active Indicator */}
        <div className="mt-2 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-bold text-[#00163d]">
            GPay Verified UPI Terminal Active
          </span>
        </div>
      </div>

      {/* Quick Direct Pay CTA */}
      <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
        <a
          href={upiIntent}
          className="w-full py-2.5 px-4 rounded-xl bg-[#0051d5] hover:bg-[#316bf3] text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[17px]">touch_app</span>
          <span>Tap to Pay ₹{amount} with UPI App</span>
        </a>
        <a
          href="/admission_qr.svg"
          download="IAIT_Admission_Payment_QR.svg"
          className="w-full sm:w-auto shrink-0 py-2.5 px-3 rounded-xl bg-[#dee8ff] hover:bg-[#d8e3fb] text-[#00163d] text-xs font-bold text-center flex items-center justify-center gap-1 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">download</span>
          <span>Save QR</span>
        </a>
      </div>

      {/* Modal for Zoomed View */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsZoomed(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-6 flex flex-col items-center gap-4 shadow-2xl relative border-2 border-[#dee8ff]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsZoomed(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#f0f3ff] hover:bg-[#dee8ff] flex items-center justify-center text-[#44464f] hover:text-[#111c2d] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>

            <div className="flex flex-col items-center text-center">
              <span className="text-[10px] text-[#0051d5] font-bold uppercase tracking-wider">
                Official Admission Desk QR
              </span>
              <h3 className="font-headline text-[16px] font-bold text-[#00163d]">
                Scan & Pay ₹{amount}
              </h3>
              <span className="text-xs text-[#747780]">{merchantName}</span>
            </div>

            <div className="w-64 h-64 bg-white rounded-xl p-2 flex items-center justify-center border border-[#dee8ff] shadow-inner">
              <img
                src="/admission_qr.svg"
                alt="Enlarged Admission Payment QR"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex flex-col items-center text-center gap-1 text-xs">
              <span className="font-mono font-bold text-[#00163d]">UPI ID: {upiId}</span>
              <span className="text-[#44464f] text-[11px]">
                Open GPay, PhonePe, Paytm, BHIM, or your bank app to scan.
              </span>
            </div>

            <a
              href={upiIntent}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0051d5] text-white text-xs font-bold text-center"
            >
              Open in PhonePe / GPay
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

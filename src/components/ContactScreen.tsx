import React, { useState } from 'react';

export const ContactScreen: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    course: 'DCA',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', phone: '', course: 'DCA', message: '' });
    }, 4000);
  };

  return (
    <div className="flex flex-col w-full px-3 sm:px-6 lg:px-8 py-5 space-y-6 max-w-6xl mx-auto pb-24">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#00163d] via-[#0f2b5c] to-[#00163d] text-white p-5 sm:p-7 shadow-md">
        <div className="flex flex-col gap-1.5 max-w-2xl">
          <span className="text-[11px] font-bold text-[#ffddb8] uppercase tracking-wider">
            CAMPUS HELP DESK & ADMISSION COUNSELING
          </span>
          <h1 className="font-headline text-[22px] sm:text-[28px] font-extrabold text-white">
            Connect with IAIT Kaliabor
          </h1>
          <p className="text-xs sm:text-sm text-[#dee8ff] leading-relaxed">
            Have queries about courses, admission fees, eligibility, or batch timings? Visit our campus or reach out directly to our counseling desk in Kaliabor, Nagaon.
          </p>
        </div>
      </div>

      {/* Main Responsive Grid: 2-column on desktop/laptop, 1-column on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left Column: Quick Dial & Campus Location */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Quick Dial Options */}
          <div className="grid grid-cols-2 gap-3">
            <a
              href="tel:+918638611886"
              className="p-3.5 bg-white rounded-xl shadow-xs border border-[#dee8ff] flex items-center gap-3 hover:bg-[#f0f3ff] transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-[#0051d5] text-white flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">call</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-[#00163d]">Call Helpline</span>
                <span className="text-[11px] text-[#44464f] truncate">+91 8638611886</span>
              </div>
            </a>

            <a
              href="https://wa.me/918638611886?text=Hello%20IAIT%20Kaliabor,%20I%20have%20an%20admission%20query"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 bg-white rounded-xl shadow-xs border border-[#dee8ff] flex items-center gap-3 hover:bg-[#f0f3ff] transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-[#16a34a] text-white flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">chat</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-[#00163d]">WhatsApp</span>
                <span className="text-[11px] text-[#15803d] font-semibold truncate">Instant Chat</span>
              </div>
            </a>
          </div>

          {/* Campus Map & Address Card */}
          <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-xs border border-[#dee8ff] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0051d5] text-[20px]">location_on</span>
                <h2 className="font-headline text-[15px] font-bold text-[#00163d]">
                  Campus Physical Location
                </h2>
              </div>
              <a
                href="https://maps.google.com/?q=Kuwaritol,Kaliabor,Nagaon,Assam"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-full bg-[#dee8ff] text-[#00163d] text-[11px] font-bold flex items-center gap-1 hover:bg-[#d8e3fb]"
              >
                <span>Directions</span>
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
            </div>

            <div
              className="w-full h-44 sm:h-52 bg-cover bg-center rounded-xl relative overflow-hidden border border-[#dee8ff]"
              style={{
                backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuCimt15bMUhES5fhnWPuxd6_9lbcnrTKGMcmcLhqpm0fZ-pOYAVsXDce0Zo75KvTnJJ6RZNlEfbhdmWZIwFwo7bEu-vIBtkTc_CcH84u0O42Hxh3-KIo9ZmTVzw6dxFcOLuCjX308-oxI_wscuG-tis77K_9-KGppQ1W2jKBaNBrgCNVodgQKwszgCWjOSQ0fmGc15Oe0_YngEV9qJuIDSjs3LLsCnEC_Ltg40VGmP1LBtrsEWqFi2MIA')`,
              }}
            >
              <div className="absolute inset-0 bg-[#00163d]/15" />
              <div className="absolute bottom-2 left-2 right-2 p-2.5 rounded-lg bg-white/95 backdrop-blur-xs text-xs flex items-center gap-2 border border-[#dee8ff]">
                <span className="material-symbols-outlined text-[#0051d5] text-[18px]">pin_drop</span>
                <div className="flex flex-col">
                  <strong className="text-[#00163d]">Icon Academy of IT (IAIT)</strong>
                  <span className="text-[#44464f] text-[11px]">
                    Kuwaritol, Near Bus Stand, Kaliabor, Nagaon Dist, Assam - 782137
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="p-2.5 bg-[#f0f3ff] rounded-lg">
                <span className="text-[10px] text-[#747780] uppercase block font-bold">Office Hours</span>
                <span className="font-semibold text-[#111c2d]">Mon - Sat: 8:30 AM - 5:30 PM</span>
              </div>
              <div className="p-2.5 bg-[#f0f3ff] rounded-lg">
                <span className="text-[10px] text-[#747780] uppercase block font-bold">Official Email</span>
                <span className="font-semibold text-[#0051d5] truncate block">iaitkaliabor@gmail.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Inquiry Form & FAQs */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Inquiry Form */}
          <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-xs border border-[#dee8ff] flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-1 border-b border-[#dee8ff]">
              <span className="material-symbols-outlined text-[#0051d5] text-[20px]">send</span>
              <h2 className="font-headline text-[16px] font-bold text-[#00163d]">
                Send Admission Inquiry
              </h2>
            </div>

            {submitted ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-center flex flex-col items-center gap-2 border border-emerald-200 animate-in fade-in">
                <span className="material-symbols-outlined text-[32px] text-emerald-600">check_circle</span>
                <strong className="text-sm">Inquiry Received Successfully!</strong>
                <p className="text-xs text-emerald-700">
                  Our Kaliabor academic advisor will contact you within 2 working hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#111c2d]">Your Name <span className="text-red-600">*</span></label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Rahul Das"
                      className="p-2.5 rounded-lg bg-[#f0f3ff] border border-[#dee8ff] text-sm focus:outline-none focus:border-[#0051d5]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-[#111c2d]">Contact Mobile Number <span className="text-red-600">*</span></label>
                    <input
                      required
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. 9864012345"
                      className="p-2.5 rounded-lg bg-[#f0f3ff] border border-[#dee8ff] text-sm focus:outline-none focus:border-[#0051d5]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#111c2d]">Program of Interest</label>
                  <select
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    className="p-2.5 rounded-lg bg-[#f0f3ff] border border-[#dee8ff] text-sm focus:outline-none focus:border-[#0051d5]"
                  >
                    <option value="DCA">DCA (6 Months)</option>
                    <option value="ADCA">ADCA (12 Months)</option>
                    <option value="PGDCA">PGDCA (1 Year)</option>
                    <option value="TALLY">Tally Prime with GST (3 Months)</option>
                    <option value="PYTHON">Python Programming (4 Months)</option>
                    <option value="AI">Artificial Intelligence (6 Months)</option>
                    <option value="CCC">CCC (3 Months)</option>
                    <option value="DTP">DTP Graphic Design (3 Months)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-[#111c2d]">Message / Questions</label>
                  <textarea
                    rows={3}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Ask about batch timings, fees, or course details..."
                    className="p-2.5 rounded-lg bg-[#f0f3ff] border border-[#dee8ff] text-sm focus:outline-none focus:border-[#0051d5]"
                  />
                </div>
                <button
                  type="submit"
                  className="py-3 px-4 rounded-xl bg-[#0051d5] hover:bg-[#316bf3] text-white text-xs font-bold transition-all shadow-xs cursor-pointer mt-1"
                >
                  Submit Inquiry
                </button>
              </form>
            )}
          </div>

          {/* Frequently Asked Questions */}
          <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-xs border border-[#dee8ff] flex flex-col gap-3 text-xs">
            <h3 className="font-headline text-[15px] font-bold text-[#00163d]">
              Frequently Asked Questions
            </h3>
            <div className="space-y-2">
              <div className="p-3 bg-[#f0f3ff] rounded-xl">
                <strong className="text-[#00163d] block">
                  Are IAIT certificates valid for Assam Govt. jobs?
                </strong>
                <span className="text-[#44464f] mt-0.5 block leading-relaxed">
                  Yes, IAIT certifications are Govt. Registered and ISO 9001:2015 accredited, widely accepted across Assam competitive exams (APSC, ADRE, Police, APDCL, District Judiciary) and corporate recruiters.
                </span>
              </div>
              <div className="p-3 bg-[#f0f3ff] rounded-xl">
                <strong className="text-[#00163d] block">
                  Are classes conducted in Assamese as well?
                </strong>
                <span className="text-[#44464f] mt-0.5 block leading-relaxed">
                  Yes, our certified faculty delivers bilingual instruction in Assamese and English, ensuring students clearly grasp practical computing concepts without language barriers.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

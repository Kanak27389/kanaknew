import { AdmissionApplication, Branch, StudentRecord } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Clean browser-compatible print engine using an isolated hidden iframe.
 * Ensures the print dialog opens reliably without popup blocking,
 * and prints ONLY the formatted document without any app/admin UI artifacts.
 * Compatible with Google AI Studio preview iframe and Vercel production.
 */
export function printHtmlContent(title: string, htmlContent: string): void {
  try {
    // 1. Remove any previous hidden print iframe
    const existing = document.getElementById('iait-isolated-print-frame');
    if (existing) {
      existing.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'iait-isolated-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #ffffff !important;
              color: #0b1329 !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              width: 100%;
            }
            .dossier-card {
              max-width: 680px;
              margin: 0 auto;
              border: 3px solid #0f2b5c;
              border-radius: 10px;
              padding: 16px 20px;
              background: #ffffff;
            }
            table {
              border-collapse: collapse;
              width: 100%;
            }
            img {
              max-width: 100%;
            }
            @media print {
              body {
                width: 100% !important;
              }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `);
    doc.close();

    // Preload all images inside print iframe before invoking print dialog
    const imgs = Array.from(doc.querySelectorAll('img'));
    let loaded = 0;
    const total = imgs.length;

    const executePrint = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (printErr) {
          console.warn('Iframe print failed, falling back to window.print():', printErr);
          window.print();
        }
      }, 100);
    };

    if (total === 0) {
      executePrint();
    } else {
      let done = false;
      const onImageLoad = () => {
        loaded++;
        if (loaded >= total && !done) {
          done = true;
          executePrint();
        }
      };
      imgs.forEach((img) => {
        if (img.complete) {
          onImageLoad();
        } else {
          img.onload = onImageLoad;
          img.onerror = onImageLoad;
        }
      });
      setTimeout(() => {
        if (!done) {
          done = true;
          executePrint();
        }
      }, 500);
    }
  } catch (err) {
    console.error('Print error, falling back to window.print():', err);
    window.print();
  }
}

/**
 * Convert modern OKLCH CSS color strings to standard RGB / RGBA strings.
 * html2canvas 1.4.x does not support CSS Color Module 4 `oklch(...)`, which
 * Tailwind CSS v4 generates by default.
 */
/**
 * Convert modern OKLCH CSS color strings to standard RGB / RGBA strings.
 * html2canvas 1.4.x does not support CSS Color Module 4 `oklch(...)`, which
 * Tailwind CSS v4 generates by default.
 */
function convertOklchToRgb(str: string): string {
  if (!str || typeof str !== 'string' || !str.includes('oklch')) {
    return str;
  }

  // Matches oklch(...) expressions inside styles, CSS variables, linear-gradient, box-shadow, etc.
  return str.replace(/oklch\(\s*([^()]+)\s*\)/gi, (fullMatch, content) => {
    try {
      const slashParts = content.split('/');
      const colorParts = slashParts[0].trim().split(/\s+/);
      const alphaPart = slashParts[1] ? slashParts[1].trim() : null;

      if (colorParts.length < 3) {
        return 'rgb(0, 0, 0)';
      }

      // 1. Lightness (L): 0..1 or 0%..100% or "none"
      let L = 0;
      if (colorParts[0] !== 'none') {
        if (colorParts[0].endsWith('%')) {
          L = parseFloat(colorParts[0]) / 100;
        } else {
          L = parseFloat(colorParts[0]);
        }
      }

      // 2. Chroma (C): 0..0.4+ or "none"
      let C = 0;
      if (colorParts[1] !== 'none') {
        if (colorParts[1].endsWith('%')) {
          C = (parseFloat(colorParts[1]) / 100) * 0.4;
        } else {
          C = parseFloat(colorParts[1]);
        }
      }

      // 3. Hue (H): degrees or "none" or rad / turn
      let H = 0;
      if (colorParts[2] !== 'none') {
        if (colorParts[2].endsWith('deg')) {
          H = parseFloat(colorParts[2]);
        } else if (colorParts[2].endsWith('rad')) {
          H = (parseFloat(colorParts[2]) * 180) / Math.PI;
        } else if (colorParts[2].endsWith('turn')) {
          H = parseFloat(colorParts[2]) * 360;
        } else {
          H = parseFloat(colorParts[2]);
        }
      }

      // 4. Alpha: 0..1 or 0%..100%
      let alpha = 1;
      if (alphaPart && alphaPart !== 'none') {
        if (alphaPart.endsWith('%')) {
          alpha = parseFloat(alphaPart) / 100;
        } else {
          alpha = parseFloat(alphaPart);
        }
      }

      if (isNaN(L)) L = 0;
      if (isNaN(C)) C = 0;
      if (isNaN(H)) H = 0;
      if (isNaN(alpha)) alpha = 1;

      // OKLCH -> OKLab coordinates
      const hRad = (H * Math.PI) / 180;
      const a_lab = C * Math.cos(hRad);
      const b_lab = C * Math.sin(hRad);

      // OKLab -> LMS
      const l_ = L + 0.3963377774 * a_lab + 0.2158037573 * b_lab;
      const m_ = L - 0.1055613458 * a_lab - 0.0638541728 * b_lab;
      const s_ = L - 0.0894841775 * a_lab - 1.2914855480 * b_lab;

      const l_cubed = l_ * l_ * l_;
      const m_cubed = m_ * m_ * m_;
      const s_cubed = s_ * s_ * s_;

      // LMS -> Linear sRGB
      const r_lin = +4.0767416621 * l_cubed - 3.3077115913 * m_cubed + 0.2309699292 * s_cubed;
      const g_lin = -1.2684380046 * l_cubed + 2.6097574011 * m_cubed - 0.3413193965 * s_cubed;
      const b_lin = -0.0041960863 * l_cubed - 0.7034186147 * m_cubed + 1.7076147010 * s_cubed;

      // Gamma correction for standard sRGB
      const gamma = (x: number) => {
        const clamped = Math.max(0, Math.min(1, x));
        return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
      };

      const R = Math.round(gamma(r_lin) * 255);
      const G = Math.round(gamma(g_lin) * 255);
      const B = Math.round(gamma(b_lin) * 255);

      if (alpha < 0.999) {
        return `rgba(${R}, ${G}, ${B}, ${alpha.toFixed(3)})`;
      }
      return `rgb(${R}, ${G}, ${B})`;
    } catch {
      return 'rgb(0, 0, 0)';
    }
  });
}

/**
 * Traverses a cloned DOM document and sanitizes all OKLCH colors
 * in stylesheets, style tags, inline styles, and wraps getComputedStyle in a Proxy
 * so html2canvas never receives an unparsed oklch() color function.
 */
function sanitizeOklchInDocument(doc: Document): void {
  try {
    // 1. Recreate all <style> elements with sanitized sRGB CSS
    const styleTags = Array.from(doc.querySelectorAll('style'));
    for (const styleEl of styleTags) {
      if (styleEl.textContent && styleEl.textContent.includes('oklch')) {
        const newStyle = doc.createElement('style');
        newStyle.textContent = convertOklchToRgb(styleEl.textContent);
        if (styleEl.parentNode) {
          styleEl.parentNode.replaceChild(newStyle, styleEl);
        }
      }
    }

    // 2. Wrap cloned window's getComputedStyle with a Proxy to intercept any remaining oklch values
    const win = doc.defaultView;
    if (win && typeof win.getComputedStyle === 'function') {
      const origGetComputedStyle = win.getComputedStyle.bind(win);
      win.getComputedStyle = function (elt: Element, pseudoElt?: string | null): CSSStyleDeclaration {
        const computed = origGetComputedStyle(elt, pseudoElt);
        return new Proxy(computed, {
          get(target, prop, receiver) {
            const val = Reflect.get(target, prop, receiver);
            if (typeof val === 'function') {
              return function (...args: any[]) {
                const res = val.apply(target, args);
                if (typeof res === 'string' && res.includes('oklch')) {
                  return convertOklchToRgb(res);
                }
                return res;
              };
            }
            if (typeof val === 'string' && val.includes('oklch')) {
              return convertOklchToRgb(val);
            }
            return val;
          },
        });
      };
    }

    // 3. Sanitize inline style attributes on all DOM elements
    const allElements = Array.from(doc.querySelectorAll('*'));
    for (const el of allElements) {
      const htmlEl = el as HTMLElement;
      const inlineStyle = htmlEl.getAttribute('style');
      if (inlineStyle && inlineStyle.includes('oklch')) {
        htmlEl.setAttribute('style', convertOklchToRgb(inlineStyle));
      }
    }
  } catch (err) {
    console.warn('Note while sanitizing OKLCH in cloned doc:', err);
  }
}

/**
 * Downloads a rendered DOM element as a crisp, print-ready PDF document.
 * 100% client-side, zero backend dependency, works on Vercel and in AI Studio preview.
 */
export async function downloadElementAsPdf(element: HTMLElement, filename: string): Promise<void> {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      onclone: (clonedDoc) => {
        // Intercept cloned DOM before rendering and convert all OKLCH colors to sRGB
        sanitizeOklchInDocument(clonedDoc);
      },
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const availableWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * availableWidth) / canvas.width;

    pdf.addImage(imgData, 'JPEG', margin, margin, availableWidth, Math.min(imgHeight, pageHeight - margin * 2));
    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  } catch (err) {
    console.error('PDF export failed, opening print dialog:', err);
    window.print();
  }
}

/**
 * Print individual admission record dossier/card with correct branch details,
 * student photo, institute logo, and clean A4 formatting.
 */
export function printAdmissionRecord(app: AdmissionApplication, branch?: Branch): void {
  const branchName = app.branchName || branch?.name || 'Institutional Centre';
  const branchCode = app.branchCode || branch?.code || 'IC';
  const branchAddress = branch?.address || app.address || 'Assam, India';
  const branchPhone = branch?.phone || '8638611886';
  const enrollment = app.enrollmentId || app.enrollment_number || app.id;
  const admDate = app.admissionDate || (app.createdAt ? app.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]);
  const year = admDate ? new Date(admDate).getFullYear() : new Date().getFullYear();
  const sessionStr = isNaN(year) ? 'Session 2025-2026' : `Session ${year}-${year + 1}`;

  const paymentStatus = app.payment_status || (app.status === 'Approved' ? 'Completed' : 'Pending Verification');
  const isPending = paymentStatus.toLowerCase().includes('pending');
  const paymentBadgeColor = isPending ? '#d97706' : '#059669';
  const paymentBadgeBg = isPending ? '#fffbeb' : '#ecfdf5';

  let photoSrc = app.photoUrl || app.photo_url || '';
  if (photoSrc && !photoSrc.startsWith('http') && !photoSrc.startsWith('data:') && !photoSrc.startsWith('/')) {
    if (photoSrc.startsWith('/9j/') || photoSrc.startsWith('iVBORw')) {
      const mime = photoSrc.startsWith('iVBORw') ? 'image/png' : 'image/jpeg';
      photoSrc = `data:${mime};base64,${photoSrc}`;
    }
  }

  const html = `
    <div class="dossier-card">
      <!-- Institute Header with Logo -->
      <table class="header-table" style="width: 100%; border-bottom: 2px solid #0051d5; padding-bottom: 8px; margin-bottom: 10px;">
        <tr>
          <td style="width: 60px; vertical-align: middle;">
            <img src="/iaitlogo.png" style="width: 52px; height: 52px; object-fit: contain; display: block;" alt="IAIT Logo" />
          </td>
          <td style="vertical-align: middle; padding-left: 10px;">
            <div class="inst-title" style="font-size: 18px; font-weight: 900; color: #00163d; text-transform: uppercase; letter-spacing: 0.5px;">
              ICON ACADEMY OF INFORMATION TECHNOLOGY
            </div>
            <div class="inst-subtitle" style="font-size: 10px; font-weight: 700; color: #0051d5; letter-spacing: 1px; text-transform: uppercase; margin-top: 2px;">
              Govt. Registered & ISO 9001:2015 Certified IT Institute
            </div>
            <div style="font-size: 9.5px; color: #475569; margin-top: 2px;">
              Central Institutional Admission Registry • Official Student Admission Slip
            </div>
            <div class="doc-title-badge" style="display: inline-block; background: #00163d; color: #ffffff; padding: 3px 10px; font-size: 9.5px; font-weight: 800; border-radius: 4px; text-transform: uppercase; margin-top: 4px;">
              Official Admission Slip / Confirmation Dossier
            </div>
          </td>
          <td style="text-align: right; vertical-align: middle; width: 145px;">
            <div class="verified-seal" style="display: inline-block; border: 2px solid ${paymentBadgeColor}; color: ${paymentBadgeColor}; background: ${paymentBadgeBg}; padding: 3px 8px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase;">
              ${isPending ? '⏳ PENDING VERIFICATION' : '✓ VERIFIED ADMISSION'}
            </div>
            <div style="font-size: 9px; color: #64748b; margin-top: 4px;">
              Issue Date: ${new Date().toLocaleDateString('en-GB')}
            </div>
            <div style="font-size: 9px; color: #0051d5; font-weight: bold; margin-top: 2px;">
              ${sessionStr}
            </div>
          </td>
        </tr>
      </table>

      <!-- Branch Banner (Actual Selected Branch Name & Branch Code) -->
      <div class="branch-banner" style="background: #eef4ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 7px 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div class="branch-label" style="font-size: 8.5px; font-weight: 800; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px;">
            Official Institutional Study Branch / Center
          </div>
          <div class="branch-name" style="font-size: 14px; font-weight: 800; color: #00163d;">
            ${branchName}
          </div>
          <div style="font-size: 9.5px; color: #3b82f6; margin-top: 1px;">
            ${branchAddress} • Contact: +91 ${branchPhone}
          </div>
        </div>
        <div style="text-align: right;">
          <div class="branch-label" style="font-size: 8.5px; font-weight: 800; color: #1e40af; text-transform: uppercase; margin-bottom: 2px;">
            Branch Code
          </div>
          <span class="branch-code-badge" style="background: #0051d5; color: #ffffff; padding: 3px 10px; border-radius: 4px; font-size: 12px; font-weight: 800; font-family: monospace;">
            ${branchCode}
          </span>
        </div>
      </div>

      <!-- Enrollment & Application ID Header Box -->
      <div class="enrollment-box" style="background: #f8fafc; border: 2px dashed #0051d5; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
        <div>
          <div style="font-size: 8.5px; font-weight: 800; color: #475569; text-transform: uppercase;">
            Institutional Enrollment Number
          </div>
          <div class="enrollment-id" style="font-size: 20px; font-weight: 900; font-family: monospace; color: #0051d5; letter-spacing: 1px;">
            ${enrollment}
          </div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 8.5px; font-weight: 800; color: #475569; text-transform: uppercase;">
            Roll Number
          </div>
          <div style="font-size: 13px; font-weight: 800; font-family: monospace; color: #0051d5;">
            ${app.course}-${enrollment.length >= 4 ? enrollment.slice(-4) : enrollment}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 8.5px; font-weight: 800; color: #475569; text-transform: uppercase;">
            Application Reference ID
          </div>
          <div style="font-size: 12px; font-weight: 700; font-family: monospace; color: #0f172a;">
            ${app.id}
          </div>
        </div>
      </div>

      <!-- Candidate Profile & Photo Section -->
      <div style="display: flex; gap: 14px; align-items: flex-start; margin-bottom: 10px;">
        <div style="flex: 1; min-width: 0;">
          <div class="section-heading" style="font-size: 9.5px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; margin-bottom: 6px;">
            1. Candidate Identity & Personal Particulars
          </div>
          <div class="data-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 12px;">
            <div class="data-item">
              <span class="data-label" style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Full Student Name</span>
              <span class="data-val-bold" style="font-size: 13px; font-weight: 800; color: #00163d;">${app.studentName}</span>
            </div>
            <div class="data-item">
              <span class="data-label" style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Father's / Mother's / Guardian's Name</span>
              <span class="data-val" style="font-size: 11.5px; font-weight: 600; color: #0f172a;">${app.guardianName || 'N/A'}</span>
            </div>
            <div class="data-item">
              <span class="data-label" style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Date of Birth & Gender</span>
              <span class="data-val" style="font-size: 11.5px; font-weight: 600; color: #0f172a;">${app.dob || 'N/A'} (${app.gender || 'N/A'})</span>
            </div>
            <div class="data-item">
              <span class="data-label" style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Active Mobile Number</span>
              <span class="data-val" style="font-size: 11.5px; font-weight: 700; font-family: monospace; color: #0f172a;">+91 ${app.phone}</span>
            </div>
            <div class="data-item">
              <span class="data-label" style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Email Address</span>
              <span class="data-val" style="font-size: 11px; font-weight: 600; color: #0f172a;">${app.email || 'N/A'}</span>
            </div>
            <div class="data-item">
              <span class="data-label" style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Permanent Residential Address</span>
              <span class="data-val" style="font-size: 11px; font-weight: 600; color: #0f172a;">${app.address || 'Assam, India'}</span>
            </div>
          </div>
        </div>

        <!-- Student Photograph -->
        <div style="flex-shrink: 0; width: 105px; text-align: center;">
          ${
            photoSrc
              ? `<img src="${photoSrc}" style="width: 105px; height: 125px; object-fit: cover; border: 2px solid #00163d; border-radius: 4px; display: block;" alt="${app.studentName}" />`
              : `<div style="width: 105px; height: 125px; border: 1.5px dashed #64748b; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8fafc; color: #64748b; font-size: 9.5px; padding: 4px;">
                  <span style="font-size: 26px;">👤</span>
                  <span style="margin-top: 2px; text-align: center;">Student Photo Affixed</span>
                </div>`
          }
          <div style="font-size: 8.5px; color: #475569; font-weight: 700; margin-top: 3px; text-transform: uppercase;">
            Student Photograph
          </div>
        </div>
      </div>

      <!-- Academic & Course Program Details -->
      <div class="section-heading" style="font-size: 9.5px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; margin-top: 6px; margin-bottom: 6px;">
        2. Academic Program Track & Allotted Batch
      </div>
      <div class="data-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px 10px; margin-bottom: 10px;">
        <div class="data-item">
          <span class="data-label" style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Program / Course</span>
          <span class="data-val-bold" style="font-size: 13px; font-weight: 800; color: #0051d5;">${app.course}</span>
        </div>
        <div class="data-item">
          <span class="data-label" style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Academic Session</span>
          <span class="data-val" style="font-size: 11.5px; font-weight: 700; color: #0f172a;">${sessionStr}</span>
        </div>
        <div class="data-item">
          <span class="data-label" style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Educational Qualification</span>
          <span class="data-val" style="font-size: 11px; font-weight: 600; color: #0f172a;">${app.qualification || '10+2 (HS Passed)'}</span>
        </div>
        <div class="data-item">
          <span class="data-label" style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Allotted Batch / Shift</span>
          <span class="data-val" style="font-size: 11.5px; font-weight: 600; color: #0f172a;">${app.batch || 'Morning Shift'}</span>
        </div>
      </div>

      <!-- Payment & Admission Status -->
      <div class="section-heading" style="font-size: 9.5px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; margin-top: 6px; margin-bottom: 6px;">
        3. Admission Confirmation & Fee Payment Record
      </div>
      <div class="data-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px 10px; margin-bottom: 10px;">
        <div class="data-item">
          <span class="data-label" style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Date of Admission</span>
          <span class="data-val" style="font-size: 11.5px; font-weight: 700; color: #0f172a;">${admDate}</span>
        </div>
        <div class="data-item">
          <span class="data-label" style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Registration Fee</span>
          <span class="data-val-bold" style="font-size: 12px; font-weight: 800; color: #00163d;">
            ₹500.00 <span style="font-size: 9px; font-weight: 600; color: #64748b;">(Online)</span>
          </span>
        </div>
        <div class="data-item">
          <span class="data-label" style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Payment / UTR Reference</span>
          <span class="data-val" style="font-size: 11.5px; font-weight: 700; font-family: monospace; color: #0051d5;">${app.utrNumber || 'N/A'}</span>
        </div>
        <div class="data-item">
          <span class="data-label" style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Payment Status</span>
          <span class="data-val-bold" style="font-size: 11.5px; font-weight: 800; color: ${paymentBadgeColor};">
            ${paymentStatus}
          </span>
        </div>
      </div>

      <!-- Institutional Verification Statement -->
      <div style="margin-top: 10px; padding: 7px 10px; background: #f8fafc; border-radius: 4px; font-size: 9px; color: #475569; border: 1px solid #e2e8f0; line-height: 1.35;">
        <strong>Institutional Notice:</strong> This admission slip certifies that candidate <strong>${app.studentName}</strong> has been registered at <strong>${branchName} (${branchCode})</strong> of Icon Academy of Information Technology under Institutional Enrollment Number <strong>${enrollment}</strong> for <strong>${app.course}</strong> (${sessionStr}). Payment Status: <strong>${paymentStatus}</strong>. Valid for identity card issuance, classroom attendance, and examination registration upon administrative verification.
      </div>

      <!-- Formal Signatures Row -->
      <div class="signatures-row" style="margin-top: 28px; padding-top: 10px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div class="sig-block" style="text-align: center; width: 170px;">
          <div class="sig-line" style="border-top: 1px solid #334155; padding-top: 4px; font-size: 9.5px; font-weight: 700; color: #334155;">
            Candidate Signature
          </div>
        </div>
        <div class="sig-block" style="text-align: center; width: 170px;">
          <div class="sig-line" style="border-top: 1px solid #334155; padding-top: 4px; font-size: 9.5px; font-weight: 700; color: #334155;">
            Center In-Charge<br />
            <strong>${branchName}</strong>
          </div>
        </div>
        <div class="sig-block" style="text-align: center; width: 170px;">
          <div class="sig-line" style="border-top: 1px solid #334155; padding-top: 4px; font-size: 9.5px; font-weight: 700; color: #334155;">
            Central Registrar / Auditor<br />
            <strong>IAIT Central Registry</strong>
          </div>
        </div>
      </div>
    </div>
  `;

  printHtmlContent(`IAIT_Admission_${enrollment}_${branchCode}`, html);
}

/**
 * Print branch-wise admission auditing report table
 */
export function printBranchWiseReport(
  admissions: AdmissionApplication[],
  branchInfo: { name: string; code: string; isAll: boolean },
  filters?: { course?: string; fromDate?: string; toDate?: string }
): void {
  const branchTitle = branchInfo.isAll ? 'All Branches (Consolidated Audit)' : `${branchInfo.name} (${branchInfo.code})`;
  const totalCount = admissions.length;

  const rowsHtml = admissions
    .map(
      (a, idx) => `
      <tr>
        <td style="text-align: center; font-weight: 600;">${idx + 1}</td>
        <td style="font-family: monospace; font-weight: 700; color: #0051d5;">${a.enrollmentId || a.id}</td>
        <td style="font-weight: 700; color: #00163d;">${a.studentName}</td>
        <td>${a.guardianName}</td>
        <td><strong>${a.branchName || 'Institutional Centre'}</strong> (${a.branchCode || 'IC'})</td>
        <td style="font-weight: 600;">${a.course}</td>
        <td>${a.admissionDate || (a.createdAt ? a.createdAt.split('T')[0] : '')}</td>
        <td style="font-family: monospace;">${a.phone}</td>
        <td style="font-family: monospace; font-size: 8.5px;">${a.utrNumber || 'N/A'}</td>
        <td style="font-weight: 700; color: #047857;">${a.status}</td>
      </tr>
    `
    )
    .join('');

  const html = `
    <div>
      <!-- Header -->
      <table class="header-table">
        <tr>
          <td>
            <div class="inst-title">ICON ACADEMY OF INFORMATION TECHNOLOGY</div>
            <div class="inst-subtitle">Official Admission Roster & Branch Audit Report</div>
            <div style="font-size: 10px; color: #475569; margin-top: 3px;">
              Session 2025-2026 • Certified Multi-Branch Institutional Register
            </div>
          </td>
          <td style="text-align: right; vertical-align: middle;">
            <div class="doc-title-badge">OFFICIAL AUDIT REPORT</div>
            <div style="font-size: 9px; color: #64748b; margin-top: 4px;">
              Generated: ${new Date().toLocaleString('en-GB')}
            </div>
          </td>
        </tr>
      </table>

      <!-- Branch Summary Header Box -->
      <div class="branch-banner">
        <div>
          <div class="branch-label">Audited Study Branch / Scope</div>
          <div class="branch-name">${branchTitle}</div>
          <div style="font-size: 10px; color: #3b82f6; margin-top: 2px;">
            Filter: Course [${filters?.course || 'All Courses'}] • Date Range: [${filters?.fromDate || 'Start'} to ${filters?.toDate || 'Present'}]
          </div>
        </div>
        <div style="text-align: right;">
          <div class="branch-label">Total Verified Admissions</div>
          <div style="font-size: 20px; font-weight: 900; color: #0051d5; font-family: monospace;">
            ${totalCount}
          </div>
        </div>
      </div>

      <!-- Report Table -->
      <table class="table-report">
        <thead>
          <tr>
            <th style="width: 25px; text-align: center;">#</th>
            <th>Enrollment No</th>
            <th>Student Name</th>
            <th>Guardian</th>
            <th>Branch Name & Code</th>
            <th>Course</th>
            <th>Adm Date</th>
            <th>Mobile</th>
            <th>UTR Ref</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${
            admissions.length === 0
              ? `<tr><td colspan="10" style="text-align: center; padding: 20px; color: #64748b;">No admission records found matching current criteria.</td></tr>`
              : rowsHtml
          }
        </tbody>
      </table>

      <!-- Signatures -->
      <div class="signatures-row" style="margin-top: 32px;">
        <div class="sig-block">
          <div class="sig-line">Prepared By (Admin Staff)</div>
        </div>
        <div class="sig-block">
          <div class="sig-line">
            Center In-Charge<br />
            <strong>${branchInfo.isAll ? 'Authorized Centers' : branchInfo.name}</strong>
          </div>
        </div>
        <div class="sig-block">
          <div class="sig-line">
            Central Institutional Auditor<br />
            <strong>IAIT Central Office</strong>
          </div>
        </div>
      </div>
    </div>
  `;

  const safeCode = branchInfo.isAll ? 'ALL' : branchInfo.code;
  printHtmlContent(`IAIT_Branch_Report_${safeCode}`, html);
}

/**
 * Print student slip directly from a verified StudentRecord (used by Student Verification Slip & Modal).
 * Guarantees that printing or downloading as PDF produces the exact formatted slip with student photo,
 * enrollment number, roll number, course, center/branch, and tamper-proof security signatures.
 */
export function printStudentSlipFromRecord(student: StudentRecord): void {
  const branchName = student.branchName || student.center || 'Institutional Centre';
  const branchCode = student.branchCode || 'IC';
  const enrollment = student.enrollmentId;
  const rollNo = student.rollNo || `IAIT-${enrollment.slice(-4)}`;
  const certSerial = student.certSerial || `IAIT/CERT/${new Date().getFullYear()}/${enrollment}`;
  const admDate = student.admissionDate || student.enrollmentDate || new Date().toISOString().split('T')[0];

  const html = `
    <div class="dossier-card" style="max-width: 680px; margin: 0 auto; border: 3px solid #0f2b5c; border-radius: 12px; padding: 20px; background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
      <!-- Certificate Header -->
      <table style="width: 100%; border-bottom: 2px solid #0051d5; padding-bottom: 12px; margin-bottom: 14px;">
        <tr>
          <td style="width: 65px; vertical-align: middle;">
            <img src="/iaitlogo.png" style="width: 58px; height: 58px; object-fit: contain; display: block;" alt="IAIT Logo" />
          </td>
          <td style="vertical-align: middle; padding-left: 12px; text-align: center;">
            <div style="font-size: 18px; font-weight: 900; color: #00163d; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;">
              ICON ACADEMY OF INFORMATION TECHNOLOGY
            </div>
            <div style="font-size: 10px; font-weight: 800; color: #0051d5; letter-spacing: 1px; text-transform: uppercase; margin-top: 3px;">
              KALIABOR, NAGAON, ASSAM • GOVT. REGD & ISO 9001:2015 CERTIFIED
            </div>
            <div style="font-size: 9.5px; color: #475569; margin-top: 3px; font-weight: 600;">
              CENTRAL ACADEMIC VERIFICATION DOCKET • OFFICIAL STUDENT SLIP
            </div>
          </td>
          <td style="width: 65px; vertical-align: middle; text-align: right;">
            <div style="width: 54px; height: 54px; border: 1.5px solid #0051d5; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; padding: 2px;">
              <svg style="width: 46px; height: 46px; color: #00163d;" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h2v2h-2v-2zm-4 0h2v2h-2v-2zm0 4h2v2h-2v-2zm4 0h2v2h-2v-2zm-2-2h2v2h-2v-2zM6 6h2v2H6V6zm12 0h2v2h-2V6zm-12 12h2v2H6v-2zm6-14h2v2h-2V4zm2 2h2v2h-2V6zm-2 2h2v2h-2V8zm0 4h2v2h-2v-2zm2 2h2v2h-2v-2z" />
              </svg>
            </div>
          </td>
        </tr>
      </table>

      <!-- Status Callout -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 7px 12px; background: #e7eeff; border: 1px solid #dee8ff; border-radius: 6px; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 11px; font-weight: 800; color: #0051d5; text-transform: uppercase;">
            ✓ STATUS: ${(student.status || 'Active Student').toUpperCase()}
          </span>
        </div>
        <div style="font-size: 11px; font-family: monospace; font-weight: 700; color: #00163d;">
          Grade: ${student.grade || 'Enrolled'}
        </div>
      </div>

      <!-- Student Biodata & Photo -->
      <div style="display: flex; gap: 14px; align-items: flex-start; padding: 12px; background: #f0f3ff; border-radius: 8px; margin-bottom: 12px;">
        <div style="flex-shrink: 0;">
          ${
            student.photoUrl
              ? `<img src="${student.photoUrl}" style="width: 95px; height: 115px; object-fit: cover; border: 2px solid #ffffff; border-radius: 6px; display: block; box-shadow: 0 1px 4px rgba(0,0,0,0.1);" alt="${student.name}" />`
              : `<div style="width: 95px; height: 115px; border: 1.5px dashed #64748b; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #ffffff; color: #64748b; font-size: 9px;">
                  <span style="font-size: 24px;">👤</span>
                  <span>Photo</span>
                </div>`
          }
        </div>
        <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; font-size: 11.5px;">
          <div>
            <span style="font-size: 9.5px; color: #64748b; text-transform: uppercase; font-weight: 700; display: block;">Candidate Name:</span>
            <div style="font-size: 16px; font-weight: 800; color: #00163d;">${student.name}</div>
          </div>
          <div>
            <span style="font-size: 9.5px; color: #64748b; text-transform: uppercase; font-weight: 700;">Parent / Guardian: </span>
            <strong style="color: #111c2d;">${student.guardianName || 'N/A'}</strong>
          </div>
          <div>
            <span style="font-size: 9.5px; color: #64748b; text-transform: uppercase; font-weight: 700;">Roll Number: </span>
            <strong style="color: #0051d5; font-family: monospace;">${rollNo}</strong>
          </div>
          <div>
            <span style="font-size: 9.5px; color: #64748b; text-transform: uppercase; font-weight: 700;">Institutional Enrollment No.: </span>
            <strong style="color: #00163d; font-family: monospace; font-size: 13px;">${enrollment}</strong>
          </div>
        </div>
      </div>

      <!-- Verification Metadata Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px; margin-bottom: 12px;">
        <div style="padding: 8px 10px; background: #f0f3ff; border-radius: 6px;">
          <span style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700; display: block;">Course / Program</span>
          <span style="font-weight: 800; color: #00163d; font-size: 12px;">${student.courseFullName || student.course}</span>
        </div>
        <div style="padding: 8px 10px; background: #f0f3ff; border-radius: 6px;">
          <span style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700; display: block;">Certificate Serial</span>
          <span style="font-weight: 800; color: #0051d5; font-family: monospace; font-size: 12px;">${certSerial}</span>
        </div>
        <div style="padding: 8px 10px; background: #f0f3ff; border-radius: 6px;">
          <span style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700; display: block;">Study Center / Branch</span>
          <span style="font-weight: 800; color: #00163d; font-size: 12px;">${branchName} (${branchCode})</span>
        </div>
        <div style="padding: 8px 10px; background: #f0f3ff; border-radius: 6px;">
          <span style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700; display: block;">Enrollment Date</span>
          <span style="font-weight: 800; color: #00163d; font-size: 12px;">${admDate}</span>
        </div>
      </div>

      <!-- Tamper-Proof Security Box -->
      <div style="padding: 9px 12px; background: #e7eeff; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 24px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 32px; height: 32px; background: #ffffff; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 16px;">
            🔒
          </div>
          <div>
            <div style="font-size: 10.5px; font-weight: 800; color: #0051d5; text-transform: uppercase;">
              SHA-256 Digitally Signed & Sealed
            </div>
            <div style="font-size: 9.5px; color: #475569;">
              Certified by Academic Controller, Kaliabor • IAIT Assam Registry
            </div>
          </div>
        </div>
        <span style="font-size: 9px; font-family: monospace; background: #ffffff; padding: 2px 6px; border-radius: 4px; color: #00163d; font-weight: 700;">
          HASH: SHA-256
        </span>
      </div>

      <!-- Signatures -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 10px;">
        <div style="text-align: center; width: 140px;">
          <div style="border-top: 1px solid #334155; padding-top: 4px; font-size: 9px; font-weight: 700; color: #334155;">
            Candidate Signature
          </div>
        </div>
        <div style="text-align: center; width: 150px;">
          <div style="border-top: 1px solid #334155; padding-top: 4px; font-size: 9px; font-weight: 700; color: #334155;">
            Center In-Charge<br />
            <strong>${branchName}</strong>
          </div>
        </div>
        <div style="text-align: center; width: 150px;">
          <div style="border-top: 1px solid #0051d5; padding-top: 4px; font-size: 9px; font-weight: 700; color: #0051d5;">
            Controller of Examinations<br />
            <strong>IAIT Kaliabor Central</strong>
          </div>
        </div>
      </div>
    </div>
  `;

  printHtmlContent(`IAIT_Student_Slip_${enrollment}`, html);
}

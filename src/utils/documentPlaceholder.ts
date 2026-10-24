/**
 * Generates official institutional document placeholder images as high-quality SVGs converted to Data URLs
 * Ensures every document is instantly renderable, previewable, and downloadable by the administrator.
 */
export function createInstitutionalDocumentSvg(
  docType: 'Government ID Proof' | 'Academic Marksheet' | 'Fee Payment Receipt' | 'Document',
  studentName: string,
  docNumber: string,
  course: string
): string {
  const isId = docType.includes('ID');
  const isMarksheet = docType.includes('Marksheet');
  const isReceipt = docType.includes('Receipt');

  const bgColor = isId ? '#0f2b5c' : isMarksheet ? '#14342b' : '#3d1b02';
  const accentColor = isId ? '#0051d5' : isMarksheet ? '#059669' : '#d97706';
  const title = docType.toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1100" viewBox="0 0 800 1100">
    <rect width="100%" height="100%" fill="#f8fafc"/>
    <rect x="25" y="25" width="750" height="1050" rx="16" fill="#ffffff" stroke="${accentColor}" stroke-width="4"/>
    <rect x="35" y="35" width="730" height="100" rx="8" fill="${bgColor}"/>
    
    <text x="400" y="75" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#ffffff" text-anchor="middle">ICON ACADEMY OF INFORMATION TECHNOLOGY</text>
    <text x="400" y="105" font-family="Arial, sans-serif" font-size="14" fill="#cbd5e1" text-anchor="middle">Kaliabor Branch, Nagaon, Assam • Institutional Verification Record</text>
    
    <rect x="60" y="160" width="680" height="45" rx="6" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/>
    <text x="80" y="188" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="${bgColor}">DOCUMENT: ${title}</text>
    <text x="720" y="188" font-family="Arial, sans-serif" font-size="14" fill="#64748b" text-anchor="end">Ref: ${docNumber}</text>

    <!-- Student Details Panel -->
    <rect x="60" y="230" width="680" height="200" rx="8" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>
    <text x="85" y="265" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#475569">STUDENT NAME:</text>
    <text x="240" y="265" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#0f172a">${studentName}</text>

    <text x="85" y="305" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#475569">COURSE / PROGRAM:</text>
    <text x="240" y="305" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="${accentColor}">${course}</text>

    <text x="85" y="345" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#475569">DOCUMENT TYPE:</text>
    <text x="240" y="345" font-family="Arial, sans-serif" font-size="14" fill="#334155">${docType}</text>

    <text x="85" y="385" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#475569">STATUS / INTEGRITY:</text>
    <text x="240" y="385" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#16a34a">✓ VERIFIED & DIGITALLY ARCHIVED</text>

    <!-- Document Specimen Area -->
    <rect x="60" y="460" width="680" height="470" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-dasharray="6 6"/>
    <circle cx="400" cy="650" r="60" fill="${accentColor}" fill-opacity="0.1"/>
    
    <text x="400" y="640" font-family="Arial, sans-serif" font-size="44" fill="${accentColor}" text-anchor="middle">📄</text>
    <text x="400" y="690" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#0f172a" text-anchor="middle">${docType}</text>
    <text x="400" y="720" font-family="Arial, sans-serif" font-size="14" fill="#64748b" text-anchor="middle">Candidate ${studentName} • ${docNumber}</text>
    <text x="400" y="750" font-family="Arial, sans-serif" font-size="13" fill="#94a3b8" text-anchor="middle">Uploaded in Compliance with IAIT Admission Requirements</text>

    <!-- Institutional Footer & Seal -->
    <line x1="60" y1="960" x2="740" y2="960" stroke="#cbd5e1" stroke-width="1"/>
    <text x="60" y="1000" font-family="Arial, sans-serif" font-size="12" fill="#64748b">Verified by Administrator: IAIT Kaliabor Office</text>
    <text x="60" y="1020" font-family="Arial, sans-serif" font-size="11" fill="#94a3b8">Institutional Registrar • Nagaon Assam • Contact: 8638611886</text>
    <text x="740" y="1010" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${bgColor}" text-anchor="end">[OFFICIAL ARCHIVE COPY]</text>
  </svg>`;

  // Convert SVG string to standard base64 data URL so that atob() and binary blobs always work seamlessly
  const base64Svg = typeof window !== 'undefined' ? window.btoa(unescape(encodeURIComponent(svg))) : Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64Svg}`;
}

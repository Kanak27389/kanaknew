# IAIT Google Sheets & Apps Script Setup Guide

This guide describes how to connect the official **Institutional Enrollment Number Generator** to your Google Sheet using Google Apps Script.

---

## 1. How It Works

1. When a candidate submits the Admission form on the IAIT website, the admission data is sent to the Google Apps Script Web App.
2. Google Apps Script acquires an exclusive script lock:
   ```javascript
   LockService.getScriptLock();
   ```
   This guarantees that two candidates submitting at the exact same millisecond never receive the same enrollment number.
3. The script determines the current admission year (e.g., `2026` → `26`).
4. It checks the existing admissions in the sheet for the current year:
   - If no admission exists yet in the new sequence: the serial starts at `1000` (`261000`).
   - If previous admissions exist in the new sequence: it takes `highestExistingSerial + 1`.
   - **Legacy rule**: Any older records (such as `268541`, `268542`) remain untouched in the sheet and are strictly excluded from the sequence calculation.
5. The row is appended to the Google Sheet.
6. The script returns:
   ```json
   {
     "success": true,
     "enrollmentNumber": "261000",
     "admissionYear": 2026,
     "serial": 1000
   }
   ```
7. The website displays:
   ```
   Institutional Enrollment No.: 261000
   ```

---

## 2. Setup Instructions

1. Open your target Google Sheet.
2. In the top menu, go to:
   **Extensions** → **Apps Script**.
3. Delete any default code in `Code.gs` and paste the contents of `google-apps-script/Code.gs`.
4. Click **Save** (floppy disk icon).
5. Click **Deploy** → **New deployment**:
   - Select type: **Web app**.
   - Description: `IAIT Admission & Enrollment Generator`.
   - Execute as: **Me** (`your-account@gmail.com`).
   - Who has access: **Anyone**.
6. Click **Deploy** and authorize permissions when prompted.
7. Copy the **Web App URL** (ends with `/exec`).
8. Add this URL to your website configuration:
   - In `.env`: `VITE_GOOGLE_APPS_SCRIPT_URL="https://script.google.com/macros/s/.../exec"`
   - Or paste it in the browser console / Staff Portal settings under `iait_apps_script_url`.

---

## 3. Sequence Verification

| Applicant | Expected Enrollment Number |
|---|---|
| Applicant 1 | `261000` |
| Applicant 2 | `261001` |
| Applicant 3 | `261002` |
| Applicant 4 | `261003` |
| Applicant 5 | `261004` |

# Vercel Deployment & Supabase Configuration Guide
## Icon Academy of Information Technology (IAIT)

This guide confirms that your website is **100% ready for deployment on Vercel.com** and that your **Supabase PostgreSQL & Cloud Storage connection** is properly integrated.

---

## 1. Quick Verification Summary

| Component | Status | Details |
| :--- | :---: | :--- |
| **Vite Production Build** | ✅ PASS | `npm run build` compiles without errors into `dist/` |
| **TypeScript Typecheck** | ✅ PASS | `tsc --noEmit` validates all components and services with 0 errors |
| **Vercel Routing Config** | ✅ READY | `vercel.json` created with SPA fallback rewrites and asset cache headers |
| **Serverless API Support** | ✅ READY | `api/index.ts` handler provided for Vercel serverless functions |
| **Supabase Client SDK** | ✅ READY | Uses `@supabase/supabase-js` v2 with dynamic reconnection & storage upload |
| **Supabase Database Schema** | ✅ READY | Full schema in `supabase/schema.sql` (admissions, branches, sequences, RPC, RLS) |
| **Storage Bucket** | ✅ READY | Storage bucket `iait-documents` with public read/write/delete policies |
| **Admin Connection Tester** | ✅ READY | In-app live test & credentials manager in Staff Portal Settings tab |

---

## 2. Step-by-Step Vercel Deployment

### Step A: Push to GitHub / Git Provider
Ensure all project files (including `vercel.json`, `package.json`, and `supabase/schema.sql`) are committed and pushed to your repository.

### Step B: Import into Vercel
1. Log in to [vercel.com](https://vercel.com).
2. Click **Add New...** &rarr; **Project**.
3. Select your GitHub repository (`Icon-Academy` / `iait-kaliabor`).
4. Vercel will automatically detect:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Step C: Configure Environment Variables in Vercel
Before clicking **Deploy**, expand the **Environment Variables** section and add the two required keys:

| Key | Value Example | Environments |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `https://your-project-id.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Production, Preview, Development |

> **Important Note:** In Vite applications, environment variables accessed in the browser must have the `VITE_` prefix. After saving or changing these variables in Vercel, always trigger a **Redeploy** so Vite bakes them into the client build.

### Step D: Click Deploy
Vercel will build the project in ~45 seconds and give you a live production URL (e.g. `https://iait-kaliabor.vercel.app`).

---

## 3. Supabase Central Database Setup

If you have not yet run the SQL migration on your Supabase project:

1. Open your Supabase Dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Select your project &rarr; in the left sidebar, click **SQL Editor**.
3. Click **New Query**.
4. Open the file `supabase/schema.sql` from this repository.
5. Copy its entire content and paste it into the Supabase SQL Editor.
6. Click **Run** (green button).

### What this sets up automatically:
- **`public.admissions`**: Authoritative admissions table with enrollment number, branch, bio, fees, payment UTR, and document URLs.
- **`public.branches`**: Multi-branch registry with automatic column synchronization triggers.
- **`public.enrollment_sequences`**: Thread-safe, concurrency-safe atomic enrollment number generation (`YY1000` series).
- **`get_next_enrollment_number`**: PostgreSQL RPC function that prevents duplicate enrollment numbers across simultaneous submissions.
- **`verify_student`**: Secure, privacy-preserving verification RPC function.
- **Row Level Security (RLS)**: Public admission submissions and public certificate verification with authorized access.
- **`storage.buckets` (`iait-documents`)**: Public bucket for student passport photos, ID proofs, marksheets, and payment receipts.

---

## 4. In-App Supabase Connection Tester

You can also test and configure Supabase directly inside the website without redeploying:

1. Open the website and click **Staff Portal** (top right header).
2. Enter passcode: `iait2025` (or click Staff Login).
3. Switch to the **Settings** tab.
4. Scroll to **Supabase PostgreSQL Central Database & Storage**.
5. You can paste your **Project URL** and **Anon API Key**, then click **Test Connection**:
   - Tests Keys format
   - Pings Supabase server
   - Checks `public.admissions` table
   - Checks `public.branches` table
   - Checks `iait-documents` storage bucket
6. Click **Save & Connect** to instantly activate the connection.

---

## 5. Verification Checklist

- [x] Visiting `/` loads the Home Screen with course cards and notice board.
- [x] Student Verification works by entering enrollment numbers (e.g., `241000`).
- [x] Online Admission form submits data and generates sequential enrollment numbers.
- [x] Staff Portal displays submitted applications, branches, and downloadable print slips.

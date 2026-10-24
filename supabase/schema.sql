-- =============================================================================
-- ICON ACADEMY OF INFORMATION TECHNOLOGY (IAIT)
-- CENTRAL POSTGRESQL DATABASE SCHEMA FOR SUPABASE
-- =============================================================================

-- Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. TABLE: public.admissions (Authoritative Admission Registry)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_number TEXT UNIQUE NOT NULL,
  application_number TEXT,
  roll_no TEXT,
  
  -- Branch Information
  branch_id TEXT,
  branch_code TEXT,
  branch_name TEXT,
  
  -- Student Personal Details
  student_name TEXT NOT NULL,
  father_name TEXT,
  mother_name TEXT,
  guardian_name TEXT,
  date_of_birth DATE,
  gender TEXT,
  category TEXT,
  
  -- Contact Information
  phone TEXT NOT NULL,
  alternate_phone TEXT,
  email TEXT,
  
  -- Address Information
  address TEXT,
  village TEXT,
  post_office TEXT,
  police_station TEXT,
  district TEXT,
  state TEXT,
  pincode TEXT,
  
  -- Academic Course & Batch Details
  course TEXT NOT NULL,
  course_code TEXT,
  qualification TEXT,
  batch TEXT,
  session TEXT,
  admission_date DATE,
  registration_date TIMESTAMPTZ DEFAULT now(),
  
  -- Uploaded Documents (Cloud Storage URLs & Original Filenames)
  photo_url TEXT,
  photo_name TEXT,
  id_proof_url TEXT,
  id_proof_name TEXT,
  qualification_certificate_url TEXT,
  marksheet_url TEXT,
  marksheet_name TEXT,
  other_document_url TEXT,
  
  -- Payment Information
  payment_status TEXT DEFAULT 'pending',
  registration_fee NUMERIC(10,2) DEFAULT 500.00,
  payment_method TEXT DEFAULT 'UPI / Online',
  utr_number TEXT,
  payment_date TIMESTAMPTZ,
  payment_receipt_url TEXT,
  receipt_name TEXT,
  
  -- Status & Certification
  application_status TEXT DEFAULT 'submitted',
  certificate_number TEXT,
  certificate_status TEXT,
  remarks TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 2. INDEXES (Optimized for Query, Search & Status Filtering)
-- =============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_admissions_enrollment_number ON public.admissions(enrollment_number);
CREATE INDEX IF NOT EXISTS idx_admissions_application_status ON public.admissions(application_status);
CREATE INDEX IF NOT EXISTS idx_admissions_application_number ON public.admissions(application_number);
CREATE INDEX IF NOT EXISTS idx_admissions_branch_id ON public.admissions(branch_id);
CREATE INDEX IF NOT EXISTS idx_admissions_branch_code ON public.admissions(branch_code);
CREATE INDEX IF NOT EXISTS idx_admissions_phone ON public.admissions(phone);
CREATE INDEX IF NOT EXISTS idx_admissions_course ON public.admissions(course);
CREATE INDEX IF NOT EXISTS idx_admissions_payment_status ON public.admissions(payment_status);
CREATE INDEX IF NOT EXISTS idx_admissions_student_name ON public.admissions(student_name);

-- =============================================================================
-- 3. UPDATED TIMESTAMP TRIGGER
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_admissions_updated_at ON public.admissions;
CREATE TRIGGER set_admissions_updated_at
  BEFORE UPDATE ON public.admissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 4. BRANCHES TABLE (Persistent Multi-Branch Registry)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.branches (
  id TEXT PRIMARY KEY,
  name TEXT,
  branch_name TEXT,
  code TEXT UNIQUE,
  branch_code TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'Active',
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure backwards and forwards compatibility columns exist if table was already created
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS branch_name TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS branch_code TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Sync trigger to keep (name <=> branch_name), (code <=> branch_code), and (status <=> is_active) synchronized
CREATE OR REPLACE FUNCTION public.handle_branches_sync()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Synchronize name and branch_name
  IF NEW.branch_name IS NULL OR NEW.branch_name = '' THEN
    NEW.branch_name := NEW.name;
  END IF;
  IF NEW.name IS NULL OR NEW.name = '' THEN
    NEW.name := NEW.branch_name;
  END IF;

  -- Synchronize code and branch_code
  IF NEW.branch_code IS NULL OR NEW.branch_code = '' THEN
    NEW.branch_code := NEW.code;
  END IF;
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := NEW.branch_code;
  END IF;

  -- Synchronize status and is_active
  IF NEW.is_active IS NULL THEN
    NEW.is_active := (NEW.status = 'Active');
  ELSE
    IF NEW.status IS NULL THEN
      NEW.status := CASE WHEN NEW.is_active THEN 'Active' ELSE 'Inactive' END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_branches_columns ON public.branches;
CREATE TRIGGER sync_branches_columns
  BEFORE INSERT OR UPDATE ON public.branches
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_branches_sync();

DROP TRIGGER IF EXISTS set_branches_updated_at ON public.branches;
CREATE TRIGGER set_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Seed Default Branches if not present
INSERT INTO public.branches (id, name, branch_name, code, branch_code, address, phone, email, status, is_active, is_default)
VALUES 
  ('branch-main', 'Main Branch', 'Main Branch', 'MAIN', 'MAIN', 'Kuwaritol, Kaliabor, Nagaon, Assam - 782137', '8638611886', 'iaitkaliabor@gmail.com', 'Active', true, true),
  ('branch-b01', 'Branch 01', 'Branch 01', 'B01', 'B01', 'Branch 01 Campus, Assam - 782001', '9864011221', 'branch01@iaitassam.in', 'Active', true, false),
  ('branch-b02', 'Branch 02', 'Branch 02', 'B02', 'B02', 'Branch 02 Campus, Assam - 784001', '9864022332', 'branch02@iaitassam.in', 'Active', true, false),
  ('branch-nagaon', 'Nagaon Town Branch', 'Nagaon Town Branch', 'NGN', 'NGN', 'Haiborgaon, Near ASTC Station, Nagaon, Assam - 782002', '9435012399', 'nagaon@iaitassam.in', 'Active', true, false),
  ('branch-tezpur', 'Tezpur City Center', 'Tezpur City Center', 'TEZ', 'TEZ', 'Mission Chariali, Tezpur, Sonitpur, Assam - 784001', '9864210982', 'tezpur@iaitassam.in', 'Active', true, false),
  ('branch-pith01-3101', 'Pithakhowa', 'Pithakhowa', 'PITH01', 'PITH01', 'TEZPUR, Assam', '7002309141', '', 'Active', true, false),
  ('branch-jakhalabandha', 'Jakhalabandha Study Center', 'Jakhalabandha Study Center', 'JKB', 'JKB', 'Main Market, Jakhalabandha, Nagaon, Assam - 782136', '8486950123', 'jakhalabandha@iait.ac.in', 'Active', true, false)
ON CONFLICT (id) DO UPDATE SET
  branch_name = EXCLUDED.branch_name,
  branch_code = EXCLUDED.branch_code,
  is_active = EXCLUDED.is_active;

-- =============================================================================
-- 5. CONCURRENCY-SAFE ENROLLMENT NUMBER GENERATION
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.enrollment_sequences (
  year_prefix TEXT PRIMARY KEY,
  last_serial INT NOT NULL DEFAULT 999,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.get_next_enrollment_number(p_year_prefix text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_serial INT;
  v_prefix TEXT;
  v_max_serial INT;
BEGIN
  v_prefix := TRIM(p_year_prefix);
  IF length(v_prefix) = 0 THEN
    v_prefix := to_char(CURRENT_DATE, 'YY');
  END IF;

  -- Ensure sequence record exists with atomic row locking
  INSERT INTO public.enrollment_sequences (year_prefix, last_serial)
  VALUES (v_prefix, 999)
  ON CONFLICT (year_prefix) DO NOTHING;

  -- Lock sequence row to prevent race conditions across parallel admissions
  SELECT last_serial + 1 INTO v_next_serial
  FROM public.enrollment_sequences
  WHERE year_prefix = v_prefix
  FOR UPDATE;

  -- Cross-check against any existing admissions in public.admissions
  SELECT COALESCE(MAX(
    CASE 
      WHEN length(enrollment_number) = 6 AND enrollment_number ~ ('^' || v_prefix || '[0-9]{4}$')
      THEN substring(enrollment_number from 3 for 4)::INT
      ELSE 0
    END
  ), 0) INTO v_max_serial
  FROM public.admissions
  WHERE enrollment_number LIKE v_prefix || '%';

  IF v_max_serial >= v_next_serial THEN
    v_next_serial := v_max_serial + 1;
  END IF;

  IF v_next_serial < 1000 THEN
    v_next_serial := 1000;
  END IF;

  UPDATE public.enrollment_sequences
  SET last_serial = v_next_serial, updated_at = now()
  WHERE year_prefix = v_prefix;

  RETURN v_prefix || v_next_serial::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_enrollment_number(text) TO anon, authenticated, service_role;

-- =============================================================================
-- 6. SECURE VERIFY STUDENT FUNCTION (RPC)
-- Returns verification-safe information including the student's verified profile photo.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.verify_student(p_enrollment_number text)
RETURNS TABLE (
  enrollment_number text,
  student_name text,
  course text,
  branch_name text,
  branch_code text,
  admission_date date,
  application_status text,
  certificate_number text,
  certificate_status text,
  photo_url text,
  father_name text,
  guardian_name text,
  phone text,
  address text,
  batch text,
  qualification text,
  utr_number text,
  date_of_birth date,
  gender text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.enrollment_number,
    a.student_name,
    a.course,
    COALESCE(a.branch_name, 'Main Branch') AS branch_name,
    COALESCE(a.branch_code, 'MAIN') AS branch_code,
    a.admission_date,
    COALESCE(a.application_status, 'Approved') AS application_status,
    COALESCE(a.certificate_number, '') AS certificate_number,
    COALESCE(a.certificate_status, 'Active') AS certificate_status,
    COALESCE(a.photo_url, '') AS photo_url,
    COALESCE(a.father_name, '') AS father_name,
    COALESCE(a.guardian_name, a.father_name, '') AS guardian_name,
    COALESCE(a.phone, '') AS phone,
    COALESCE(a.address, '') AS address,
    COALESCE(a.batch, '') AS batch,
    COALESCE(a.qualification, '') AS qualification,
    COALESCE(a.utr_number, '') AS utr_number,
    a.date_of_birth,
    COALESCE(a.gender, '') AS gender
  FROM public.admissions a
  WHERE LOWER(TRIM(a.enrollment_number)) = LOWER(TRIM(p_enrollment_number))
     OR REGEXP_REPLACE(LOWER(TRIM(a.enrollment_number)), '[^a-z0-9]', '', 'g') = REGEXP_REPLACE(LOWER(TRIM(p_enrollment_number)), '[^a-z0-9]', '', 'g')
     OR a.enrollment_number ILIKE '%' || p_enrollment_number
     OR p_enrollment_number ILIKE '%' || a.enrollment_number
     OR LOWER(TRIM(COALESCE(a.application_number, ''))) = LOWER(TRIM(p_enrollment_number))
  ORDER BY a.created_at DESC NULLS LAST
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_student(text) TO anon, authenticated, service_role;

-- =============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_sequences ENABLE ROW LEVEL SECURITY;

-- Admissions Policies: Anonymous & Authenticated access
DROP POLICY IF EXISTS "Allow anon insert admissions" ON public.admissions;
CREATE POLICY "Allow anon insert admissions"
  ON public.admissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow select admissions" ON public.admissions;
CREATE POLICY "Allow select admissions"
  ON public.admissions
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow update admissions" ON public.admissions;
CREATE POLICY "Allow update admissions"
  ON public.admissions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete admissions" ON public.admissions;
CREATE POLICY "Allow delete admissions"
  ON public.admissions
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Branches Policies
DROP POLICY IF EXISTS "Allow public read branches" ON public.branches;
CREATE POLICY "Allow public read branches"
  ON public.branches
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow manage branches" ON public.branches;
CREATE POLICY "Allow manage branches"
  ON public.branches
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Enrollment Sequences Policies
DROP POLICY IF EXISTS "Allow read sequences" ON public.enrollment_sequences;
CREATE POLICY "Allow read sequences"
  ON public.enrollment_sequences
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- =============================================================================
-- 8. STORAGE BUCKET FOR DOCUMENTS & ATTACHMENTS
-- =============================================================================
-- Creates the public storage bucket for student documents and receipts
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('iait-documents', 'iait-documents', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
EXCEPTION WHEN OTHERS THEN
  -- Storage bucket can also be created manually via Supabase Dashboard -> Storage
  NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Public document access" ON storage.objects;
  CREATE POLICY "Public document access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'iait-documents');

  DROP POLICY IF EXISTS "Allow upload documents" ON storage.objects;
  CREATE POLICY "Allow upload documents"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'iait-documents');

  DROP POLICY IF EXISTS "Allow update documents" ON storage.objects;
  CREATE POLICY "Allow update documents"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'iait-documents');

  DROP POLICY IF EXISTS "Allow delete documents" ON storage.objects;
  CREATE POLICY "Allow delete documents"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'iait-documents');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;


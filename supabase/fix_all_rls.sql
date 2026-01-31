-- ============================================
-- DROPAM OS - Complete RLS Fix
-- ============================================
-- This script fixes ALL Row Level Security issues
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Ensure RLS is enabled on all tables
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brief_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Drop ALL existing policies to start fresh
-- ============================================

-- Profiles policies
DROP POLICY IF EXISTS "Public profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Pod leads read pod members" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated insert profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

-- Pods policies
DROP POLICY IF EXISTS "Public pods" ON public.pods;
DROP POLICY IF EXISTS "Authenticated read pods" ON public.pods;
DROP POLICY IF EXISTS "Bootstrap or admin insert pods" ON public.pods;
DROP POLICY IF EXISTS "Admin update pods" ON public.pods;
DROP POLICY IF EXISTS "Admin delete pods" ON public.pods;
DROP POLICY IF EXISTS "pods_select_authenticated" ON public.pods;
DROP POLICY IF EXISTS "pods_insert_admin" ON public.pods;
DROP POLICY IF EXISTS "pods_update_admin" ON public.pods;
DROP POLICY IF EXISTS "pods_delete_admin" ON public.pods;

-- Brands policies
DROP POLICY IF EXISTS "Public brands" ON public.brands;
DROP POLICY IF EXISTS "Authenticated read brands" ON public.brands;
DROP POLICY IF EXISTS "Bootstrap or admin insert brands" ON public.brands;
DROP POLICY IF EXISTS "Admin update brands" ON public.brands;
DROP POLICY IF EXISTS "Admin delete brands" ON public.brands;
DROP POLICY IF EXISTS "brands_select_authenticated" ON public.brands;
DROP POLICY IF EXISTS "brands_insert_admin" ON public.brands;
DROP POLICY IF EXISTS "brands_update_admin" ON public.brands;
DROP POLICY IF EXISTS "brands_delete_admin" ON public.brands;

-- Folders policies
DROP POLICY IF EXISTS "Public folders" ON public.folders;
DROP POLICY IF EXISTS "Read folders in pod or admin" ON public.folders;
DROP POLICY IF EXISTS "Bootstrap or pod insert folders" ON public.folders;
DROP POLICY IF EXISTS "Update folders in pod or admin" ON public.folders;
DROP POLICY IF EXISTS "Delete folders in pod or admin" ON public.folders;
DROP POLICY IF EXISTS "folders_select" ON public.folders;
DROP POLICY IF EXISTS "folders_insert" ON public.folders;
DROP POLICY IF EXISTS "folders_update" ON public.folders;
DROP POLICY IF EXISTS "folders_delete" ON public.folders;

-- Briefs policies
DROP POLICY IF EXISTS "Public briefs" ON public.briefs;
DROP POLICY IF EXISTS "Read briefs pod or admin" ON public.briefs;
DROP POLICY IF EXISTS "Clients read own brand briefs" ON public.briefs;
DROP POLICY IF EXISTS "Update briefs pod or admin" ON public.briefs;
DROP POLICY IF EXISTS "Insert briefs" ON public.briefs;
DROP POLICY IF EXISTS "Delete briefs pod or admin" ON public.briefs;
DROP POLICY IF EXISTS "briefs_select" ON public.briefs;
DROP POLICY IF EXISTS "briefs_insert" ON public.briefs;
DROP POLICY IF EXISTS "briefs_update" ON public.briefs;
DROP POLICY IF EXISTS "briefs_delete" ON public.briefs;

-- Brief files policies
DROP POLICY IF EXISTS "Public files" ON public.brief_files;
DROP POLICY IF EXISTS "Read brief files" ON public.brief_files;
DROP POLICY IF EXISTS "Pod members insert brief files" ON public.brief_files;
DROP POLICY IF EXISTS "Pod members update delete brief files" ON public.brief_files;
DROP POLICY IF EXISTS "brief_files_select" ON public.brief_files;
DROP POLICY IF EXISTS "brief_files_insert" ON public.brief_files;
DROP POLICY IF EXISTS "brief_files_update" ON public.brief_files;
DROP POLICY IF EXISTS "brief_files_delete" ON public.brief_files;

-- Messages policies
DROP POLICY IF EXISTS "Public messages" ON public.messages;
DROP POLICY IF EXISTS "Read messages" ON public.messages;
DROP POLICY IF EXISTS "Insert messages" ON public.messages;
DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;

-- ============================================
-- STEP 3: Create SIMPLE, working profiles policies
-- CRITICAL: Avoid circular dependencies at all costs!
-- ============================================

-- SIMPLE POLICY: All authenticated users can read ALL profiles
-- This avoids the circular dependency issue entirely
-- Security note: Profile data (name, email, role, pod) is not sensitive internal info
CREATE POLICY "profiles_select_authenticated"
ON public.profiles FOR SELECT
USING (auth.role() = 'authenticated');

-- Everyone can update their own profile only
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Everyone can insert their own profile (for auto-creation on first login)
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- ============================================
-- STEP 4: Pods policies (simple, authenticated read)
-- ============================================

-- All authenticated users can read pods
CREATE POLICY "pods_select_authenticated"
ON public.pods FOR SELECT
USING (auth.role() = 'authenticated');

-- Admins can insert/update/delete pods
CREATE POLICY "pods_insert_admin"
ON public.pods FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR (SELECT COUNT(*) FROM public.pods) = 0  -- Bootstrap: first pod creation
);

CREATE POLICY "pods_update_admin"
ON public.pods FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "pods_delete_admin"
ON public.pods FOR DELETE
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- STEP 5: Brands policies
-- ============================================

-- All authenticated users can read brands
CREATE POLICY "brands_select_authenticated"
ON public.brands FOR SELECT
USING (auth.role() = 'authenticated');

-- Admins can manage brands
CREATE POLICY "brands_insert_admin"
ON public.brands FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR (SELECT COUNT(*) FROM public.brands) = 0  -- Bootstrap
);

CREATE POLICY "brands_update_admin"
ON public.brands FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "brands_delete_admin"
ON public.brands FOR DELETE
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- STEP 6: Folders policies
-- ============================================

-- Pod members and admins can read folders in their pod
CREATE POLICY "folders_select"
ON public.folders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (p.role = 'admin' OR p.pod_id = folders.pod_id)
  )
);

-- Pod members and admins can manage folders
CREATE POLICY "folders_insert"
ON public.folders FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (p.role = 'admin' OR p.pod_id = folders.pod_id)
  )
);

CREATE POLICY "folders_update"
ON public.folders FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (p.role = 'admin' OR p.pod_id = folders.pod_id)
  )
);

CREATE POLICY "folders_delete"
ON public.folders FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (p.role = 'admin' OR p.pod_id = folders.pod_id)
  )
);

-- ============================================
-- STEP 7: Briefs policies
-- ============================================

-- Pod members and admins can read briefs
CREATE POLICY "briefs_select"
ON public.briefs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (p.role = 'admin' OR p.pod_id = briefs.pod_id)
  )
);

-- Pod members and admins can manage briefs
CREATE POLICY "briefs_insert"
ON public.briefs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (p.role = 'admin' OR p.pod_id = briefs.pod_id)
  )
);

CREATE POLICY "briefs_update"
ON public.briefs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (p.role = 'admin' OR p.pod_id = briefs.pod_id)
  )
);

CREATE POLICY "briefs_delete"
ON public.briefs FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (p.role = 'admin' OR p.pod_id = briefs.pod_id)
  )
);

-- ============================================
-- STEP 8: Brief files policies
-- ============================================

CREATE POLICY "brief_files_select"
ON public.brief_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.briefs b
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE b.id = brief_files.brief_id
    AND (p.role = 'admin' OR p.pod_id = b.pod_id)
  )
);

CREATE POLICY "brief_files_insert"
ON public.brief_files FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.briefs b
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE b.id = brief_files.brief_id
    AND (p.role = 'admin' OR p.pod_id = b.pod_id)
  )
);

CREATE POLICY "brief_files_update"
ON public.brief_files FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.briefs b
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE b.id = brief_files.brief_id
    AND (p.role = 'admin' OR p.pod_id = b.pod_id)
  )
);

CREATE POLICY "brief_files_delete"
ON public.brief_files FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.briefs b
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE b.id = brief_files.brief_id
    AND (p.role = 'admin' OR p.pod_id = b.pod_id)
  )
);

-- ============================================
-- STEP 9: Messages policies
-- ============================================

CREATE POLICY "messages_select"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.briefs b
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE b.id = messages.brief_id
    AND (p.role = 'admin' OR p.pod_id = b.pod_id)
  )
);

CREATE POLICY "messages_insert"
ON public.messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.briefs b
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE b.id = messages.brief_id
    AND (p.role = 'admin' OR p.pod_id = b.pod_id)
  )
);

-- ============================================
-- STEP 10: Create profiles for existing auth users
-- ============================================

INSERT INTO public.profiles (id, email, name, role)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)),
  'pod_member'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 11: Ensure Justin is admin
-- ============================================

UPDATE public.profiles
SET role = 'admin', pod_id = NULL
WHERE email ILIKE '%justin%';

-- ============================================
-- STEP 12: Ensure PODs exist
-- ============================================

INSERT INTO public.pods (name, slug, lead_name) VALUES
  ('POD 1', 'pod-1', 'Taiwo'),
  ('POD 2', 'pod-2', 'Ade'),
  ('POD 3', 'pod-3', 'Bright')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, lead_name = EXCLUDED.lead_name;

-- ============================================
-- STEP 13: Assign team members to pods
-- ============================================

UPDATE public.profiles SET role = 'pod_lead', pod_id = (SELECT id FROM public.pods WHERE slug = 'pod-1') WHERE email ILIKE 'taiwo@disruptdna.com';
UPDATE public.profiles SET role = 'pod_member', pod_id = (SELECT id FROM public.pods WHERE slug = 'pod-1') WHERE email ILIKE 'ubongking@disruptdna.com';
UPDATE public.profiles SET role = 'pod_lead', pod_id = (SELECT id FROM public.pods WHERE slug = 'pod-2') WHERE email ILIKE 'ade@disruptdna.com';
UPDATE public.profiles SET role = 'pod_member', pod_id = (SELECT id FROM public.pods WHERE slug = 'pod-2') WHERE email ILIKE 'esther@disruptdna.com';
UPDATE public.profiles SET role = 'pod_member', pod_id = (SELECT id FROM public.pods WHERE slug = 'pod-2') WHERE email ILIKE 'courage@disruptdna.com';
UPDATE public.profiles SET role = 'pod_lead', pod_id = (SELECT id FROM public.pods WHERE slug = 'pod-3') WHERE email ILIKE 'bright@disruptdna.com';
UPDATE public.profiles SET role = 'pod_member', pod_id = (SELECT id FROM public.pods WHERE slug = 'pod-3') WHERE email ILIKE 'vn@disruptdna.com';

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '=== RLS FIX COMPLETE ===' as status;

SELECT 'Profiles:' as section;
SELECT email, role, (SELECT name FROM public.pods WHERE id = profiles.pod_id) as pod
FROM public.profiles
ORDER BY role, email;

SELECT 'Pods:' as section;
SELECT name, slug FROM public.pods ORDER BY name;

SELECT 'Policy count on profiles:' as section;
SELECT COUNT(*) as policy_count FROM pg_policies WHERE tablename = 'profiles';

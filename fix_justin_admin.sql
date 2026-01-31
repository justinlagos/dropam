-- ============================================
-- FIX: Ensure Justin is admin + RLS policies work
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Check current state (run this first to see what we're dealing with)
SELECT id, email, role, pod_id FROM public.profiles WHERE email ILIKE '%justin%';

-- Step 2: Force Justin to admin role (handles any email variation)
UPDATE public.profiles
SET role = 'admin', pod_id = NULL
WHERE email ILIKE '%justin%';

-- Step 3: If Justin's profile doesn't exist, we need to create it
-- First, get Justin's auth.users id
DO $$
DECLARE
  justin_auth_id uuid;
BEGIN
  -- Find Justin in auth.users
  SELECT id INTO justin_auth_id
  FROM auth.users
  WHERE email ILIKE '%justin%disruptdna%'
  LIMIT 1;

  IF justin_auth_id IS NOT NULL THEN
    -- Upsert profile
    INSERT INTO public.profiles (id, email, name, role, pod_id)
    VALUES (justin_auth_id, 'justin@disruptdna.com', 'Justin', 'admin', NULL)
    ON CONFLICT (id) DO UPDATE SET role = 'admin', pod_id = NULL;

    RAISE NOTICE 'Justin profile updated/created with admin role';
  ELSE
    RAISE NOTICE 'Justin not found in auth.users - they need to sign up first';
  END IF;
END $$;

-- Step 4: Verify the fix
SELECT id, email, role, pod_id FROM public.profiles WHERE email ILIKE '%justin%';

-- Step 5: Ensure RLS is enabled on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brief_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop and recreate the key admin policies to ensure they're correct
DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Bootstrap or admin insert pods" ON public.pods;
DROP POLICY IF EXISTS "Admin update pods" ON public.pods;
DROP POLICY IF EXISTS "Bootstrap or admin insert brands" ON public.brands;
DROP POLICY IF EXISTS "Admin update brands" ON public.brands;

-- Admins can read all profiles
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Admins can insert pods (bootstrap OR admin)
CREATE POLICY "Bootstrap or admin insert pods" ON public.pods FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND (
    (SELECT count(*) FROM public.pods) = 0 OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
);

-- Admins can update pods
CREATE POLICY "Admin update pods" ON public.pods FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Admins can insert brands (bootstrap OR admin)
CREATE POLICY "Bootstrap or admin insert brands" ON public.brands FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND (
    (SELECT count(*) FROM public.brands) = 0 OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
);

-- Admins can update brands
CREATE POLICY "Admin update brands" ON public.brands FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Final verification
SELECT 'DONE - Justin should now be admin' as status;
SELECT email, role, pod_id FROM public.profiles WHERE role = 'admin';

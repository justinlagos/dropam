-- ============================================
-- DROPAM OS - Fix User Access
-- ============================================
-- Run this in Supabase SQL Editor when users
-- see "You don't have access to a POD yet"
-- ============================================

-- DIAGNOSTIC: List all policies on profiles (6 = possible duplicates/conflicts)
SELECT 'Current policies on profiles:' as section;
SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles';

-- OPTIONAL: Clean profiles policies (run if you had 6 policies or RLS errors)
-- Drops ALL policies on profiles, then recreates the 3 correct ones
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- DIAGNOSTIC: See who has no pod assigned (run to understand the issue)
SELECT 'Users without pod assignment:' as section;
SELECT id, email, name, role, pod_id
FROM public.profiles
WHERE pod_id IS NULL AND role IN ('pod_member', 'pod_lead')
ORDER BY email;

-- FIX: Assign all pod_member/pod_lead users without a pod to POD 1
-- (Admins stay with pod_id NULL by design)
UPDATE public.profiles
SET pod_id = (SELECT id FROM public.pods WHERE slug = 'pod-1' LIMIT 1)
WHERE pod_id IS NULL
  AND role IN ('pod_member', 'pod_lead')
  AND EXISTS (SELECT 1 FROM public.pods WHERE slug = 'pod-1');

-- Ensure profiles exist for all auth users (handles new signups before first login)
INSERT INTO public.profiles (id, email, name, role)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)),
  'pod_member'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Assign newly created profiles to pod-1
UPDATE public.profiles
SET pod_id = (SELECT id FROM public.pods WHERE slug = 'pod-1' LIMIT 1)
WHERE pod_id IS NULL
  AND role = 'pod_member'
  AND EXISTS (SELECT 1 FROM public.pods WHERE slug = 'pod-1');

-- VERIFICATION
SELECT '=== FIX COMPLETE ===' as status;
SELECT email, role, (SELECT name FROM public.pods WHERE id = profiles.pod_id) as pod
FROM public.profiles
ORDER BY role NULLS LAST, email;

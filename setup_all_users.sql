-- ============================================
-- COMPLETE USER SETUP FOR DROPAM OS
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Create profiles for ALL users in auth.users who don't have one yet
INSERT INTO public.profiles (id, email, name, role)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)),
  'pod_member'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Ensure PODs exist
INSERT INTO public.pods (name, slug, lead_name) VALUES
  ('POD 1', 'pod-1', 'Taiwo'),
  ('POD 2', 'pod-2', 'Ade'),
  ('POD 3', 'pod-3', 'Bright')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, lead_name = EXCLUDED.lead_name;

-- Step 3: Set up Justin as admin
UPDATE public.profiles
SET role = 'admin', pod_id = NULL
WHERE email ILIKE '%justin%disruptdna%' OR email ILIKE 'mrjustinukaegbu%';

-- Step 4: Assign POD 1 members
UPDATE public.profiles SET
  role = 'pod_lead',
  pod_id = (SELECT id FROM public.pods WHERE slug = 'pod-1')
WHERE email ILIKE 'taiwo@disruptdna.com';

UPDATE public.profiles SET
  role = 'pod_member',
  pod_id = (SELECT id FROM public.pods WHERE slug = 'pod-1')
WHERE email ILIKE 'ubongking@disruptdna.com';

-- Step 5: Assign POD 2 members
UPDATE public.profiles SET
  role = 'pod_lead',
  pod_id = (SELECT id FROM public.pods WHERE slug = 'pod-2')
WHERE email ILIKE 'ade@disruptdna.com';

UPDATE public.profiles SET
  role = 'pod_member',
  pod_id = (SELECT id FROM public.pods WHERE slug = 'pod-2')
WHERE email ILIKE 'esther@disruptdna.com';

UPDATE public.profiles SET
  role = 'pod_member',
  pod_id = (SELECT id FROM public.pods WHERE slug = 'pod-2')
WHERE email ILIKE 'courage@disruptdna.com';

-- Step 6: Assign POD 3 members
UPDATE public.profiles SET
  role = 'pod_lead',
  pod_id = (SELECT id FROM public.pods WHERE slug = 'pod-3')
WHERE email ILIKE 'bright@disruptdna.com';

UPDATE public.profiles SET
  role = 'pod_member',
  pod_id = (SELECT id FROM public.pods WHERE slug = 'pod-3')
WHERE email ILIKE 'vn@disruptdna.com';

-- Step 7: Ensure RLS policies allow profile reads
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Pod leads read pod members" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated insert own profile" ON public.profiles;

CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Pod leads read pod members" ON public.profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles me WHERE me.id = auth.uid() AND me.role = 'pod_lead' AND me.pod_id = profiles.pod_id));

CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Authenticated insert own profile" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Step 8: Ensure pods/brands/folders/briefs RLS allows proper access
DROP POLICY IF EXISTS "Authenticated read pods" ON public.pods;
CREATE POLICY "Authenticated read pods" ON public.pods FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated read brands" ON public.brands;
CREATE POLICY "Authenticated read brands" ON public.brands FOR SELECT
  USING (auth.role() = 'authenticated');

-- Step 9: Show final state
SELECT '=== PROFILES ===' as section;
SELECT email, role,
  (SELECT name FROM public.pods WHERE id = profiles.pod_id) as pod_name
FROM public.profiles
ORDER BY role, email;

SELECT '=== PODS ===' as section;
SELECT name, slug FROM public.pods ORDER BY name;

SELECT '=== BRANDS ===' as section;
SELECT b.name, p.name as pod_name
FROM public.brands b
LEFT JOIN public.pods p ON b.pod_id = p.id
ORDER BY p.name, b.name;

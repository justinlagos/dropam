-- ============================================
-- DROPAM OS - Complete Seed Script
-- ============================================
-- Run this AFTER the base schema is set up
-- This creates the POD structure and assigns users
-- ============================================

-- ============================================
-- 1. REMOVE "TIER" PODS, CREATE CLEAN POD STRUCTURE
-- ============================================

-- First, remove any "Tier" named pods
DELETE FROM public.pods WHERE name ILIKE '%tier%' OR slug ILIKE '%tier%';

-- Create POD 1, POD 2, POD 3
INSERT INTO public.pods (name, slug, lead_name) VALUES
  ('POD 1', 'pod-1', 'Taiwo'),
  ('POD 2', 'pod-2', 'Ade'),
  ('POD 3', 'pod-3', 'Bright')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, lead_name = EXCLUDED.lead_name;

-- ============================================
-- 2. CREATE/UPDATE BRANDS WITH CORRECT POD ASSIGNMENTS
-- ============================================

-- Get POD IDs
DO $$
DECLARE
  pod1_id uuid;
  pod2_id uuid;
  pod3_id uuid;
BEGIN
  SELECT id INTO pod1_id FROM public.pods WHERE slug = 'pod-1';
  SELECT id INTO pod2_id FROM public.pods WHERE slug = 'pod-2';
  SELECT id INTO pod3_id FROM public.pods WHERE slug = 'pod-3';

  -- POD 1 Brands: Access Bank, Nadissa, Learn Africa
  INSERT INTO public.brands (name, slug, pod_id) VALUES
    ('Access Bank', 'access-bank', pod1_id),
    ('Nadissa', 'nadissa', pod1_id),
    ('Learn Africa', 'learn-africa', pod1_id)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, pod_id = EXCLUDED.pod_id;

  -- POD 2 Brands: Sparkle, Cardinal Stone, Insight 360
  INSERT INTO public.brands (name, slug, pod_id) VALUES
    ('Sparkle', 'sparkle', pod2_id),
    ('Cardinal Stone', 'cardinal-stone', pod2_id),
    ('Insight 360', 'insight-360', pod2_id)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, pod_id = EXCLUDED.pod_id;

  -- POD 3 Brands: Visit Nigeria, Lid Store, Laverita, Nadissa (unique slug)
  INSERT INTO public.brands (name, slug, pod_id) VALUES
    ('Visit Nigeria', 'visit-nigeria', pod3_id),
    ('Lid Store', 'lid-store', pod3_id),
    ('Laverita', 'laverita', pod3_id),
    ('Nadissa', 'nadissa-pod3', pod3_id)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, pod_id = EXCLUDED.pod_id;
END $$;

-- ============================================
-- 3. UPDATE USER PROFILES WITH CORRECT ROLES AND POD ASSIGNMENTS
-- ============================================

-- Make Justin admin (do NOT change if already admin)
UPDATE public.profiles
SET role = 'admin'
WHERE email ILIKE '%justin%' AND role != 'admin';

-- POD 2 Members
UPDATE public.profiles SET
  role = 'pod_member',
  pod_id = (SELECT id FROM public.pods WHERE slug = 'pod-2')
WHERE email = 'esther@disruptdna.com';

UPDATE public.profiles SET
  role = 'pod_member',
  pod_id = (SELECT id FROM public.pods WHERE slug = 'pod-2')
WHERE email = 'courage@disruptdna.com';

UPDATE public.profiles SET
  role = 'pod_lead',
  pod_id = (SELECT id FROM public.pods WHERE slug = 'pod-2')
WHERE email = 'ade@disruptdna.com';

-- POD 1 Members
UPDATE public.profiles SET
  role = 'pod_lead',
  pod_id = (SELECT id FROM public.pods WHERE slug = 'pod-1')
WHERE email = 'taiwo@disruptdna.com';

UPDATE public.profiles SET
  role = 'pod_member',
  pod_id = (SELECT id FROM public.pods WHERE slug = 'pod-1')
WHERE email = 'ubongking@disruptdna.com';

-- POD 3 Members
UPDATE public.profiles SET
  role = 'pod_lead',
  pod_id = (SELECT id FROM public.pods WHERE slug = 'pod-3')
WHERE email = 'bright@disruptdna.com';

UPDATE public.profiles SET
  role = 'pod_member',
  pod_id = (SELECT id FROM public.pods WHERE slug = 'pod-3')
WHERE email = 'vn@disruptdna.com';

-- ============================================
-- 4. UPDATE POD LEAD IDs
-- ============================================

UPDATE public.pods SET lead_id = (
  SELECT id FROM public.profiles WHERE email = 'taiwo@disruptdna.com'
) WHERE slug = 'pod-1';

UPDATE public.pods SET lead_id = (
  SELECT id FROM public.profiles WHERE email = 'ade@disruptdna.com'
) WHERE slug = 'pod-2';

UPDATE public.pods SET lead_id = (
  SELECT id FROM public.profiles WHERE email = 'bright@disruptdna.com'
) WHERE slug = 'pod-3';

-- ============================================
-- 5. VERIFY SETUP
-- ============================================

-- Show all pods
SELECT id, name, slug, lead_name FROM public.pods ORDER BY name;

-- Show all brands with their pods
SELECT b.name as brand, b.slug, p.name as pod
FROM public.brands b
LEFT JOIN public.pods p ON b.pod_id = p.id
ORDER BY p.name, b.name;

-- Show all profiles with roles and pods
SELECT
  pr.email,
  pr.role,
  p.name as pod_name
FROM public.profiles pr
LEFT JOIN public.pods p ON pr.pod_id = p.id
ORDER BY p.name, pr.role, pr.email;

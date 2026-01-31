-- ============================================
-- DROPAM OS - Memberships Auth System
-- Migration 002: Proper tenancy model
-- ============================================
-- IMPORTANT: Drop constraint FIRST, then update data
-- ============================================

-- ============================================
-- STEP 1: DROP the old constraint FIRST
-- ============================================

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- ============================================
-- STEP 2: Now update the roles (no constraint blocking)
-- ============================================

UPDATE public.profiles
SET role = 'user'
WHERE role IN ('pod_member', 'pod_lead', 'creative', 'client');

UPDATE public.profiles
SET role = 'admin'
WHERE email ILIKE '%justin%' OR email ILIKE '%admin%';

-- ============================================
-- STEP 3: Add the new constraint
-- ============================================

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'user'));

-- ============================================
-- STEP 4: Create memberships table
-- ============================================

CREATE TABLE IF NOT EXISTS public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pod_id uuid NOT NULL REFERENCES public.pods(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('pod_member', 'pod_lead')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, pod_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_pod_id ON public.memberships(pod_id);

-- ============================================
-- STEP 5: Migrate existing pod assignments
-- ============================================

INSERT INTO public.memberships (user_id, pod_id, role, status)
SELECT
  p.id as user_id,
  p.pod_id,
  'pod_member' as role,
  'active' as status
FROM public.profiles p
WHERE p.pod_id IS NOT NULL
ON CONFLICT (user_id, pod_id) DO NOTHING;

-- ============================================
-- STEP 6: Enable RLS on memberships
-- ============================================

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "memberships_select" ON public.memberships;
DROP POLICY IF EXISTS "memberships_insert" ON public.memberships;
DROP POLICY IF EXISTS "memberships_update" ON public.memberships;
DROP POLICY IF EXISTS "memberships_delete" ON public.memberships;

CREATE POLICY "memberships_select" ON public.memberships FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "memberships_insert" ON public.memberships FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "memberships_update" ON public.memberships FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "memberships_delete" ON public.memberships FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================
-- STEP 7: Update RLS policies for other tables
-- ============================================

DROP POLICY IF EXISTS "folders_select" ON public.folders;
DROP POLICY IF EXISTS "folders_insert" ON public.folders;
DROP POLICY IF EXISTS "folders_update" ON public.folders;
DROP POLICY IF EXISTS "folders_delete" ON public.folders;

CREATE POLICY "folders_select" ON public.folders FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    LEFT JOIN public.memberships m ON m.user_id = p.id AND m.pod_id = folders.pod_id
    WHERE p.id = auth.uid()
    AND (p.role = 'admin' OR m.status = 'active')
  )
);

CREATE POLICY "folders_insert" ON public.folders FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    LEFT JOIN public.memberships m ON m.user_id = p.id AND m.pod_id = folders.pod_id
    WHERE p.id = auth.uid()
    AND (p.role = 'admin' OR m.status = 'active')
  )
);

CREATE POLICY "folders_update" ON public.folders FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    LEFT JOIN public.memberships m ON m.user_id = p.id AND m.pod_id = folders.pod_id
    WHERE p.id = auth.uid()
    AND (p.role = 'admin' OR m.status = 'active')
  )
);

CREATE POLICY "folders_delete" ON public.folders FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    LEFT JOIN public.memberships m ON m.user_id = p.id AND m.pod_id = folders.pod_id
    WHERE p.id = auth.uid()
    AND (p.role = 'admin' OR m.status = 'active')
  )
);

DROP POLICY IF EXISTS "briefs_select" ON public.briefs;
DROP POLICY IF EXISTS "briefs_insert" ON public.briefs;
DROP POLICY IF EXISTS "briefs_update" ON public.briefs;
DROP POLICY IF EXISTS "briefs_delete" ON public.briefs;

CREATE POLICY "briefs_select" ON public.briefs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    LEFT JOIN public.memberships m ON m.user_id = p.id AND m.pod_id = briefs.pod_id
    WHERE p.id = auth.uid()
    AND (p.role = 'admin' OR m.status = 'active')
  )
);

CREATE POLICY "briefs_insert" ON public.briefs FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    LEFT JOIN public.memberships m ON m.user_id = p.id AND m.pod_id = briefs.pod_id
    WHERE p.id = auth.uid()
    AND (p.role = 'admin' OR m.status = 'active')
  )
);

CREATE POLICY "briefs_update" ON public.briefs FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    LEFT JOIN public.memberships m ON m.user_id = p.id AND m.pod_id = briefs.pod_id
    WHERE p.id = auth.uid()
    AND (p.role = 'admin' OR m.status = 'active')
  )
);

CREATE POLICY "briefs_delete" ON public.briefs FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    LEFT JOIN public.memberships m ON m.user_id = p.id AND m.pod_id = briefs.pod_id
    WHERE p.id = auth.uid()
    AND (p.role = 'admin' OR m.status = 'active')
  )
);

DROP POLICY IF EXISTS "brief_files_select" ON public.brief_files;
DROP POLICY IF EXISTS "brief_files_insert" ON public.brief_files;
DROP POLICY IF EXISTS "brief_files_update" ON public.brief_files;
DROP POLICY IF EXISTS "brief_files_delete" ON public.brief_files;

CREATE POLICY "brief_files_select" ON public.brief_files FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.briefs b
    JOIN public.profiles p ON p.id = auth.uid()
    LEFT JOIN public.memberships m ON m.user_id = p.id AND m.pod_id = b.pod_id
    WHERE b.id = brief_files.brief_id
    AND (p.role = 'admin' OR m.status = 'active')
  )
);

CREATE POLICY "brief_files_insert" ON public.brief_files FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.briefs b
    JOIN public.profiles p ON p.id = auth.uid()
    LEFT JOIN public.memberships m ON m.user_id = p.id AND m.pod_id = b.pod_id
    WHERE b.id = brief_files.brief_id
    AND (p.role = 'admin' OR m.status = 'active')
  )
);

CREATE POLICY "brief_files_update" ON public.brief_files FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.briefs b
    JOIN public.profiles p ON p.id = auth.uid()
    LEFT JOIN public.memberships m ON m.user_id = p.id AND m.pod_id = b.pod_id
    WHERE b.id = brief_files.brief_id
    AND (p.role = 'admin' OR m.status = 'active')
  )
);

CREATE POLICY "brief_files_delete" ON public.brief_files FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.briefs b
    JOIN public.profiles p ON p.id = auth.uid()
    LEFT JOIN public.memberships m ON m.user_id = p.id AND m.pod_id = b.pod_id
    WHERE b.id = brief_files.brief_id
    AND (p.role = 'admin' OR m.status = 'active')
  )
);

DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;

CREATE POLICY "messages_select" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.briefs b
    JOIN public.profiles p ON p.id = auth.uid()
    LEFT JOIN public.memberships m ON m.user_id = p.id AND m.pod_id = b.pod_id
    WHERE b.id = messages.brief_id
    AND (p.role = 'admin' OR m.status = 'active')
  )
);

CREATE POLICY "messages_insert" ON public.messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.briefs b
    JOIN public.profiles p ON p.id = auth.uid()
    LEFT JOIN public.memberships m ON m.user_id = p.id AND m.pod_id = b.pod_id
    WHERE b.id = messages.brief_id
    AND (p.role = 'admin' OR m.status = 'active')
  )
);

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'Migration complete!' as status;
SELECT email, role FROM public.profiles ORDER BY role, email;

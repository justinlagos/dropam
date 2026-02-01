-- ============================================
-- DROPAM OS - Anonymous Client Access Policies
-- Migration 003: Allow clients to view their briefs
-- ============================================

-- ============================================
-- STEP 1: Allow anonymous SELECT for briefs by brand
-- ============================================

DROP POLICY IF EXISTS "briefs_anon_select_by_brand" ON public.briefs;

CREATE POLICY "briefs_anon_select_by_brand" ON public.briefs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = briefs.brand_id
    AND b.is_active = true
    AND b.archived_at IS NULL
  )
);

-- ============================================
-- STEP 2: Allow anonymous SELECT for brief_files
-- ============================================

DROP POLICY IF EXISTS "brief_files_anon_select" ON public.brief_files;

CREATE POLICY "brief_files_anon_select" ON public.brief_files
FOR SELECT USING (
  visible_to_client = true
  AND EXISTS (
    SELECT 1 FROM public.briefs br
    JOIN public.brands b ON b.id = br.brand_id
    WHERE br.id = brief_files.brief_id
    AND b.is_active = true
    AND b.archived_at IS NULL
  )
);

-- ============================================
-- STEP 3: Allow anonymous SELECT for messages
-- ============================================

DROP POLICY IF EXISTS "messages_anon_select" ON public.messages;

CREATE POLICY "messages_anon_select" ON public.messages
FOR SELECT USING (
  visibility = 'client'
  AND EXISTS (
    SELECT 1 FROM public.briefs br
    JOIN public.brands b ON b.id = br.brand_id
    WHERE br.id = messages.brief_id
    AND b.is_active = true
    AND b.archived_at IS NULL
  )
);

-- ============================================
-- STEP 4: Allow anonymous INSERT for briefs
-- (if not already exists)
-- ============================================

DROP POLICY IF EXISTS "briefs_anon_insert" ON public.briefs;

CREATE POLICY "briefs_anon_insert" ON public.briefs
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id
    AND b.is_active = true
    AND b.archived_at IS NULL
  )
);

-- ============================================
-- STEP 5: Allow anonymous INSERT for brief_files
-- ============================================

DROP POLICY IF EXISTS "brief_files_anon_insert" ON public.brief_files;

CREATE POLICY "brief_files_anon_insert" ON public.brief_files
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.briefs br
    JOIN public.brands b ON b.id = br.brand_id
    WHERE br.id = brief_id
    AND b.is_active = true
    AND b.archived_at IS NULL
  )
);

-- ============================================
-- STEP 6: Allow anonymous INSERT for client messages
-- ============================================

DROP POLICY IF EXISTS "messages_anon_insert" ON public.messages;

CREATE POLICY "messages_anon_insert" ON public.messages
FOR INSERT WITH CHECK (
  visibility = 'client'
  AND EXISTS (
    SELECT 1 FROM public.briefs br
    JOIN public.brands b ON b.id = br.brand_id
    WHERE br.id = brief_id
    AND b.is_active = true
    AND b.archived_at IS NULL
  )
);

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'Anonymous access policies created!' as status;

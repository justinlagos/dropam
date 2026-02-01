-- ============================================
-- DROPAM OS - Storage Bucket Policies
-- Migration 006: Enable file download for pod members
-- ============================================

-- ============================================
-- STEP 1: Create storage bucket if not exists
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('briefs', 'briefs', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 2: Drop existing policies (clean slate)
-- ============================================

DROP POLICY IF EXISTS "briefs_storage_select_auth" ON storage.objects;
DROP POLICY IF EXISTS "briefs_storage_insert_auth" ON storage.objects;
DROP POLICY IF EXISTS "briefs_storage_select_anon" ON storage.objects;
DROP POLICY IF EXISTS "briefs_storage_insert_anon" ON storage.objects;

-- ============================================
-- STEP 3: SELECT policy for authenticated users
-- Pod members and admins can download files
-- ============================================

CREATE POLICY "briefs_storage_select_auth" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'briefs'
  AND (
    -- Admin access
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    -- Pod member access via membership
    EXISTS (
      SELECT 1 FROM public.brief_files bf
      JOIN public.briefs b ON b.id = bf.brief_id
      JOIN public.memberships m ON m.pod_id = b.pod_id AND m.user_id = auth.uid()
      WHERE storage.objects.name LIKE '%' || bf.id::text || '%'
      AND m.status = 'active'
    )
  )
);

-- ============================================
-- STEP 4: INSERT policy for authenticated users
-- Pod members and admins can upload files
-- ============================================

CREATE POLICY "briefs_storage_insert_auth" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'briefs'
  AND (
    -- Admin access
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    -- Pod member access
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.memberships m ON m.user_id = p.id
      WHERE p.id = auth.uid()
      AND m.status = 'active'
    )
  )
);

-- ============================================
-- STEP 5: SELECT policy for anonymous clients
-- Clients can download visible files
-- ============================================

CREATE POLICY "briefs_storage_select_anon" ON storage.objects
FOR SELECT TO anon
USING (
  bucket_id = 'briefs'
  AND EXISTS (
    SELECT 1 FROM public.brief_files bf
    JOIN public.briefs b ON b.id = bf.brief_id
    JOIN public.brands br ON br.id = b.brand_id
    WHERE storage.objects.name LIKE '%' || bf.id::text || '%'
    AND bf.visible_to_client = true
    AND br.is_active = true
    AND br.archived_at IS NULL
  )
);

-- ============================================
-- STEP 6: INSERT policy for anonymous clients
-- Clients can upload their brief files
-- ============================================

CREATE POLICY "briefs_storage_insert_anon" ON storage.objects
FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'briefs'
);

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'Storage policies created!' as status;
SELECT policyname, permissive, cmd FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;

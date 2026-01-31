-- ============================================
-- DROPAM OS - Fix Initialization Issue
-- ============================================
-- Run this in your Supabase Dashboard SQL Editor
-- if you see "Failed to initialize" errors
-- ============================================

-- Fix PODS policies (allow first-time initialization)
drop policy if exists "Admin manage pods" on public.pods;
drop policy if exists "Bootstrap or admin insert pods" on public.pods;
drop policy if exists "Admin update pods" on public.pods;
drop policy if exists "Admin delete pods" on public.pods;

create policy "Bootstrap or admin insert pods" on public.pods for insert with check (
  auth.role() = 'authenticated' and (
    (select count(*) from public.pods) = 0 or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
);
create policy "Admin update pods" on public.pods for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Admin delete pods" on public.pods for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Fix BRANDS policies
drop policy if exists "Admin manage brands" on public.brands;
drop policy if exists "Bootstrap or admin insert brands" on public.brands;
drop policy if exists "Admin update brands" on public.brands;
drop policy if exists "Admin delete brands" on public.brands;

create policy "Bootstrap or admin insert brands" on public.brands for insert with check (
  auth.role() = 'authenticated' and (
    (select count(*) from public.brands) = 0 or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
);
create policy "Admin update brands" on public.brands for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Admin delete brands" on public.brands for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Fix FOLDERS policies
drop policy if exists "Manage folders in pod or admin" on public.folders;
drop policy if exists "Bootstrap or pod insert folders" on public.folders;
drop policy if exists "Update folders in pod or admin" on public.folders;
drop policy if exists "Delete folders in pod or admin" on public.folders;

create policy "Bootstrap or pod insert folders" on public.folders for insert with check (
  auth.role() = 'authenticated' and (
    (select count(*) from public.folders) = 0 or
    exists (select 1 from public.profiles p where p.id = auth.uid() and (p.pod_id = folders.pod_id or p.role = 'admin'))
  )
);
create policy "Update folders in pod or admin" on public.folders for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and (p.pod_id = folders.pod_id or p.role = 'admin'))
);
create policy "Delete folders in pod or admin" on public.folders for delete using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and (p.pod_id = folders.pod_id or p.role = 'admin'))
);

-- ============================================
-- Make Justin the main admin
-- ============================================
update public.profiles
set role = 'admin'
where email = 'justin@disruptdna.com';

-- Success! Now go back to your app and refresh

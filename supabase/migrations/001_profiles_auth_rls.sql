-- Migration: Real auth model, profiles, lead_id, RLS
-- Run this AFTER the base supabase_schema.sql

-- 1. Add lead_id to pods
alter table public.pods add column if not exists lead_id uuid references public.profiles(id) on delete set null;

-- 2. Add author_id to messages
alter table public.messages add column if not exists author_id uuid references public.profiles(id) on delete set null;

-- 3. Update existing 'creative' role to 'pod_member'
update public.profiles set role = 'pod_member' where role = 'creative' or role not in ('client', 'pod_member', 'pod_lead', 'admin');

-- 4. Add role constraint (after migration)
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('client', 'pod_member', 'pod_lead', 'admin'));

-- 5. Ensure RLS is enabled on all tables
alter table public.profiles enable row level security;
alter table public.pods enable row level security;
alter table public.brands enable row level security;
alter table public.folders enable row level security;
alter table public.briefs enable row level security;
alter table public.brief_files enable row level security;
alter table public.messages enable row level security;

-- 6. Drop all existing policies (idempotent; includes both old and new policy names)
-- Profiles
drop policy if exists "Public profiles" on public.profiles;
drop policy if exists "Users read own profile" on public.profiles;
drop policy if exists "Admins read all profiles" on public.profiles;
drop policy if exists "Pod leads read pod members" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;
drop policy if exists "Insert own profile" on public.profiles;
drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
-- Pods
drop policy if exists "Public pods" on public.pods;
drop policy if exists "Authenticated read pods" on public.pods;
drop policy if exists "Bootstrap or admin insert pods" on public.pods;
drop policy if exists "Admin update pods" on public.pods;
drop policy if exists "Admin delete pods" on public.pods;
drop policy if exists "pods_select_authenticated" on public.pods;
drop policy if exists "pods_insert_admin" on public.pods;
drop policy if exists "pods_update_admin" on public.pods;
drop policy if exists "pods_delete_admin" on public.pods;
-- Brands
drop policy if exists "Public brands" on public.brands;
drop policy if exists "Authenticated read brands" on public.brands;
drop policy if exists "Bootstrap or admin insert brands" on public.brands;
drop policy if exists "Admin update brands" on public.brands;
drop policy if exists "Admin delete brands" on public.brands;
drop policy if exists "brands_select_authenticated" on public.brands;
drop policy if exists "brands_insert_admin" on public.brands;
drop policy if exists "brands_update_admin" on public.brands;
drop policy if exists "brands_delete_admin" on public.brands;
-- Folders
drop policy if exists "Public folders" on public.folders;
drop policy if exists "Read folders in pod or admin" on public.folders;
drop policy if exists "Bootstrap or pod insert folders" on public.folders;
drop policy if exists "Update folders in pod or admin" on public.folders;
drop policy if exists "Delete folders in pod or admin" on public.folders;
drop policy if exists "folders_select" on public.folders;
drop policy if exists "folders_insert" on public.folders;
drop policy if exists "folders_update" on public.folders;
drop policy if exists "folders_delete" on public.folders;
-- Briefs
drop policy if exists "Public briefs" on public.briefs;
drop policy if exists "Read briefs pod or admin" on public.briefs;
drop policy if exists "Clients read own brand briefs" on public.briefs;
drop policy if exists "Update briefs pod or admin" on public.briefs;
drop policy if exists "Insert briefs" on public.briefs;
drop policy if exists "Delete briefs pod or admin" on public.briefs;
drop policy if exists "briefs_select" on public.briefs;
drop policy if exists "briefs_insert" on public.briefs;
drop policy if exists "briefs_update" on public.briefs;
drop policy if exists "briefs_delete" on public.briefs;
-- Brief files
drop policy if exists "Public files" on public.brief_files;
drop policy if exists "Read brief files" on public.brief_files;
drop policy if exists "Pod members insert brief files" on public.brief_files;
drop policy if exists "Pod members update delete brief files" on public.brief_files;
drop policy if exists "brief_files_select" on public.brief_files;
drop policy if exists "brief_files_insert" on public.brief_files;
drop policy if exists "brief_files_update" on public.brief_files;
drop policy if exists "brief_files_delete" on public.brief_files;
-- Messages
drop policy if exists "Public messages" on public.messages;
drop policy if exists "Read messages" on public.messages;
drop policy if exists "Insert messages" on public.messages;
drop policy if exists "messages_select" on public.messages;
drop policy if exists "messages_insert" on public.messages;

-- 7. Profiles RLS (simple: avoid circular dependency; all authenticated can read profiles)
create policy "profiles_select_authenticated" on public.profiles for select using (auth.role() = 'authenticated');
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- 8. Pods RLS (Bootstrap-friendly: first pod creation when none exist)
create policy "pods_select_authenticated" on public.pods for select using (auth.role() = 'authenticated');
create policy "pods_insert_admin" on public.pods for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  or (select count(*) from public.pods) = 0
);
create policy "pods_update_admin" on public.pods for update using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "pods_delete_admin" on public.pods for delete using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 9. Brands RLS (Bootstrap-friendly)
create policy "brands_select_authenticated" on public.brands for select using (auth.role() = 'authenticated');
create policy "brands_insert_admin" on public.brands for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  or (select count(*) from public.brands) = 0
);
create policy "brands_update_admin" on public.brands for update using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "brands_delete_admin" on public.brands for delete using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 10. Folders RLS (Pod members and admins)
create policy "folders_select" on public.folders for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and (p.role = 'admin' or p.pod_id = folders.pod_id))
);
create policy "folders_insert" on public.folders for insert with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and (p.role = 'admin' or p.pod_id = folders.pod_id))
);
create policy "folders_update" on public.folders for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and (p.role = 'admin' or p.pod_id = folders.pod_id))
);
create policy "folders_delete" on public.folders for delete using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and (p.role = 'admin' or p.pod_id = folders.pod_id))
);

-- 11. Briefs RLS (Pod members and admins; clients use Edge Function)
create policy "briefs_select" on public.briefs for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and (p.role = 'admin' or p.pod_id = briefs.pod_id))
);
create policy "briefs_insert" on public.briefs for insert with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and (p.role = 'admin' or p.pod_id = briefs.pod_id))
);
create policy "briefs_update" on public.briefs for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and (p.role = 'admin' or p.pod_id = briefs.pod_id))
);
create policy "briefs_delete" on public.briefs for delete using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and (p.role = 'admin' or p.pod_id = briefs.pod_id))
);

-- 12. Brief files RLS (Pod members and admins; clients use Edge Function)
create policy "brief_files_select" on public.brief_files for select using (
  exists (
    select 1 from public.briefs b
    join public.profiles p on p.id = auth.uid()
    where b.id = brief_files.brief_id and (p.role = 'admin' or p.pod_id = b.pod_id)
  )
);
create policy "brief_files_insert" on public.brief_files for insert with check (
  exists (
    select 1 from public.briefs b
    join public.profiles p on p.id = auth.uid()
    where b.id = brief_files.brief_id and (p.role = 'admin' or p.pod_id = b.pod_id)
  )
);
create policy "brief_files_update" on public.brief_files for update using (
  exists (
    select 1 from public.briefs b
    join public.profiles p on p.id = auth.uid()
    where b.id = brief_files.brief_id and (p.role = 'admin' or p.pod_id = b.pod_id)
  )
);
create policy "brief_files_delete" on public.brief_files for delete using (
  exists (
    select 1 from public.briefs b
    join public.profiles p on p.id = auth.uid()
    where b.id = brief_files.brief_id and (p.role = 'admin' or p.pod_id = b.pod_id)
  )
);

-- 13. Messages RLS (Pod members and admins; clients use Edge Function)
create policy "messages_select" on public.messages for select using (
  exists (
    select 1 from public.briefs b
    join public.profiles p on p.id = auth.uid()
    where b.id = messages.brief_id and (p.role = 'admin' or p.pod_id = b.pod_id)
  )
);
create policy "messages_insert" on public.messages for insert with check (
  exists (
    select 1 from public.briefs b
    join public.profiles p on p.id = auth.uid()
    where b.id = messages.brief_id and (p.role = 'admin' or p.pod_id = b.pod_id)
  )
);

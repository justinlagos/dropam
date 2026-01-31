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

-- 5. Drop all existing public policies
drop policy if exists "Public profiles" on public.profiles;
drop policy if exists "Public pods" on public.pods;
drop policy if exists "Public brands" on public.brands;
drop policy if exists "Public folders" on public.folders;
drop policy if exists "Public briefs" on public.briefs;
drop policy if exists "Public files" on public.brief_files;
drop policy if exists "Public messages" on public.messages;

-- 6. Profiles RLS
create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Admins read all profiles" on public.profiles for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "Pod leads read pod members" on public.profiles for select using (
  exists (select 1 from public.profiles me where me.id = auth.uid() and me.role = 'pod_lead' and me.pod_id = profiles.pod_id)
);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- 7. Pods RLS (Bootstrap-friendly: any authenticated user can create first pod)
create policy "Authenticated read pods" on public.pods for select using (auth.role() = 'authenticated');
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

-- 8. Brands RLS (Bootstrap-friendly: any authenticated user can create first brands)
create policy "Authenticated read brands" on public.brands for select using (auth.role() = 'authenticated');
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

-- 9. Folders RLS (Bootstrap-friendly)
create policy "Read folders in pod or admin" on public.folders for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and (p.pod_id = folders.pod_id or p.role = 'admin'))
);
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

-- 10. Briefs RLS
create policy "Read briefs pod or admin" on public.briefs for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and (p.pod_id = briefs.pod_id or p.role = 'admin'))
);
create policy "Clients read own brand briefs" on public.briefs for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'client' and p.brand_id = briefs.brand_id)
);
create policy "Update briefs pod or admin" on public.briefs for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and (p.pod_id = briefs.pod_id or p.role = 'admin'))
);
create policy "Insert briefs" on public.briefs for insert with check (
  auth.role() = 'authenticated' and (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.pod_id = briefs.pod_id) or
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'client' and p.brand_id = briefs.brand_id) or
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
);
create policy "Delete briefs pod or admin" on public.briefs for delete using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and (p.pod_id = briefs.pod_id or p.role = 'admin'))
);

-- 11. brief_files RLS - Pod/admin see all; clients see deliverables only when brief is delivered
create policy "Read brief files" on public.brief_files for select using (
  exists (
    select 1 from public.briefs b
    join public.profiles p on p.id = auth.uid()
    where b.id = brief_files.brief_id
    and (
      (p.pod_id = b.pod_id or p.role = 'admin') or
      (p.role = 'client' and p.brand_id = b.brand_id and (b.status = 'delivered' or brief_files.type != 'deliverable'))
    )
  )
);
create policy "Pod members insert brief files" on public.brief_files for insert with check (
  exists (
    select 1 from public.briefs b
    join public.profiles p on p.id = auth.uid()
    where b.id = brief_files.brief_id and (p.pod_id = b.pod_id or p.role = 'admin')
  )
);
create policy "Pod members update delete brief files" on public.brief_files for all using (
  exists (
    select 1 from public.briefs b
    join public.profiles p on p.id = auth.uid()
    where b.id = brief_files.brief_id and (p.pod_id = b.pod_id or p.role = 'admin')
  )
);

-- 12. Messages RLS
create policy "Read messages" on public.messages for select using (
  exists (
    select 1 from public.briefs b
    join public.profiles p on p.id = auth.uid()
    where b.id = messages.brief_id
    and (
      (p.pod_id = b.pod_id or p.role = 'admin') or
      (p.role = 'client' and p.brand_id = b.brand_id and messages.visibility = 'client')
    )
  )
);
create policy "Insert messages" on public.messages for insert with check (
  auth.uid() is not null and
  exists (
    select 1 from public.briefs b
    join public.profiles p on p.id = auth.uid()
    where b.id = messages.brief_id and (p.pod_id = b.pod_id or (p.role = 'client' and p.brand_id = b.brand_id) or p.role = 'admin')
  )
);

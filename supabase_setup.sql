-- ============================================
-- DROPAM OS - Complete Database Setup
-- ============================================
-- Run this ONCE in your Supabase Dashboard SQL Editor
-- This creates all tables with bootstrap-friendly RLS policies
-- ============================================

-- Reset Schema (drops existing Dropam tables)
drop table if exists public.client_folder_briefs cascade;
drop table if exists public.client_folders cascade;
drop table if exists public.messages cascade;
drop table if exists public.brief_files cascade;
drop table if exists public.briefs cascade;
drop table if exists public.folders cascade;
drop table if exists public.brands cascade;
drop table if exists public.pods cascade;
drop table if exists public.profiles cascade;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. TABLES
-- ============================================

-- Profiles (linked to Supabase Auth)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  role text default 'pod_member' check (role in ('client', 'pod_member', 'pod_lead', 'admin')),
  pod_id uuid,
  brand_id uuid,
  name text,
  email text,
  preferences jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Pods (teams/workspaces)
create table public.pods (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  slug text not null unique,
  description text,
  lead_name text,
  lead_id uuid references public.profiles(id) on delete set null,
  archived_at timestamp with time zone
);

-- Brands (clients within pods)
create table public.brands (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  name text not null,
  slug text not null unique,
  pod_id uuid references public.pods(id) on delete cascade,
  access_key_hash text,
  is_active boolean default true not null,
  notification_email text,
  archived_at timestamp with time zone
);

-- Folders (organization on canvas)
create table public.folders (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  pod_id uuid references public.pods(id) on delete cascade,
  position_x numeric default 0,
  position_y numeric default 0
);

-- Briefs (work items)
create table public.briefs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  status text default 'new',
  priority text default 'normal',
  deadline timestamp with time zone,
  submitted_at timestamp with time zone default timezone('utc'::text, now()),
  guidance text,
  owner_id uuid references public.profiles(id),
  owner_name text,
  brand_id uuid references public.brands(id) on delete cascade,
  pod_id uuid references public.pods(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  stack_id text,
  position_x numeric default 0,
  position_y numeric default 0
);

-- Brief Files (attachments)
create table public.brief_files (
  id uuid default gen_random_uuid() primary key,
  uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  type text not null,
  url text not null,
  brief_id uuid references public.briefs(id) on delete cascade,
  visible_to_client boolean default false not null
);

-- Messages (comments on briefs)
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  text text not null,
  author_name text not null,
  author_id uuid references public.profiles(id) on delete set null,
  author_type text default 'user' check (author_type in ('user', 'client')),
  visibility text default 'internal',
  brief_id uuid references public.briefs(id) on delete cascade
);

-- Client Folders (client-side organization)
create table public.client_folders (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  brand_id uuid not null references public.brands(id) on delete cascade,
  client_key_hash text not null,
  name text not null,
  position_x numeric default 0 not null,
  position_y numeric default 0 not null
);

create table public.client_folder_briefs (
  folder_id uuid not null references public.client_folders(id) on delete cascade,
  brief_id uuid not null references public.briefs(id) on delete cascade,
  primary key (folder_id, brief_id)
);

create index idx_client_folders_brand_key on public.client_folders(brand_id, client_key_hash);

-- ============================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================

alter table public.profiles enable row level security;
alter table public.pods enable row level security;
alter table public.brands enable row level security;
alter table public.folders enable row level security;
alter table public.briefs enable row level security;
alter table public.brief_files enable row level security;
alter table public.messages enable row level security;
alter table public.client_folders enable row level security;
alter table public.client_folder_briefs enable row level security;

-- ============================================
-- 3. RLS POLICIES (Bootstrap-friendly)
-- ============================================

-- PROFILES
create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Admins read all profiles" on public.profiles for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "Pod leads read pod members" on public.profiles for select using (
  exists (select 1 from public.profiles me where me.id = auth.uid() and me.role = 'pod_lead' and me.pod_id = profiles.pod_id)
);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- PODS (Bootstrap-friendly: anyone can create first pod)
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

-- BRANDS (Bootstrap-friendly: anyone can create first brands)
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

-- FOLDERS
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

-- BRIEFS
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
  auth.uid() is not null and (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.pod_id = briefs.pod_id) or
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'client' and p.brand_id = briefs.brand_id) or
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
);
create policy "Delete briefs pod or admin" on public.briefs for delete using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and (p.pod_id = briefs.pod_id or p.role = 'admin'))
);

-- BRIEF FILES
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

-- MESSAGES
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

-- CLIENT FOLDERS
create policy "Public client folders" on public.client_folders for all using (true) with check (true);
create policy "Public client folder briefs" on public.client_folder_briefs for all using (true) with check (true);

-- ============================================
-- 4. STORAGE BUCKET
-- ============================================

insert into storage.buckets (id, name, public) values ('brief-assets', 'brief-assets', true)
on conflict (id) do nothing;

drop policy if exists "Public Access" on storage.objects;
create policy "Public Access" on storage.objects for all
  using (bucket_id = 'brief-assets')
  with check (bucket_id = 'brief-assets');

-- ============================================
-- DONE! Your database is ready.
-- ============================================

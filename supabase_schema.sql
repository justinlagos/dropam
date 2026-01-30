-- Reset Schema (CAUTION: This drops all existing Dropam tables to ensure a clean start)
-- This fixes "relation already exists" errors by clearing the slate.

drop table if exists public.messages cascade;
drop table if exists public.brief_files cascade;
drop table if exists public.briefs cascade;
drop table if exists public.folders cascade;
drop table if exists public.brands cascade;
drop table if exists public.pods cascade;
drop table if exists public.profiles cascade;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 0. Profiles (Real Auth)
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

-- 1. Create Tables

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

create table public.folders (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  pod_id uuid references public.pods(id) on delete cascade,
  position_x numeric default 0,
  position_y numeric default 0
);

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

create table public.brief_files (
  id uuid default gen_random_uuid() primary key,
  uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  type text not null, 
  url text not null,
  brief_id uuid references public.briefs(id) on delete cascade,
  visible_to_client boolean default false not null
);

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

-- 2. Security

alter table public.profiles enable row level security;
alter table public.pods enable row level security;
alter table public.brands enable row level security;
alter table public.folders enable row level security;
alter table public.briefs enable row level security;
alter table public.brief_files enable row level security;
alter table public.messages enable row level security;

-- Public access policies for V1 ease of use (Production should tighten this)
create policy "Public profiles" on public.profiles for all using (true) with check (true);
create policy "Public pods" on public.pods for all using (true) with check (true);
create policy "Public brands" on public.brands for all using (true) with check (true);
create policy "Public folders" on public.folders for all using (true) with check (true);
create policy "Public briefs" on public.briefs for all using (true) with check (true);
create policy "Public files" on public.brief_files for all using (true) with check (true);
create policy "Public messages" on public.messages for all using (true) with check (true);

-- 3. Storage
insert into storage.buckets (id, name, public) values ('brief-assets', 'brief-assets', true)
on conflict (id) do nothing;
drop policy if exists "Public Access" on storage.objects;
create policy "Public Access" on storage.objects for all using ( bucket_id = 'brief-assets' ) with check ( bucket_id = 'brief-assets' );
-- Migration: Client access model, brands access_key_hash, soft delete, messages author_type, brief_files visible_to_client
-- Run after 001_profiles_auth_rls.sql

-- 1. Pods: description, archived_at (soft delete)
alter table public.pods add column if not exists description text;
alter table public.pods add column if not exists archived_at timestamp with time zone;

-- 2. Brands: access_key_hash, is_active, updated_at, notification_email, archived_at
alter table public.brands add column if not exists access_key_hash text;
alter table public.brands add column if not exists is_active boolean default true not null;
alter table public.brands add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());
alter table public.brands add column if not exists notification_email text;
alter table public.brands add column if not exists archived_at timestamp with time zone;

-- 3. Messages: author_type for client vs internal
alter table public.messages add column if not exists author_type text default 'user' check (author_type in ('user', 'client'));

-- 4. brief_files: visible_to_client (deliverables private by default; set true when "Send to client")
alter table public.brief_files add column if not exists visible_to_client boolean default false not null;

-- 5. RLS: exclude archived pods/brands from default reads (admin can still manage)
-- Policies in 001 already use "authenticated" and "admin manage" - we filter archived in app or add policy conditions.
-- For simplicity we keep existing policies; app and Edge Functions filter by archived_at is null and is_active.

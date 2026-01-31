-- Migration: Single key per brand. One access_key_hash only. No rotation columns.
-- Run after 003_client_folders.sql

-- 1. Ensure slug is unique (idempotent; base schema may already have it)
alter table public.brands drop constraint if exists brands_slug_key;
alter table public.brands add constraint brands_slug_key unique (slug);

-- 2. Backfill null access_key_hash with a sentinel (invalid) hash so NOT NULL is safe.
--    Admins must use "Change access key" to set a real key for any such brand.
update public.brands
set access_key_hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
where access_key_hash is null;
-- (e3b0c442... is SHA-256 of empty string; no client can match it.)

-- 3. Single key: access_key_hash is required and the only key field.
alter table public.brands alter column access_key_hash set not null;

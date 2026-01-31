-- Migration: Add share_token to brands. The link with share_token IS the credential—no separate code.
-- URL format: /#/drop/{share_token}. Anyone with the link can access; no code to enter.

-- 1. Add share_token column (unique, used in URL)
alter table public.brands add column if not exists share_token text unique;

-- 2. Generate share_tokens for existing brands (URL-safe hex, 36 chars)
update public.brands
set share_token = encode(gen_random_bytes(18), 'hex')
where share_token is null;

-- 3. Make share_token required for new brands (backfilled rows now have it)
alter table public.brands alter column share_token set not null;


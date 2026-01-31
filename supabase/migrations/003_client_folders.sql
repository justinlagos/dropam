-- Client folders: sync across devices via brand_id + access_key_hash
-- Clients organize briefs into folders; stored server-side for cross-device sync.

create table if not exists public.client_folders (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  brand_id uuid not null references public.brands(id) on delete cascade,
  client_key_hash text not null,
  name text not null,
  position_x numeric default 0 not null,
  position_y numeric default 0 not null
);

create table if not exists public.client_folder_briefs (
  folder_id uuid not null references public.client_folders(id) on delete cascade,
  brief_id uuid not null references public.briefs(id) on delete cascade,
  primary key (folder_id, brief_id)
);

create index if not exists idx_client_folders_brand_key on public.client_folders(brand_id, client_key_hash);

alter table public.client_folders enable row level security;
alter table public.client_folder_briefs enable row level security;

-- Allow anon to manage client folders when brand access is validated via Edge Function.
-- For direct client access we use a permissive policy; the Edge Function validates the key.
create policy "Public client folders" on public.client_folders for all using (true) with check (true);
create policy "Public client folder briefs" on public.client_folder_briefs for all using (true) with check (true);

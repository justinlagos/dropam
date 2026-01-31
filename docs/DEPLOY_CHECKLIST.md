# Launch deployment checklist

## Before going live

### 1. Run database migrations
```bash
# If using Supabase CLI
supabase db push

# Or run migrations manually in order:
# - 001_profiles_auth_rls.sql (if using auth-based RLS)
# - 002_client_access_brands_pods.sql
# - 003_client_folders.sql
```

### 2. Deploy Edge Functions
Brand access keys require **client-verify**, **client-briefs**, and **client-messages**.
```bash
supabase functions deploy client-verify
supabase functions deploy client-briefs
supabase functions deploy client-messages
```

### 3. Enable Realtime (optional but recommended)
In Supabase Dashboard → Database → Replication:
- Ensure `briefs` is in the publication
- Ensure `brief_files` is in the publication (for realtime deliverable updates)
- Ensure `messages` is in the publication

### 4. Environment variables
Set in your hosting (Vercel, Netlify, etc.):
- `VITE_SUPABASE_URL` – your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` – your Supabase anon key

### 5. CORS for Edge Functions
Supabase Edge Functions need CORS configured. The client-briefs function includes CORS headers for `*`. If you need to restrict origins, update the `corsHeaders()` in the function.

---

## What was fixed for launch

| Issue | Fix |
|-------|-----|
| Pod uploads not visible to client | `getClientBriefs` now uses Edge Function (service role), bypassing RLS. Refetch triggered when brief status becomes `delivered`. |
| Client folders only in localStorage | Client folders stored in `client_folders` and `client_folder_briefs` tables. Synced across devices via `brand_id` + `client_key_hash`. Refetch on window focus. |

---

## Fallback behavior

- If the Edge Function fails or is not deployed, `getClientBriefs` falls back to direct Supabase. With restrictive RLS, this may return empty files; deploy the Edge Function for reliable behavior.
- If `client_folders` tables don't exist yet, folder sync will fail gracefully; the client will show no folders until migrations are run.

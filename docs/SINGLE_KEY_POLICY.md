# Single Key Policy

Dropam OS enforces one access key per brand. One link. One key. Admin only. No regeneration UI. No accidental invalidation.

## Contract

- A brand has exactly one public drop link: `/drop/:brandSlug`.
- A brand has exactly one access key (stored as `access_key_hash` in the database).
- The access key does not change unless an admin explicitly changes it.
- Clients never log in. They enter the access key once per browser session and get a brand-scoped session (sessionStorage keyed by brand slug).
- The key works identically in local and production (Vercel). Verification is deterministic: same hash algorithm, normalized input.

## Database

- `brands.access_key_hash` is the only key field. It is required (NOT NULL).
- No multiple keys, key history, key arrays, or key rotations.
- Brand slug is unique.

## Admin

- Only admins can see or change a brand’s access key.
- Pod leads and pod members cannot see or change the key.
- In Settings → Brands, the only key action is **Change access key**. It requires typing `CHANGE KEY` to confirm. The new key is shown once with a Copy button. The old key is never shown or stored in plaintext.

## Client

- Client opens `/drop/:brandSlug`. If no session exists, the key gate is shown.
- Client enters the key; the app POSTs to the `client-verify` Edge Function (the browser never queries the brands table).
- On success, the client stores the key in sessionStorage for that brand. Subsequent visits in the same browser do not ask again until the session ends or the admin changes the key.
- If the admin changes the key, all existing client sessions become invalid (the stored key no longer matches). The client sees the key gate again.

## Verification (Edge Function)

- Input key is normalized: trim, collapse invisible whitespace, reject empty.
- Hash with SHA-256 and compare to `brands.access_key_hash`.
- Specific errors: 404 brand not found, 401 invalid key, 500 missing server env (SUPABASE_URL or SERVICE_ROLE_KEY).

## Split-brain guard

- In dev, the frontend logs the Supabase project ref (parsed from `VITE_SUPABASE_URL`).
- The Edge Function logs the project ref on each request.
- Settings (admin only) shows a row: **Supabase project: &lt;ref&gt;** so it is obvious which project Vercel is using.

## Seed

- `scripts/seed-accounts.js` creates brands with `access_key_hash` and prints plaintext keys once at the end for the admin to share.
- If you run seed again, keys will change because you are rebuilding the database. That is expected. In production you do not run seed.

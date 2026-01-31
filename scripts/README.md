# Scripts

## seed-accounts.js

Resets all accounts and data, then creates the DisruptDNA pod/user/brand structure. All user passwords are set to `000000`.

**Requirements**

- Node 18+
- **SUPABASE_SERVICE_ROLE_KEY** from Supabase Dashboard → Project Settings → API → `service_role` (secret). Do not commit this key.

**Usage**

Option A — use a `.env` or `.env.local` file (recommended; these are in `.gitignore`):

```bash
# Create or edit .env or .env.local in the project root:
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-here
# Optional: SUPABASE_URL=https://your-project.supabase.co

npm run seed
```

Option B — set the variable in the shell:

```bash
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
npm run seed
```

**What it does**

1. Deletes messages, brief_files, briefs, folders, brands.
2. Clears pod leads, then deletes all auth users (profiles cascade).
3. Deletes all pods.
4. Creates 3 pods (POD 1, POD 2, POD 3).
5. Creates 8 auth users with password `000000` and inserts profiles (role, pod).
6. Sets pod leads (Taiwo, Ade, Bright).
7. Creates brands per pod **with a unique access key each** (hash stored; raw key printed so admin can give to clients).

**Structure created**

| POD   | Brands                                      | Lead   | Members        |
|-------|---------------------------------------------|--------|----------------|
| POD 1 | Access Bank, Nadissa, Learn Africa          | Taiwo  | Ubong          |
| POD 2 | Sparkle, Cardinal Stone, Insight 360       | Ade    | Esther, Courage |
| POD 3 | Visit Nigeria, Lid Store, Laverita, Nadissa | Bright | VN Designer, Courage |

Emails: justin@disruptdna.com (admin), esther@disruptdna.com, courage@disruptdna.com, ade@disruptdna.com, taiwo@disruptdna.com, bright@disruptdna.com, ubongking@disruptdna.com, VN@disruptdna.com

After seeding, the script prints **brand access keys** once at the end. Give each key to the client for that brand; they use it on the drop page (`/drop/<brand-slug>` with the key) to submit briefs.

**Single Key Policy**

- A brand has exactly one access key (one `access_key_hash` in the database).
- The key does not change unless an admin explicitly changes it in Settings → Brands → Change key (with confirmation).
- If you run seed again, keys will change because you are rebuilding the database. That is expected. In production you do not run seed.

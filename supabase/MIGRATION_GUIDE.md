# Dropam OS Auth System Migration Guide

## Overview

This migration implements a proper tenancy model using a `memberships` table instead of directly storing `pod_id` on profiles.

### New Architecture

**Before:**
- `profiles.role` could be: `admin`, `pod_lead`, `pod_member`, `client`
- `profiles.pod_id` directly linked users to pods
- Circular RLS dependencies caused "Permission denied" errors

**After:**
- `profiles.role` is simplified to: `admin` or `user`
- `memberships` table links users to pods with roles (`pod_member`, `pod_lead`)
- Clients access via brand drop links only (no profiles)
- No circular RLS dependencies

## Migration Steps

### Step 1: Run the Initial RLS Fix (if not already done)

If users are still experiencing "Permission denied" errors, first run:

```sql
-- Run in Supabase SQL Editor
\i fix_all_rls.sql
```

Or paste the contents of `supabase/fix_all_rls.sql` into the SQL Editor.

### Step 2: Run the Memberships Migration

Run the memberships migration to create the new table and policies:

```sql
-- Run in Supabase SQL Editor
\i migrations/002_memberships_auth.sql
```

Or paste the contents of `supabase/migrations/002_memberships_auth.sql`.

This migration will:
1. Create the `memberships` table
2. Migrate existing `pod_id` assignments to memberships
3. Simplify `profiles.role` to `admin` or `user`
4. Update RLS policies to use memberships
5. Add `access_key` to brands for client entry

### Step 3: Deploy Frontend Changes

After running the SQL migrations, deploy the updated frontend. The key changes are:

- **types.ts**: New `Membership` type, simplified `UserRole`
- **UserContext.tsx**: Fetches memberships, provides `hasPodAccess()` and `getPodRole()`
- **SettingsPage.tsx**: Membership management UI for admins
- **App.tsx**: Updated route guards to use memberships
- **PodCanvasPage.tsx**: Uses `hasPodAccess()` for security

## User Role Changes

| Old Role | New Role | Access |
|----------|----------|--------|
| `admin` | `admin` | All pods, system settings |
| `pod_lead` | `user` + membership(pod_lead) | Assigned pod(s) as lead |
| `pod_member` | `user` + membership(pod_member) | Assigned pod(s) as member |
| `client` | ❌ Removed | Use brand drop links |

## Admin Actions

### Adding a User to a Pod

1. Go to Settings > Manage People
2. Find the user
3. Click "+ Add to pod" dropdown
4. Select the pod
5. Optionally change their role (Member/Lead)

### Removing a User from a Pod

1. Go to Settings > Manage People
2. Find the user
3. Click the "×" next to the pod membership

### Making Someone Admin

1. Go to Settings > Manage People
2. Change their role from "User" to "Admin"
3. Note: Admins have access to all pods automatically

## Verification

After migration, verify:

1. **Admin can see all pods**: Log in as Justin (admin), should see Admin Dashboard
2. **Pod members can only see their pod**: Log in as a pod member, should only see their assigned pod
3. **Users without memberships see "No Access"**: New users without pod assignments
4. **Settings page shows memberships**: Admin can see and manage pod memberships

## Troubleshooting

### "Permission denied" after migration

If you still see permission errors after running the migration:

1. Check that the migration ran successfully (no SQL errors)
2. Clear browser cache and refresh
3. Sign out and sign back in
4. Check the `profiles` table - ensure your user has `role = 'admin'`

### Memberships table doesn't exist

If you see errors about missing `memberships` table:

1. Run the migration again: `\i migrations/002_memberships_auth.sql`
2. Check for any SQL errors in the output

### Users can't access their pods

1. Check the `memberships` table for their user_id
2. Ensure they have a row with `status = 'active'`
3. Verify the `pod_id` matches an existing pod

## Rollback

If you need to rollback (not recommended):

```sql
-- WARNING: This will lose membership data
DROP TABLE IF EXISTS public.memberships;

-- Restore old role constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('client', 'pod_member', 'pod_lead', 'admin'));
```

Then redeploy the old frontend code.

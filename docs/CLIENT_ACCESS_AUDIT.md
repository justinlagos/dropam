# Client / Brand Access Flow — Audit & Recommendations

**Goal:** Clients can access their area easily. No extra steps, no technical jargon, no friction.

---

## 1. Current Flow Summary

| Step | Who | Action |
|------|-----|--------|
| 1 | Admin | Creates brand in Settings → receives one-time access key |
| 2 | Admin | Copies **link** (with or without key) and shares with client |
| 3 | Client | Opens link |
| 4 | Client | If key in URL → auto-access. If not → must enter access key manually |

**Access verification:** Client key is hashed (SHA-256). Stored in `brands.access_key_hash`. `client-verify` Edge Function validates. Key is never stored in plain text after creation.

---

## 2. Issues Identified

### Critical

**2.1 URL key not read with HashRouter**

`loadKeyFromUrl()` in `ClientDropPage` uses `window.location.search`. With HashRouter, the shared link is `https://app.example.com/#/drop/sparkle?key=abc123`. The query string lives *inside the hash*, so `window.location.search` is empty. The key is never read. Clients who receive a link with the key embedded still see the “Enter access key” screen.

**Fix:** Parse key from both `window.location.search` and the hash:

```ts
const loadKeyFromUrl = useCallback(() => {
  if (typeof window === 'undefined') return null;
  const searchParams = new URLSearchParams(window.location.search);
  const hashIdx = window.location.hash.indexOf('?');
  const hashParams = hashIdx >= 0 
    ? new URLSearchParams(window.location.hash.slice(hashIdx + 1)) 
    : null;
  const key = searchParams.get('key') || searchParams.get('accessKey')
    || hashParams?.get('key') || hashParams?.get('accessKey');
  return key ? key.trim() : null;
}, []);
```

---

**2.2 “Link” button copies link without key**

In Settings → Brands, “Copy Link” uses `dropLink(brand.slug)` (no key). Clients who get this link must manually type a long alphanumeric key. The intended flow (link with embedded key for one-click access) only exists when the admin copies from the **new brand** modal.

**Impact:** For existing brands, admins cannot get a one-click link unless they “Change key” and copy from the new-key modal, which invalidates all previous links.

---

### Moderate

**2.3 Key lost when tab closes**

Access key is stored in `sessionStorage`. On return visits (new tab, closed tab, or new session), clients must re-enter the key or use a link with the key embedded.

---

**2.4 Technical copy**

Client-facing text includes “access key” and “passcode”. DROPAM_COPY prefers minimal, non-technical language. Current copy:

- “Enter access key”
- “Use the key shared by your team to access this drop portal.”
- “Invalid access key”

---

### Minor

**2.5 No “Get shareable link” for existing brands**

Admins can only get a one-click link when creating a brand or changing the key. There is no clear path to “I lost the original link / key, give me a new shareable link” without “Change key” language.

---

## 3. Recommendations (Platform-Style, Easy for Clients)

### 3.1 Fix URL key parsing (critical)

Implement the hash-aware `loadKeyFromUrl` change above so links with embedded keys work correctly. This is the highest-impact, lowest-effort fix.

---

### 3.2 Friendlier client copy (low effort)

Replace technical terms with plain language:

| Current | Suggested |
|---------|-----------|
| “Enter access key” | “Enter your code” |
| “Use the key shared by your team to access this drop portal.” | “Enter the code your team shared with you.” |
| “Access key” (input placeholder) | “Code” |
| “Invalid access key” | “Code not recognized. Check and try again.” |

Aligns with DROPAM_COPY: calm, minimal, orienting.

---

### 3.3 Persist key in localStorage (optional)

Switch from `sessionStorage` to `localStorage` so clients can return without re-entering the key. Trade-off: shared computers retain access until the user clears site data. For typical client portals, localStorage is acceptable. Optionally add a “Remember on this device” toggle later.

---

### 3.4 “Get shareable link” for existing brands

Add a “Get shareable link” action in Settings → Brands that:

1. Generates a new access key (same as “Change key”).
2. Opens a modal similar to the new-brand flow.
3. Shows “Copy link” (full URL with key) and “Copy code” (key only).
4. Copies a one-click link to clipboard.

Useful when admins have lost the original link or key. Same behavior as “Change key”, but framed around sharing rather than security.

---

### 3.5 Encourage full link on create

In the new-brand modal, make “Copy link” the main CTA and state: “Share this link with your client. They open it once—no code needed.” This reinforces that the full link is the primary shareable artifact.

---

### 3.6 Optional short code (future)

Allow admins to set an optional 4–6 character code per brand. Clients can use either the long key or the short code. Easier to share verbally or by SMS. Requires schema and hashing changes; lower priority.

---

## 4. Priority Order

| Priority | Change | Effort | Impact |
|----------|--------|--------|--------|
| 1 | Fix URL key parsing (hash support) | Low | Critical — fixes broken one-click links |
| 2 | Friendlier client copy | Low | High — reduces confusion |
| 3 | “Get shareable link” for existing brands | Medium | High — easier for admins to share |
| 4 | localStorage instead of sessionStorage | Low | Medium — fewer re-entries |
| 5 | Emphasize “Copy link” in new-brand modal | Low | Medium — clearer admin flow |

---

## 5. Acceptance Criterion

> Client can access their area easily.

After these changes:

1. Admin shares a link with the key embedded (primary path).
2. Client clicks → lands on the canvas without typing anything.
3. If the key is missing, client sees “Enter your code” and simple error copy.
4. On return visits, stored key (session or local) keeps them in without re-entry when possible.

---

## 6. References

- `pages/ClientDropPage.tsx` — access gate, key loading, client UI
- `pages/SettingsPage.tsx` — Brands tab, drop link, key reveal
- `services/clientApi.ts` — verifyBrandAccess, getStoredAccessKey, setStoredAccessKey
- `supabase/functions/_shared/brandAuth.ts` — validateBrandAccess, normalizeAccessKey
- `docs/DROPAM_FLOW.md` — “Client never logs in”, brand link
- `docs/DROPAM_USER_FLOW.md` — Client entry, brand link + key
- `docs/DROPAM_COPY.md` — tone, minimal language

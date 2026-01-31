# DROPAM_USER_FLOW.md
## Extensive and clear user flow for Dropam

This document describes **every user flow** in Dropam: who enters where, what they see, what they do, and how work moves. It is the single reference for understanding the product from a user’s perspective.

Terminology follows **DROPAM_COPY.md** (brief, file, folder, deliver, message, pod, brand). Behavior follows **DROPAM_CORE.md**, **DROPAM_FLOW.md**, and **DROPAM_STATE.md**.

---

## Table of contents

1. [Actors and access](#1-actors-and-access)
2. [Routes and entry](#2-routes-and-entry)
3. [Client flows](#3-client-flows)
4. [Internal user flows (pod member / lead)](#4-internal-user-flows-pod-member--lead)
5. [Admin flows](#5-admin-flows)
6. [Canvas and spatial flows](#6-canvas-and-spatial-flows)
7. [Brief lifecycle flows](#7-brief-lifecycle-flows)
8. [Messaging flows](#8-messaging-flows)
9. [Delivery flows](#9-delivery-flows)
10. [Error and edge flows](#10-error-and-edge-flows)
11. [Exit flows](#11-exit-flows)

---

## 1. Actors and access

| Actor | How they access Dropam | Primary surface |
|-------|------------------------|-----------------|
| **Client** | Brand link + access key (no login) | Client drop page: white canvas, “Drop your brief here” |
| **Pod member** | Email/password login | Pod canvas: briefs and folders on canvas |
| **Pod lead** | Same as pod member; extra permissions (reassign, set deadline, etc.) | Same pod canvas |
| **Admin** | Same login; can access all pods and settings | Pod canvas + Settings (pods, brands, access keys, sign out) |

Clients never see: pod, admin, internal, role labels.  
Internal users never see: client access keys (except when copying for sharing).

---

## 2. Routes and entry

### 2.1 Route map

| Route | Who | Purpose |
|-------|-----|--------|
| `/#/login` | Unauthenticated | Sign in (email + password) |
| `/#/signup` | Unauthenticated | Create account (team or client; client picks brand) |
| `/#/` | Authenticated | Root redirect (see below) |
| `/#/pod/:podSlug` | Authenticated, has pod access | Pod canvas (briefs, folders, side panel) |
| `/#/drop/:brandSlug` | Anyone with link | Client drop surface (key in URL or prompt) |
| `/#/settings` | Authenticated | Settings: pods, brands, access keys, sign out |
| `/#/no-access` | Authenticated but no pod/brand | Choose pod or brand, or initialize / get access |
| `/#/logout` | Authenticated | Sign out, then redirect to login |

### 2.2 Root redirect (`/#/`)

1. Not logged in → `/#/login`
2. Logged in, has `podId` in profile and that pod exists → `/#/pod/:podSlug`
3. Logged in, admin, at least one pod exists → `/#/pod/:firstPodSlug`
4. Logged in but no pod or no access → `/#/no-access`

No “home” or “dashboard”; user lands on pod canvas or no-access.

### 2.3 Client entry (no login)

1. User receives a **brand link** (e.g. `https://app.dropam.com/#/drop/sparkle`) and optionally an **access key**.
2. User opens link → **Client drop page** loads.
3. If URL has `?key=...` (or `?accessKey=...`), key is read and verified.
4. If no key in URL:
   - If a key was previously stored for this brand, it is used.
   - Otherwise, user sees a minimal **access key** input; after submitting a valid key, access is verified and key can be stored for the session (or locally, per implementation).
5. Invalid key → minimal error (e.g. “Invalid access key”), user can correct and retry.
6. Valid key → white canvas with “Drop your brief here” (and optional “Drag a file onto this page”). If the client already has briefs, their briefs appear as icons on the canvas.

No onboarding, no account creation, no email verification for the client.

### 2.4 Internal user entry (login)

1. User goes to `/#/login` (or is redirected there).
2. User enters email and password, submits.
3. On success: session is set; app redirects per **Root redirect** (pod canvas or no-access).
4. On failure: minimal inline error (e.g. “Sign in failed”), user stays on login. No toast, no modal.
5. From login, user can go to **Sign up** if signup is enabled.

### 2.5 Sign up flow

1. User is on `/#/signup`.
2. User enters name, email, password.
3. User chooses account type: **team** (pod_member) or **client** (and if client, selects brand).
4. User submits. On success:
   - If email confirmation is required: message that they should confirm then sign in; redirect to login.
   - If no confirmation: redirect to `/#/` (then root redirect to pod or no-access).
5. On failure: minimal inline error. No celebration copy.

---

## 3. Client flows

### 3.1 Client: first time on brand link (empty state)

1. Open brand link, pass access key (URL or prompt).
2. See: white canvas; top left “Dropam” and brand name; center “Drop your brief here” (and optional “Drag a file onto this page”).
3. No cards, no extra UI. Client can leave as-is or drop a brief.

### 3.2 Client: dropping a brief

1. Client has valid access on the drop page.
2. **Drop**: drag a file onto the canvas (or use the drop zone). One file = one brief; title defaults to file name (editable in some implementations).
3. **Create**: upload starts immediately; no “Submit” step. On success, a new brief appears on the canvas as an icon; status is “new” (client may or may not see status label).
4. **Failure**: e.g. “Upload failed” near the action; client can retry. No global popup.
5. Client can drop multiple briefs; each appears as its own icon. All updates appear in real time (no refresh).

### 3.3 Client: viewing their briefs

1. After at least one brief exists, briefs appear as **desktop-style icons** on the white canvas.
2. Client can **single-click** a brief → selection highlight; **side panel** opens with brief details (files, status, messages if applicable).
3. Client can **double-click** to open/details (same outcome as single-click + panel).
4. Clicking empty canvas clears selection and closes panel.
5. Positions are saved; after refresh, briefs appear in the same places.

### 3.4 Client: sending a message

1. Client selects a brief (click) → side panel opens.
2. Panel shows message thread (client-visible messages only).
3. Client types in the message input and sends.
4. Message appears in the thread immediately; pod sees it in real time. No “Message sent” toast; state change is the confirmation.
5. If send fails: minimal inline error (e.g. “Message not sent”); client can retry.

### 3.5 Client: seeing delivered work

1. Pod marks the brief as **delivered** and (if applicable) uploads deliverables.
2. Client view updates **in real time**: brief status shows “delivered”; deliverable files become visible in the panel.
3. Client opens brief → in panel sees deliverables and can **download** files.
4. No email required; no separate “delivery confirmation” page. The canvas and panel are the only surfaces.

### 3.6 Client: context menu (if implemented)

On **right-click** on a brief (client view): e.g. View, Send message. Same actions as in the panel; no extra steps.

### 3.7 Client: leaving

Client closes tab or navigates away. No sign-out; no “Are you sure?”. Link + key (and optional stored key) allow return later.

---

## 4. Internal user flows (pod member / lead)

### 4.1 Landing on the pod canvas

1. After login (or root redirect), user lands on `/#/pod/:podSlug`.
2. **Top bar**: pod name, search (filter briefs), link to Settings.
3. **Canvas**: briefs and folders at saved positions; free-form drag, no grid, no snap.
4. **Side panel**: closed until user selects a brief or folder.
5. Data loads; realtime subscriptions keep briefs, folders, and messages in sync. No manual refresh.

### 4.2 Choosing a pod (multi-pod user)

1. If user has access to more than one pod, they may have a pod switcher (or similar) in the UI.
2. Selecting another pod navigates to `/#/pod/:otherPodSlug`. Same canvas pattern; only that pod’s briefs and folders.
3. System may remember last chosen pod for next visit (per implementation).

### 4.3 Seeing work

1. New briefs from clients appear on the canvas automatically (realtime).
2. Each brief shows as an icon with title; optional status label (new, in progress, review, delivered).
3. Folders show as folder icons; briefs can be inside folders.
4. No notification banners; presence of new items is the signal. Search filters the list on canvas.

### 4.4 Selecting a brief

1. **Single-click** a brief → brief is selected (subtle highlight), **side panel** opens (details by default).
2. Panel tabs (if present): e.g. Details, Messages (internal / client).
3. **Click empty canvas** (or click another brief) → selection moves or clears; panel updates or closes.
4. No separate “Open” button; click is the open.

### 4.5 Acting on a brief (panel vs context menu)

1. **Side panel**: actions as buttons (Take brief, Mark in progress, Move to review, Send message to client, Send message to pod, Upload deliverables, Deliver and send to client, Set deadline, Reassign owner, Properties, Rename, Delete for admin).
2. **Right-click** on the same brief → **context menu** with the same logical actions (same handlers, no duplicate logic).
3. Action runs immediately; state updates in real time; no confirmation modal unless destructive and irreversible (e.g. Delete). Success = state change, no “Done” toast.

### 4.6 Taking a brief

1. Brief status is **new**; user has permission to take.
2. User clicks **Take brief** (panel or context menu).
3. System assigns brief to current user (owner); status can stay “new” or move to “in progress” per product rule. Change appears immediately for all pod members.
4. No confirmation dialog; no “Assign to me?” step.

### 4.7 Moving status (in progress → review → delivered)

1. **Mark in progress**: available when brief is new or in progress; sets or keeps status “in progress”.
2. **Move to review**: available when in progress; sets status “review”.
3. **Deliver and send to client**: available when in progress or review; sets status “delivered”, and deliverable files (if any) become visible to client. No separate “delivery confirmation” screen; state change is the confirmation.

### 4.8 Messaging (internal)

1. User selects brief → panel → Messages; can filter **internal** (pod) vs **client**.
2. User types and sends internal message → only pod sees it. Client never sees internal messages.
3. User sends message to client → visible in client thread; client sees it in real time.
4. All messaging is in-context (per brief); no global chat.

### 4.9 Uploading deliverables and delivering

1. User opens brief → **Upload deliverables** (panel or context menu).
2. User selects file(s); upload starts. Progress can be shown inline (e.g. progress bar) for long uploads.
3. When ready, user clicks **Deliver and send to client** (or equivalent). Status becomes “delivered”; files visible to client.
4. If upload fails: minimal inline error (e.g. “Upload failed”); retry per file if supported.

### 4.10 Set deadline / Reassign owner (lead or admin)

1. **Set deadline**: User opens Properties (or dedicated control), sets date/time. Saved immediately; no modal “Saved”.
2. **Reassign owner**: User opens Properties, selects another pod member as owner. Brief ownership updates in real time for everyone.

### 4.11 Folders

1. **New folder**: Right-click on empty canvas → New folder. Folder appears on canvas; user can rename (e.g. via Properties or inline).
2. **Move brief into folder**: Drag brief onto folder, or use menu “Move to folder” and choose folder. Position and folderId update; persisted.
3. **Open folder**: Click folder to open (navigate into folder or expand in place, per implementation). **Rename folder**, **New folder** inside, **Properties** via context menu.
4. **Delete folder**: Only if supported and permitted; confirmation minimal (e.g. “Delete this folder?”).

### 4.12 Search

1. User types in the search field in the top bar.
2. Canvas (or list) filters to briefs matching title or owner; folders may stay visible. Clearing search restores full view.
3. No “Search results” headline; filtering is implicit.

### 4.13 Settings (internal user)

1. User clicks **Settings** (from pod canvas or no-access page) → `/#/settings`.
2. User sees: Sign out, and (if admin) Pods, Brands, Access keys, etc. Non-admin may only see Sign out and maybe profile.
3. **Sign out** → session cleared, redirect to `/#/login`. No “Are you sure?”.

---

## 5. Admin flows

### 5.1 Admin: same as pod member plus

- Can open any pod (e.g. from no-access or pod switcher).
- In Settings: create/edit/archive **pods**; create/edit/archive **brands**; assign **pod lead**; generate/copy **access keys** for brands.
- Can **reassign** brief owner, **set deadline**, and **delete** brief (if implemented and permitted by role).

### 5.2 Creating a pod

1. Settings → Pods → Create Pod.
2. Enter name, slug (optional, can derive from name), description (optional), pod lead (optional).
3. Submit → pod appears in list; user can go to `/#/pod/:podSlug` and see empty canvas (or with default folder).

### 5.3 Creating a brand and sharing client link

1. Settings → Brands → Create brand (or equivalent). Enter name, slug, associate with a pod.
2. System creates brand and (optionally) an access key. Admin **copies** brand link (e.g. `https://app.dropam.com/#/drop/brand-slug?key=...`) and shares with client.
3. Client uses link + key to open drop page and drop briefs; briefs appear on that pod’s canvas.

### 5.4 Assigning pod lead

1. Settings → Pods → Edit pod → choose **Pod lead** from list (users with appropriate role).
2. Save. Lead can reassign briefs, set deadlines, etc., per permissions.

### 5.5 Observing flow (no dashboards)

Admin “observes flow” by being on the pod canvas: seeing briefs, who owns what, load and distribution. No charts, KPIs, or productivity metrics (per DROPAM_CORE). Rebalancing = reassigning owners or moving work, not “managing performance”.

---

## 6. Canvas and spatial flows

### 6.1 Dragging briefs and folders

1. User drags a brief or folder on the pod canvas.
2. Item follows pointer; release at any pixel position. No grid, no snap, no rounding.
3. On release, new position is persisted; all users see the update in real time.
4. Drag hit target = full tile (icon + label), not just the label.

### 6.2 Pan and zoom (if implemented)

- Pan/zoom affect viewport only. Drag still uses world coordinates; drop position is correct after pan/zoom.
- No momentum on drag (per DROPAM_CORE).

### 6.3 Multi-select (if implemented)

- Lasso or Shift+click selects multiple briefs. Panel may show shared actions or “N selected”. Actions (e.g. move to folder, status change) apply to selection per product rules.

### 6.4 Empty canvas (internal)

- Right-click on empty area → **New folder**. No “Refresh”; realtime makes refresh unnecessary.

---

## 7. Brief lifecycle flows

### 7.1 Status sequence

Only these statuses, in this order:

- **new** → **in progress** → **review** → **delivered**

No branching, no silent skip. Transitions are immediate; no “Submit” ritual.

### 7.2 Who can do what (typical)

- **new → in progress**: Take brief (assigns owner); or “Mark in progress”.
- **in progress → review**: “Move to review” (owner or lead/admin).
- **review → delivered**: “Deliver and send to client” (owner or lead/admin); deliverables become visible to client.
- **delivered**: No further status change; client can view and download. Optional: internal “reopen” or archive per product rules.

### 7.3 State visibility

- **Pod**: sees all statuses and owner. Realtime updates.
- **Client**: sees minimal status (e.g. “delivered” when done) and deliverable files; no internal labels (e.g. no “pod”, “in progress”).

---

## 8. Messaging flows

### 8.1 Client → pod

1. Client selects brief, opens panel, types message, sends.
2. Message is stored with visibility “client”. Pod sees it in the brief’s message thread in real time.
3. Pod replies with “client” visibility → client sees reply in thread in real time. No unread badges; open thread shows latest.

### 8.2 Pod internal

1. Pod member sends “message to pod” (internal visibility). Only pod sees it; client does not.
2. All internal messages are in the context of one brief. No global chat room.

### 8.3 Failure

- Send fails → minimal inline “Message not sent”; input preserved; user can retry. No global alert.

---

## 9. Delivery flows

### 9.1 Pod delivers

1. Pod uploads files via “Upload deliverables”.
2. Pod clicks “Deliver and send to client” (or equivalent). Status → delivered; deliverables marked visible to client.
3. Client view updates in real time: brief shows delivered; files appear in panel for download.

### 9.2 Client receives

1. Client has drop page open (or returns via brand link + key).
2. Sees brief as “delivered” and in panel sees deliverable files; can download. No email step; no separate delivery page.

### 9.3 Partial failure

- If some files fail to upload, show failed items inline with retry. Successful uploads are reflected; only failed part needs retry.

---

## 10. Error and edge flows

### 10.1 Invalid or missing client access key

- No key in URL and none stored → show access key input.
- Wrong key → minimal message (e.g. “Invalid access key”); user can re-enter. No apology, no long copy.

### 10.2 Client: no briefs yet

- Empty state: only “Drop your brief here” (and optional “Drag a file onto this page”). No tips, no onboarding.

### 10.3 Realtime disconnect (internal or client)

- App attempts silent reconnect and re-sync. Only if reconnection fails repeatedly, show minimal message (e.g. “Connection unstable”). No “Reconnect” button unless necessary.

### 10.4 Network drop during action

- Preserve input (e.g. message draft, file selection). Pause action; resume or retry when possible. User should not lose work.

### 10.5 Session expired (internal)

- Redirect to login; optionally restore route after login. No “Session expired” message required (per DROPAM_STATE).

### 10.6 No access (internal)

- User is logged in but has no pod (and is not admin) or no brand (client role) → `/#/no-access`. User sees: list of pods/brands they can open, or “Initialize system” (admin) or “Contact … to get access” (client). Link to Settings.

### 10.7 Not found

- Unknown `podSlug` or `brandSlug` → minimal “Not found” or redirect to no-access / login as appropriate.

### 10.8 Destructive actions

- **Delete brief** or **Delete folder**: One short confirmation (e.g. “Delete this folder?”). No dramatic copy, no “Cannot be undone” required (per DROPAM_COPY). Confirm → delete; Cancel → stay.

---

## 11. Exit flows

### 11.1 Client

- Close tab or navigate away. No sign-out. Next visit = same link + key (and optional stored key).

### 11.2 Internal

- **Sign out**: Settings → Sign out. Session cleared; redirect to `/#/login`. No confirmation. After that, protected routes redirect to login.

---

## Flow summary (one-page view)

| Actor | Entry | Primary action | Exit |
|-------|--------|----------------|------|
| **Client** | Brand link + access key | Drop briefs; view status; send message; download delivered files | Close tab |
| **Pod member** | Login → pod canvas | See briefs; take brief; change status; message; upload deliverables; deliver | Sign out (Settings) or close |
| **Pod lead** | Same | Same + reassign, set deadline | Same |
| **Admin** | Same | Same + create pods/brands; assign lead; copy access keys; observe flow | Same |

- **Realtime**: All brief, message, and file changes sync without refresh.
- **No wizards**: Linear, shallow actions; no onboarding tours or progress meters.
- **Confirmation**: Only for irreversible destructive actions; one short sentence.
- **Errors**: Minimal, inline, non-apologetic; retry when possible.

This document is the **extensive user flow** for Dropam. For contractual rules on copy, state, and flow philosophy, see DROPAM_COPY.md, DROPAM_STATE.md, and DROPAM_FLOW.md.

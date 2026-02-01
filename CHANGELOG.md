# Dropam OS Changelog

## Fix drag world coords, remove date field, add timestamps, clean menus, refine side panel

- **Drag**: All positioning in world coordinates. SpatialCanvas exposes `getWorldFromClient` (screenToWorld); `worldToClient` in coords and `getClientFromWorld` in SpatialCanvas for worldToScreen. useDesktopDrag uses grab offset in world space; cursor stays attached under pan/zoom. Movement threshold differentiates click vs drag; no shadow/scale on drag (BriefIcon, FolderIcon).
- **Side panel**: Removed date picker from Properties. Added read-only timestamps at bottom (Created, Updated, Delivered when available). Properties shows owner only. "Brief Files" renamed to "Files".
- **Tile**: BriefIcon shows subtle timestamp (e.g. 01 Feb, 06:12) from `createdAt`/`submittedAt`.
- **Top bar**: PodCanvasPage shows user name and role (e.g. "Justin, Admin", "Esther, Pod member") near Settings.
- **Context menu**: Removed disabled "Mark in progress". ContextMenu styling: shadow-sm, soft border (minimal).
- **Types/Data**: Brief has optional `createdAt`, `updatedAt`; mapBriefRow and realtime UPDATE merge them. docs/proofs/ README lists proof screenshot names.

---

## Summary of Changes (Launch-Ready OS-Style Product)

### A) Freeform Drag (No Grid Snapping)

- **pages/PodCanvasPage.tsx**: Uses `pos + info.offset` for brief and folder positions. No snapToGrid or GRID_CELL_SIZE. Positions written directly to DB.
- **components/BriefIcon.tsx**: Reduced `whileDrag` scale from 1.1 to 1.02 for subtle feedback.
- **components/FolderIcon.tsx**: Same scale reduction.
- **contexts/ActionContext.tsx**: `updateBriefPosition` and `updateFolderPosition` persist exact x/y to Supabase with no rounding.
- **components/SpatialCanvas.tsx**: Removed spring transition (`transition={{ duration: 0 }}`) for direct pan/zoom feel.

### B) Removed Mock Data and Mock Users

- **services/mockData.ts**: Deleted.
- **components/SpatialCanvas.tsx**: Removed MOCK_CURSORS and fake live presence simulation entirely.
- **contexts/UserContext.tsx**: No DEFAULT_SESSION or localStorage role switching. Session from Supabase Auth + profiles.

### C) Real Auth and RLS

- **supabase_schema.sql**: Updated profiles (role check, default `pod_member`), added `lead_id` to pods, `author_id` to messages.
- **supabase/migrations/001_profiles_auth_rls.sql**: New migration with RLS policies for profiles, pods, brands, folders, briefs, brief_files, messages.

### D) Real Auth Flows

- **pages/LoginPage.tsx**: Sign-in only. Link to `/signup`.
- **pages/SignupPage.tsx**: New page. Account type (Client / Team). Optional brand selection for clients.
- **App.tsx**: Routes for `/login`, `/signup`, `/logout`. `LogoutRedirect` component.
- **contexts/UserContext.tsx**: Profile creation uses `user_metadata` (role, brand_id) from signup.

### E) OS-Style Behaviors

- **components/SpatialCanvas.tsx**: Zoom centered on cursor (ctrl+wheel). Pan via space+drag or middle-click. Lasso selection on empty canvas. No spring on transform.
- **pages/PodCanvasPage.tsx**: Settings link in top bar. `deleteFolder` wired from `useActions`.

### F) Client Access Control

- **pages/ClientDropPage.tsx**: Clients redirected to `/no-access` if `currentUser.brandId !== brand.id`.
- **pages/NoAccessPage.tsx**: Client without brand sees “Your account isn’t assigned to a brand yet.” Clients only see their assigned brand in the list.

### G) Admin Capability

- **components/CommandPalette.tsx**: Admin-only section: Manage People, Assign Pod Lead, Settings.
- **pages/SettingsPage.tsx**: Assign Pod Lead per pod. Workload: Free (0–2), Busy (3–5), Overloaded (6+). Manage People (role, pod, brand).
- **contexts/DataContext.tsx**: Added `setPods`, realtime subscription for pods updates.
- **types.ts**: Pod has `leadId`, `leadName` optional. `UserRole` includes `pod_member` (replaces `creative`).

### H) Messages and Profile Mapping

- **contexts/ActionContext.tsx**: `addMessage` includes `author_id` from `currentUser.id`.
- **contexts/UserContext.tsx**: Maps `creative` → `pod_member` for legacy profiles.

### Files Changed

| File | Changes |
|------|---------|
| `pages/PodCanvasPage.tsx` | deleteFolder, Settings link |
| `pages/ClientDropPage.tsx` | Client brand access check |
| `pages/LoginPage.tsx` | Sign-in only, Link to signup |
| `pages/SignupPage.tsx` | **New** |
| `pages/NoAccessPage.tsx` | Client no-brand copy, brand filtering |
| `pages/SettingsPage.tsx` | Pod lead assignment, workload badges |
| `App.tsx` | /signup, /logout, LogoutRedirect |
| `contexts/UserContext.tsx` | Metadata-based profile creation |
| `contexts/DataContext.tsx` | setPods, pods realtime |
| `contexts/ActionContext.tsx` | author_id in messages |
| `components/SpatialCanvas.tsx` | No MOCK_CURSORS, zoom-to-cursor, no spring |
| `components/BriefIcon.tsx` | Subtle drag scale |
| `components/FolderIcon.tsx` | Subtle drag scale |
| `components/CommandPalette.tsx` | Admin section |
| `types.ts` | pod_member, Pod.leadId |
| `supabase_schema.sql` | profiles role, lead_id, author_id |
| `supabase/migrations/001_profiles_auth_rls.sql` | **New** migration |

### Deleted

- `services/mockData.ts`

---

## DROPAM_CORE Implementation (Product Contract)

### 1. Changelog (file paths and why)

| File | Why |
|------|-----|
| **docs/DROPAM_CORE.md** | New. Product contract: realtime mandatory, free drag, right-click parity, minimal client UI, Mac desktop feel, sign out. |
| **README.md** | Link to docs/DROPAM_CORE.md and pre-merge note: any PR that violates it must be rejected. |
| **contexts/DataContext.tsx** | Realtime: INSERT briefs (fetch full), UPDATE/DELETE briefs, brief_files (INSERT/UPDATE/DELETE), messages (INSERT/DELETE). Reconnect: refetch silently on channel error. Expose refetchSilent. mapBriefRow shared. |
| **pages/ClientDropPage.tsx** | Realtime: poll getClientBriefs every 2s when tab visible. Minimal client UI: white canvas, top-left “Dropam” + brand name, centered “Drop your brief here” + “Drag a file onto this page” only (no card). Removed gradients/blobs/footer. |
| **components/BriefIcon.tsx** | dragElastic={0}, no bounce. Selection: subtle gray ring/bg (150ms ease-out). Full tile clickable. |
| **components/FolderIcon.tsx** | dragElastic={0}. Selection: subtle gray ring (150ms ease-out). Full tile clickable. |
| **components/SpatialCanvas.tsx** | White background. No grid/snap. |
| **contexts/ActionContext.tsx** | updateBriefTitle, updateFolderName. All position writes raw x/y (no rounding). |
| **actions/briefActions.ts** | New. Single source for brief context menu: getBriefContextMenuItems(brief, actions, user, callbacks). Same handlers as side panel. |
| **actions/folderActions.ts** | New. getFolderContextMenuItems, getCanvasContextMenuItems. Move briefs here, delete folder. |
| **pages/PodCanvasPage.tsx** | Context menu from briefActions/folderActions. focusMeta for Properties. Same handlers as side panel. |
| **components/SidePanel.tsx** | 150ms ease-out (no spring). focusMeta, onMetaBlur. Properties section: deadline, owner. Same actions as context menu. |
| **components/ContextMenu.tsx** | Unchanged; used by both brief and folder menus. |
| **pages/SettingsPage.tsx** | Sign out: await signOut(); navigate('/login'). Button label “Sign out”. |
| **ContextMenu.tsx** | Already clips to viewport (adjustedX/adjustedY). |

### 2. Realtime subscriptions implemented and scopes

| Subscription | Table | Scope | Events | Purpose |
|--------------|-------|--------|--------|---------|
| public:briefs | briefs | All rows | INSERT, UPDATE, DELETE | New brief appears on pod canvas; position/status/owner updates; brief removed. |
| public:folders | folders | All rows | INSERT, UPDATE, DELETE | Folder add/move/delete. |
| public:brief_files | brief_files | All rows | INSERT, UPDATE, DELETE | Deliverables/attachments; visible_to_client (Delivered) updates. |
| public:messages | messages | All rows | INSERT, DELETE | New messages in thread; message delete. |
| public:pods | pods | All rows | UPDATE | Pod lead/name updates. |

**Client drop page:** No Supabase auth; uses Edge Functions + access key. Realtime via **polling**: getClientBriefs every 2s when document.visibilityState === 'visible'. Refetch after createClientBrief / sendClientMessage.

**Reconnect:** On briefs channel SUBSCRIBED status callback, if status === 'CHANNEL_ERROR', call refetchSilent() once (no loading spinner).

### 3. Removed snapping / rounding (where it used to exist)

- **No snapToGrid or GRID constants** were present; none added. Confirmed no Math.round on position in ActionContext or DataContext.
- **Positions:** Stored and applied as raw `position_x`, `position_y` (Number from DB). No rounding in updateBriefPosition, updateFolderPosition, addBrief, createFolder, unstackBrief.
- **Drag:** BriefIcon and FolderIcon use `pos + info.offset` (world space inside scaled container). Added **dragElastic={0}** and kept **dragMomentum={false}** to prevent bounce/momentum.

### 4. Right-click actions and which handlers they call

**Brief (internal pod)**  
- Open details → openDetails() → setSelectedBrief, setPanelState({ activeTab: 'details' })  
- Take brief → assignBrief(brief.id, currentUser.id, currentUser.name)  
- Mark in progress → disabled when already in progress  
- Move to review → updateBriefStatus(brief.id, 'review')  
- Deliver and send to client → updateBriefStatus(brief.id, 'delivered')  
- Send message to client → openMessagesClient() → panel messages, client filter  
- Send message to pod → openMessagesPod() → panel messages, internal filter  
- Upload deliverables → openDelivery() → open panel  
- Set deadline → openProperties() → panel + focusMeta (Properties: deadline input)  
- Reassign owner → openProperties() → panel Properties  
- Properties → openProperties()  
- Rename → openDetails()  
- Delete → deleteBrief(brief.id) (admin) or disabled  

**Folder (internal pod)**  
- Open folder → openFolder() → setSelectedIds([folder.id])  
- Rename folder → openFolder()  
- New folder → createFolder(podId, 'New folder', position)  
- Properties → openFolder()  
- Move briefs here → moveBriefToFolder(id, folder.id) for each selectedIds  
- Delete folder → deleteFolder(folder.id)  

**Canvas (empty)**  
- New folder → createFolder(pod.id, 'New folder', { x: 200, y: 200 })  

**Client brief**  
- View → setSelectedBrief(brief)  
- Send message → setSelectedBrief(brief)  
- Refresh → getClientBriefs then setBriefs  

All brief/folder actions use the same handlers as the side panel (ActionContext + PodCanvasPage callbacks).

### 5. 10-step manual QA script

1. **Realtime without refresh (pod)**  
   Open pod canvas in two tabs. In tab A: create/move a brief or change status. In tab B: confirm the change appears without refresh.

2. **Realtime without refresh (client)**  
   Open client drop link and pod canvas. From pod: create brief or mark delivered. On client: within ~2s (poll) confirm list/status updates without refresh.

3. **Realtime messaging**  
   Open same brief in pod panel and client panel. Send message from one; confirm it appears in the other without refresh.

4. **Free drag persists**  
   Drag a brief to an odd position (e.g. x=413, y=287). Refresh. Confirm the brief is in the same position.

5. **Free drag folders**  
   Drag a folder to an odd position. Refresh. Confirm the folder is in the same position.

6. **Right-click parity (brief)**  
   Right-click a brief. Confirm menu has Open details, Take brief (if new), Move to review, Deliver and send to client, Send message to client/pod, Upload deliverables, Set deadline, Reassign owner, Properties, Rename, Delete (or disabled). Run Take brief / Move to review / Deliver from the menu and confirm they work like the side panel.

7. **Right-click parity (folder)**  
   Right-click a folder. Confirm Open folder, Rename folder, New folder, Properties, Move briefs here, Delete folder. Run New folder and Delete folder; confirm they work.

8. **Client UI minimal**  
   Open client drop link (with access key). Confirm: white canvas only; top-left “Dropam” and brand name; centered “Drop your brief here” and “Drag a file onto this page”. No card, no border, no extra UI until files exist.

9. **Sign out**  
   Log in as admin. Go to Settings. Click “Sign out”. Confirm: session cleared, redirected to login, and /pod/* is not accessible without logging in again.

10. **Mac desktop feel**  
    On pod canvas: white background, subtle selection (gray ring), 150ms panel slide, no spring. Click empty space to clear selection and close panel. Single and double click on brief/folder work; right-click opens context menu. No grid snap or bounce on drag.

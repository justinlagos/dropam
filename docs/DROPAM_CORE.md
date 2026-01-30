# Dropam Product Contract (DROPAM_CORE)

**Primary rule:** This document is the single source of truth. If anything conflicts with DROPAM_CORE.md, the implementation must follow DROPAM_CORE.md. The system must follow it.

---

## Deliverable outcome

- Dropam behaves like a minimal Mac desktop on a white canvas.
- No manual refresh is ever needed. Realtime is mandatory.
- Dragging is freeform. No grid. No snapping. No rounding.
- Right click works and mirrors side panel actions.
- Client desktop has no centered card. Only instruction text: "Drop your brief here".
- Admin settings includes a Sign out button and it works.

---

## 1. Realtime is mandatory. No manual refresh.

Users must never refresh to see activity.

### Requirements

**Realtime briefs**
- When a client drops a brief, it must appear instantly on the correct pod canvas without refresh.
- When a pod member takes a brief or changes status, client drop view updates instantly.
- When deliverables are uploaded and marked delivered, client sees Delivered instantly.

**Realtime messaging**
- Messaging must be instant both ways.
- Client sends message to pod, pod sees it instantly with no refresh.
- Pod replies, client sees it instantly with no refresh.
- If the message thread is open, new messages appear in real time.

### Implementation

- Use Supabase realtime subscriptions on: **briefs** table, **messages** table, **files** table.
- Subscribe per scope: **pod_id** for internal pod pages, **brand_id** for client drop pages, **brief_id** for open panel thread.
- Update local state on INSERT, UPDATE, DELETE events.
- Do not refetch entire lists on each event. Patch state in memory.
- Handle reconnect: if realtime drops, refetch once silently, then resubscribe.

---

## 2. Free drag movement. No grid. No snap. No rounding.

- Files and folders move freely like a Mac desktop.
- User can place an item at any pixel position.
- When the user releases, it stays exactly there.
- After refresh, it appears exactly there.
- No grid snapping, no rounding, no hidden alignment.

### Implementation

- Remove all snapToGrid logic everywhere.
- Remove any GRID constants and rounding.
- Persist raw x and y to DB as stored coordinates.
- Use canvas world coordinates, not viewport coordinates.
- If pan and zoom exists, dragging must remain correct in world coordinates.
- Turn off drag momentum.
- Ensure draggable hit target is the full tile, not just the filename.

---

## 3. Right click must work and mirror side panel actions

- Right click on a file icon shows a context menu containing the same key actions available in the right side panel for that item.
- Every menu item must be functional.
- Entire tile is clickable and right-clickable, not only the label.

### Context menu for a brief (internal pod)

- Open details
- Take brief (if unassigned)
- Mark in progress
- Move to review
- Send message to client
- Send message to pod
- Upload deliverables
- Deliver and send to client
- Set deadline (lead or admin)
- Reassign owner (lead or admin)
- Properties (opens panel and focuses meta)
- Rename if supported
- Delete only for admin (optional, default hidden or guarded)

### Context menu for a folder (internal pod)

- Open folder
- Rename folder
- New folder
- Properties

### Context menu on empty canvas

- New folder
- Refresh optional but should not be needed

### Context menu rules

- Opens at cursor position.
- Must not clip off screen.
- Click outside closes it.
- Disabled items show disabled state, not hidden.
- Clicking an action triggers instantly and state updates in realtime.

### Technical requirement

- Use a single source of truth for actions. Side panel buttons and context menu items must call the same handlers. Do not duplicate logic. Extract brief actions into a shared module (e.g. actions/briefActions.ts, actions/folderActions.ts). The UI must be thin; actions are centralized.

---

## 4. Client desktop UI must be ultra minimal (no card)

- Pure white canvas.
- Top left: small label shows product name **Dropam** and brand name.
- Centered only text, no card, no border: **"Drop your brief here"**.
- Optional smaller line below: **"Drag a file onto this page"**.
- No other UI until a file appears.
- Once files exist, show them as desktop icons.

**Client context menu:** View, Send message, Refresh optional but should not be needed.

---

## 5. Mac desktop feel. Minimal. More white space.

- Icons look like files on a blank desktop.
- Selection highlight is subtle, not loud.
- Dragging feels direct and smooth: no snap, no bounce.
- Right click opens a simple context menu.
- Side panel slides in smoothly from right.
- Clicking empty space clears selection and closes panel.
- Double click can open; single click must also work.

### Visual rules

- White background, no gradients.
- No shadows except extremely subtle on hover.
- 150ms ease out for UI transitions.
- No spring animations.
- Large canvas padding and whitespace.

---

## 6. Sign out in admin settings

- Admin settings must include a **Sign out** button.
- It must end the session and return to login.
- After sign out, protected routes must not be accessible.

---

## Non-negotiable release gate

If any part violates this document, it does not ship.

---

## APPENDIX: DATA PHILOSOPHY (READ BEFORE ASKING FOR ANALYTICS)

This appendix clarifies how Dropam treats data.

Dropam is **data-aware**, not **data-interpretive**.

---

### A. WHAT DROPAM COLLECTS (SILENTLY)

Dropam naturally collects **raw operational data** as a byproduct of work moving.

This includes:
- brief creation timestamps
- brief state changes and timestamps
- ownership and reassignment events
- file uploads and deliveries
- message events
- current brief distribution across pods and people

No additional tracking is added beyond what is required for the system to function.

---

### B. WHAT DROPAM DISPLAYS (IN REAL TIME)

Dropam displays:
- the current state of work
- who is holding what
- where congestion exists
- where space exists

This is shown:
- spatially
- visually
- live

No abstraction.
No aggregation.
No interpretation.

The canvas **is the visibility layer**.

---

### C. WHAT DROPAM REFUSES TO DISPLAY

Dropam will never display:
- charts
- graphs
- KPIs
- productivity scores
- performance rankings
- efficiency metrics
- comparative analytics

These are **interpretive tools**, not operational ones.

The moment interpretation enters the surface, Dropam stops being an operating system and becomes a management tool.

---

### D. WHERE ANALYSIS BELONGS (INTENTIONALLY OUTSIDE)

Analysis belongs:
- in exports
- in spreadsheets
- in reports
- in BI tools
- in review meetings
- in human conversations

Not inside the operating surface.

Dropam supports this by:
- keeping clean, structured data
- allowing export or read access
- not editorializing the data

---

### E. THE CORE DISTINCTION (NON-NEGOTIABLE)

Dropam answers:
"What is happening right now?"

Dropam refuses to answer:
"How well are people performing?"

This boundary is permanent.

---

### F. WHY THIS BOUNDARY EXISTS

The moment performance metrics appear inside the system:
1. People optimize for numbers, not work
2. Work becomes political
3. The desktop metaphor collapses
4. The surface becomes hostile

Dropam exists to **support work**, not measure humans.

---

### G. ADMIN VISIBILITY DEFINED

When we say:
"Admin may observe flow"

We mean:
- seeing load
- seeing congestion
- seeing idleness
- seeing imbalance

The same way one observes:
- a crowded desk
- an empty room
- a busy studio

No scoring.
No judgment.
No ranking.

---

### H. FINAL RULE

If a data feature requires:
- explanation
- interpretation
- justification
- performance framing

It does not belong in Dropam.

Data exists.
Insight exists.
Judgment does not live here.

This boundary is final.

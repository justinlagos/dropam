# DROPAM_FLOW.md
## The User Flow Contract of Dropam

This document defines the **end-to-end and moment-to-moment user flow** of Dropam.

It governs:
- how users enter
- how they act
- how work moves
- how work leaves
- how nothing ever feels stuck

This is not a feature list.
This is the **movement logic** of the system.

If a flow feels confusing, slow, or app-like, it is wrong.

Dropam does not guide users.
Dropam **lets users move**.

---

## 0. CORE FLOW PHILOSOPHY

Flows in Dropam must be:
- linear
- shallow
- reversible
- interruption-tolerant

Users should never wonder:
- "What do I do next?"
- "Where am I?"
- "What just happened?"

If they do, the flow is broken.

---

## 1. MACRO FLOWS (END-TO-END)

### 1.1 Client → Delivery Flow (Primary)

This is the most important flow.

Client:
1. Opens brand link
2. Sees white canvas
3. Drops brief
4. Leaves

Internal:
5. Pod sees brief instantly
6. Someone takes it
7. Work progresses
8. Work is delivered

Client:
9. Sees delivered state
10. Downloads files
11. Optionally sends a message
12. Leaves

No step requires explanation.

---

### 1.2 Internal Daily Flow (Pod Member)

Pod member:
1. Opens Dropam
2. Lands directly on pod canvas
3. Sees briefs spatially
4. Picks one up
5. Works
6. Delivers
7. Leaves

No inbox.
No dashboard.
No task list.

---

### 1.3 Admin Flow (Caretaker)

Admin:
1. Logs in
2. Creates pods
3. Creates brands
4. Assigns pod leads
5. Observes flow
6. Rebalances if needed
7. Logs out

Admin never micromanages work.
Admin maintains flow.

---

## 2. ENTRY FLOWS

### 2.1 Client Entry

- Client never logs in
- Client never creates an account
- Client enters through a unique brand link

On entry:
- white canvas
- minimal instruction text

There is no onboarding.
The surface explains itself.

---

### 2.2 Internal User Entry

- Internal users authenticate once
- On login, they land directly on their pod canvas
- No intermediate screens
- No home dashboard

If a user belongs to multiple pods:
- they choose once
- system remembers choice

---

## 3. CANVAS-LEVEL MICRO FLOWS

These are the flows that happen **every minute**.

### 3.1 Seeing Work

- Briefs appear automatically
- No refresh
- No notification banners

Presence is implied, not announced.

---

### 3.2 Selecting a Brief

User:
- single-clicks a brief

System:
- highlights it subtly
- opens side inspector

There is no "open" button.

---

### 3.3 Acting on a Brief

User may:
- right-click
- use side inspector

Both surfaces offer the same actions.

Action executes immediately.
State updates silently.

---

### 3.4 Moving Things

User:
- drags a brief or folder

System:
- follows pointer exactly
- persists position
- reflects change for all users

No snap.
No alignment.
No correction.

---

## 4. MESSAGING FLOW

### 4.1 Client Messaging

Client:
- opens brief
- types message
- sends

System:
- delivers instantly
- shows message in thread
- no confirmation

Pod:
- sees message instantly
- replies

Client:
- sees reply instantly

No refresh.
No unread badges.
No "new message" alerts.

---

### 4.2 Internal Messaging

Internal users:
- message within a brief
- message within a pod

Messages are contextual.
There is no global chat.

---

## 5. STATE TRANSITION FLOWS

### 5.1 Taking a Brief

User:
- clicks "Take brief"

System:
- assigns ownership
- updates state
- reflects change instantly

No confirmation.
No modal.

---

### 5.2 Progressing Work

User:
- marks in progress
- moves to review
- delivers

Each action:
- updates state
- updates for all users
- preserves continuity

There is no "submit" ritual.

---

## 6. DELIVERY FLOW

User:
- uploads deliverables
- clicks deliver

System:
- marks delivered
- exposes files to client
- notifies via state change

Client:
- sees delivered
- downloads files

No email dependency.
No "delivery confirmation" page.

---

## 7. ERROR & INTERRUPTION FLOWS

### 7.1 Temporary Failure

If something fails:
- state remains unchanged
- user stays in context
- system retries silently

Only surface error if retry fails.

---

### 7.2 Network Drop

If network drops:
- preserve user input
- pause action
- resume automatically

User should never lose work.

---

## 8. EXIT FLOWS

### 8.1 Client Exit

Client can leave at any time.
No sign-out.
No session awareness.

---

### 8.2 Internal Exit

Internal users:
- may sign out from settings
- return to login
- lose access to protected routes

No ceremony.

---

## 9. FLOW ANTI-PATTERNS (FORBIDDEN)

Dropam must never introduce:
- multi-step flows
- wizards
- setup screens
- onboarding tours
- checklists
- progress meters

If a flow needs explanation, it is wrong.

---

## 10. CHANGE CONTROL (FLOW)

Before changing any flow, ask:

- Does this add steps?
- Does this add decisions?
- Does this interrupt movement?
- Does this feel like an app?

If yes, do not ship.

---

## 11. FINAL AUTHORITY

This document defines how Dropam **moves**.

If:
- users hesitate
- users look for buttons
- users ask "where do I…"

The flow has failed.

Dropam does not direct.
Dropam allows.

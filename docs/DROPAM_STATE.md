# DROPAM_STATE.md
## The State, Transitions, Errors, and Failure Contract of Dropam

This document defines how Dropam **behaves over time**.

It governs:
- loading
- waiting
- transitions
- errors
- failures
- recovery

Any implementation that violates this document breaks the operating system model of Dropam.

If something "works" but introduces friction, noise, or waiting rituals, it is wrong.

Dropam does not announce state.
Dropam **moves**.

---

## 0. CORE PHILOSOPHY

State should be:
- quiet
- implicit
- self-resolving

Users should rarely notice state changes.
They should feel continuity, not transitions.

If a user thinks:
"Something is loading"
then the system has already failed.

---

## 1. LOADING STATES

### 1.1 Default Rule

Loading is invisible by default.

If data is not ready:
- show nothing
- preserve layout
- avoid placeholders unless unavoidable

Never block the user with spinners.

---

### 1.2 When Loading Indicators Are Allowed

Loading indicators are allowed only when:
- an action is explicitly initiated by the user
- the action takes longer than 300ms
- silence would feel broken

Examples:
- uploading a large file
- delivering files
- initial authentication handshake

---

### 1.3 Loading Indicator Style

If shown, loading indicators must be:
- minimal
- inline
- quiet

Allowed:
- subtle progress bar
- small inline spinner near the object

Forbidden:
- full-screen spinners
- blocking modals
- "Loading…" text
- animated skeleton screens

---

## 2. ACTION FEEDBACK

### 2.1 Success Feedback

Success is implied.

Do not display:
- success banners
- confirmation toasts
- checkmarks
- celebratory animations

The UI changing state is the confirmation.

Example:
- Brief moves from new → in progress
- Status label updates
- Panel reflects new state

That is enough.

---

### 2.2 Pending Feedback

While an action is pending:
- disable the triggering control
- keep context visible
- avoid blocking unrelated actions

Never freeze the canvas.

---

## 3. STATE TRANSITIONS (CRITICAL)

### 3.1 Brief Lifecycle

The brief lifecycle is linear and quiet:

- new
- in progress
- review
- delivered

Rules:
- no branching
- no skipping states silently
- transitions must be instant or near-instant

If a transition fails:
- remain in previous state
- show minimal error feedback

---

### 3.2 Transition Animations

State transitions must:
- be visually subtle
- use opacity or label change
- complete within 150ms

No movement animations for status changes.

---

## 4. ERROR HANDLING (STRICT)

### 4.1 Error Philosophy

Errors are facts, not events.

They must:
- inform without drama
- appear close to the source
- disappear when resolved

Never interrupt the user flow.

---

### 4.2 Error Language

Error messages must be:
- short
- neutral
- non-apologetic

Correct:
- Upload failed
- Message not sent
- Connection lost

Incorrect:
- Oops, something went wrong
- Sorry, we couldn't send your message
- Please try again

---

### 4.3 Error Placement

Errors must appear:
- inline
- near the action that failed

Forbidden:
- global banners
- modal alerts
- toast notifications
- alert popups

---

## 5. FAILURE MODES & RECOVERY

### 5.1 Realtime Failure

If realtime disconnects:
- attempt silent reconnection
- do not notify the user immediately
- re-sync state once reconnected

Only surface an issue if:
- reconnection fails after multiple attempts

Surface message:
Connection unstable

Nothing more.

---

### 5.2 Network Failure

If network drops during an action:
- pause the action
- preserve user input
- retry automatically when possible

Never lose:
- drafted messages
- file positions
- drag state

---

### 5.3 Partial Failure

If part of an operation succeeds:
- reflect the successful part
- allow retry for the failed part

Example:
- file uploads partially succeed
- show failed files inline
- allow retry per file

---

## 6. AUTHENTICATION STATES

### 6.1 Logged-Out State

Logged-out users:
- see login
- cannot access protected routes
- are redirected cleanly

No flashing content.
No partial renders.

---

### 6.2 Session Expiry

If a session expires:
- redirect to login
- preserve last known route
- restore context after login if possible

Never show:
Session expired messages.

---

## 7. CLIENT STATE HANDLING

### 7.1 Anonymous Client State

Clients:
- do not authenticate
- rely on brand link + key
- must never see auth-related errors

If access fails:
- show nothing
- or a minimal access message

Allowed:
Access unavailable

Nothing else.

---

## 8. EMPTY STATES (STATE, NOT COPY)

Empty states are not features.
They are natural conditions.

Rules:
- never animate empty states
- never explain why it's empty
- never suggest what to do beyond one sentence

---

## 9. MULTI-USER STATE CONSISTENCY

### 9.1 Concurrent Actions

If two users act simultaneously:
- first valid action wins
- second user sees updated state instantly

No conflict dialogs.
No merge screens.

---

### 9.2 Visual Consistency

All users must see:
- the same object positions
- the same statuses
- the same messages

Realtime consistency is mandatory.

---

## 10. STATE & PERFORMANCE

Performance must never leak into UX.

Rules:
- slow operations must degrade gracefully
- UI must remain responsive
- canvas must never freeze

If performance degrades:
- reduce visual feedback
- preserve interactivity

---

## 11. WHAT DROPAM NEVER DOES

Dropam never:
- shows spinners for routine reads
- blocks the entire UI
- asks users to retry manually
- exposes technical errors
- explains backend failures

---

## 12. CHANGE CONTROL (STATE)

Before introducing any new state, ask:

- Is this state visible to the user?
- Can it be implicit instead?
- Can it resolve silently?
- Does it preserve continuity?

If not, do not add it.

---

## 13. FINAL AUTHORITY

This document is final.

If:
- state handling feels "app-like"
- errors feel loud
- loading feels heavy
- recovery feels manual

Then the implementation is wrong.

Dropam does not pause.
Dropam flows.

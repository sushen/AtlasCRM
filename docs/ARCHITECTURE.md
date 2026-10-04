# Architecture

## Current shape

```text
Browser
  |
  +-- index.html -> js/app.js -> views rendered into #app
  +-- login.html -> js/login.js
  |
  +-- js/utils (phone, dates, WhatsApp)
  +-- js/services (store, imports)
  |
  +-- js/firebase.js -> Firebase Authentication / Firestore (when configured)
  +-- localStorage demo store (when unconfigured or ?demo=1)
  |
  +-- supported wa.me link -> WhatsApp (external)
```

## Startup and authentication

`index.html` loads `js/app.js`. If the Firebase placeholder config is still present, the app renders local demo mode. If configured, `onAuthStateChanged` redirects unauthenticated users to `login.html`; authenticated users receive the app shell. `login.html` uses email/password Firebase Authentication.

## Rendering and modules

`js/app.js` owns the current view, shell, dashboard, contacts, profile modal, follow-ups, imports, and settings rendering. `js/services/store.js` is the data/service boundary and switches between Firestore and localStorage. `js/services/imports.js` parses and previews input. `js/utils/phone.js`, `dates.js`, and `whatsapp.js` provide reusable transformations. CSS is split into variables, base rules, layout, and components. `index.html` dynamically imports `app.js` so module-load failures become a visible startup error instead of an endless loading message.

## Data access and workflow

The store reads and writes `customers`, `activities`, and `followups`. Customer creation normalizes a phone and writes an import activity. Status transitions update contact/reply timestamps and append activities. Follow-up creation writes a follow-up, updates `nextFollowUpAt`, and records an activity. The profile displays activities in chronological order.

## WhatsApp and errors

`whatsappUrl` creates a click-to-chat URL from a normalized number; the app opens it in a new tab and records `whatsapp_opened`. It does not inspect WhatsApp. Current UI errors are mostly inline login text, thrown validation errors, and browser prompts/alerts.

## Configuration and responsibilities

Static pages are hosted from the repository root. `firebase.json` points Hosting at `.` and maps Firestore rules/indexes. `js/firebase.js` contains a client Firebase config placeholder; client config is not a secret, but service-account keys never belong here. `firestore.rules` is the authorization boundary.

## Directory responsibilities

`css/` presentation; `js/app.js` UI orchestration; `js/services/` persistence and parsing; `js/utils/` pure helpers; root HTML entry points; `firestore.rules` and `firestore.indexes.json` Firebase policy/configuration; `docs/` durable system knowledge.

## Architectural invariants

- Keep the browser app framework-free and module-based.
- Keep Firebase access behind `js/firebase.js` and service modules.
- Preserve immutable activity history.
- Normalize phone numbers before duplicate detection and WhatsApp links.
- Treat WhatsApp actions as external events, never delivery proof.
- Use authenticated access for Firestore and do not broaden rules casually.
- Keep future sales entities separate from the current contact journey.

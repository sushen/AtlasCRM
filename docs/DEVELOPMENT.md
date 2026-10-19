# Development

For local inventory and supplier-control review, use the loopback workspace in
`LOCAL_WORKSPACE.md`. It uses actual encrypted local storage and real catalog reads
without production CRM writes. Review locally before pushing or deploying.

## Branch-first workflow (2026-10-19)

The operator requires local tests → online feature-branch preview → explicit
acceptance before merging to master. CI checks and an isolated read-only
GitHub Pages preview are prepared; no production deployment occurs on branch push.
See [CI_CD.md](CI_CD.md) for commands, preview limits and promotion procedure.

## Prerequisites

A modern browser is required. The optional WhatsApp backend uses Node 20.19+ and npm (`npm ci --ignore-scripts`). Firebase CLI is needed only for Firebase deployment. Browser source remains build-free; `npm run build:hosting` stages only public assets for Hosting.

## Local setup

For a safe local preview run `python -m http.server 8000` from the repository root and open `http://localhost:8000/index.html?demo=1`. Demo records are stored in localStorage. For Firebase development, configure `js/firebase.js`, enable Email/Password Authentication, create a test user, and deploy or use the configured Firestore project.

Prefer `npm run preview` and `http://127.0.0.1:3000/index.html?demo=1`: this
server exposes only browser assets, unlike a generic root directory server. For
WhatsApp transport use `npm start` after `npm run whatsapp:check`; see
`WHATSAPP_SETUP.md` for runtime config, private Firebase credentials and CLI testing.

For the selected Windows local-send mode, run `npm run start:local`; it reuses
the existing CLI login when ADC is absent and performs read-only readiness probes.
Use the Firebase-hosted app's Settings → WhatsApp sending → This computer. Allow
the browser's local-network permission if prompted. No Firebase billing upgrade
is required for this outgoing path; leave the service running while sending.

## Conventions and workflow

Use ES modules, small service/util modules, escaped user content, normalized phones, and append-only activity records. Inspect code and docs before edits, test affected behavior, review `git diff` and `git status`, then update only materially affected documentation.

## Debugging

Use browser DevTools for module, network, authentication, and Firestore errors. Confirm whether the UI is in demo or Firebase mode before interpreting data. Do not use real customer data for debugging.

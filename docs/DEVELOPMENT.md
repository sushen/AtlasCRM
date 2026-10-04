# Development

## Prerequisites

A modern browser and a static HTTP server are required. Firebase CLI is needed only for Firebase deployment. No package manager or build step exists in the current repository.

## Local setup

For a safe local preview run `python -m http.server 8000` from the repository root and open `http://localhost:8000/index.html?demo=1`. Demo records are stored in localStorage. For Firebase development, configure `js/firebase.js`, enable Email/Password Authentication, create a test user, and deploy or use the configured Firestore project.

## Conventions and workflow

Use ES modules, small service/util modules, escaped user content, normalized phones, and append-only activity records. Inspect code and docs before edits, test affected behavior, review `git diff` and `git status`, then update only materially affected documentation.

## Debugging

Use browser DevTools for module, network, authentication, and Firestore errors. Confirm whether the UI is in demo or Firebase mode before interpreting data. Do not use real customer data for debugging.

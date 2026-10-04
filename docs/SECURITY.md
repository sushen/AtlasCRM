# Security and Privacy

## Current controls

Firebase Authentication gates the configured app and Firestore rules require a signed-in request. Deletes are denied for customers and activities; follow-up deletes are also denied. Demo data lives in browser localStorage and is not a secure store.

## Known limitation

Rules grant any authenticated user read/create/update access to all current records, and broad read/write access to reserved sales collections. There is no owner field, role model, or tenant isolation. This is acceptable only for a single trusted workspace and must be addressed before multi-user use.

## Data handling

Phone numbers and notes are private customer information. Do not put real numbers in source, public JSON, README files, screenshots, fixtures, or logs. Imports and exports require deliberate handling and must not be committed.

Never commit real customer TXT/CSV files, WhatsApp HTML exports, customer database exports, backups containing customer information, credentials, service-account keys, or private environment files. `.gitignore` covers common export locations and secret files while leaving prompt `.txt` files trackable.

## Operational concerns

Review Firebase Authentication providers, rules, indexes, Hosting access, backups, and least privilege before production. Use a separate test project for fictional data. Future multi-user authorization should add ownership and role checks rather than relying on sign-in alone.

# Testing

## Automated tests

No automated test runner or test files currently exists. Pure helpers can be exercised with a browser or an ES-module capable JavaScript runtime. Important coverage targets are phone normalization, duplicate detection, TXT/CSV parsing, WhatsApp URL generation, status transitions, activity logging, follow-up creation, and authentication protection.

## Manual smoke test

Use fictional data: import one contact, confirm `not_contacted`, open WhatsApp, confirm `whatsapp_opened`, mark message sent, confirm `contacted`, schedule a follow-up, record a reply, set `interested`, set `customer`, and inspect the complete timeline. Also test invalid and duplicate rows and a no-Firebase demo session.

## Firebase/security tests

With Firebase configured, verify unauthenticated redirect, authenticated reads/writes, denied deletes, activity ordering, follow-up ordering, and that rules do not expose data to unauthenticated requests. These have not been run in this repository.

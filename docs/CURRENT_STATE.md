# Atlas CRM - Current State

Last Updated: 2026-10-04
Current Milestone: WhatsApp import preview and customer journey MVP
Current Branch: master
Latest Verified Commit: None; `git log` reports no commits

## Working

- Static dashboard, contacts/customers views, profile timeline, follow-ups, imports, subscriptions, templates, settings, and login page exist.
- Demo mode stores customers, activities, and follow-ups in localStorage.
- Firebase service path is implemented with the configured `atlascrm-c5722` web app settings.
- TXT/CSV parsing, Bangladesh/international phone normalization, duplicate preview, private browser backup before import, status updates, follow-up creation, subscription expiry derivation, template previews, and wa.me link generation are implemented in code.

## Partially Working

- Firebase Authentication and Firestore behavior depends on external configuration and has not been verified here.
- The UI uses prompts/alerts for some actions and has limited error/loading handling.
- Status transitions are not validated against an explicit state machine.

## Not Implemented

- Automated tests, payment workflows, pagination, and multi-user ownership.
- Verified production deployment.

## Known Problems

- Firestore rules authorize all authenticated users across records and allow broad writes to reserved collections.
- Startup now reports module, authentication, and initial view failures visibly and in the console.
- No commits exist, so historical change tracking is unavailable.

## Technical Debt

Add tests, improve CSV quoting/validation, centralize authorization/ownership, improve error states, and review encoding of existing UI strings.

## Testing Status

Repository inspection, dependency/path checks, config parsing, and local HTTP smoke checks completed. Browser authentication and production deployment verification require network access and an existing Firebase CLI session.

## What Changed Recently

The repository was inspected and the durable agent/project documentation system was added. Existing application code was not changed.

## Immediate Next Tasks

Configure a Firebase test project, add meaningful automated tests for pure helpers and workflow behavior, then tighten Firestore ownership rules before production use.

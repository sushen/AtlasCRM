# Atlas CRM Agent Guide

## Project identity

Atlas CRM is a private, lightweight CRM for managing WhatsApp leads and customers through a business journey. Atlas owns workflow and history; WhatsApp remains the external communication system.

Primary flow: Contact -> Conversation -> Follow-up -> Customer -> Purchase -> Subscription -> Renewal.

## Technology

The browser implementation is static HTML5, CSS3, and JavaScript ES modules. It uses Firebase Authentication and Firestore when configured, with a localStorage demo fallback. Static Firebase Hosting releases have been verified. An optional framework-free Node backend now supports official WhatsApp Cloud API transport using Firebase Admin; live backend deployment remains pending. Preserve the framework-free architecture unless explicitly instructed otherwise. Read `docs/WHATSAPP_SETUP.md` for transport work.

## Required reading order

Before substantial work, read:

1. `AGENTS.md`
2. `docs/PROJECT.md`
3. `docs/CURRENT_STATE.md`
4. `docs/ARCHITECTURE.md`
5. Documentation relevant to the task
6. The affected source files

For database work also read `docs/DATA_MODEL.md`, `docs/FIREBASE.md`, and `docs/SECURITY.md`. For customer workflow work read `docs/CUSTOMER_JOURNEY.md`. For deployment read `docs/DEPLOYMENT.md` and `docs/SECURITY.md`.

## Context Recovery

A new agent with no conversation history should read this file, then `docs/PROJECT.md` and `docs/CURRENT_STATE.md`; inspect `git status` and recent `git log`; read `docs/ARCHITECTURE.md` and relevant domain documentation; inspect affected code; compare documentation with implementation; and resolve important discrepancies before editing.

## Operating rules

Agents must inspect existing code first, preserve customer history, normalize phone numbers consistently, use server timestamps where appropriate, preserve Firestore security, protect private customer information, test affected behavior, and update authoritative documentation when architecture or project state materially changes. Keep UI, business logic, Firebase access, and utilities separated according to the existing structure.

Agents must not silently replace the stack, introduce unnecessary frameworks, hardcode real customers, commit customer datasets or WhatsApp HTML exports, expose customer numbers in public static files, commit keys or secrets, weaken Firestore security, manipulate WhatsApp Web DOM, treat a WhatsApp link opening as proof of sending or reply, or invent project state.

## Source-of-truth hierarchy

1. Actual running code and configuration
2. `AGENTS.md`
3. Architecture Decision Records
4. `docs/ARCHITECTURE.md`
5. Domain documentation
6. `docs/CURRENT_STATE.md` for current status
7. `README.md`
8. Historical prompts and notes

If documentation conflicts with code, investigate before changing either one.

## Documentation maintenance

A task is incomplete when it materially changes architecture, schema, security, journey behavior, setup, deployment, or project state while leaving authoritative documentation incorrect. Update only affected documents. Code comments explain local implementation reasoning; `docs/` stores system knowledge; ADRs record significant decisions; `CURRENT_STATE.md` stores durable handoff facts; prompts are temporary task instructions.

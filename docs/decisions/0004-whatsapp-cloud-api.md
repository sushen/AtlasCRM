# ADR 0004: Server-side official WhatsApp transport

Status: Accepted
Date: 2026-10-05

## Context

The user requested official Cloud API sending/webhooks while preserving the
static framework-free CRM and existing runtime credentials. Browser code cannot
protect a bearer token or implement a public webhook. Existing persistence is
Firestore with a browser-only localStorage demo fallback; no backend/migrations exist.

## Decision

Add a small Node HTTP service using native fetch and Firebase Admin, rather than
changing the browser stack. Share the existing phone utility. Outbound is an
operator CLI and an authenticated web route with tracked attempts, never an
unrestricted public sender. Require signed raw webhook
bodies, business/phone matching, atomic Firestore deduplication, conservative lead
creation and append-only timeline events. Add transport collections to the same
database; keep business states independent from transport facts. No AI execution.

Stage only browser assets for Firebase Hosting. Backend HTTPS hosting is separate
and has not been deployed. Runtime configuration fills missing Windows inherited
settings without altering saved values. Graph version is explicit, with no default.

## Consequences

Firebase Admin credentials and Meta app secret are required beyond the user's four
existing transport variables. Demo data cannot receive server events. Public HTTPS
and WABA webhook subscription require environment configuration. Processing is
synchronous with acknowledgement after durable writes; a future durable queue can
support increased throughput. No automatic retry is made for ambiguous outbound
failures. Existing broad single-workspace authorization remains a separate issue.

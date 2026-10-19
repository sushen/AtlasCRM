# ADR 0005: Support manual WhatsApp username-only leads

Date: 2026-10-19. Status: Accepted by the operator.

## Context

WhatsApp enquiries may expose a username without the sender's phone. Atlas must
retain the lead and attach products, spending and expiry dates without inventing
a phone or losing the connection when an identifier changes.

## Decision

Retain the existing internal customer document ID as the relationship key. Add
optional username display/normalized fields and permit null phone fields for
username-only manual leads. The shared Quick Add field validates/detects the input
namespace. Match phone and username separately, never by null phone or display name.
Matching manual entries open unchanged records; they do not merge business history.
Phone imports/merge and official transport remain phone-based. Username-only
contact actions expose the saved handle for copying, without a guessed URL/send.

## Consequences

Purchases, subscriptions and timeline relations continue to use customer IDs.
UI views must tolerate null phone and show the handle. Phone-based integrations
must reject username-only recipients until an official supported identity contract
is deliberately implemented. A copied username is not ownership verification and
may change; cross-identity linking is a separate explicit workflow. Existing
operator-only Firestore security remains unchanged. See `../WHATSAPP_USERNAMES.md`.

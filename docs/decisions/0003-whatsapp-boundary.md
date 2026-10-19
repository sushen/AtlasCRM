# ADR 0003: Keep WhatsApp External

Status: Accepted
Date: 2026-10-04

## Context

Atlas tracks the business journey around WhatsApp conversations but does not own WhatsApp communication events.

## Decision

Generate supported `wa.me` links and record explicit local activities. Do not manipulate WhatsApp Web or infer sent, delivered, read, or replied events from a link opening.

2026-10-05 amendment: at the operator's request, the chat link now targets WhatsApp Web directly. An optional message is encoded in the link and the operator still sends it manually. This changes the destination, not the external communication boundary.

2026-10-05 follow-up: the dialog also offers an explicit desktop app link through the registered WhatsApp URL handler. Web and desktop remain separate operator choices; neither action supplies evidence of sending or replies.

## Reasons

The boundary keeps records honest and avoids unsupported automation.

## Consequences

Operators manually record message and reply outcomes until an official integration supplies reliable events.

2026-10-05 Cloud API amendment: official API transport is now implemented in a
separate Node service. API acceptance, signed inbound messages and delivery/read/
failure events supply external evidence through Firestore and timeline activities.
Manual Web/desktop links still supply opening requests only. Browser DOM automation
and inference from links remain prohibited. See ADR 0004 and `WHATSAPP_SETUP.md`.

## Alternatives Considered

DOM automation and scraping are outside scope and are not reliable evidence of communication events.

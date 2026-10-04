# ADR 0003: Keep WhatsApp External

Status: Accepted
Date: 2026-10-04

## Context

Atlas tracks the business journey around WhatsApp conversations but does not own WhatsApp communication events.

## Decision

Generate supported `wa.me` links and record explicit local activities. Do not manipulate WhatsApp Web or infer sent, delivered, read, or replied events from a link opening.

## Reasons

The boundary keeps records honest and avoids unsupported automation.

## Consequences

Operators manually record message and reply outcomes until an official integration supplies reliable events.

## Alternatives Considered

DOM automation and scraping are outside scope and are not reliable evidence of communication events.

# ADR 0002: Use Firebase

Status: Accepted
Date: 2026-10-04

## Context

Atlas needs private authentication and a hosted document store without a custom server.

## Decision

Use Firebase Authentication and Firestore, with Firebase Hosting as the configured deployment target.

## Reasons

The repository already integrates the Firebase browser SDK, rules, and indexes.

## Consequences

Rules, indexes, client configuration, and external project setup are part of the system. Authorization must be reviewed before multi-user use.

## Alternatives Considered

A custom backend or another database would add infrastructure outside the current architecture.

# ADR 0001: Use Vanilla JavaScript

Status: Accepted
Date: 2026-10-04

## Context

The app is a small private CRM with static pages and a narrow workflow.

## Decision

Use HTML, CSS, and browser JavaScript ES modules without a frontend framework or TypeScript.

## Reasons

The current code is framework-free and easy to host and inspect.

## Consequences

Module boundaries and manual rendering must remain clear as features grow.

## Alternatives Considered

React, Vue, Angular, and TypeScript were not justified by the current scope.

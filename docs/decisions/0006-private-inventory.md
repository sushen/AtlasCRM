# ADR 0006: Separate supplier availability from private owned inventory

Date: 2026-10-19. Status: Accepted design; implementation prepared, not released.

## Decision

Public stock aggregates explicitly equivalent supplier offers, deduplicated by
underlying stock pool. Private purchased inventory is a separate operator-only
ledger in the existing Worker coordinator. Product mappings use existing CRM
product IDs; customer/purchase links use stable document IDs. Lowest available
comparable cost receives the existing Atlas margin once. No implicit FX or
automatic supplier purchasing is introduced.

Private delivery credentials use authenticated AES-GCM envelopes in separate
server records, with a server-only backed-up keyring. Reads of metadata do not
reveal credentials. Explicit authenticated reveals are audited. SQLite atomic
claims prevent duplicate allocation; reference checks use the existing Firebase
server identity and leave Firestore history/security unchanged.

## Consequences

Feature flags stay off until keys, provider responses, product equivalence and
release approval are ready. Credentials cannot safely use the browser demo store.
Firebase reference checks and the private SQLite ledger are separate systems;
refund/correction reconciliation remains manual. Key loss is unrecoverable, so
backup and retained rotation keys are required. Supplier availability never
constitutes an owned item or proof that delivery occurred. See `../INVENTORY.md`.

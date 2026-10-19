# Local inventory to Firebase promotion

Superseded by the operator's clarification on 2026-10-19: local code should use
actual Firebase immediately, not a separate inventory requiring routine promotion.
The Firebase-connected local service and hosted adapter now share the server-only
atlasInventoryState collection and hashed key/payload format. See LOCAL_WORKSPACE.md.
The import procedure below is historical contingency for any pre-existing local
file data; no import has been performed. New shared-Firebase records need no
transfer when code is deployed. The hosted adapter still requires release approval,
INVENTORY_STORAGE=firestore and the same backed-up encryption keyring.

Status: proposed plan, 2026-10-19. No migration or production deployment performed.
Operator requirement: inventory works locally while developing; approved local
inventory data must be carried into Firebase when the feature goes live.

## Target behavior

Local review uses the working loopback inventory service and encrypted local
ledger. A release has two distinct operations: reviewed code deployment and an
explicit, validated data promotion into Firebase. Git commits contain code and
schema/setup instructions only. Customer data, inventory credentials, backups and
encryption keys are never committed or included in public Hosting assets.

After promotion, local and hosted operators may deliberately connect to the same
live Firebase-backed inventory through authenticated server endpoints. The UI
must clearly show Local / Staging / Live. Local editing stays local until promotion;
connecting local UI to Live means subsequent saves affect Live immediately.

## Shared business logic, separate storage adapters

Reuse InventoryProgram validation, envelope encryption, receipt, assignment and
audit semantics. Keep the local file adapter for offline/local review. Add a
server-only Firestore inventory adapter for hosted operation, using atomic
transactions and explicit unique claims for units, purchases and fingerprints.
The server remains on Cloudflare or the chosen existing backend; Firebase stores
the persistent inventory. Supplier catalog transport may remain Cloudflare-based.
No browser Admin credential or encryption key is introduced.

Proposed server-owned collections, finalized during implementation:

- atlasInventoryUnits: metadata, saved product snapshot, cost, source, dates,
  status and purchase/customer references.
- atlasInventorySecrets: authenticated encrypted credential envelopes only.
- atlasInventoryClaims: unique credential fingerprint and purchase assignment
  claims. The namespace is explicit; no plaintext secret fingerprints.
- atlasInventoryReceipts and atlasInventoryAudit: idempotency and append-only
  operator actions.
- atlasSupplierPolicies and atlasSupplierMappings: approved on/off settings and
  exact equivalent-product/stock-pool mappings.
- atlasInventoryImports: promotion batch manifest, actor, hashes, counts and state.

Deny browser access to secrets/claims/import control and all direct inventory
writes. Server endpoints require verified strict operator identity and return
metadata or an explicit audited credential reveal. Review/test rules before release.

## Promotion workflow

1. Freeze an immutable local snapshot for the selected release. The operator
   selects genuine inventory and supplier settings; local trial records are not
   automatically accepted as real stock.
2. Capture referenced local products, customers, purchases and subscriptions.
   Browser-only records require an explicit local export into the promotion bundle;
   the filesystem ledger alone does not contain them. Bundle creation stays private.
3. Validate local references and the target Firebase project before any write.
   Map local product/customer/purchase IDs to existing live IDs where verified.
   Report missing/ambiguous matches and conflicts. Never match customers solely by
   display name, guess equivalent plans, or create duplicate live sales silently.
4. Generate a dry-run report: selected units, target collections, reference maps,
   already-present records, collisions, new purchase records and excluded test data.
   No credential plaintext appears in the report or logs.
5. Prepare and securely back up the target server keyring. Existing local envelopes
   require retained keys, or authenticated local decryption and re-encryption for
   the target key. Keep keys separately from the data bundle and public code.
   Never replace a deployed keyring or fingerprint key blindly.
6. Obtain approval of that exact manifest. Import into server-only staging paths,
   validating each unit envelope, state, claim uniqueness and mapped references.
   Persist progress per batch; retries use the same import and unit identities.
   An interrupted run resumes, rather than generating duplicate stock or purchases.
7. Reconcile counts, envelope integrity, assignments, purchase totals and supplier
   policies with the dry run. Promote only validated batches to active inventory;
   partly imported units must not be assignable or counted as available.
8. Deploy reviewed code/rules/hosting to the intended targets, enable the
   Firebase-backed adapter, then verify authenticated reads and safe access denial.
   Confirm real inventory counts and a deliberate operator acceptance action.
9. Retain a protected local snapshot, import receipts and key backup. Rollback
   disables the feature or quarantines the import; it does not delete customer
   history, revert assigned units to available, or restore obsolete encryption keys.

## Avoid divergent inventories

After successful promotion, mark that local snapshot as promoted and immutable.
Either continue through Live explicitly, or create a new local workspace for
further testing. Later promotion uses a diff and conflict review, never a blind
replacement of live inventory. If an item was assigned/delivered in Live after the
snapshot, its live state wins until an operator resolves the conflict. Do not
automatically upload local data on startup, Git push, merge or Hosting deployment.

## Required validation before enabling

- Empty, normal and partially interrupted import; identical retries create no
  duplicate unit, purchase, fingerprint claim, assignment or timeline event.
- Product/customer/purchase mapping conflicts; phone/username identity boundaries.
- Concurrent assignment during promotion and subsequent local/live access.
- Key mismatch, envelope tampering and rotation, with no secret leakage in reports.
- Trial-record exclusion and explicit selected-record manifest.
- Strict browser rules, signed server identity, correct project/environment checks.
- Count reconciliation, failed-batch quarantine, recovery and non-destructive rollback.

This plan supersedes the assumption that hosted private inventory should remain
only in Worker SQLite. The existing prepared SQLite implementation is not migrated
or deleted by this planning change. Implementation, dry-run review, approval and
production import remain outstanding.

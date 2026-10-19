# Local review workspace

Validation: 191 automated tests pass, plus Worker build and mocked inventory/
checkout runtime checks. Shared-mode endpoint tests reject anonymous/nonoperator
access and forged browser product references. Startup read connectivity to the real
inventory collection succeeded without writes, and the browser was verified at
the local login page. A hidden background service was started for local review.
Real signed-in inventory saves remain an operator acceptance step; no real
customer/purchase/inventory data was created for verification.

The dashboard now includes searchable per-product supplier counts to explain its
aggregate availability figure. Unknown/unlimited counts remain explicitly labeled.

## Actual Firebase mode (current operator choice)

Build with `node scripts/build-local-workspace.mjs --firebase`, then start
`node server/local-workspace.mjs PATH_TO_PRIVATE_ENV --firebase`. The local browser
uses the existing Firebase project and real operator authentication. Inventory
routes verify a revoked-token-aware Firebase ID token and strict operator claim,
plus the loopback session/origin checks. Anonymous reads return 401. Browser-supplied
references are ignored; server-side Firebase reads validate purchases/customers/products.

Inventory is persisted in the server-only `atlasInventoryState` collection. Each
document uses a SHA-256 key ID, logical `key`, JSON `payload`, and server `updatedAt`.
Encrypted credential envelopes remain protected by the same backed-up server keyring.
Browser access is denied by the existing default Firestore policy; all operations
go through the authenticated local or hosted backend. No rule was weakened.

The Node adapter and prepared Worker REST adapter share that exact format and
atomic transaction semantics. Hosted release must choose `INVENTORY_STORAGE=firestore`
and upload the existing keyring securely, not generate a new one. These Firebase
records then remain present when the code is released. No routine data copy is needed.
The actual hosted inventory feature is not yet deployed/enabled.

The service read-checked the real inventory collection without creating records.
Sign in through the local login page yourself. Deliberate saves in this mode update
the real shared Firebase records, even though the code is served from localhost.
No supplier purchase, balance operation or customer message is performed. Previous
local file/browser test records are not imported automatically.

The separate file-mode description below remains available for isolated tests;
it is not the active shared-data setup requested by the operator.

The operator wants private inventory and supplier controls reviewed at localhost
before any push, merge or production deployment.

Run `node scripts/build-local-workspace.mjs`, then
`node server/local-workspace.mjs PATH_TO_PRIVATE_ENV`. Open
http://localhost:3199/ on this computer. Alternatively `npm run preview:workspace`
uses inherited settings and the public catalog fallback without loading an env file.

This uses the actual InventoryProgram and encryption vault, with separate local
file state under ignored `.worker-private/local-workspace/inventory.json`. It starts
empty: no fictional owned inventory. The previously prepared keyring and backup
are required. Windows directory access is restricted to current user and SYSTEM.
Do not publish this directory, keyring or environment file.

Customer/product/purchase test records stay in browser storage under
`atlas_local_workspace_store_v1`. Selected local references are sent to the
loopback backend when saving inventory commands. This trusted local review mode
does not replace production Firebase authentication/reference checks. It does not
copy or write production customers. Create a saved product and local test purchase
to test stock assignment.

The server binds only to loopback, verifies exact Host and Origin, and requires a
random per-process session for inventory routes. It serves only generated browser
assets. Restarting rotates that session; reload the page afterward. Messaging,
partner and production Firebase adapters are disconnected in generated output.

Supplier reads use the chosen private environment on the server. If the current
supplier read fails, the already-public catalog is a read-only fallback with its
original timestamp. NAM requires its saved token/USD config and a working API.
Local supplier switches affect only local state. No upstream purchase, balance,
payment, customer message, production Firestore write or deployment occurs.

The inventory credential reveal remains explicit, audited and cleared after
30 seconds. Assignment and delivery are separate manual actions. Local test data
and owned items are separate from the production ledger.

`tests/local-workspace.test.mjs` verifies session/origin checks, private-path denial,
encrypted file receipt/assignment, genuine empty counts and supplier GET-only access.
See `CI_CD.md` for subsequent branch review and approval-before-master policy.

## Local sign-in hostname

Firebase's existing authorized domain list contains localhost, but not 127.0.0.1.
Shared-Firebase mode redirects entry/login pages from the numeric loopback address
to localhost, preserving route/query. The server still binds to 127.0.0.1 and
accepts only the exact localhost/numeric loopback Host and same Origin. No Firebase
allowlist/provider/security setting was changed. Sign in from http://localhost:3199/.

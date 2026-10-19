# Private owned inventory and combined supplier catalog

Prepared 2026-10-19. Not deployed or enabled by this task. Previously released
phone/username leads and customer purchases remain live.

## Two distinct stock concepts

The operator chose public stock equal to combined supplier availability. Owned
items purchased privately are not added to this number. Private inventory is an
operator tool for recording, assigning and delivering accounts/licenses/codes or
individual seats. No supplier balance or purchasing endpoint is called.

The operator supplied `https://api.nam.qzz.io` as the next reseller source and
confirmed USD for its `apiPrice`. Pricing policy: choose the cheapest available
equivalent supplier cost, then apply the existing Atlas stock-tier margin once.
Exact product/plan mappings are explicit; names alone do not establish equivalence.
Independent pools are summed; offers sharing a stock pool use the largest reported
count once. Unknown/unlimited inventory never becomes a fabricated finite count.
Different currencies cannot be merged without a separately defined conversion rule.

## Supplier switches and owned-stock dashboard

The operator clarified that merely saving an API token must not enroll a supplier.
Private inventory includes an on/off switch for each supported source. Current
Canboso defaults on to preserve existing operation; NAM defaults off even when its
credentials and multi-source transport are configured. Enabling requires private
configuration readiness; tokens themselves never appear in this response or UI.

Switches are persisted under `iv:supplier:SOURCE_ID`, audit the operator and use
idempotent save receipts. A toggle invalidates the legacy catalog cache/cooldown
in the same SQLite commit. Disabled sources are not fetched and contribute no
products, prices or availability. Mapped catalog IDs stay stable when one supplier
is off. Turning both off returns an empty public catalog rather than old cached
listings. Existing saved order quotes and all private owned stock remain intact.
Turning a source back on fetches fresh data; a failing enabled source does not
silently fall back to its disabled or outdated contribution.

The CRM Dashboard's **Your owned stock** section uses the authenticated
`/api/inventory/summary` endpoint. It displays available-to-assign, assigned awaiting
delivery, delivered, expired unassigned, retired and total recorded units. It never
counts supplier availability. Summary reads scan metadata in 500-item pages; above
10,000 units the UI explicitly labels the result as partial. Unavailable inventory
shows an unavailable message, not estimated or zero counts. **Manage inventory and
suppliers** opens the private workspace.

## Admin workflow

The private CRM sidebar adds **Private inventory**. It requires the existing
operator account and an enabled inventory backend; no insecure browser/demo
credential store is supplied.

1. Create or select a saved CRM product with its exact plan/term.
2. Receive one owned item: product, source label, acquisition cost/currency,
   purchase date, optional stock expiry, and private delivery credentials.
3. Record the customer's paid purchase using that same saved product. The existing
   customer may be identified by phone or username; its document ID is the link.
4. Assign an available item to that customer's purchase. Product and customer
   references are checked server-side; cancelled/refunded or unpaid purchases are
   rejected. Expired stock, or stock expiring before the sold term ends, is rejected.
5. Reveal credentials only when needed, deliver manually, then explicitly record
   delivery. Assignment and copying do not send anything or prove delivery.

An item is `available → assigned → delivered`, or `available → retired`. There is
no silent unassignment, deletion, credential replacement or recycling. Each
purchase accepts one inventory item, matching the current one-product purchase
model. For shared accounts, record only a separately assignable seat and its own
delivery details; do not record a shared secret as several interchangeable units.

Customer purchase cards add **Stock and credentials**, which reads the assigned
item or opens Inventory with that purchase selected. Legacy purchases lacking a
saved product ID cannot be assigned based on names; new purchases must choose the
correct saved product. Existing customer history is not rewritten.

## Storage and authorization

`server/inventory/program.mjs` uses the existing `atlas-market` SQLite Durable
Object; no second Worker, database namespace or frontend framework is introduced.
Only freshly verified Firebase tokens with strict `atlasOperator:true` can call
the fixed inventory routes from an approved CRM origin. The coordinator repeats
the operator gate and applies request budgets. Feature gates default off.

- `iv:unit:ID`: private metadata, product snapshot, source/cost, dates, state and
  customer/purchase assignment references. This is never public catalog data.
- `iv:secret:ID`: AES-256-GCM envelope (`version`, `keyId`, random 96-bit IV,
  ciphertext). Associated data binds it to the unit and product IDs.
- `iv:fingerprint:HMAC`: duplicate-credential claim using a separate secret HMAC
  key. Matching is exact after outer whitespace trimming, not account discovery.
- `iv:purchase:PURCHASE_ID`: unique assignment claim.
- `iv:receipt:REQUEST_ID`: actor, keyed intent digest and metadata-only result.
- `iv:audit:TIME:REQUEST_ID`: actor/time/action/unit audit, including reveals.
- `iv:map:SOURCE:OFFER_ID`: explicit CRM product/offer/stock-pool mapping.
- `iv:supplier:SOURCE_ID`: operator-controlled source enable state, time and actor.

Receive, assignment, retirement and delivery commit their ledger changes and
receipts atomically. Stable request IDs make retries safe, including uncertain
network outcomes. Concurrent claims cannot allocate the same unit or purchase
twice. Referenced Firestore products/customers/purchases are checked through a
read-only adapter using the existing same-project server identity. Those external
reads and the SQLite commit are not a distributed transaction: an operator should
review assignments when later correcting/refunding a CRM purchase. Inventory does
not mutate Firestore purchase/payment state or Telegram order/commission records.

Lists paginate 50 metadata records; reveal is a separate POST, audited, `no-store`
response. Revealed text is inserted as text, cleared after 30 seconds, on closing
the dialog or hiding the page. Credentials are never put in localStorage, static
files, timeline notes, command receipts, query strings or automatic clipboard writes.
TLS protects transfer; authorized operators can necessarily read a revealed item.
Firebase token expiry/revocation latency is the existing Worker verifier's limit.

## New supplier adapter and freshness

`server/suppliers/nam.mjs` allows only fixed-origin GET `/products` and numeric
GET `/stock/{productId}`. It uses a private bearer header and refuses redirects,
oversized/malformed/error responses, inactive products and missing configuration.
`apiPrice` is private acquisition cost; `price` is not substituted for that cost.
`unlimitedSlot` and `requiresGmail` are retained without inventing finite stock.

The assumed product wrapper is `{ok:true,data:[...]}`. The supplied excerpt did not
show the full wrapper, so it must be verified against a live response before
activation; the adapter fails closed on a different shape. At the time of this
task, unauthenticated health and products reads returned HTTP 502. No reseller
token was present in the saved project's private environment, and none was requested
in chat. The adapter is tested with fictional responses, not verified live.

When `MULTI_SUPPLIER_ENABLED=true`, the Worker fetches a fresh new-supplier catalog
on each listing/order path and does not use the legacy six-hour catalog fallback.
The current supplier's raw cost snapshot stays inside its server adapter. Public
output is an explicit product projection with retail price and aggregate stock;
no credentials, owned counts, supplier costs or tokens are included. Mapped products
use `atlas_CRM_ID`; unmapped new-source products use `nam_SOURCE_ID`. Unmapped current
supplier IDs remain unchanged. Existing saved order quotes are immutable snapshots.

Before accepting a new Telegram order request, the coordinator rechecks current
price/currency and calls the selected NAM offer's stock endpoint. Removed/out-of-stock
responses with `refreshCatalog:true` reject the request; no supplier order is placed.
The later upstream purchase, if performed manually, must revalidate stock/price
again. Automatic procurement/polling/delivery is not implemented or authorized.

## Configuration and release

Current production is unchanged. Required before enabling private inventory:

1. A local keyring and separate restricted backup have been prepared. For a new
   installation, generate a keyring with `node scripts/prepare-inventory-keyring.mjs`; it creates
   a new ignored `.worker-private/inventory-keyring.json`, never overwrites an
   existing ring, and restricts Windows ACLs to the current user/SYSTEM.
2. Securely back it up outside public assets before uploading it as the encrypted
   Worker secret `INVENTORY_KEYRING`. The ring contains `activeKeyId`, base64
   32-byte `keys`, and a separate base64 32-byte `fingerprintKey`.
3. Verify the existing `PARTNER_FIRESTORE_SERVICE_ACCOUNT` and Firebase project
   can read product/customer/purchase references. Do not grant browser key access.
4. Obtain release approval, deploy the existing Worker preserving live bindings,
   then release Hosting and set `INVENTORY_ENABLED=true`. Preserve the current
   Telegram webhook, bot state and order data. No Firestore rule/index change.

The multi-supplier catalog is a separate activation: save `NAM_RESELLER_TOKEN`
privately and configure `NAM_RESELLER_CURRENCY=USD`; restore provider health,
validate the product wrapper with `scripts/check-nam.mjs` (using the private env),
review exact product/pool mappings and only then enable `MULTI_SUPPLIER_ENABLED`.
The inventory workspace itself can be enabled while the second feed remains off.
Do not enable a failing upstream feed merely to obtain a live merged catalog.

Key rotation adds a new AES key ID and changes `activeKeyId`, retaining every old
key needed by existing envelopes. Keep `fingerprintKey` stable to retain duplicate
claims. Never regenerate/replace a deployed ring as a rollback. Back up encrypted
inventory state and its separately protected keyring; losing the old key loses
credential recovery. Roll back feature flags to false without deleting state.

## Validation

All 183 tests pass. Both workspace and receive form were visually checked at
390px using fictional stock only. `tests/inventory.test.mjs` covers vault binding/rotation,
metadata privacy, duplicates/idempotency, concurrency, authorization, reference and
expiry validation, exact plan mapping, mixed currencies and cheapest-cost pricing,
supplier HTTP boundaries and frontend retry behavior. `scripts/inventory-smoke.mjs`
passes in mocked workerd/SQLite with real signed buyer/operator tokens, mocked
Firestore reference reads, encrypted receive/assignment/reveal/delivery, fresh
merged pricing, rejected stock-change checkout, supplier switch exclusion and owned
dashboard totals. The existing manual-payment
Worker smoke also passes. All providers and credentials in these checks are
fictional; no production customer, supplier balance or order was changed.

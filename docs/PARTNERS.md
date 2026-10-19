# Atlas partner tracking and commissions

Released on 2026-10-16 after explicit operator deployment approval. Production
partner tracking is enabled on the existing `atlas` Worker; the source default
remains disabled for local development. Firebase rules and Hosting are released.
**Partner tracking** is available in the CRM sidebar and directly at `/?partners=1`.
Dedicated protected Firestore credentials/HMAC secrets are configured. No partner,
customer, commission, payout or advertising spend was fabricated during release;
all test fixtures are fictional. Create the intended partner account/link in the portal.

## Architecture and boundaries

The existing Cloudflare `atlas` Worker, `AtlasCoordinator` SQLite Durable Object,
Firebase Authentication, static Hosting catalog, Telegram shop, `ShopOrders`, manual
payment review and manual delivery are reused. No framework or paid analytics
service is added. Orders remain canonical in the current durable store. Partner
domain writes and their Firestore outbox markers use the **same transaction**.

`server/partners/program.mjs` handles policy, referrals, attribution, payout records
and the idempotent commission ledger. `report.mjs` supplies sanitized reporting and
CSV. `worker/partner-firestore.mjs` projects durable records using Firestore REST
and a server-only service-account credential; it does not bundle Node Firebase
Admin into workerd. Firestore is an auditable projection, not a second order writer.

The Firestore outbox coalesces a record's latest state, while immutable audit/ledger
events retain individual keys. Acknowledged batches are removed; errors and unknown
outcomes retain the queue. Firestore deterministic document IDs make retries safe.
An alarm starts about 30 seconds after new work, commits up to 25 projections,
and retries pending work each minute. Reports remain available from canonical state
and display sync status. Last successful sync does not mean the whole queue is empty.

## Customer journey and attribution policy

1. Operator creates an active partner linked to the intended **Firebase Auth UID**.
   IDs are unique; the UI proposes `PARTNER-<random>`. Defaults are **10 BDT** per
   eligible sale and **USD 100** monthly maximum. No monthly allocation is approved
   automatically. Partners retain their own Facebook ad accounts.
2. Operator assigns an immutable campaign ID, optionally restricted to a product,
   and generates the Firebase website URL with `ref`, `campaign`, and UTMs.
3. A valid active referral creates a first-touch click with server timestamp,
   registered source `facebook`, partner/campaign/product and keyed anonymous
   visitor hash. Browser storage keeps an opaque visit capability for **30 days**.
   Existing unexpired first touch wins; URL edits do not replace it.
4. Clicking a normal Atlas shop link requests a fresh cryptographically random
   192-bit Telegram token. Its `r_` payload is 50 characters (below Telegram's 64).
   It contains no customer identity, partner policy or commission amount. Only its
   hash is retained server-side; validity is **20 minutes** within the 30-day window.
5. `/start r_TOKEN` is accepted only in the existing matching private Telegram chat.
   It binds atomically to that customer. Replays by the same customer are idempotent;
   another customer cannot reuse it. Product navigation remains intact. New handoffs
   can recover expired/interrupted journeys while the visit is still valid.
6. Customer attribution also uses **first touch** until the original click's 30-day
   expiry, without extending the window on every visit. Orders snapshot attribution
   and the current commission rate at creation. Later links/rate changes cannot edit
   an existing order. Legacy orders are never retrospectively assigned to a partner.
7. Repeat purchases within the original active attribution window qualify as distinct
   sales. After expiry, unattributed orders earn nothing unless a new valid referral
   is accepted. Product-restricted campaigns apply only to that product. Suspending
   a partner prevents new attributions and partner access; genuine existing attributed
   orders retain their snapshotted rate and may complete.

If tracking is disabled/unavailable, the catalog and normal shop links remain usable;
the browser discloses the failure rather than claiming attributed sales. Local storage
blocking, erased cookies/storage, another browser/device, forwarded links, shared IPs
or not pressing Telegram Start can interrupt attribution. No fingerprinting workaround.

## Commission, refunds and payouts

Only the conjunction `PAYMENT_VERIFIED` **and** `DELIVERED` creates a credit.
Clicks, starts, submitted references/screenshots and unverified orders never do.
The order model commits `ORDER_credit` once, atomically with the qualifying delivery.
All money uses integer minor units: **1000 BDT minor = 10 BDT**.

The partner portal records `CANCELLED` on an attributed unpaid order, or `REFUNDED`
after an operator has actually refunded a verified payment. These actions **record
facts only**; they do not send money, verify bank transactions or deliver products.
A unique `ORDER_reverse` reverses the original credit, never the new policy rate.
Repeated notifications cannot duplicate a credit or reversal. Rejected and cancelled
unpaid orders earn nothing. Currently refunds are full-order adjustments; partial
refunds require a reviewed extension, not an invented prorated commission.

Payout approval reserves available commission. Recording settlement requires an
approved payout, a real transfer reference and sufficient net earned commission;
the system transfers no funds. An unsettled approval can be cancelled with a reason.
A refund after payout creates an explicit recovery balance/debt; it is not hidden
as negative payable money. Future earnings offset it. Unique request IDs survive
uncertain browser retries; conflicting content with the same ID is rejected.

## Portal and reporting

The administrator's **Partner accounts** table shows partner name/ID, linked Firebase
user UID and active/suspended status, with a copy control and selectable UID field.
This directory is displayed only for a verified operator; partner-only accounts
do not get the administrator directory. Linking a UID never grants CRM operator access.

Open `/?partners=1`. Sign in using the assigned Firebase account (Google or email).
The existing `atlasOperator:true` claim enables administration. Partner access is
checked server-side against an active partner's `ownerUid` on every request.
An operator can create/suspend partners, create campaigns/links, update future rates,
set a monthly maximum up to USD 100, explicitly approve a monthly allocation, record
daily campaign spend with evidence, review reports/ledger, approve/cancel/settle
payout records, and record actual refunds/cancellations.

Reports support partner, campaign and Bangladesh-date filters, clicks, unique starts,
orders, currently eligible completed sales, sales/clicks, manual spend and cost/sale
by original billing currency, period ledger commission, lifetime paid/due/reserved/
recovery balances, and CSV export. All currency totals remain separate; no USDT/USD
or USD/BDT rate is assumed. Period activity is not a cohort funnel and repeat sales
may make sales/clicks exceed 100%. Refunded credits are excluded from current sales.
Due/payout balances are clearly partner-wide lifetime values even on campaign views.

Spend is a reviewed total per campaign/day/currency; corrections replace that total
and append audit evidence. Receipt/report references are retained privately, not
fetched or treated as independently verified Meta evidence. Missing/overspent USD
approvals are flagged for the full reporting months; non-USD costs need documented
conversion before comparing to the USD maximum. **This is not a Meta spending cap**
and does not buy advertisements or fund partners. Reports scan up to 10,000 records
per entity type and fail clearly beyond that; add indexed/archive reporting before
exceeding this pilot-scale limit.

## Security, privacy and Firestore

New routes are fixed `/api/partners/{click,handoff,list,admin,report,export}`. Exact
Hosting-origin CORS, bounded JSON, timeouts and durable global/per-rotating-IP-hash
rate limits apply. CORS alone is not authentication; public capture cannot earn
commission. Browser dashboard/admin calls need verified Firebase RS256 ID tokens;
partners cannot submit administrative commands or select another partner's data.
As with the existing Worker verifier, disabled/revoked Firebase sessions may remain
valid until the issued ID token expires; partner suspension is checked immediately.

No raw IP, user-agent fingerprint, customer username, transaction evidence or Telegram
numeric buyer ID enters partner reports. Server-keyed HMACs protect identities; raw
handoff capabilities are never mirrored to Firestore. A daily keyed IP hash supports
coarse rate controls. Optional operator-supplied partner Telegram ID is hashed to
block known self-referrals and omitted from audit inputs. Unknown identities, fake
traffic and colluding buyers cannot be fully excluded; inspect actual payment and
delivery evidence before approval. Client claims never determine commission amounts.

`atlasPartnerProfiles/{partnerId}` is a server-owned projection with owner UID, active
state and JSON policy payload. Its owner may read only an active own profile; Atlas
operators may read profiles. `atlasPartnerPrivate/{deterministicHash}` contains private
click/customer/order attribution, budgets, spend, ledger, payout and audit projections;
only operators may read. **All browser writes to both collections are denied.**
Partner dashboards get sanitized authorized aggregates from the Worker, not private
Firestore reads. Existing CRM rules and collections retain their boundaries. REST
service-account writes use IAM and bypass client rules, so restrict that service
identity to this Firebase project and protect the key. Accounting/audit records are
retained for reconciliation; short-lived token/visit records have expiry cleanup.
Agree a jurisdiction-appropriate analytics/accounting retention and privacy notice
before production. Rotate identity secret only with a planned attribution migration.

## Configuration and release operations

No new Cloudflare service or paid plan is assumed. Existing Firestore/Worker quotas
and API/network costs still apply. `PARTNER_TRACKING_ENABLED=false` is the checked-in
default. The new bindings are:

| Binding | Type | Purpose |
|---|---|---|
| `PARTNER_TRACKING_ENABLED` | Variable | Explicit feature gate |
| `PARTNER_HASH_SECRET` | Secret | Random secret of at least 32 characters for HMAC |
| `PARTNER_FIRESTORE_SERVICE_ACCOUNT` | Secret | Dedicated same-project service-account JSON |
| `FIREBASE_PROJECT_ID` | Existing variable | `atlascrm-c5722` |

Supply secrets privately using interactive Wrangler secret input after deployment
approval. Do not paste them into chat, `.vars` or committed source. Configure the
dedicated Firestore identity/IAM and Auth users before enabling the feature.
Local Node polling remains available with the shared order file and optional partner
service; it does not replace production Firestore synchronization and must not run
on the same bot while its webhook is registered.

For future releases, after approval: deploy additive Firestore rules, deploy the existing `atlas`
Worker with the required secrets and explicit gate, then build/deploy Hosting.
The Worker name/DO migration, existing webhook, supplier pricing and payment bindings
must be preserved. Do not use the current repository defaults to overwrite the
approved live payment configuration. Verify private backend paths remain unserved
by Hosting. No webhook replacement is needed. Disable referral capture with the gate
for rollback; keep order/ledger schema and recovery state. Existing attributed orders
still reconcile commissions; queued projections resume when synchronization is enabled.

## Verification

```cmd
cd /d C:\Users\user\PycharmProjects\AtlasCRM
npm test
npm run worker:check
node scripts/test-partner-rules.mjs
npm run build:hosting
```

For the actual local workerd/SQLite smoke after the dry-run bundle, use the same
Node 22+ runtime selected by the existing Wrangler wrapper:

```cmd
"C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts\partner-worker-smoke.mjs
```

The journey tests use fictional partners/customers and mocked external requests.
Rules simulation sends fictional resources to Google's Rules test API, **not** to
Firestore document endpoints, and neither releases nor changes the live rules.
See `CURRENT_STATE.md` for the final verification record. Live same-project Firestore
credential/IAM validation and a genuine operator-controlled end-to-end purchase remain
release checks; mocked tests are not proof of a production commission payout.

References: [Telegram deep-link limits](https://core.telegram.org/bots/features#deep-linking),
[Firestore REST authentication](https://firebase.google.com/docs/firestore/use-rest-api),
[Google service-account authentication](https://developers.google.com/identity/protocols/oauth2/service-account).


## Collaborator performance extension

See [COLLABORATOR_PERFORMANCE.md](COLLABORATOR_PERFORMANCE.md) for the prepared
per-creative links, Meta-ad mappings and Genie cohort-report endpoint.

# Testing

## Inventory / second-supplier checks (2026-10-19)

All 183 tests pass, including `tests/inventory.test.mjs`: authenticated vault
binding/rotation, idempotency, concurrency, reference/expiry/state checks, supplier
projection and safe HTTP/UI retries. `scripts/inventory-smoke.mjs` exercises real
signed operator/buyer tokens with mocked Firestore/provider reads in workerd and
SQLite, encrypted credential lifecycle and changed-stock checkout rejection.
Supplier switch persistence/cache exclusion and paginated owned-stock summary
checks also pass; signed runtime checks verify removing one/all sources without
changing owned stock. The existing manual-payment smoke and Worker dry-run pass. No production order,
balance read, real credential or customer record is used. See `INVENTORY.md`.

## Username/customer workflow release checks (2026-10-19)

All 166 tests pass. `customer-identity.test.mjs` covers username-only records,
separate namespaces, case/at-prefix normalization, duplicate history, shared input
and copy-only contact UI. The 14 identity/sales checks pass after numeric-username
search isolation. Both real views were inspected at 390px with fictional data.
Worker dry-run, private-value scan, final Hosting source matching/private-file
404 checks and live Worker health/catalog/auth/CORS/shop-readiness pass. No real
customer/purchase mutation or message was used for verification.

## Customer purchase profile checks (2026-10-19)

`tests/customer-sales.test.mjs` covers two-product history, paid totals/currencies,
real calendar dates and Bangladesh expiry boundaries, normalized search, retry
idempotency and atomic failure, preserved suppression/history, demo storage failure
and profile/form rendering. Local 390px QA uses fictional data only. See
`CUSTOMER_PURCHASES.md`; no real production customer sale was entered.

## Mobile Quick Add checks (2026-10-19)

`npm test` includes `tests/quick-add.test.mjs`: phone normalization and duplicates,
unchanged history/suppression, atomic customer/activity creation, operator startup
and fixed auth return routing, form busy/retry states and private Telegram menus.
Local 390px visual QA uses the real form/CSS with fictional persistence. A real
phone sign-in/save check remains a post-release operator step. See `QUICK_ADD.md`.

## Prepared manual checkout (2026-10-15)

104 automated tests passed, including 20 new manual-payment cases and all prior
catalog/Telegram/CRM/WhatsApp regression coverage. Actual local workerd/SQLite
smoke passed in both checkout-disabled legacy mode and enabled fictional-payment
mode. No real messages/payments/provider calls or production changes occurred.
See `PAYMENT_TESTING.md` for commands, coverage and remaining acceptance checks.

## Shop visual refresh (2026-10-14)

All 84 tests passed. Actual local workerd/SQLite order-flow smoke passed with
mock providers. New coverage checks safe exact-product links, local family artwork,
bounded channel captions and clearly flagged bounded stale-cache fallback. Live
HTML/CSS/JS/JPEG equality verified; private-source paths remain 404. Browser checks
covered desktop/mobile layouts, image loading, stock shortcuts and exact product
bot URLs. Telegram confirms pinned photo/caption/shop link after in-place channel
media updates. Hosted gate remains active; no real test payment or order created.

## Manual-review channel shop (2026-10-14)

All 82 tests passed, including transactional order-intent/reference deduplication,
buyer ownership, admin review isolation, state transitions, quote/stock limits,
manual fulfillment and local-file restart persistence. Actual workerd/SQLite smoke
passed order creation, reference submission, nonadmin denial, approval and fulfillment
with mocked suppliers/Telegram and fictional actors. Channel publication/activation
then verified real pinned shop link, command scopes and healthy webhook. No real
test payment/order or supplier purchase was performed; buyer/admin interactive
testing requires operator requests. See `TELEGRAM_SHOP.md`.

## Google login and CRM isolation (2026-10-14)

`npm test`: 73 tests passed, including Google popup routing, cancellation,
operator/customer separation, safe destinations and local operator selection.
`node scripts/test-crm-access-rules.mjs` and `--live` mode passed 275 Firebase
Rules API simulations each. These use fictional contexts without customer data
reads/writes. Released login/auth/routing/Market files match local source.
Real Google popup/consent remains a user test.

## Atlas Market Worker verification (2026-10-14)

`npm test` now includes `tests/worker.test.mjs`: 68 tests pass across catalog,
Telegram, Worker and CRM/WhatsApp behavior. Worker coverage includes signed
Firebase tokens, invalid claims/signatures, auth boundaries, exact-origin CORS,
bounded input, admin validation, persistent disable/replay state, provider
cooldowns, cleanup and serialized request budgets. `npm run worker:check` bundles
with pinned Wrangler 4.151.0 using Node 22+ through the runtime wrapper.
`scripts/worker-smoke.mjs` runs the built bundle in actual local Workers/workerd
with SQLite, fictional secrets and mocked supplier/Telegram/Google key responses.
`node scripts/check-market-secrets.mjs` checks configured private values against
browser files and the Worker bundle without printing values. See
[CLOUDFLARE.md](CLOUDFLARE.md) for exact commands and production approval gates.

## Automated tests

Run `node --experimental-default-type=module --test tests/core.test.mjs tests/contact-actions.test.mjs`. Five tests cover phone normalization, invalid numbers, basic TXT import/duplicate preview, WhatsApp Web link encoding and interpolation, and repeated manual sent confirmations with activity logging and missing-customer rejection. The contact-actions test isolates demo storage from browser Firebase imports; it does not verify Firestore. Remaining coverage targets include CSV quoting, duplicate merging, dialog save/error behavior in a browser, follow-ups, and authentication protection.

## Manual smoke test

Use fictional data: import one contact, confirm `not_contacted`, open WhatsApp, confirm `whatsapp_opened`, mark message sent, confirm `contacted`, schedule a follow-up, record a reply, set `interested`, set `customer`, and inspect the complete timeline. Also test invalid and duplicate rows and a no-Firebase demo session.

## Firebase/security tests

With Firebase configured, verify unauthenticated redirect, authenticated reads/writes, denied deletes, activity ordering, follow-up ordering, and that rules do not expose data to unauthenticated requests. These have not been run in this repository.

## Cloud API integration

Run `npm test` for the five existing tests and thirteen focused transport tests.
The 18 tests passed on 2026-10-05. Meta calls are mocked and all fixtures fictional.
Coverage includes verification success/failure, raw-body signatures/tampering,
text parsing, malformed/unsupported events, foreign account filtering, transactional
deduplication, contact matching/suppression, status ordering and early statuses,
outbound payloads, Meta/network/timeout errors, missing config, tracked-send
failure behavior, private asset denial and HTTP startup. Firestore transactions
use an in-memory adapter; production IAM/rules/Firestore are not integration-tested.

`npm run preview` and local HTTP checks verify the browser app starts without
WhatsApp configuration. `npm run whatsapp:check` inherits the four existing
Windows user variables, then correctly reports missing app secret/Graph version.
No real WhatsApp message, credential upload, backend deployment or rule deployment
was performed. `npm audit --omit=dev` reports zero vulnerabilities; a uuid override
to 11.1.1+ removes the Admin SDK's transitive advisory while retaining its UUID API.

The direct web-send follow-up increases the suite to **24 passing tests**. Added
coverage checks revoked/unauthorized identity, approved-user gating, customer-only
destinations, concurrent/replayed HTTP sends, conflicting IDs, browser bearer
requests, and DOM interaction. Dialog tests verify interpolated text, acceptance
feedback, blank/demo/unavailable states, duplicate click prevention, manual-link
blocking and safe/uncertain failure handling. Linkedom is development-only.
Container image creation and Firebase Hosting rewrites are documented but have not
been built/deployed; live Firebase Auth verification and Meta requests remain untested.

Deployment follow-up: all 24 tests passed again. Hosting and additive Firestore
rules deployed successfully. Rules compiled before release; existing live
collection permissions were compared and preserved. Live Hosting home/app/client
modules returned 200 and modules matched local source; backend source and the
currently unconfigured API route returned 404. No real message was sent.

The local connection follow-up has **26 passing tests**, adding fixed endpoint/
token forwarding validation, restricted CORS/PNA preflights, Host/Origin rejection
and continued authentication requirements. Live local startup also completed
read-only Firestore, Firebase Auth account discovery and Meta phone checks.
Local HTTP verified allowed-origin preflight 200, unauthenticated config 401,
private source 404 and unavailable unsigned webhook 503. Real message delivery
and browser permission/sign-in interactions have not been exercised automatically.

Independent validation on 2026-10-06 ran the current **30-test suite: all passed**,
including the added safe-diagnostic and shared Firebase-bootstrap coverage.
Read-only accepted-message reconciliation matched the intended recipient, message,
customer and timeline records. No inbound/status events were found; delivery is
unverified. Live local webhook remains 503, while saved app-secret/verify-token
presence is true. No active local ngrok process/inspector was found. Hosted modules
match local source. No real message was sent, data mutated or deployment initiated.
See `WHATSAPP_VALIDATION.md` for the current evidence table and interpretation.

## Partner extension verification

`npm run test:partners` covers fictional end-to-end attribution, separate payment
and delivery gates, duplicate and expired events, multiple partners, repeat buyers,
refund reversals, payout reservations, private reporting and Firestore retry state.
`node scripts/test-partner-rules.mjs` tests the prepared rules with fictional resources
through Google's non-deploying Rules test API. `npm test` includes the partner and
business-report suites. `npm run worker:check` only bundles locally. See `PARTNERS.md`
for the manual live-release checks; automated mocks do not exercise real purchases.

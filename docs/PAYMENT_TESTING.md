# Manual checkout validation

## Manual payment release — 2026-10-15

After the operator explicitly requested live deployment and clarified the desired
manual reference-tracking flow, the existing atlas Worker was released with
manual Binance instructions enabled using private payment bindings. The receiving
QR was sent once to the configured private admin; its same-bot photo reference
is retrievable. Bot buyer/admin command scopes were updated and verified; the
hosted shop remains enabled and the existing webhook/SQLite namespace is preserved.
The shop keyboard omits Wallet/API buttons. No customer balance, Binance API,
automatic funds verification, supplier purchasing or automatic delivery exists.
Buyers create an order, view the receiving details/QR, submit a reference, and
wait for authorized human verification and manual delivery. The explicit 1:1
USD/USDT quote rule follows the single 10% catalog markup. Local default remains
disabled; the prepared deployed bindings enable production.

Validation: all 104 tests passed; the 28 affected payment/shop tests passed again
after menu simplification; local mocked workerd/SQLite payment smoke and Wrangler
dry-run passed. Live QR retrieval, command scopes, enabled shop and existing
webhook were checked. Secret scans passed. No real customer order/payment was
created or approved during verification. Receiving identity is operator-supplied;
the QR's encoded recipient was not independently verified in Binance.

Telegram's published digital-goods Stars requirement was disclosed to the operator;
this release is not a claim of platform approval/compliance. Earlier preparation
sections below describe the pre-release state and are superseded by this release
record where they say local-only, missing QR file reference or not deployed.
Rollback new instructions by releasing MANUAL_CHECKOUT_ENABLED=false, preserving
all order/evidence state; do not revert to incompatible order-schema code.

Verified on 2026-10-15: **104/104 automated tests passed**, both legacy and enabled
manual-payment workerd/SQLite smoke modes passed with mocked providers, Wrangler
dry-run passed (~96.03 KiB / 24.89 KiB gzip), and private-value scanning passed
against browser source, staged Hosting assets and Worker bundle. Receiving QR
readiness confirms disabled local checkout, valid original image/checksum and
configured receiving identity/rate. Worker file ID and verified payment link are
not configured. No dependency was added.

No real payment, order, supplier purchase, Telegram message, QR upload, webhook
change or production deployment is performed by the local tests/preparation.
Fixtures use fictional buyers/admins, receiving identity, file IDs and transaction
references; fake responses are test doubles, not claimed Binance confirmations.

## Commands

```bat
cd /d C:\Users\user\PycharmProjects\AtlasCRM
npm test
npm run payment:check
npm run worker:check
"C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts/worker-smoke.mjs
"C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts/worker-smoke.mjs --manual-payments
npm run build:hosting
node scripts/check-market-secrets.mjs
```

Wrangler uses the existing Node 22+ runtime wrapper; local app/tests remain Node
20.19+ compatible. Smoke tests read only the fresh dry-run bundle, not `.env` or
`.dev.vars`, and intercept every provider request in actual local workerd/SQLite.
No request to Binance is implemented or permitted by the smoke test.

## Automated coverage

`tests/payment.test.mjs` adds:

- Existing supplier markup once, explicit 1:1 and other configured conversion,
  exact decimal rounding, missing/unsupported rates and currency validation.
- Immutable receiver/price quote, private receiving QR/file-ID instructions and
  no fabricated payment URL. Invalid/unverified URLs and changed QR checksums fail.
- New order/buttons, I Have Paid prompt, raw reference/command submission and
  persistent buyer-isolated dialogue state.
- Admin notifications, screenshot caption/subsequent screenshot submission,
  no approval from evidence alone and no public/group evidence transmission.
- Duplicate reference submission without another event notification, duplicate
  reference claims across orders and atomic approved-reference uniqueness.
- Auth checks in the model and handler, forged/malformed callbacks, mismatched
  actor/chat identity and invalid/oversized screenshot metadata.
- Under-review status, explicit admin approval/rejection, request-information,
  buyer updates, changed-evidence version checks and stale-button rejection.
- Separate delivery status and queue, manual fulfillment only after verification,
  idempotent repeat review/delivery and legacy-order compatibility.
- Owned cancellation, quote expiration/flagged late references, paginated queues,
  local JSON restart persistence and no partial save on a failed transaction.
- Multipart QR Blob transport without local paths/API credentials in JSON.
- Ordinary Products/Support navigation still works during a reference prompt.

Existing catalog, Telegram, Worker, CRM/WhatsApp and authentication tests continue
in the default suite. Local static tests deny `.payment-private/` and payment
source; the configured-value scanner checks receiving identity/file IDs as well
as existing bot/supplier/admin credentials against browser files and Worker bundle.

Smoke test default exercises existing contact ordering with checkout disabled.
`--manual-payments` exercises the new enabled flow with fictional QR file ID:
create, display QR, prompt/submit, duplicate webhook, screenshot, nonadmin denial,
stale version denial, human approval, duplicate approval without duplicate buyer
notification, and manually recorded fulfillment. Neither mode transfers money.

## Operator acceptance after approval

Before any activation, resolve Telegram's Stars requirement for digital-product
payments, validate the receiving QR/account and settle the approved deployment
design. Then use a dedicated test bot/environment where possible to exercise a
clearly labelled test order and evidence; a fabricated reference must never be
approved as a real payment. Check private admin routing and human-review buttons,
buyer notifications, manual-delivery queue and rollback. A real funds transfer
is not required to establish code behavior and was not attempted here.

See [architecture](PAYMENT_ARCHITECTURE.md) and [setup](BINANCE_PAY_SETUP.md).

# Manual payment implementation report — 2026-10-15

## Readable payment instructions and copy controls — 2026-10-15

Released the payment presentation update to the existing Worker. New and reopened
payment instructions use escaped HTML headings, separated amount/recipient/ID
fields, short steps, a concise QR caption, and native Telegram copy buttons for
the receiving UID, name, numeric amount and order ID. Values come from the saved
order quote; copy amounts omit grouping/currency and retain payment precision.
Existing messages are unchanged until the buyer reopens payment details.
Manual approval, quote validation, amount calculation and orders are unchanged.
All 106 tests, mocked workerd payment smoke and dry-run passed. Telegram accepted
a clearly labeled non-payment preview with recipient copy buttons sent silently
to the single configured private admin; no order/payment was created.

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

**Implemented locally, tested, checkout disabled. Production is unchanged.**

## Features and storage

Reused existing catalog, Telegram shop, admin roles, Durable Object SQLite and Node
file store. Added a modular manual Binance provider, fixed quote/receiving snapshot,
Pay/I Have Paid/Cancel buttons, private QR instructions, persistent reference and
optional screenshot prompts, human under-review/approve/reject/request-information,
private customer/admin status notifications and paginated manual-delivery queue.
No merchant API, automatic payment approval or automatic product delivery exists.

Schema v2 extends private order records with separate payment/delivery status,
payable amount/currency, username, evidence references, audit/version data and
verification/delivery actor/time. Legacy IDs/quotes/history remain compatible.
Atomic approved-reference claims and ownership/admin guards prevent duplicate
verification and unauthorized changes. No Firestore collection/rule/index changed.

The explicit operator rule is 1 USD = 1 USDT, after the existing single 10% markup.
Receiving identity and original QR are prepared privately, with checksum and
Windows current-user/SYSTEM access. File/byte checks confirm the original image
is unchanged and its copy matches the private manifest. No receiving values appear
in public code/bundle/staging scans.

## Files created/changed by this task

- Provider: `server/payments/config.mjs`, `binance-manual.mjs`, `local-qr.mjs`.
- Order/conversation/runtime: `server/shop-orders.mjs`, `shop-file-storage.mjs`,
  `telegram-manual-checkout.mjs`, `telegram-shop.mjs`, `telegram-catalog.mjs`,
  `telegram-catalog-runner.mjs`, `worker/coordinator.mjs`.
- Local setup: `scripts/prepare-binance-manual.mjs`, `private-payment-runtime.ps1`,
  `check-manual-payment.mjs`, `upload-manual-payment-qr.mjs`,
  `prepare-manual-payment-worker-bindings.mjs`.
- Validation/integration: `scripts/check-market-secrets.mjs`, `worker-smoke.mjs`,
  `channel-shop.mjs`; `tests/payment.test.mjs`, `shop.test.mjs`, `catalog.test.mjs`;
  `package.json`, `.env.example`, `.gitignore`.
- Documentation: the five requested payment guides below, plus affected project,
  architecture, data-model, security, deployment, testing, shop, README and current
  state handoff documents.
- Ignored local files only: receiving JPEG/manifest under `.payment-private/`,
  payment entries in `.env`/`.dev.vars`, disabled private bindings file under
  `.worker-private/`. No real customer order store was read or modified.

All existing unrelated uncommitted CRM/WhatsApp work is preserved. No commit,
reset, push or dependency installation was performed.

## Validation

- 104 automated tests passed, including all prior regressions and 20 new payment
  scenarios. Focused payment/order tests also passed after flushing Node file writes.
- Actual local workerd/SQLite smoke passed in legacy and enabled fictional checkout
  modes, with all supplier/Telegram/Google responses intercepted and no Binance call.
- Wrangler dry-run passed (~96.03 KiB / 24.89 KiB gzip).
- Browser/bundle/staged receiving-value and credential scan passed; private payment
  source/image HTTP requests return 404 in local endpoint tests.
- Local QR/type/checksum/configuration validation passed; Git ignore and private
  Windows ACL protection verified. Git whitespace checks passed.

## Remaining setup and release

`MANUAL_CHECKOUT_ENABLED=false` is saved locally. Required fields are
`PAYMENT_PROVIDER`, `PAYMENT_MODE`, `BINANCE_PAY_UID`, `BINANCE_PAY_NAME`,
`PAYMENT_CURRENCY`, `PAYMENT_DECIMALS`, `PAYMENT_USD_USDT_RATE`,
`PAYMENT_VERIFICATION_MODE`, `PAYMENT_DELIVERY_MODE`, plus private local
`BINANCE_PAY_QR_PATH`/`BINANCE_PAY_QR_SHA256` or Worker `BINANCE_PAY_QR_FILE_ID`.
Optional actual payment link requires `BINANCE_PAY_PAYMENT_LINK` and
`BINANCE_PAY_LINK_VERIFIED=true`. No payment URL is invented from a UID.

The Worker QR file ID (or verified actual link) is still missing. Its upload would
send the image to the configured private admin and needs separate approval. No QR
upload, message, real payment/order, secret upload, deployment, webhook/gate change
or runtime restart occurred. Existing live shop continues its prior workflow.

Before release, verify the receiving QR/account, review private bindings and
resolve Telegram's requirement to use Stars for bot digital-product payments.
Manual review does not waive that rule. This implementation is not represented as
an approved Telegram payment setup. See the [official rule](https://core.telegram.org/bots/payments-stars).

Detailed configuration, exact future commands and rollback:

- [Payment architecture](PAYMENT_ARCHITECTURE.md)
- [Binance Pay setup](BINANCE_PAY_SETUP.md)
- [Order workflow](ORDER_WORKFLOW.md)
- [Admin verification](ADMIN_PAYMENT_VERIFICATION.md)
- [Payment testing](PAYMENT_TESTING.md)

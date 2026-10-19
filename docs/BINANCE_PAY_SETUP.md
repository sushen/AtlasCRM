# Binance Pay manual configuration

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

Prepared on 2026-10-15 using the operator-supplied receiving identity and JPEG.
Local configuration and the byte-identical private QR copy are ready. Checkout is
**disabled**, no QR was uploaded, no message/payment/provider API call was made,
and no production configuration/deployment changed.

The operator explicitly chose **1 USD = 1 USDT** for pricing. This is a configurable
business rule, not a guarantee that their market values are identical. The existing
10% retail markup is applied once before conversion. Do not guess other exchange
rates or change historical order quotes.

## Central server configuration

Keep these in ignored `.env`/`.dev.vars` locally and server bindings for Workers.
They never belong in `js/`, public images, Hosting assets or Git commits.

| Environment field | Setting / meaning |
| --- | --- |
| `MANUAL_CHECKOUT_ENABLED` | `false` until separately approved/configured activation |
| `PAYMENT_PROVIDER` / `PAYMENT_MODE` | `binance_pay` / `manual` |
| `BINANCE_PAY_UID` | Operator-supplied receiving UID, saved privately |
| `BINANCE_PAY_NAME` | Operator-supplied receiving name, saved privately |
| `PAYMENT_CURRENCY` / `PAYMENT_DECIMALS` | `USDT` / `6` by default |
| `PAYMENT_USD_USDT_RATE` | `1`, explicitly selected by the operator |
| `PAYMENT_VERIFICATION_MODE` / `PAYMENT_DELIVERY_MODE` | `admin_manual` / `admin_manual` only |
| `BINANCE_PAY_QR_PATH` | Private local image path; Node only, never uploaded as a Worker binding |
| `BINANCE_PAY_QR_SHA256` | Checksum from local image preparation; protects existing quote instructions |
| `BINANCE_PAY_QR_FILE_ID` | Same-bot Telegram photo reference for Workers; not configured/uploaded yet |
| `BINANCE_PAY_PAYMENT_LINK` | Empty unless the operator supplies an actual verified Binance link |
| `BINANCE_PAY_LINK_VERIFIED` | `false` by default; explicit operator verification required for any configured link |

Supported payment-link hosts are HTTPS `pay.binance.com` and `app.binance.com`,
without URL credentials, ports or fragment. Host validation is not proof that a
link pays the right person; the operator must verify it. **No URL is derived from
the receiving UID.** No API key/private key/merchant account is required for this
manual reference tracker, and no merchant APIs are called.

Existing `TELEGRAM_SHOP_ADMIN_IDS`, bot token, webhook secret, admin bearer token,
channel and public support username are reused. Only the selected numeric admin
can review/fulfill; a username is not authorization. `npm run payment:check` prints
readiness booleans and non-sensitive mode information, not receiving values/secrets.

## Local preparation and verification

Single-line Cmder commands from the project:

```bat
cd /d C:\Users\user\PycharmProjects\AtlasCRM
npm run payment:check
npm test
npm run worker:check
"C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts/worker-smoke.mjs
"C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts/worker-smoke.mjs --manual-payments
```

Preparation was done with `scripts/prepare-binance-manual.mjs --qr FILE --uid UID
--name NAME --usd-usdt-rate RATE`. It copies the original JPEG unchanged, validates
its header/size, records SHA-256, sets Windows private ACL and writes local settings
with checkout disabled. It does not decode or independently verify the QR's encoded
recipient. Verify the main receiving QR yourself in Binance Pay before activation.
Rerunning with a different image refuses to overwrite the existing receiving asset.
Existing `.env` secrets/chat settings and the source image in the other project
are preserved. `.payment-private/` is ignored and excluded by static/Hosting routes.

Current missing Worker setup: a receiving QR Telegram file ID (or a verified actual
payment link). Local Node can use the supplied image; Workers cannot read this
laptop's filesystem. Do not use the public `images/` folder as a shortcut.

## Approval-gated external actions — not performed

Telegram requires Stars for digital goods sold through bots/mini apps. This also
applies when another payment processor is offered; manual approval alone does not
remove the rule. Resolve the deployment/payment-channel design first. The commands
below are implementation instructions, **not a claim of Telegram compliance**.
[Telegram digital-goods rules](https://core.telegram.org/bots/payments-stars)

After fresh approval to send the QR to the selected private admin, and only then:

```bat
node --env-file=.env scripts/upload-manual-payment-qr.mjs upload
```

This sends one receiving image to the single configured private admin and saves
the returned same-bot file ID in ignored local settings. An uncertain upload must
be reconciled in the admin chat before retrying; do not blindly resend. It does
not verify the receiving account or enable checkout.

Prepare disabled bindings for review (local write only):

```bat
node --env-file=.env scripts/prepare-manual-payment-worker-bindings.mjs
```

Only after separate activation/deployment approval, correct receiving QR/link,
confirmed pricing, and platform-policy resolution:

```bat
node --env-file=.env scripts/prepare-manual-payment-worker-bindings.mjs --enable
node scripts/wrangler.mjs versions list --name atlas
node scripts/wrangler.mjs deploy --keep-vars --secrets-file .worker-private/manual-payment-bindings.json
```

The preparation command rejects a laptop-only QR path when enabling Workers. It
produces private bindings without uploading QR bytes or the path. Wrangler wrapper
checks that the existing lowercase `atlas` Worker exists before deployment; never
create/delete a replacement. Preserve the Durable Object namespace/migration,
gate, previous version and private order history. Existing hosted webhook remains
the transport; no re-registration is needed for this code change. Do not start
Node polling while it is registered.

The manual-specific command menu can be registered during an approved publisher
run with locally enabled checkout, but the publisher also refreshes channel posts:
review that separate side effect before running `shop:publish`. The buttons/prompts
work without re-registering commands. No Firebase/Firestore release is required.
For a private local polling test, webhook removal and hosted-bot pause require their
own deliberate coordinated cutover. A separate test bot is preferable.

Pause/rollback: set `MANUAL_CHECKOUT_ENABLED=false` through an approved server
settings release to stop offering new Binance checkout/instructions. Existing
references, admin review/history and manual fulfillment remain recoverable.
Disabling the global bot gate pauses all bot handling, not just payments. Never
delete payment indexes/order state or revert to code that cannot interpret the
expanded records without a compatibility review.

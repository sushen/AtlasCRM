# Atlas channel shop and manual payment review

## Clear transaction-reference prompt — 2026-10-15

I Have Paid now opens a formatted prompt asking the buyer to paste the Binance
Pay transaction ID/payment reference as their next message, with a ForceReply
input placeholder. Technical slash-command syntax is omitted from this prompt.
After submission the receipt shows the saved reference and actual review status,
explicitly distinguishing receipt of evidence from confirmation of funds. Human
review remains required. All 30 affected tests and mocked workerd payment smoke
passed. Worker release completed and the live hosted shop remains enabled/configured.

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

## Public profile catalog links — 2026-10-15

Bot description, bot short About text and channel description now include the
public website catalog URL `https://atlascrm-c5722.web.app/?catalog=1`. Each
was read back and verified through Telegram. Existing descriptions were empty.
This changes profile text only; no deployment, order or payment behavior changed.

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

## Shop navigation — 2026-10-15

The existing channel welcome card uses the supplied Atlas logo and is pinned.
Its Browse catalog button opens Atlas Market Bot directly; Contact admin and
Website catalog remain available. The website also opens the bot directly.
Channel posts are the public display; browsing and order menus run privately
in the bot. The update edits the existing welcome message without rebroadcasting.

New local preparation on 2026-10-15 adds disabled manual-payment checkout with
configured receiving QR/identity, an explicitly selected USD=USDT pricing rule,
I Have Paid prompts, private evidence, versioned admin review/request-information,
and a separate manual delivery queue. This code has not been deployed or activated;
the live contact-based shop described below is unchanged. See
`PAYMENT_ARCHITECTURE.md`, `BINANCE_PAY_SETUP.md` and `ORDER_WORKFLOW.md` before
any activation, including Telegram's digital-goods payment restrictions.

Product pricing labels: variant buttons show the already-normalized retail price
first, followed by the product name (for example `$11.00 · Canva Pro`), replacing
the old “View” prefix. Featured channel title and primary order button also show
the exact selected variant price. Formatting never applies another markup: supplier
price ×1.10 is applied once by the catalog adapter, then shared across web/bot/posts.

## Photo cards and direct product handoff

Visual refresh adds hosted Atlas family artwork to welcome and featured channel
posts. Publisher uses editMessageMedia to convert known text posts in place, with
their message IDs, deep-link buttons and publication receipts preserved. Captions
stay within 1024 characters. These are original branded product-family graphics,
not supplier photos. Private bot product detail sends an image then the full text
and order buttons; known image rejection falls back to text, but ambiguous network
failures are not blindly retried. Website listing links open the exact product in
the bot. Manual review, orders, authorization and payment boundaries are unchanged.

Live activation completed on 2026-10-14 after the user's “Go for it”. Existing
Worker deployed, admin bindings configured, webhook registered (no pending updates
dropped) and gate confirmed on. No local polling process was found. Six channel
posts published, welcome pinned, buyer/admin menus verified. Full automated tests
(82) and mocked actual local workerd/SQLite shop flow passed. Real buyer/admin
interactive validation remains a user test; no test payment, supplier purchase or
live order was created by the agent.

The user authorized a channel storefront and private shop bot, with human payment
verification and fulfillment, on 2026-10-14. The approved channel is
`https://t.me/atlascrmshop`, bot @AtlasCrmMarketBot, public admin contact
`https://t.me/GodofDistruction`. Read-only Bot API checks confirmed the bot's
channel post/edit permissions and a single human owner. The owner's numeric ID
is stored only in ignored settings/server secret bindings. Bot owner/admin IDs
are not inferred from buyer-supplied text, channel usernames or callback payloads.

## Buyer flow

Channel welcome and five featured posts open private bot conversations. The
welcome links to the full catalog, admin and public website. Featured cards quote
an actual listing's retail price (supplier +10% once), stock and reference.
Snapshots can become stale; the private bot re-fetches current cached catalog.
Channel buttons are URLs, not shared mutable order callbacks, so another reader
cannot change a public post into their own checkout. No buyer data appears in
channel posts. Full product discovery continues through the three-column bot menus.

Private bot provides Buy, Profile, Purchase history, Wallet, API, Support and
Warranty. Wallet explicitly has no stored customer balance; API does not expose
supplier access. Each order request is for one selected variant/unit. Variant
duration/customer-detail requirements are arranged directly with admin; the bot
does not collect account passwords or automatically provision supplier products.
Contact admin first to confirm stock, price and payment instructions. Quotes last
24 hours and do not reserve supplier inventory. Five active orders and 200 retained
orders per buyer bound individual abuse; coordinator request budgets also apply.

Buyer commands:

```text
/start
/products
/profile
/history
/order AM-<order-number>
/cancel AM-<order-number>
/payment AM-<order-number> TRANSACTION_REFERENCE
```

Payment references must be 6–128 alphanumeric/underscore/dot/colon/hyphen characters.
Buyer sends the real ID after arranging payment with admin. Submission records
`awaiting_review` and sends a private admin notification; it never records payment
success by itself. Duplicate reference hashes cannot be attached to another order;
this is an abuse guard, not validation of amount, recipient, currency or provider.
Reference normalization is case-insensitive. Verify the actual received funds in
your account. Bot does not inspect Binance or payment accounts, collect payment
credentials, charge, refund or debit the supplier wallet.

## Admin flow and state

Admin gets private notifications for new orders and submitted references. `/orders`
lists up to 20 active orders with amount, currency, listing and reference. Only
configured numeric admins may review. Review buttons explicitly require the admin
to have checked the received payment. `/approve ID` and `/reject ID` first open a
confirmation card; clicking its approval/rejection button records the decision.

```text
/orders
/approve AM-<order-number>
/reject AM-<order-number>
/fulfill AM-<order-number> Delivered separately; contact support if missing.
```

Buyer receives status notifications after admin decision/fulfillment. Fulfillment
is permitted only after approval and requires a bounded note. Handle supplier
purchase/delivery yourself, then record it; bot does not purchase on your behalf.
Do not paste passwords/API keys or private payment-account data into notes.
Rejected orders require admin contact; there is no automatic refund or resubmission
loop. Buyer cancellation is allowed before submitting a reference; later disputes
are handled by admin. Terminal orders/history are retained for reconciliation.

States:

```text
awaiting_payment -> awaiting_review -> approved -> fulfilled
        |                 |
     cancelled         rejected
```

Order number is random; records include buyer Telegram ID, bounded product quote,
one-unit quantity, timestamps, payment reference when submitted, and audit events
with approving admin ID/fulfillment note. Only the buyer can query their own order
or history through Telegram; only configured admins see the active review list.
Entire private conversations are not copied to admin. Contact Admin opens a direct
personal chat. Customer history shows at most the 20 most recent orders; no website
order-data endpoint or buyer API is added.

## Persistence, privacy and uncertain replies

Worker uses the same SQLite Durable Object with transactional keys `order:ID`,
`buyer-orders:BUYER_ID`, `order-intent:BUYER_ID:UPDATE_ID` and `payment-ref:HASH`.
Persistent Telegram update receipts still prevent duplicate handling for 48 hours;
order intent keys additionally stop duplicate creation. Changes commit before
notifications. A crash/API failure can lose a reply or admin notification; inspect
`/order` or `/orders` instead of replaying payment/fulfillment blindly. Repeated
approval/fulfillment returns the existing state without performing a second action.
No automatic order/payment retry queue exists.

Node polling uses atomic ignored `.catalog-state/shop-orders.json`; keep one local
process. Windows `mode:0600` alone does not enforce ACL isolation; protect its folder
with the existing private-runtime script before using local orders. Hosted/local
order stores are separate; do not switch a live store without planning migration.
No existing customer/Firestore schema is modified. Durable storage is now needed
for order/review history as well as cache/cooldowns; free row/request/storage quotas
still apply. No automatic expiry deletes financial review records. Admin must plan
retention/backups and handle deletion requests; the implementation bounds per-buyer
records but does not implement a general retention/export dashboard.

## Configuration and activation

Server settings:

```text
TELEGRAM_SHOP_ENABLED=true
TELEGRAM_SHOP_ADMIN_IDS=<approved numeric owner IDs>
TELEGRAM_SHOP_SUPPORT_URL=https://t.me/GodofDistruction
```

`npm run shop:prepare` inspects the channel owner/permissions and writes ignored
local settings. It does not send messages, restart polling or change webhooks.
`node scripts/prepare-shop-worker-bindings.mjs` prepares a private secrets file for
the admin ID/contact. Deploy existing atlas with those bindings while bot gate off.
Shop private chats are enabled only by the explicit shop flag; groups still require
the original numeric allowlist. Admin gate state persists and wins over defaults.

Single-line Cmder steps for an approved cutover (never run polling and webhook together):

```bat
cd /d C:\Users\user\PycharmProjects\AtlasCRM
npm test
npm run worker:check
node scripts/prepare-shop-worker-bindings.mjs
node scripts/wrangler.mjs deploy --keep-vars --secrets-file .worker-private/shop-bindings.json
node --env-file=.env scripts/shop-bot-state.mjs off
npm run telegram:webhook-status
npm run telegram:webhook-register
node --env-file=.env scripts/shop-bot-state.mjs on
npm run shop:preview
npm run shop:publish
```

First stop only the identified local polling process after authorization, or
confirm none is running. No local process may start afterwards without explicitly
removing the webhook. Do not drop pending updates; buyer can issue a fresh request
if a disabled/gated delivery was acknowledged during the transition. Admin should
open the bot and send `/start` so notifications can reach their private chat.

Publisher checks hosted shop-readiness, webhook, gate and channel post/edit rights
before posting. It sends six silent messages, pins welcome and registers separate
buyer/admin command scopes. Local publication receipts are claimed before sends;
unknown outcomes stop publication until the operator reconciles the channel.
Reruns edit known posts; they do not delete or recreate unknown posts. Channel price
snapshots update only on an explicit publisher run, not through an unattended job.

Payment-provider integration is deferred. Telegram requires Stars for automated
digital-product payments through bots/mini apps; a future Binance merchant account
does not remove that platform restriction. No Binance integration or promise of
automatic transaction verification is included here. The current flow is an order
enquiry/reference tracker with direct human payment arrangements/review, not an
automated bot checkout. See [Telegram's payment documentation](https://core.telegram.org/bots/payments-stars).

Rollback: confirmed Bot off pauses new handling without deleting orders. Preserve
SQLite namespace and publication receipts. Rolling code back does not restore
bindings, gate or order state. Coordinate explicit webhook removal before returning
to local polling; never automatically reset order/reference records for a retry.

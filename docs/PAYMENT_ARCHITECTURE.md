# Manual payment architecture

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

Prepared locally on 2026-10-15. Nothing in this task was deployed, activated or
sent to Telegram/Binance. The existing live catalog/shop remains unchanged.

## Reused system and boundaries

Atlas remains framework-free. Firebase Hosting serves the public catalog; private
CRM remains protected by the existing operator-claim Firestore rules. Official
Telegram updates reach the existing lowercase `atlas` Cloudflare Worker and one
SQLite Durable Object. Node polling remains a development alternative only after
explicit webhook removal. Existing catalog normalization and supplier ×1.10 retail
markup are reused without adding markup in payment code.

The order store already had private buyer records, transaction-reference claims,
admin review and manual fulfillment. It is extended in place: no replacement bot,
customer database or Firestore collection/rule/index change. Existing order IDs,
history and quotes are preserved. Legacy reads project missing fields in memory;
mutating an order saves the expanded record, not a bulk/destructive migration.

```text
Telegram private buyer
  -> TelegramShop -> ManualCheckoutConversation
  -> BinanceManualPaymentProvider
       quote / instructions / reference / status / human decision
  -> ShopOrders (ownership + admin authorization + atomic state/audit/indexes)
  -> existing SQLite Durable Object, or existing private Node JSON store

Admin checks actual receiving-account history independently
  -> explicit versioned approve/reject
  -> verified payment -> manual delivery queue -> admin records fulfillment
```

## Modules

| Module | Responsibility |
| --- | --- |
| `server/payments/config.mjs` | Central validated server-side configuration and disabled default |
| `server/payments/binance-manual.mjs` | Provider interface, exact decimal quote, receiving snapshot and manual-only operations |
| `server/payments/local-qr.mjs` | Private, checksummed JPEG/PNG loading for Node; excluded from Worker bundle |
| `server/shop-orders.mjs` | Transactional records, legacy projection, authorization, payment/delivery transitions, indexes and dialogue state |
| `server/telegram-manual-checkout.mjs` | Private buttons/prompts, screenshot refs, notifications, review confirmation and queues |
| `server/telegram-shop.mjs` | Existing catalog/profile/history with the checkout conversation integrated |
| `server/telegram-catalog.mjs` | Existing shared catalog and official API transport; adds multipart QR Blob upload |
| `worker/coordinator.mjs` | Existing serialized updates, receipts, budgets, transactions and temporary-dialog cleanup |
| `server/telegram-catalog-runner.mjs` | Existing polling with file-backed orders and local QR loader |

`PaymentProvider` exposes `createPaymentInstructions`, `submitPaymentReference`,
`getPaymentStatus` and `verifyPayment`. The implemented verifier records a human
admin decision; it **does not** call Binance, examine an account, detect a transfer
or treat supplied evidence as authoritative. `getPaymentStatus` reports the stored
workflow state, not a live Binance status. Future merchant automation must implement
an authenticated server-side confirmation path with exact recipient, amount,
currency, order and terminal provider-status matching. No fake merchant API or
speculative Binance endpoint is implemented.

## Quote and schema

New orders use `schemaVersion:2`. `product.price/currency` preserves the already
marked-up supplier listing. `unitPrice`, `totalAmount`, `currency` and
`paymentQuote` freeze the actual payable quote. One unit per variant/order remains
the established scope. USDT precision defaults to six decimal places; integer
minor-unit strings and decimal rational arithmetic avoid binary-float conversion
rounding. The operator explicitly selected **1 USD = 1 USDT** as a business pricing
rule; this is not a market-price claim. Other conversions fail closed.

Required-field mapping preserves existing camelCase conventions:

| Requested field | Stored field |
| --- | --- |
| order_id / telegram_user_id / telegram_username | `id` / `buyer` / `telegramUsername` (nullable) |
| product_id / product_name | `product.id` / `product.name` |
| quantity / unit_price / total_amount / currency | `quantity` / `unitPrice` / `totalAmount` / `currency` |
| payment_provider / payment_status | `paymentProvider` / `paymentStatus` |
| submitted_transaction_id | `submittedTransactionId` (`reference` preserved for compatibility) |
| payment_screenshot_reference | `paymentScreenshotReference`, plus bounded `evidence` history |
| created_at / submitted_at | `createdAt` / `submittedAt` |
| verified_at / verified_by | `verifiedAt` / `verifiedBy` |
| delivered_at | `deliveredAt`, with `deliveredBy` |
| admin_notes | `adminNotes` entries and append-only order `events` |

`deliveryStatus` is independent. Legacy `status` is retained as a compatibility
projection. Legacy `fulfilled` projects payment verified plus delivery delivered;
old USD quotes are never silently relabelled USDT or assigned today's receiver.
All timestamps come from the backend clock (epoch milliseconds), not customer input.

Private keys reuse `order:ID`, `buyer-orders:BUYER`, `order-intent:BUYER:UPDATE_ID`
and `payment-ref:HASH`. New `approved-payment-ref:HASH` atomically enforces unique
approved references, including legacy/imported reference collisions. Existing
submission reservations remain conservative: references are not recycled after
rejection/cancellation. `payment-dialog:BUYER` stores a selected order/prompt for
30 minutes; Worker cleanup removes expired/cleared prompts without deleting order
or payment history. Existing 48-hour webhook receipts remain unchanged.

## Reliability and privacy

Ownership and numeric admin identity are checked in the model as well as the bot.
Admin callbacks include a submission version: screenshots/information increment
it and invalidate old confirmation buttons. Database changes and index claims are
atomic and precede notifications. Repeated references/decisions do not emit another
customer/admin event notification. Repeated display requests may intentionally show
instructions again; transport retries of the same update are receipt-deduplicated.

No automatic outbound retry queue exists. A crash or Telegram failure can lose a
notification after a committed state change; `/order`, `/orders` and `/deliveries`
recover state instead of replaying financial decisions. A human can still deliver
twice outside this system; the bot prevents duplicate **recording/notifications**,
not actions taken independently by the operator. Quotes expire after 24 hours;
expired instructions cannot encourage a new payment, but an already-paid late
reference is retained, flagged and referred to human review.

Receiving configuration, original QR and file IDs remain private. The original
image is copied unchanged under ignored `.payment-private/`, with a checksum and
current-user/SYSTEM ACL on Windows. Local quote snapshots pin its checksum; changing
the asset cannot silently change an existing order's QR. Workers require a same-bot
Telegram file ID or an explicitly verified payment link; laptop paths/QR bytes
are not bundled. Screenshots are stored as private Telegram file references only,
not downloaded or served publicly. No payment/account credentials are requested.

Telegram's current digital-goods rules require Stars, including when another
processor is offered through a bot. Manual admin review does not waive that
restriction. This Binance implementation is prepared and disabled; platform
eligibility must be resolved before activation. [Official rules](https://core.telegram.org/bots/payments-stars)

See [setup](BINANCE_PAY_SETUP.md), [workflow](ORDER_WORKFLOW.md),
[admin procedure](ADMIN_PAYMENT_VERIFICATION.md) and [tests](PAYMENT_TESTING.md).

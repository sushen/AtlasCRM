# Administrator payment verification

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

New manual checkout is prepared locally and disabled; production activation has
not been approved or performed in this task. No test payment is necessary to
review the implementation.

Only configured `TELEGRAM_SHOP_ADMIN_IDS` may review or record delivery. The public
support username and receiving UID are contact/payment instructions, not admin
authorization. Review is private; customer/order/payment evidence is never posted
to the channel or public website.

## Review procedure

1. Open the bot as the approved admin. Use `/orders` and Next page, or open the
   private order notification. A reference notification includes order, customer
   ID/public username if present, product, quoted amount/currency, reference,
   submission timestamp and screenshot when provided.
2. Select **Review Payment**. Payment becomes under review and the buyer is told
   a human is checking it. Open your actual receiving account independently.
3. Compare **all** of the following against real completed transaction history:
   - Transaction reference/ID.
   - Actual received amount versus the frozen order total.
   - Currency (USDT is not a USD bank transfer).
   - Completed/received payment status, not pending/failed/reversed.
   - Correct receiving account/UID/name.
   - Genuine transaction history, including whether this transfer was already used.
4. If unclear, choose **Request Information**, or use
   `/requestinfo ORDER_ID SPECIFIC_QUESTION`. Do not request passwords, API keys,
   login codes or full payment-account credentials. The buyer can reply with a
   short note or an explicit screenshot. Their submission is still unverified.
5. Only after checking actual received funds, click **Approve Payment — I checked
   received funds**. Approval records your numeric ID/server timestamp and moves
   the order to the separate manual-delivery queue. No product is sent automatically.
6. If payment cannot be confirmed, choose **Reject Payment**. The buyer receives a
   rejected status and contact route; no automatic refund occurs. Resolve disputes
   directly and preserve the original audit/reference record.

An admin confirmation carries the evidence version. If a buyer attaches a new
screenshot or note, open a fresh Review Payment card. Repeated approval returns
the existing state. A different order cannot claim an already-approved reference.
Database uniqueness is an abuse guard, not evidence that a transaction is genuine.

## Manual delivery

Use `/deliveries` to see verified, undelivered orders and Next page for more.
Complete supplier purchase and customer delivery yourself, then record:

```text
/fulfill AM-<order-number> Delivered separately; contact support if missing.
```

The note is sent to the buyer. Do not include account passwords, private keys or
payment credentials in this administrative note. Payment remains verified while
delivery changes from `NOT_DELIVERED` to `DELIVERED`, with your identity/time/audit
record. Repeating fulfillment does not send another event notification or change
the delivered record. This does not prevent a human from independently sending a
product twice outside the bot; check the recorded state before acting.

## Operational cautions

Telegram retries are deduplicated, and reference/review/delivery writes are atomic.
A crash or API failure may lose a notification after the database commit. Recover
using `/order`, `/orders` or `/deliveries`; do not blindly resend money/products.
Do not delete order/reference indexes to make a rejected reference reusable.
Manual-contact legacy orders keep their original terms, including currency.

Screenshots are untrusted supporting documents and may contain financial details.
Keep them in the private bot/admin chat, restrict local order backups, and arrange
retention/deletion handling deliberately. The implementation does not download
screenshots, export customer datasets or provide a public payment-status endpoint.

The current provider cannot query Binance. Actual receipt of funds is established
only by your independent account-history check; see
[Binance's transaction-history instructions](https://www.binance.com/en/support/faq/detail/020763c7f665400ab70d0e23a2ba6803).

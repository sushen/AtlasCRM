# Order and manual payment workflow

## Partner extension (released 2026-10-16)

Orders may snapshot a registered partner's immutable first-touch attribution and
commission rate. The existing human payment-verification and delivery flow remains
the gate: only both completed statuses create one commission credit. Operator-
recorded refunds add `REFUNDED` and one reversal; cancelled unpaid orders earn
nothing. These accounting actions do not move funds. See `PARTNERS.md`; production
is enabled after approval, while the source default remains disabled locally.

## Clear transaction-reference prompt — 2026-10-15

I Have Paid now opens a formatted prompt asking the buyer to paste the Binance
Pay transaction ID/payment reference as their next message, with a ForceReply
input placeholder. Technical slash-command syntax is omitted from this prompt.
After submission the receipt shows the saved reference and actual review status,
explicitly distinguishing receipt of evidence from confirmation of funds. Human
review remains required. All 30 affected tests and mocked workerd payment smoke
passed. Worker release completed and the live hosted shop remains enabled/configured.

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

Prepared locally; the existing live shop has not been updated by this task.

## New checkout orders

1. Buyer opens a selected catalog listing in a **private** bot chat.
2. Bot resolves product/stock and already-marked-up retail price server-side.
   Stale catalog data cannot create an order. Quantity remains one unit.
3. The enabled provider creates a fixed currency/receiving-account quote using the
   explicit configured conversion rule. Unsupported currency/rate/QR setup fails
   closed; callback data cannot supply an amount or buyer identity.
4. Atomic creation generates an `AM-` ID, retains buyer ID/public username when
   present, product, original retail quote, payable amount/currency and audit event.
   Repeated actor/update intent returns the same original order. No stock is reserved.
5. Buyer sees final amount/currency, receiving instructions and buttons:
   **Pay with Binance**, **I Have Paid**, **Cancel Order**, and admin contact.
6. Pay displays the configured receiving QR or verified actual Binance link.
   The QR does not encode the order, prefill its amount or prove any transfer.
7. I Have Paid selects this buyer's order in a persistent 30-minute prompt. Buyer
   sends a transaction reference, or uses `/payment ORDER_ID TRANSACTION_REFERENCE`.
   Customer input never confirms payment.
8. Reference submission atomically reserves its normalized hash and moves payment
   to `PAYMENT_SUBMITTED`. Buyer and private admins receive clearly unverified
   status/amount/reference information. Admin can recover missed notifications
   through the paginated `/orders` queue.
9. Optional screenshot: use Add payment screenshot, `/evidence ORDER_ID` then send
   a photo, or send a photo captioned `/payment ORDER_ID TRANSACTION_REFERENCE`.
   Only Telegram photo references/metadata are retained; no public download is added.
10. Admin opens Review Payment, which records `PAYMENT_UNDER_REVIEW` and tells the
    buyer a human has begun review. Approve/reject requires an explicit confirmation.
11. Verified payments enter `/deliveries`. Nothing purchases or delivers a product.
    Admin delivers independently, then records `/fulfill ORDER_ID DELIVERY_NOTE`.

```text
PENDING_PAYMENT -> PAYMENT_SUBMITTED -> PAYMENT_UNDER_REVIEW -> PAYMENT_VERIFIED
       |                    ^                  |                      |
    CANCELLED               |            PAYMENT_REJECTED              +-> NOT_DELIVERED
                            |                                             -> DELIVERED (human record)
                     Request Information /
                     new screenshot or buyer note
```

Both submitted and under-review payments may be explicitly approved/rejected by
an authorized human. `deliveryStatus` remains separate from payment status. Admin
request-information records a note and asks the buyer for bounded additional
details via `/info ORDER_ID NOTE` or the selected prompt. New evidence increments
`submissionVersion`; old admin buttons become invalid and a fresh review is needed.

## Ownership, limits and recovery

- Private chat ID must equal the acting Telegram user ID. Buyers see only their
  own order/history. Admin actions require configured numeric identity in both
  the bot and model. Group/channel callbacks cannot create private checkout orders.
- Five active and 200 retained orders per buyer remain the established limits.
  Buyer history shows the 20 most recent; admin queues have Next page controls.
- Quote validity is 24 hours. Expired quotes cannot show fresh Pay instructions.
  If money was already sent late, the reference is still saved and flagged for
  admin rather than discarded. Admin resolves amount differences with the buyer.
- Cancel is idempotent before payment submission. After evidence is submitted,
  cancellation/disputes require admin contact rather than erasing payment history.
- References accept 6–128 alphanumeric/underscore/dot/colon/hyphen characters.
  Screenshots accept bounded Telegram photo IDs and up to 10 MiB declared metadata;
  at most five distinct screenshots/order. Notes are bounded at 500 characters.
- Reference claims are case-insensitive and not recycled across orders, including
  rejected ones. Approved-reference uniqueness is checked atomically again during
  human approval; repeated approvals/fulfillment do not repeat state changes.
- A committed transition may outlive a lost Telegram notification. Query state;
  never turn a pasted reference, screenshot, button click or notification into
  evidence that funds were received. No automatic replay or payment retry exists.

Older manual-contact orders retain their original product/amount/currency and
do not acquire the new receiving identity. Legacy state fields remain projected
for compatibility. Do not mutate old quotes just because the current conversion
rate, provider or receiver changed. See [architecture](PAYMENT_ARCHITECTURE.md).

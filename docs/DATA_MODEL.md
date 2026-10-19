# Data Model

## Private owned-stock ledger (prepared 2026-10-19)

Existing Worker SQLite keys `iv:unit`, `iv:secret`, `iv:fingerprint`, `iv:purchase`,
`iv:receipt`, `iv:audit`, `iv:map` and `iv:supplier` hold private inventory metadata, AES-GCM
credentials, keyed duplicate claims, unique purchase allocation, idempotency,
audit and exact supplier mappings. References point to existing Firestore product,
customer and purchase IDs; no Firestore schema migration or browser rule change.
Inventory is not included in public supplier stock. See `INVENTORY.md` for exact
fields, states, encryption envelope and cross-store consistency limits.

## Username-only customers (2026-10-19)

Manual handle leads add `whatsappUsername` (`@` display) and
`normalizedWhatsAppUsername` (lowercase without `@`). Their `phone`,
`normalizedPhone` and `whatsappNumber` are null. Matching uses the corresponding
non-null namespace and retains the internal customer ID for all relationships.
Legacy phone records need no migration. See `WHATSAPP_USERNAMES.md` / ADR 0005.

## Linked manual customer purchases (released 2026-10-19)

Purchase records now snapshot `productName`, `paidAmount`, `startDate` and nullable
`expiryDate` in addition to existing purchase fields. A linked expiring subscription
carries `purchaseId`, `productName` and `currency`. IDs are stable per manual save
request; a Firestore transaction creates all linked records/activity and customer
qualification atomically with server timestamps. Old records are displayed without
inventing missing details. No migration or security-rule change is required.
See [CUSTOMER_PURCHASES.md](CUSTOMER_PURCHASES.md).

## Quick Add metadata (released 2026-10-19)

Manual mobile entry reuses `customers` without a schema migration: source
`WhatsApp Quick Add`, sourceGroup `Manual enquiry`, status `new`, customerStatus
`lead`, tags `whatsapp-lead` and `quick-add`. New customer and `lead_added` activity
commit together with server timestamps. Duplicate lookup returns the existing
record without writes. See [QUICK_ADD.md](QUICK_ADD.md).

## Partner extension (released 2026-10-16)

Existing orders add an optional immutable `partnerAttribution` snapshot containing
partner/campaign/click references, original attribution expiry and BDT commission
minor units. `pt:` durable records hold partners, campaigns, clicks, opaque-ticket
hashes, keyed customer references, order-state projections, budgets, reported spend,
credit/reversal ledger, reserved/settled/cancelled payouts and audit receipts. These
are separate records, not a new monolithic database document. A transactional
outbox projects server-owned `atlasPartnerProfiles` and `atlasPartnerPrivate`
Firestore documents. Order payment adds `REFUNDED`; cancelled/refunded orders
cannot earn commission. Existing quotes/history are preserved. See `PARTNERS.md`.

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

## Prepared payment schema v2 (2026-10-15; local only)

`ShopOrders` now defines independent `paymentStatus` and `deliveryStatus`, payable
`unitPrice/totalAmount/currency`, immutable `paymentQuote` (receiving identity,
conversion rule, QR reference/checksum), buyer public username when available,
reference/evidence metadata, submitted/verified/delivered times and actor IDs,
admin notes and audited evidence versions. Existing IDs/product retail quotes and
legacy `status` remain compatible; old reads are projected without rewriting
history. New indexes are `approved-payment-ref:HASH` and 30-minute
`payment-dialog:BUYER`. Prepared local schema does not migrate live SQLite or
Firestore data. Full requested-field mapping: `PAYMENT_ARCHITECTURE.md`.

## Private Telegram shop orders (2026-10-14)

Separate from Firestore/CRM, channel shop stores order records in Worker coordinator
SQLite, or ignored local `.catalog-state/shop-orders.json` when polling. Keys are
`order:ID`, buyer-only history indices, actor/update creation intents and hashed
payment-reference claims. Fields include buyer Telegram ID, one-unit product quote,
currency, stock snapshot, 24-hour quote expiry, timestamps, bounded reference and
admin audit events/fulfillment note. States are awaiting_payment, awaiting_review,
approved, rejected, cancelled, fulfilled. References never establish payment by
themselves. Private bot access checks buyer ownership/admin numeric IDs. Orders
are retained for reconciliation, without an automatic cleanup policy. No existing
Firestore customer/activity/history record is changed. See `TELEGRAM_SHOP.md`.

## Implemented Firestore collections

### `customers`

One lead/customer record. Fields written by `createCustomer`: `name`, `phone`, `normalizedPhone`, `whatsappNumber`, `source`, `sourceGroup`, `status`, `customerStatus`, `tags` (array), `notes`, `importedAt`, `firstContactedAt`, `lastContactedAt`, `lastReplyAt`, `nextFollowUpAt`, `contactAttempts`, `createdAt`, and `updatedAt`. Imported WhatsApp leads use `name: "WhatsApp Lead"`, `status: "new"`, `customerStatus: "lead"`, and `tags: ["imported", "whatsapp-lead"]`. Firestore writes use server timestamps for creation/import/update fields. Demo mode uses ISO strings.

`normalizedPhone` is the duplicate-detection key. Bangladesh forms `01712345678`, `8801712345678`, and `+8801712345678` normalize to `+8801712345678`; valid international numbers are retained as `+` plus 8-15 digits. The display `phone` is also retained.

### `activities`

Append-only customer timeline records: `customerId`, `type`, `note`, and `createdAt`. The current code emits `imported`, `status_changed`, `reply_recorded`, `whatsapp_opened`, `follow_up_created`, `follow_up_completed`, and `note_added`. The index orders by `customerId`, then `createdAt`.

### `followups`

Work items with `customerId`, `dueAt`, `status` (`pending` or `completed` in current code), `note`, `createdAt`, and `completedAt`. `dueAt` is a Firestore `Timestamp` in Firebase mode. The index orders by `dueAt`.

## Other workflow collections

The current store also writes `products`, `purchases`, `subscriptions`, and
`templates`. `payments` and `renewals` remain reserved in rules. Earlier claims
that all sales collections were unimplemented did not match the existing code.

## Official WhatsApp transport collections

`whatsappLeadAlerts` is additive and server-owned: deterministic message/request
key, `customerId`, server `createdAt`, message time, display name, masked phone,
new-lead flag and referral source/ID. Manual records also retain a payload hash for
idempotency; no message body/full phone is in the feed projection. Manual capture
records product interest in the activity timeline and an optional deterministic
pending followup, preserving existing qualification/suppression and purchase facts.
Meta referral evidence on private message/event records is distinct from manual
source claims. See `WHATSAPP_LEAD_ALERTS.md`.

`messages` contains private inbound/outbound records keyed by SHA-256 of the
external Meta message ID: `customerId`, `channel`, `direction`, `sender`,
`recipient`, `body`, `messageType`, `externalMessageId`, `timestamp`,
`deliveryStatus`, `statusTimestamp`, `metadata`, `createdAt`, `updatedAt`, and
optional `profileName`/`errorCodes`. Status-before-send stubs may initially lack
text, sender and customer; accepted outbound persistence completes them. Outbound
sender is null when only the business Phone Number ID is known. Selected metadata
keeps business IDs/display number without full webhook payloads.

`whatsappEvents` contains immutable idempotency/event records keyed by a hash of
message ID, kind, status and event timestamp, plus normalized event fields,
`customerId` and server `receivedAt`. `whatsappSendAttempts` uses random attempt
IDs and retains recipient/body/customer, state, server timestamps and numeric
failure diagnostics for send reconciliation. These two collections are Admin-only.

Web send attempts additionally store `actorUid` and `requestCustomerId`; their
document IDs hash actor/request ID so identical HTTP requests are idempotent.
An accepted repeat returns acceptance without resending; pending/uncertain
attempts and conflicting content cannot be retried with the same request ID.

The backend writes customers/messages/events/activities in transactions. Inbound
customer creation uses deterministic `wa_<phone-hash>` IDs after looking for
existing `normalizedPhone` records. No migration system exists; collections are
additive and existing records are not rewritten. Creation/ingestion/update times
use server timestamps; Meta event times are UTC ISO strings. New leads keep
`status: new`, `customerStatus: lead`; inbound messages update `lastReplyAt` without
overriding qualification or suppression. No separate conversation collection exists.

Timeline types add `whatsapp_contact_created`, `whatsapp_message_received`,
`whatsapp_message_accepted`, and `whatsapp_message_status`. Activities refer to a
message through `metadata.messageId`. Browser duplicate merging moves message
associations along with existing history. Transport bodies/statuses remain server-owned.

## Relationships and security

Activities and follow-ups refer to a customer by ID. Current rules require an
authenticated user with Admin-set `atlasOperator:true`, and deny Market customers.
Per-record ownership is not implemented; see `docs/SECURITY.md`. Google registration
creates Firebase Auth identities, not CRM customer records.

## Fictional example

```js
{ name: "Demo Contact", phone: "01712345678", normalizedPhone: "+8801712345678",
  whatsappNumber: "+8801712345678", status: "not_contacted", contactAttempts: 0 }
```

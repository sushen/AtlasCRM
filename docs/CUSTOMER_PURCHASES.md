# Customer purchase history

## Local account-assignment development — 2026-10-19

The focused customer journey provides Assign product. It loads the saved catalog
products and matching owned inventory accounts. Catalog selling price is only a
reference; actual paid amount stays empty until explicitly entered. Customer access
days calculate an expiry independently of the underlying supplier account's years
or warranty hours. Each renewal is a separate purchase/term and can select the same
reusable account. Purchase and allocation have separate idempotent intents; after
purchase success, a failed allocation retry reuses that purchase instead of creating
another sale. No credentials are sent or external access revoked.

Real case correction records may contain paidAmount:null/paymentStatus:
paid_amount_unknown when the operator confirmed the purchase but not the amount.
Such purchases count as product purchases but are excluded from spending totals.
ExpiryUnknown:true with null expiry means access term not recorded, not perpetual
or two-year customer access. The regular purchase form still requires actual paid
amount and an explicit date/no-expiry choice. These incomplete fields are shown
honestly until the operator confirms them; no exact amount or term is inferred.

Released with operator approval on 2026-10-19 together with username-only
Quick Add support. Release verification is recorded in CURRENT_STATE.md.

## Operator workflow

Open Contacts, search the customer's phone (local or international formatting)
or WhatsApp username,
then View. The profile's **Products and spending** section shows purchase count,
amount paid and outstanding totals for each currency, and each product's purchase
date, start date, expiry date and access status. Select **Attach purchased product**
once per product bought. Select an existing saved CRM product or enter its exact
product/plan name. Enter total price, amount paid, currency and dates. Expiry is
required unless the operator explicitly chooses **This product has no expiry date**.
This is manual recordkeeping; it performs no payment, supplier order or delivery.

One save promotes the lead to `customer` and `customerStatus:customer`, preserving
all prior history, notes and follow-up dates. Suppression statuses `blocked`,
`do_not_contact`, `inactive` and legacy `not_interested` remain unchanged even when
a purchase is recorded. There is no automatic purchase inferred from a chat.

## Persistence

`recordCustomerPurchase` in `js/services/store.js` validates with
`js/utils/customer-sales.js`. A Firestore transaction creates one purchase, an
optional linked subscription for an expiring product, one `purchase_added`
activity, and the customer qualification update. Audit fields use server
timestamps. The existing collections and strict operator rules are reused;
no rules change or data migration is required.

The form generates a stable random request ID. Purchase, subscription and activity
IDs use `manual-REQUEST_ID`. A repeated identical request returns the saved
purchase without writes. Reusing an ID with changed data is rejected, preventing
an uncertain save from silently replacing history. A deliberate new form gets a
new ID and represents a separate product/renewal purchase. Demo mode commits all
changes in one localStorage write and retains the old in-memory state on failure.

New purchase fields supplement legacy records: `productName` (historical snapshot),
`paidAmount`, `startDate` and nullable `expiryDate`, alongside existing `customerId`,
`productId`, `amount`, `currency`, `paymentStatus`, `purchasedAt`, `notes`, `createdAt`
and `updatedAt`. Linked subscriptions add `purchaseId`, `productName` and `currency`.
Product renaming later does not change the saved purchase name.

## Summary and compatibility

Spending sums `paidAmount`. Older `paid` records use their saved `amount`; pending
records contribute zero paid. Older partial payments without a paid amount are
flagged rather than assigned an invented payment or exact outstanding balance.
Cancelled/refunded purchases are excluded from the spending/count summary but
remain visible in history. Currencies are never combined or converted. Each
purchase represents one product attachment; subscription rows are not counted
again as spending. Older unlinked subscriptions appear separately without guessed
purchase links, dates or product names.

Date-only access uses Bangladesh calendar days: future starts are Upcoming, expiry
today is still Expiring soon, and only an earlier expiry is Expired. Expiring soon
means within seven days. Existing cancelled/renewed states remain respected.
The renewal queue includes the product name and start date for the new records.

## Validation and release

`tests/customer-sales.test.mjs` covers validation, normalized phone search, dates,
mixed currencies, partial payments, two-product history, idempotent transactions,
server timestamps, suppression/history preservation, quota failure and form
retry states. The real sales view and form were inspected locally at 390px with
fictional records. No real customer purchase was written.

Release is Hosting-only after review/authorization: run the full tests, build
Hosting, scan public output for private values, deploy and verify browser assets.
The combined username release also updates private Telegram help wording.
There is no Firestore rules or official WhatsApp transport change.
Real products, prices and dates must be supplied before recording the user's
customer purchases; never assume a term or silently default to no expiry.

Username-only customers can receive purchases exactly like phone customers,
using their stable customer ID. No username-to-phone resolution occurs; see
WHATSAPP_USERNAMES.md.

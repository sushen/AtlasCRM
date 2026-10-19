# Roadmap

## Requested: multiple suppliers and private owned inventory (2026-10-19)

Implemented locally behind disabled gates; not deployed. The operator clarified
these separate concerns:

- Operator controls: each supplier can be switched on/off independently. Off
  excludes its data from current catalog pricing/availability and invalidates cache.
  Dashboard owned-stock counters are separate from supplier data.
- Public catalog: combine availability reported by equivalent supplier offers,
  present total supplier stock and the best comparable selling price. Do not add
  purchased private inventory to that total. Product/plan equivalence and source
  overlap must be resolved before aggregating; existing saved quotes remain intact.
- Private admin inventory: record items actually purchased from suppliers or other
  sources, including private delivery credentials, acquisition cost and state.
  These credentials, costs and owned-unit records must not appear in public catalog
  responses, stock breakdowns or static assets.
- Customer fulfillment: allocate an owned unit once to the existing CRM customer
  and purchase, track assignment/delivery, product start and expiry, and preserve
  history. Stock assignment alone does not prove external delivery.
- Reuse framework-free code, strict operator access and existing customer/purchase
  identities. Credential storage requires server-side encryption and a narrow
  authenticated reveal/assignment boundary; never add plaintext secrets to public
  product documents, activity notes or frontend/demo fixtures.

The operator supplied api.nam.qzz.io, confirmed USD and chose cheapest available
comparable supplier cost plus the current margin. Private token, healthy API, live
response contract and exact mappings remain needed before activation. See
`INVENTORY.md`. See CURRENT_STATE.md for already released purchase/subscription and
security work; the older milestone lists below are historical backlog context.

## NOW

Make Firebase configuration and authorization production-ready, add automated tests, validate imports and journey transitions, and improve current error handling.

## NEXT

Explicit transition validation, owner-aware rules, message templates, pagination, and robust CSV parsing.

## LATER

Products, purchases, subscriptions, payments, renewals, sales analytics, staff accounts, roles, and permissions.

## IDEAS

Official WhatsApp Business API integration and a customer portal, subject to reliable event contracts and privacy review.

## OUT OF SCOPE

WhatsApp Web DOM manipulation, scraping, and claims that a click proves delivery or reply.

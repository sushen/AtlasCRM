# Atlas CRM Project

## Inventory and multiple sources (prepared 2026-10-19)

Private owned inventory, encrypted delivery credentials and purchase assignment
are implemented locally behind a disabled gate. A second read-only supplier
adapter and explicit merged-stock/cheapest-cost pricing are also gated pending
provider health, private token and exact mapping verification. Owned inventory
is separate from public supplier availability. See `INVENTORY.md`.

## Username leads and customer purchase profile (released 2026-10-19)

The live operator CRM supports phone-or-username leads, searching an existing
record, attaching purchased products and viewing spending plus product start/expiry
dates. Username-only customers do not need a visible phone number. See `CUSTOMER_PURCHASES.md` for data and workflow semantics.

## Mobile lead entry (released 2026-10-19)

A phone-first Quick Add form and private operator Telegram shortcut are live
at `/?quick-add=1`. Copy/paste remains manual, duplicates open unchanged
records, and the existing operator authentication is retained. See `QUICK_ADD.md`.

Partner tracking and commission accounting are released as an additive, enabled
feature: existing website → Telegram → manually verified/delivered order, partner
attribution, server-calculated commissions, isolated reports and Firestore audit
projection. Worker, rules and Hosting were released after approval on 2026-10-16;
no advertising purchase was made. See `PARTNERS.md`.

## Current identity

Atlas CRM is a private CRM for turning WhatsApp numbers into persistent lead and customer records and tracking the surrounding business workflow.

## Problem and user

The intended user needs to work through a large contact list without losing who was contacted, who replied, who needs follow-up, and who became a customer. The current UI supports one private workspace; multi-user operation is planned, not implemented.

## Product philosophy

Keep the workflow small, inspectable, and history-preserving. A CRM event is recorded explicitly. Atlas does not impersonate WhatsApp or infer delivery, read, or reply events from a browser link.

## Current scope

Local preparation now includes a disabled modular manual-payment provider and
expanded order review/evidence/delivery infrastructure. It reuses the existing
shop/storage, is not deployed, and makes no automatic payment/provider purchase
or delivery call. See `PAYMENT_ARCHITECTURE.md` and `BINANCE_PAY_SETUP.md`.

Cloudflare transport for Atlas Market is deployed to the existing lowercase
`atlas` Worker, with Firebase Hosting as frontend and public catalog browsing.
Hosted shop bot is active through its registered webhook after user approval.
Node polling remains a development option after explicit webhook removal. See
[CLOUDFLARE.md](CLOUDFLARE.md).

Atlas Market is an additive local catalog storefront: branded product discovery,
supplier prices with a stock-based 10–40% retail markup, and Telegram channel enquiry links. A
separate command bot can display the same catalog/pricing in approved Telegram
chats. Channel storefront links open private shop chats for order requests and
human payment-reference review. Neither path invokes supplier purchases or charges
customer payments. See `CATALOG.md`, `TELEGRAM.md` and `TELEGRAM_SHOP.md`.

Implemented scope is contact import (TXT/CSV), normalized phone storage, customer statuses, activity timeline, follow-ups, search/filtering, WhatsApp click-to-chat links, Firebase authentication integration, and a local demo mode. Existing store/UI code also implements products, purchases, subscriptions, and templates. An optional Node backend now supplies official WhatsApp text sending through a CLI or approved-user web dialog and signed message/status webhooks, with private Firestore persistence. Live backend/Meta validation and deployment remain pending; see `WHATSAPP_SETUP.md`.

## Non-goals

Atlas is not WhatsApp, a WhatsApp Web automation tool, an accounting system, or a public customer directory. Official delivery evidence is recorded only from Meta webhooks.

## Terminology and boundary

Atlas manages customer workflow. WhatsApp manages communication. Atlas generates WhatsApp Web chat links with an optional prepared message and records `whatsapp_opened` when the operator clicks the link. Opening a link does not prove a message was sent, delivered, read, or replied to; those facts require manual recording or evidence from the optional official Cloud API backend.

## Lifecycle

The implemented status vocabulary is `not_contacted`, `contacted`, `replied`, `interested`, `customer`, `follow_up`, `not_interested`, `no_response`, `inactive`, and `do_not_contact`. Purchases, subscriptions, and renewals are future direction.

## Future direction

Add reliable sales entities, safer multi-user authorization, richer tests, and official integrations only when the requirement and data contract are clear. See `docs/ROADMAP.md`.

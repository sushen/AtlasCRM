# Username-only WhatsApp leads

## Workflow

Use the same Quick Add field for a phone number or a copied WhatsApp username.
An `@` prefix, letters or underscores select username parsing; numeric phone input
uses the existing normalizer. Numeric-only usernames need an `@` prefix so they
cannot be mistaken for phones. Handles are trimmed, stripped of the leading `@`
for comparison and lowercased. The supported input shape is 3–35 Latin letters,
digits, periods or underscores. Display names with spaces and arbitrary URLs are
not treated as handles or converted into phone numbers.

No phone is required for a username-only lead. Save creates a normal CRM customer
record with a stable internal document ID. Search accepts its handle; its profile,
timeline, follow-ups, purchases, spending summary and product start/expiry dates
use that same customer ID. Names and notes remain optional.

## Identity and duplicate boundaries

Phone records keep `phone`, `normalizedPhone` and `whatsappNumber` as before.
Username-only records set those three fields to `null` and add `whatsappUsername`
(displayed with `@`) plus `normalizedWhatsAppUsername` (lowercase without `@`).
Quick Add checks the selected namespace before creating: normalized phone for a
phone, normalized username for a handle. It never searches for a null phone,
which would incorrectly group unrelated username-only customers. A matching
handle opens the existing record unchanged; it does not overwrite qualification,
notes or purchase history. Phone-based imports and duplicate merge retain their
existing phone-only scope. Names alone are never a duplicate key.

A manually copied handle is not ownership verification. WhatsApp usernames can
change, so Atlas does not automatically merge username and phone records or infer
that a future phone belongs to a saved username. Existing phone merge preserves
any username fields on the retained customer, but is not a username lookup.
Simultaneous create requests from separate sessions still share the pre-existing
query-before-create race; no global uniqueness claim is made.

## Contact actions

Phone leads retain supported Web/desktop/API paths. For username-only records,
Open WhatsApp presents the saved handle with a Copy username control and asks the
operator to find it in WhatsApp or continue the existing chat. Atlas does not
invent a phone number, username deep link, account lookup, API recipient or send.
Copying is not recorded as a chat opening or proof of sending/reply. Username keys
are not collected. Official inbound capture remains a separate pending integration;
there is no automatic import of WhatsApp usernames from chat content.

The private Telegram Add lead URL remains fixed and contains no private identity.
Its help text now mentions either a phone or username. Public menus stay unchanged.

## Sources and verification

Official [WhatsApp username guidance](https://www.whatsapp.com/usernames-faq/)
describes optional usernames for people/businesses, their mutable nature,
3–35-character shape and optional username keys. Reservations/availability and
rollout depend on WhatsApp; Atlas saving a manually supplied identifier does not
claim that an account exists or that chat-by-username is active for everyone.

`tests/customer-identity.test.mjs` covers separate identity namespaces, handle
normalization, distinct null-phone customers, case-insensitive duplicate opening,
preserved purchase history, shared input and copy-only contact UI. These tests use
fictional data. All 166 tests, the Worker dry-run and public private-value scan pass.
Both Quick Add and purchase views were visually checked at 390px. No real lead or
purchase was written for verification.

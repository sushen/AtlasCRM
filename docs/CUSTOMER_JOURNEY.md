# Customer Journey

## Reusable inventory account access (local review, 2026-10-19)

The listed product/source account and the customer's access agreement are distinct.
A two-year supplier account can fulfill multiple independent short-term customer
purchases. Assign product selects the listed product, an already owned matching
account, actual amount paid and the customer's access days/dates. A new renewal
is a separate linked purchase and may reuse that same account. Account capacity
is not known; dates track agreements and do not automatically revoke external access.
Default customer delivery details contain email/password only, never 2FA seeds.

## Connected journey review (local development, 2026-10-19)

Inbox & journey now visualizes the whole recorded lifecycle, next action, verified
message activities and product/payment/subscription context together. Suppression
and factual message/payment boundaries are preserved. The connected path has mocked
integration coverage from actual inbound repository/dedup through accepted reply,
purchase validation, subscription and renewal projections. This is not yet a real
live-number end-to-end test or enabled autonomous workflow. See JOURNEY_WORKSPACE.md.

## Supplier-first manual procurement (local review, 2026-10-19)

Inspect supplier offers and comparable terms first. Buy manually, then record
the received unit and its credentials. Atlas links the supplier product internally
without requiring a custom product definition. Record the customer's paid purchase
and subscription dates, assign the owned unit, and record manual delivery. One
customer can have multiple product purchases. No upstream purchase or delivery
is automatically inferred or executed. See SUPPLIER_WORKFLOW.md.

## Owned-stock assignment (prepared 2026-10-19; disabled)

Record a paid purchase using a saved product, then assign one matching owned stock
item from Private inventory. Phone and username-only customers work identically.
Stock and credentials on the purchase card reads its private assignment. Reveal,
assignment and manual delivery are separate audited actions; no customer message,
supplier purchase or payment is triggered. Existing history is preserved. See
`INVENTORY.md` for expiry and reference checks and cross-store limitations.

## Username-only enquiries (2026-10-19)

Copy a WhatsApp handle into Quick Add's phone-or-username field without needing
a phone. Find the saved lead by username, then attach purchases and product terms
to the same profile. No communication or sale is inferred by saving/copying a
handle. Usernames can change and are not automatically merged with phone contacts.
See `WHATSAPP_USERNAMES.md`.

## Attach products after conversion (released 2026-10-19)

Search the existing lead's phone, open View, then Attach purchased product for
each product bought. Record total/paid amount, purchase/start/expiry dates or an
explicit no-expiry choice. The profile shows all purchases, paid totals per currency
and access dates/status. Saving qualifies the customer while preserving history,
follow-ups and contact restrictions. No actual charge or supplier purchase occurs.
See [CUSTOMER_PURCHASES.md](CUSTOMER_PURCHASES.md).

## Mobile manual entry (released 2026-10-19)

Copy a WhatsApp enquiry number into **Add lead** at `/?quick-add=1`; name/notes
are optional. A new `new` lead records `lead_added` as an explicitly manual event.
An existing normalized phone opens its profile without changing status, notes,
follow-ups or history. Neither path proves a reply or sends a message. See
[QUICK_ADD.md](QUICK_ADD.md).

## Advertising partner journey (released 2026-10-16)

Registered partner ad → public catalog referral capture → opaque short-lived
Telegram handoff → existing private order/manual review → manually verified payment
+ delivery → one commission credit. First-touch attribution lasts 30 days; repeat
orders may qualify within it, while existing orders never change partners. Recorded
refunds reverse credits. This does not change WhatsApp lead states or replace manual
payment/delivery. See `PARTNERS.md`; the approved production feature is enabled.

## States

`not_contacted` is the import default. `contacted` means the operator manually marked a contact attempt. `replied` means a reply was manually recorded. `interested` means the operator qualified interest. `customer` means the operator considers the person a customer. `follow_up` means more work is planned. `not_interested`, `no_response`, `inactive`, and `do_not_contact` represent explicit outcomes or suppression states.

## Events versus states

`whatsapp_opened` is an event, not a state transition. `message_marked_sent` is a separate manual fact from opening WhatsApp. The current UI's Mark sent action transitions to `contacted`; opening WhatsApp only adds an activity. A reply must be manually recorded and transitions to `replied`.

The WhatsApp Web dialog also provides **Mark sent and close**. After manually sending in WhatsApp, the operator confirms here; the dialog closes after the sent confirmation saves. Save failures keep the dialog open with an error. Repeated sent confirmations for an already contacted customer record another attempt and activity rather than silently doing nothing. The message text remains in WhatsApp and is not stored by this action.

The dialog includes a predefined **Free tokens invitation** snippet supplied by the operator. Clicking it replaces the message field with the invitation and updates the WhatsApp Web link. The operator can edit the text before opening the chat. Selecting a snippet does not open WhatsApp, send a message, or record a contact attempt. This snippet is part of the static app, separate from Firestore custom templates.

The operator can choose the Web link or adjacent desktop icon. The desktop option requires the installed WhatsApp app and a registered app link handler; the browser may ask for permission to open it. Both use the current prepared message and record `whatsapp_opened` as a request. Sending and sent confirmation remain manual for both choices.

## Expected transitions

The normal path is `not_contacted -> contacted -> replied -> interested -> customer`, with `follow_up` branching from any active stage. `no_response`, `not_interested`, `inactive`, and `do_not_contact` are terminal or paused outcomes unless a future explicit reactivation policy is added. Current code permits any requested status without a transition validation table; this is a known limitation.

## History

Every meaningful action should append an activity. Status and event semantics must remain distinct so the timeline can explain what actually happened.

## Official Cloud API evidence

The prepared Genie enquiry form also supports manual capture of a WhatsApp phone,
product interest, note and optional follow-up date. It matches existing contacts,
records an explicitly manual activity and preserves their business/suppression
state. A new contact remains a lead; this action does not verify a reply or sale.
Its optional pending follow-up is saved without replacing business qualification;
suppressed contacts cannot be scheduled. The existing Atlas profile and purchase/
subscription workflow remains the place to qualify interest and record outcomes.
See `WHATSAPP_LEAD_ALERTS.md` for the private bridge and API-onboarding limits.

The optional Node backend now records inbound messages, API acceptance and
delivery/read/failure events separately from manual confirmations. Incoming events
associate by normalized phone, update `lastReplyAt`, and add message text to the
timeline; they preserve the current business status and follow-ups. Unknown
senders create `new` leads. Outbound CLI refuses suppressed contacts. API acceptance
does not count as delivery or automatically transition/increment manual contacted
status. Manual Web/desktop actions keep their existing semantics. No AI response,
automatic qualification or follow-up execution has been added.

The existing WhatsApp dialog now also offers **Send via WhatsApp API** to approved
signed-in operators when the backend is available. This uses the configured
business number and shows API acceptance; subsequent webhook events supply
delivery/read outcomes. It does not invoke the manual contacted transition or
require Mark sent. The dialog disables duplicate/manual sending after acceptance
or an uncertain result; the operator should inspect history before another attempt.

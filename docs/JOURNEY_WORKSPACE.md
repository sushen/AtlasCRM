# Customer journey workspace

The reviewed workspace and inventory forms were released to the live Firebase
site on 2026-10-19, with the existing Worker mediating operator-only shared-Firebase
inventory. Use `https://atlascrm-c5722.web.app/?inbox=1` after signing in. Real
automatic WhatsApp onboarding/sending remains pending; this release does not enable
it. Deployment/static checks pass; signed-in browser verification awaits operator
login. Earlier local review notes below remain historical. See DEPLOYMENT.md.

Latest local review adds Assign product to the focused customer overview. It
opens the saved catalog-product selector, matching owned inventory accounts and
customer access-days field. Supplier account years/warranty are displayed as
source terms, never a default customer expiry. Selecting a catalog price does
not prefill actual payment. An unsaved three-day draft was visually checked;
no third purchase was created. The real customer overview shows two recorded
purchases and two assigned accounts, with the second payment/access term explicitly
pending. The default delivery-details projection excludes 2FA fields.

Local development, 2026-10-19. Open `http://localhost:3199/?inbox=1` after operator
sign-in, or select Inbox & journey. This is a development view, not a production
release or a claim that the real WhatsApp integration is active.

The workspace reads existing Firebase customers, activities, purchases,
subscriptions and follow-ups. It shows each person's current journey stage and
the next action, conversation evidence and product/payment/access context. Search
matches names, phones or WhatsApp usernames. No demo conversations or new real
customer records are generated. Opening the screen does not change business state.

The pure journey projection follows lead → conversation → interest → purchase →
subscription → renewal using recorded evidence. An inbound message does not by
itself qualify someone or confirm payment. Paid amounts stay separate by currency;
expiry uses Bangladesh business dates. Suppression overrides reply/follow-up actions.
Manual WhatsApp openings/sent markers are not provider messages. API acceptance
is shown separately from provider status events and never proves delivery.

The conversation pane reuses the existing official sending adapter, authenticated
customer ID and explicit send action. It disables duplicate sends and locks unknown
outcomes; it does not use WhatsApp Web automation. The generated local workspace
still replaces sending with a disabled adapter, so development cannot message real
customers. The operator must check the connection before Send reply is enabled in
an actual sending environment. Username-only leads need a supported sender identity
before official API replies can be sent. No AI reply or automatic reminder is enabled.

Verified webhook capture already exists in the backend but requires approved live
number onboarding, working Meta credentials, public HTTPS callback and subscription.
Those remain unresolved; see WHATSAPP_LEAD_ALERTS.md. The UI shows this gap rather
than treating manually stored numbers as incoming conversations.

Tests connect the real MessageRepository's inbound/dedup and accepted-send paths
to journey projections, purchase validation, subscription expiry/renewal, suppression,
cross-customer isolation and honest empty UI. These are mocked integration tests,
not a completed real-number end-to-end test. Changes remain local for visual review.

Validation: all 42 affected journey/sales/WhatsApp/alert tests passed. The actual
local service restarted, verified shared Firebase read access and serves both the
journey route and module with HTTP 200; generated sending remains disabled. Browser
inspection was blocked on the old error tab by its URL security gate, so the
operator must reopen the normal localhost link before visual inspection can resume.

Subsequent normal-page browser inspection succeeded. A focused customer URL now
opens a customer/product overview before the people list, showing actual purchase
count, amount paid, access dates and assigned account. Global stage queues are
hidden in focused mode and explicitly labeled "Customers by current stage" in
the all-journeys view, preventing a Purchase-stage zero being read as no purchases.
Reloading the normal page refreshed its local session and assignment reads worked.
Six journey tests cover the focused overview, including real-count/assignment UI.

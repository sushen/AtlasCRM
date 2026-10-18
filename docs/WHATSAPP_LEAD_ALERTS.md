# WhatsApp enquiries → Atlas → Genie

Prepared on 2026-10-18. This reuses the existing Node WhatsApp webhook and CRM
repository. No public deployment, number migration, webhook registration or
automatic reply was performed. The saved Meta token currently fails authentication;
the intended Business-app number still needs approved WhatsApp Platform onboarding.

## Immediate manual capture

Run `npm run leads:local` from AtlasCRM, then restart Genie and open
**Atlas Market → Ad reports → WhatsApp enquiries**. The private lead bridge needs
the existing Firebase CLI/Admin login, a workspace operator and the existing
`ATLAS_ADMIN_TOKEN` from the private environment or ignored `.env`. It does not
need a Meta token or enable WhatsApp sending. It binds only to `127.0.0.1:3000`.
Do not run it alongside the full Atlas local server on the same port.

Enter the lead's name, phone, optional product interest, note and next follow-up
date. The date is interpreted at 10 AM Bangladesh time. Saving deliberately sends
these fields only to the authenticated loopback bridge and then to the existing
private Atlas Firestore. Identical retries reuse one request ID; conflicting input
under an existing ID is rejected. An uncertain save says **not confirmed**, not
success. No message is sent and no sale or ad attribution is invented.

Normalized phones match existing customers. Existing names, notes, business status,
history and suppression are preserved. Product interest goes in the enquiry
timeline (and initial notes for a new contact). A supplied follow-up creates one
pending followup and updates `nextFollowUpAt`; suppressed customers cannot receive
a scheduled follow-up. Capturing an enquiry never marks someone a customer.

In Atlas, qualify interest, agree on a product, schedule follow-up, and use the
existing purchase/subscription workflow to record the actual outcome. Marking an
alert reviewed acknowledges it locally; it does not qualify the contact or prove
payment. The earlier two phone-app messages are not automatically imported.

## Automatic incoming messages

The full server's signed `/webhooks/whatsapp` handler already creates or matches a
customer and records the private message/timeline. It now creates an alert in the
same transaction. Verified Meta referral fields are retained on the private message;
only `source_type` ad/post, numeric `source_id` and bounded `ctwa_clid` are accepted.
No source is inferred from message text or from an ad click alone.

Real automatic capture requires the intended phone/WABA, working Meta credentials,
the app secret, a public HTTPS callback, the app's messages subscription and a real
controlled test enquiry. The localhost lead bridge alone is not that callback.
`npm run start:local` can serve signed webhooks once properly configured, but Meta
cannot call localhost directly. Hosting currently has no Node webhook rewrite.
Windsor's aggregate ad reporting is not a WhatsApp inbox integration.

Preserve the existing Business app until its supported onboarding/coexistence
route is confirmed. Never delete its registration merely to make an API test work.
WhatsApp sending/replies remain the existing explicit operator workflow. No LLM
auto-reply, conversion-to-customer automation or repeated outbound follow-up is enabled.

## Private feed and notifications

`GET /api/genie/lead-alerts?cursor=...` is read-only; `POST
/api/genie/manual-leads` is explicit manual capture. Both require a sufficiently
long existing admin bearer token, fixed loopback Host, loopback source and no browser
Origin/Sec-Fetch-Site. No CORS is granted. Raw errors are sanitized. The feed returns
only event/customer IDs, a display name, masked phone suffix, timestamps, new-contact
flag and evidence-based source; no message body, full phone or click ID is exposed.

Genie polls every fifteen seconds while open, persists the cursor/dedup in ignored
`lead_alerts.sqlite`, and shows failures honestly. The first backlog is visible
without a sound storm. Later unseen events open the enquiry window and produce one
Windows notification beep per new batch if sound is enabled. A mute switch and local
review acknowledgements persist. Genie being closed means no local beep; durable
incoming storage still depends on a continuously running reachable backend.

## Storage and verification

The additive server-only `whatsappLeadAlerts` collection is denied to browser
clients by existing default rules; no rules change is needed for Admin SDK access.
It stores deterministic per-message alerts plus request hashes for manual dedup.
Manual capture uses the existing `customers`, `activities` and `followups` schema.
Existing customers and messages are not migrated. The feed orders by server
creation time and document ID, with a bounded 50-record page and an opaque cursor.

Automated tests use fictional contacts and mocked Meta transport. No real customer
was created for testing. The private bridge's Firebase read/bootstrap and Genie's
authenticated empty-feed read passed on the operator's machine. This verifies
manual-path readiness, not receipt of real WhatsApp messages.

An operator-authorized real-phone test of Meta's Hello World template was accepted
and confirmed received. It used Meta's test sender, not the real business number
as an API sender. The existing AtlasCRM app remains unpublished and its setup page
requires publication for production webhooks. Meshstocks exposed only test-number
accounts; SMM Client reported no eligible WABA access for the login. A Business-app
linking form for Meshstocks was approved and reached code verification; completion
is still pending. The old saved Windows credential was not overwritten with the
browser's temporary test token. No token or real phone number belongs in this doc.

```sh
node --test tests/lead-alerts.test.mjs tests/whatsapp.test.mjs
```

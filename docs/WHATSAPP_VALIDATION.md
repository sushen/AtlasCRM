# WhatsApp validation — 2026-10-06

## Current callback trace

The latest intended-recipient send remains accepted with matching private attempt,
message and customer associations in the preceding read-only reconciliation. No
status or inbound event has been observed, so the provider delivery/failure outcome
is unknown. This session could not repeat the Firestore query: Node was denied
filesystem access while resolving the project path. No accepted message was resent.

The running loopback webhook returned HTTP 200 and the exact challenge for a GET
using the existing process verify token. An unsigned POST returned HTTP 401 as
expected. The app secret is unavailable to this diagnostic process, so a valid
signed POST could not be tested against the live service. Source and mocked tests
cover raw-byte HMAC verification, account/phone filtering and deduplication, but
they do not prove Meta's public callback reaches this service.

No ngrok executable was found on this session's PATH or usual WinGet link, and no
ngrok process was visible. Thus there is no verified public HTTPS callback URL.
The intended app among the WABA's two subscriptions, its callback URL, and its
`messages` field selection remain unverified. No inbound Hi was requested or
received during this trace. The CRM acceptance text now says delivery remains
unconfirmed until a verified webhook arrives; this UI edit is not deployed.

## Result

### Latest CRM send after token refresh and service restart

The operator reports Accepted by WhatsApp but no message on the recipient's phone.
Read-only reconciliation of the new intended-recipient attempt confirms acceptance,
external ID, message persistence, recipient/customer associations and acceptance
activity. Delivery state remains accepted, with no incoming message or status events.

Read-only Meta calls using the refreshed saved token succeed: the configured phone
is accessible and belongs to the saved WABA. The WABA has two subscribed apps and
five approved templates in the retrieved page, including hello_world. Exact callback/
field configuration of the intended app is still unverified. The local webhook now
rejects unsigned POSTs with 401, showing signature support is active; no ngrok process
or usual inspector was found. No new message was sent or retried in this review.

The current task is `prompts/active/04-accepted-message-delivery-trace.md`: connect
provider status evidence and diagnose the nonreceipt, rather than repeating the
resolved token-authentication investigation. Webhook absence explains missing
diagnostics; it is not itself proof of why Meta did not deliver to the phone.

### Subsequent operator-authorized single Hi test

After the read-only validation below, the operator explicitly requested one real
Hi message to the existing verified test recipient. One new request was made
through the official service using current inherited/saved local settings and
tracked CRM persistence. Meta rejected it with **HTTP 401, code 190**. The message
was not accepted. There was no retry or fallback. The current test credentials are
invalid or expired; the already-running service's in-memory token was not inspected
and may differ. The earlier accepted-message records below remain historical facts.

That stage's authentication task is now archived at
`prompts/archive/03-whatsapp-integration/08-access-token-and-runtime-validation.md`.
The operator subsequently refreshed the token; the latest CRM acceptance above
supersedes this authentication blocker.

### Earlier read-only evidence

The latest send for the intended private test recipient was accepted by Meta and
persisted consistently in AtlasCRM. Recipient delivery cannot currently be verified:
there are no sent/delivered/read/failed webhook events for that message, and no
inbound message from the recipient is present in Firestore.

No WhatsApp message was sent or retried during this validation. Read-only database
queries, local HTTP probes, public static-file checks and mocked automated tests
were used. No customer numbers, bodies, credentials or external message IDs were
printed or copied into this report.

| Check | Verified result |
|---|---|
| Intended recipient matched | Yes |
| Latest send attempt | `accepted` |
| External Meta message ID | Present; value withheld |
| Corresponding message record | Present |
| Customer, recipient and external-ID associations | Match |
| Stored delivery state | `accepted` |
| Acceptance timeline activity | Present |
| Status timeline activity | Absent |
| Webhook status events | None for the accepted message |
| Recipient inbound message / Hi | Absent |
| Recipient-confirmed delivery | Not verified |
| Local API allowed-origin preflight | HTTP 200 |
| Unauthenticated API request | HTTP 401 |
| Local webhook POST | HTTP 503, not configured |
| Private backend source request | HTTP 404 |
| Saved Windows app-secret / verify-token presence | Both present; values withheld |
| Ngrok | Installed; no Windows ngrok process or usual inspector endpoint found |
| Hosted application/client/endpoint modules | HTTP 200 and match local source |
| Automated suite | 30 passed, zero failed; Meta sends mocked |
| Affected server syntax checks | Passed |

## Interpretation

The earlier Meta recipient-list rejection is not the latest send outcome. The
current evidence proves request acceptance and correct persistence, not delivery.
Missing webhook records are not evidence that Meta failed to deliver.

The running webhook endpoint is disabled despite the two required values being
saved in Windows. The running process may have inherited earlier settings, but
its in-memory environment has not been inspected; stale runtime configuration is
an inference requiring a controlled restart and fresh verification. No active
local ngrok tunnel was found. Meta cannot post inbound/status events through an
unconfigured/unreachable callback.

The latest work refactored local Firebase credential setup into
`server/local-firebase.mjs` and added privacy-safe diagnosis. The approved local
architecture, sender transport and authentication remain intact. No code defect
was reproduced by the 30-test suite; live end-to-end webhook processing remains
the missing validation.

## Next task

Use `prompts/active/04-accepted-message-delivery-trace.md` for the current
accepted-but-not-received situation. Historical authentication and webhook
handoffs remain in the archive. Do not resend accepted messages as diagnostics;
first establish legitimate incoming/status evidence and identify the provider outcome.

# AtlasCRM — trace accepted messages that the recipient has not received

## Goal

Continue in `C:\Users\user\PycharmProjects\AtlasCRM`. The operator refreshed the
Meta token, restarted the local service and manually sent another CRM message.
The CRM shows Accepted by WhatsApp, but the operator reports no message on the
verified recipient's phone. Determine the provider's real delivery/failure outcome
and fix only an established cause. Do not automatically resend accepted messages.

Preserve the local Windows service plus Firebase-hosted CRM. Do not enable billing,
move to cloud hosting, add WhatsApp Web automation or introduce AI responses.

## Independently checked evidence

- The latest attempt for the intended private recipient is accepted, has a Meta
  message ID, and is stored in `messages` with matching customer, recipient and
  external-ID association. The acceptance timeline activity exists.
- Stored delivery state is accepted. There are no status events or status timeline
  entries for this message and no incoming recipient message/Hi in Firestore.
- The recipient reports nonreceipt. There is no provider delivery/failure evidence
  in Atlas yet; missing webhooks must not be interpreted as delivery failure.
- Read-only Meta checks using the refreshed saved token can access the configured
  Phone Number ID, and that ID belongs to the configured WABA.
- That WABA reports TWO subscribed applications. The exact app's callback/field
  configuration has not been verified; do not assume either application is correct.
- Five approved templates were returned, including approved `hello_world`.
  Existing Atlas transport still sends ordinary text, not approved API templates.
- The local webhook now returns 401 for an unsigned POST instead of 503: local
  signature support is active. Correctly rejecting an unsigned probe is expected,
  not a defect. A valid externally signed callback has not yet been proven.
- The known Hosting origin's API preflight returns 200. No ngrok process was found
  and the usual local tunnel inspector was unavailable.
- Earlier full suite: 30 tests passed. No new real message was sent/retried during
  this read-only review. The prior code-190 test is historical, not the current
  authentication result.

## Recover context

Read `AGENTS.md`, project/current state/architecture, then WhatsApp validation/setup,
security, Firebase, data model, journey, tests and deployment documents. Inspect
git status/log and preserve existing changes. Read current source and actual runtime
before applying archived instructions. The preceding authentication prompt is
archived at `prompts/archive/03-whatsapp-integration/08-access-token-and-runtime-validation.md`.

Relevant implementation: `server/local.mjs`, `local-firebase.mjs`, `config.mjs`,
`http.mjs`, `webhook.mjs`, `repository.mjs`, `firestore.mjs`, `whatsapp.mjs`,
`send.mjs`, `auth.mjs`, `scripts/whatsapp.ps1`, and browser messaging modules/tests.
Diagnostics under `.firebase/` must be reviewed before reuse and remain read-only.

## Work sequence

1. Reconcile the latest intended recipient's accepted attempt, message and status
   events read-only. Compare customer/recipient/ID values in memory and output only
   states, Boolean matches and numeric provider codes. Distinguish newer messages
   from older accepted/rejected attempts. Never dump records, message contents,
   real numbers, credentials or full provider IDs.
2. Verify local GET challenge handling and raw-body HMAC-SHA256 POST handling
   using the existing saved verify token/app secret. Do not regenerate them or log
   query strings/signatures/values. Valid/invalid mock probes must not fabricate
   messages/events in production Firestore. Preserve WABA/phone filtering and dedup.
3. Verify installed ngrok help/configuration and establish a temporary HTTPS
   callback to loopback. Do not install another tool unnecessarily. Prefer disabling
   payload inspection and debug/request logs; a locally checked candidate is:

   ```powershell
   ngrok http http://127.0.0.1:3000 --inspect=false --log-level=warn
   ```

   Use the actual HTTPS URL returned by the tool, with `/webhooks/whatsapp` appended.
   If ngrok private sign-in/token setup is absent, request that precise operator
   action without collecting tokens in chat. Keep normal endpoint/auth/Host/Origin
   safeguards. Do not relax the send API globally to accommodate a tunnel.
4. Identify the intended existing Meta application and how it relates to the
   configured sender/token/app secret and the TWO subscribed WABA apps. Check
   subscriptions read-only where possible; do not delete or reconfigure another
   app's subscription. Show the operator the exact existing-app callback settings:
   actual HTTPS callback, privately entered existing verify token, object
   `whatsapp_business_account`, field `messages`. Do not claim those dashboard
   settings are correct merely because the WABA has subscribed apps.
5. Validate public challenge forwarding and legitimate signed POST delivery.
   Inspect raw-body preservation and exact account/phone IDs if verified callbacks
   are ignored. Any code fix must be minimal and supported by reproduced evidence;
   signatures must never be bypassed. Report external setup gaps rather than
   inventing bugs or weakening security.
6. Have the operator manually send one new inbound Hi from the verified recipient
   to the correct configured business/test sender. Verify a legitimate inbound
   Firestore record, received activity, normalized association and lastReplyAt.
   No outgoing test is authorized by this step. Incoming receipt is the proof that
   the receiving route works; a local 200 for an empty probe is not equivalent.
7. Check whether historical message status events arrive through provider retries.
   If no historical evidence is available, report unknown rather than retrying the
   message. Only after an explicit operator-initiated fresh controlled send may
   a new message be reconciled through sent/delivered/read/failed status events.
   Never automate retries or silently switch text to a template fallback.
8. Use a definite numeric status failure to choose the fix. For a customer-service
   window/template restriction, explain that ordinary text and approved templates
   differ. Meta's approved hello_world availability does not mean Atlas already
   implements template sending. Add minimal template support only if the operator
   approves that next task; do not send it automatically. For another provider
   failure, follow the established code rather than guessing token/window causes.
9. Inspect the UI statement that delivery/read status "will appear" even when no
   callback is operational. If needed, make its acceptance text truthful: accepted
   is not delivered, and status remains unknown until provider evidence exists.
   Never infer delivery from a click, API response or recipient-list membership.

## Restrictions and completion

Do not resend older messages, execute message contents, expose private data,
replace credentials, change billing, deploy Hosting/cloud services, weaken rules,
commit/push or alter unrelated work. Diagnostics cannot mutate Firestore; only
legitimate validated webhook processing may write ordinary transport history.
Keep suppression, authentication/revocation/UID checks and send idempotency intact.

Use existing local credential bootstrap rather than a second implementation.
If restarting, identify only the Atlas process and ensure no pending send. Avoid
duplicate listeners or stale process IDs. All automated Meta sends must be mocked.
Run focused tests/syntax/diff checks for actual code changes and update materially
affected docs. A configuration-only fix does not justify unrelated code edits.

Finish with evidence-based acceptance, public callback/subscription, inbound,
delivery/status and recipient-result checks. State the exact provider failure
only when observed, or explicitly state unknown. Give one concrete operator action
if blocked; do not keep generating replacement prompts for an unchanged blocker.

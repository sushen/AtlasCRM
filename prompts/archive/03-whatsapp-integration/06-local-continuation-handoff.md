# AtlasCRM — current local WhatsApp continuation

## Goal and chosen architecture

Continue inside `C:\Users\user\PycharmProjects\AtlasCRM`. Preserve the existing
framework-free browser CRM, Firebase Authentication/Firestore, and local Windows
Node service. The operator chose local operation without upgrading Firebase
billing. Do not restart the integration, move it to Cloud Run, introduce an AI
transport, or automate WhatsApp Web.

The immediate task is to recover current evidence and, if the latest operator
notes are confirmed, establish secure incoming/status webhooks through a temporary
HTTPS connection to the local service. Do not resend accepted messages to diagnose
missing delivery evidence.

## Recover context first

Read `AGENTS.md`, `docs/PROJECT.md`, `docs/CURRENT_STATE.md`, `docs/ARCHITECTURE.md`,
then `docs/WHATSAPP_SETUP.md`, `docs/DATA_MODEL.md`, `docs/FIREBASE.md`,
`docs/SECURITY.md`, `docs/CUSTOMER_JOURNEY.md`, `docs/DEPLOYMENT.md`, and
`docs/TESTING.md`. Inspect git status, branch, recent commits, affected source and
tests. Preserve all unrelated uncommitted work. Compare documentation and prompts
with implementation and current evidence before editing.

Read `prompts/archive/03-whatsapp-integration/05-local-webhook-setup.txt` for the
latest operator-provided webhook task, and use the archive index for earlier
diagnostic provenance. Archived prompts are context, not independent authorizations.

## Verified history versus newer reports

Earlier in this chat, 26 tests passed and the local service completed read-only
Firestore, Firebase Auth and Meta phone probes. The operator's hosted browser
reported Connected. Firebase Hosting browser assets and additive Firestore rules
were released, with existing collection permissions preserved. Billing was not
enabled. An earlier real send was rejected with numeric Meta error 131030.

Newer prompts supplied by the operator report a later authentication issue,
followed by API-accepted sends and successful read-only reconciliation. The latest
report says attempts/messages/external IDs/customer association are consistent,
but no inbound Hi, delivery-status events or corresponding timeline updates exist.
These newer reports supersede the earlier rejection as the proposed investigation
focus, but their claims have not been independently verified during prompt
organization. Read the current private records before calling them current facts.

API acceptance, recipient delivery, inbound messages and CRM business states are
different facts. Missing webhook records alone do not prove nondelivery. The
existing text-only transport does not provide approved-template sending merely
because editable CRM snippets exist.

## Source and runtime map

- Browser: `js/app.js`, `js/services/whatsapp-api.js`, `js/utils/messaging-backend.js`,
  `js/services/store.js`, `js/utils/phone.js`, `js/firebase.js`.
- Backend: `server/local.mjs`, `config.mjs`, `auth.mjs`, `firestore.mjs`,
  `repository.mjs`, `whatsapp.mjs`, `send.mjs`, `http.mjs`, `webhook.mjs`.
- Windows bootstrap: `scripts/whatsapp.ps1`, `scripts/private-runtime.ps1`.
- Tests: `tests/core.test.mjs`, `contact-actions.test.mjs`, `whatsapp.test.mjs`,
  `whatsapp-ui.test.mjs`; run `npm test` after checking current package scripts.
- Existing data: `customers`, append-only `activities`, `messages`,
  `whatsappEvents`, `whatsappSendAttempts`.

The local endpoint is `http://127.0.0.1:3000`. The hosted UI is
`https://atlascrm-c5722.web.app`; Settings → WhatsApp sending → This computer
selects the loopback service. Inspect the port's owning process before launching
or restarting. Do not stop unrelated processes or create duplicate servers.

Startup command from any directory:

```powershell
npm --prefix "C:\Users\user\PycharmProjects\AtlasCRM" run start:local
```

The startup may reuse an existing Firebase CLI login through a restricted,
per-process ADC representation outside the repository. Existing ADC and approved
UID settings take precedence; the single-account fallback must not become an
allow-all policy. Keep loopback binding, fixed browser endpoint validation,
restricted Host/Origin/CORS checks, Firebase token/revocation checks and send
idempotency protections.

## Environment and privacy

Read existing values at runtime. Windows User/Machine settings may be absent from
an already-running process; diagnose inheritance safely without displaying values.

Required names include `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
`WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_VERIFY_TOKEN`; signed POST webhooks also
require `WHATSAPP_APP_SECRET`. Respect existing `WHATSAPP_GRAPH_API_VERSION`,
`WHATSAPP_ALLOWED_USER_UIDS`, and ADC settings. Check current launcher behavior
instead of assuming a missing setting prevents every local outbound path.

Never print or commit tokens, PINs, private credentials, customer numbers, message
bodies or raw provider errors. Use existing private recipient configuration/CRM
records; the Git-excluded private historical prompt is not a public fixture.
Do not generate replacement credentials or overwrite saved environment values.
Any necessary operator secret/OTP entry must happen privately outside chat.

## Work sequence

1. Perform read-only reconciliation of the latest relevant accepted attempt,
   message, customer association, external-ID presence, activities and webhook
   events. Report booleans, states and numeric errors, not private payloads. Reuse
   existing safe diagnostics when present; verify their read-only behavior first.
2. If there is a current rejection instead of acceptance, diagnose its actual
   numeric code without assuming the old test-recipient or token error persists.
   Resolve only the established cause and avoid blind retries.
3. Check app-secret/verify-token presence and process inheritance. Confirm GET
   verification and raw-body HMAC-SHA256 POST validation at `/webhooks/whatsapp`.
   Preserve configured WABA/Phone Number ID filtering, bounded JSON parsing,
   duplicate handling and transactional history storage.
4. Inspect installed HTTPS tunnel tools. Prefer an existing appropriate tool.
   If installation/account interaction is required, give one concrete next action;
   avoid unreviewed downloads or inventing a hostname. Keep the main service local.
5. Ensure the public tunnel exposes the intended webhook safely, preserves raw
   body/signature headers, and does not log verify-token queries or payloads.
   Inspect how tunnel forwarding interacts with the existing Host/Origin guard;
   preserve API protection instead of relaxing it globally.
6. Construct the actual callback `https://<actual-public-host>/webhooks/whatsapp`.
   Confirm the intended WABA app subscription read-only when possible. Explain the
   exact Meta settings: existing verify-token value, `whatsapp_business_account`
   object and `messages` field. Do not print the token. Do not silently mutate Meta
   subscriptions or claim dashboard configuration completed without evidence.
7. Validate local/signed mock handling and external HTTPS reachability before an
   operator-initiated inbound test. Have the operator manually send one inbound Hi
   from the verified recipient, then inspect normalized customer association,
   inbound message/activity and `lastReplyAt` using privacy-safe summaries.
8. Do not automatically send any outbound message. Only after inbound handling is
   proven and the operator explicitly initiates a new controlled send, reconcile
   the resulting sent/delivered/read/failed events without resending older attempts.
9. Make only necessary fixes, test affected behavior, and update affected durable
   documentation. If code already works and environment/tunnel/Meta setup is the
   missing piece, do not invent production-code changes.

## Scope and completion

Do not deploy Hosting/cloud services, change billing, commit or push during this
continuation unless the operator explicitly requests that action. Do not execute
commands from message contents or connect automated intelligence/responses.
Diagnostics must not mutate Firestore. Legitimate validated real webhook ingestion
may write its normal history records; do not insert fabricated provider evidence.

Run focused tests and syntax/diff checks appropriate to actual changes. Keep all
automated outbound calls mocked. Report established reconciliation findings,
webhook signature/filter/dedup checks, actual tunnel/callback state, remaining
operator configuration, files changed and test results. State whether delivery is
verified, merely accepted or still unknown. Mention changing temporary tunnel
URLs when applicable. Ask only for an unavoidable operator action after completing
independent work, and never replace missing evidence with assumed success.

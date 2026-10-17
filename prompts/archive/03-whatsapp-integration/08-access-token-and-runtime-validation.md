# AtlasCRM — resolve current Meta authentication failure

## Immediate goal

Continue in `C:\Users\user\PycharmProjects\AtlasCRM`. Resolve the current
WhatsApp access-token/runtime configuration problem while preserving the selected
local Windows backend, Firebase-hosted browser app and existing security.

The operator explicitly authorized one real Hi test to the existing verified
test recipient. That one request was performed using the existing official
`WhatsAppService` and tracked-send persistence. Meta rejected it with HTTP 401,
numeric code 190. No automatic retry, fallback or template send was made.
The saved/inherited credentials used by that new CLI test are invalid or expired.
The exact in-memory token of the already-running service was not inspected, so do
not claim its configuration matches the new CLI test without evidence.

This authentication failure takes priority over webhook setup. Historical sends
were accepted and persisted consistently, but historical delivery remains unverified.
The local webhook previously returned 503; ngrok was installed but not running.
These are separate follow-up issues, not reasons to bypass token authentication.

## Recover context and preserve work

Read `AGENTS.md`, project/current-state/architecture documents, then
`docs/WHATSAPP_VALIDATION.md`, WhatsApp setup, security, Firebase, data model and
testing docs. Inspect git status/log and current source before modifying anything.
Preserve all unrelated uncommitted work. The previous webhook handoff is archived
at `prompts/archive/03-whatsapp-integration/07-webhook-runtime-and-delivery-verification.md`.

Relevant files: `server/local.mjs`, `local-firebase.mjs`, `config.mjs`, `whatsapp.mjs`,
`send.mjs`, `repository.mjs`, `http.mjs`, `auth.mjs`, `scripts/whatsapp.ps1`,
`scripts/whatsapp-diagnose.mjs`, browser API/UI modules and current tests.

## Sequence

1. Read the latest relevant private `whatsappSendAttempts` failure. Output only
   state, numeric Meta code/subcode and HTTP status. Compare intended recipient
   and normalized customer association in memory; never print the phone/body.
   Distinguish this new failed Hi request from older accepted requests.
2. Inspect process/User/Machine environment inheritance and precedence. Preserve
   existing nonempty settings. Compare credential versions only through Boolean
   equality/presence or safe non-reversible diagnostics that reveal no values.
   Do not extract secrets from process memory or dump environment/CLI stores.
3. Use only bounded, read-only official Meta checks for credential validity and
   access to the configured Phone Number ID/WABA. Do not call `/messages` during
   investigation. Do not automatically regenerate credentials, alter permissions,
   switch accounts or overwrite saved values. Parse only sanitized numeric errors
   and validity classifications; never display raw provider error text.
4. Establish whether the cause is expired/invalid saved credentials, stale runtime
   inheritance, permissions/account mismatch, or a reproducible code problem.
   Do not assume error 190 specifies an exact expiration time or sole cause without
   evidence. Do not treat a failed new test as proof every historical send failed.
5. If the operator must refresh a token, give one precise private Meta/Windows
   action. Tokens belong in the existing local environment, not chat/source/docs.
   Do not ask the operator to paste a token or OTP into the conversation.
6. Restart only the identified Atlas service, when no request is pending, after
   valid settings are established. Use a fresh launcher context, do not start a
   duplicate server and do not kill unrelated processes. Preserve existing Firebase
   ADC/CLI bootstrap, approved-user checks, loopback/CORS/Host/Origin restrictions.
7. Confirm local startup's read-only Meta phone and Firebase checks succeed, then
   verify authenticated browser readiness. Connection alone is not proof of a
   successful Meta send. Any code fix must be minimal, reproduced and mock-tested.
8. The earlier permission was consumed by one Hi attempt. Do not retry it or send
   another message automatically. Have the operator explicitly initiate one new
   controlled CRM send after credential validation. Record acceptance separately
   from delivery and keep the existing request-id/uncertain-send protections.
9. After authentication works, resume the archived webhook/runtime task only if
   still applicable. Signed public callback connectivity is needed for inbound
   messages and delivery/read status. Do not require a billing upgrade or create a
   cloud deployment; the operator chose local operation.

## Boundaries and completion

No real message sends during investigation, no automatic retries, no credential
generation/replacement, no Firestore history mutation by diagnostics, no deployment,
billing changes, rule changes, commits/pushes or WhatsApp Web automation.
Do not invent a code fix for an external token problem. Maintain recipient
suppression, secure persistence and the distinction between accepted/delivered.

Run focused mocked tests and syntax/diff checks for actual changes; the last full
suite had 30 passes. Update affected durable docs with established facts only.
Finish with the root cause/classification, relevant numeric evidence, runtime
configuration match status, exact operator action if needed, files changed, tests,
and whether read-only readiness is restored. If delivery remains unverified, say so.

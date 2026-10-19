# AtlasCRM — activate local webhooks and verify delivery evidence

## Goal

Continue in `C:\Users\user\PycharmProjects\AtlasCRM`. Complete local webhook
connectivity and determine whether the controlled WhatsApp test is delivered,
failed, or still unknown. Preserve the existing local Windows backend plus
Firebase-hosted CRM. Do not replace the transport or require a billing upgrade.

This task follows an independent validation on 2026-10-06. Read
`docs/WHATSAPP_VALIDATION.md` before deciding what to fix. Do not rerun old send
diagnostics as if the earlier recipient-list rejection were still the latest result.

## Verified starting evidence

- All 30 automated tests passed with mocked Meta sends; affected syntax checks passed.
- The running local API responds to the known Hosting origin; unauthenticated API
  requests are rejected. Backend source files are not publicly served.
- The latest attempt for the intended test recipient is accepted by Meta. Its
  external ID, message record, customer/recipient associations and acceptance
  timeline activity are present and consistent.
- Its stored delivery state remains `accepted`, with no webhook status events or
  status timeline activity. No inbound recipient message/Hi is stored.
- Actual recipient delivery is unverified. Absence of webhooks does not prove
  nondelivery; an accepted response does not prove delivery.
- POST `http://127.0.0.1:3000/webhooks/whatsapp` returns 503, not configured.
- `WHATSAPP_APP_SECRET` and `WHATSAPP_VERIFY_TOKEN` exist in Windows User settings,
  but the current process's effective values were not read. Stale inherited
  configuration is a hypothesis, not an established internal code defect.
- Ngrok is installed. No Windows ngrok process or its usual local inspector was
  found. Its help supports disabling request inspection with `--inspect=false`.
- The hosted browser modules return 200 and match local source.
- No real message was sent/retried, no deployment performed and no Firestore
  records changed during validation.

## Read and inspect first

Follow `AGENTS.md` reading order: project, current state, architecture, then the
WhatsApp setup, validation, data model, Firebase, security, journey, testing and
deployment documents. Inspect git status/log and preserve unrelated working edits.
Read actual affected code: `server/local.mjs`, `local-firebase.mjs`, `config.mjs`,
`http.mjs`, `webhook.mjs`, `repository.mjs`, `firestore.mjs`, `auth.mjs`,
`scripts/whatsapp.ps1`, `scripts/private-runtime.ps1`, and relevant tests.

The prior continuation handoff is archived at
`prompts/archive/03-whatsapp-integration/06-local-continuation-handoff.md`.
Historical prompts are context only; they do not authorize unrelated work.

## Required work sequence

1. Recheck current listener/process identity, latest privacy-safe accepted-message
   evidence, and secret presence. Runtime state can change. Do not print credentials,
   recipient numbers, message bodies, full IDs, request URLs containing tokens,
   or raw exception/provider payloads. Existing private recipient configuration
   and data may be used only in memory for Boolean comparisons.
2. Determine why the running webhook route is disabled. Inspect the guard and
   launcher inheritance logic. If a restart is needed, stop only the confirmed
   Atlas local process, when no send is pending, and launch from a fresh environment
   that fills missing process values from the saved Windows settings. Preserve
   existing nonempty values and explicit ADC/UID settings. Do not start another
   copy on port 3000 or kill unrelated Node processes.
3. Use the existing local command:

   ```powershell
   npm --prefix "C:\Users\user\PycharmProjects\AtlasCRM" run start:local
   ```

   Keep the service running. Check that required effective settings are present
   using Boolean summaries only. Never regenerate tokens/secrets, overwrite saved
   values, copy secrets into tracked files, or weaken signature requirements.
4. Before starting a public tunnel, verify GET challenge handling with the existing
   verify token without printing its value/query. Verify POST signatures against
   raw bytes: valid HMAC accepted, invalid/missing signature rejected, malformed
   input bounded and rejected. Use empty harmless payloads or mocked repositories;
   do not write fabricated provider messages/statuses into production Firestore.
   Retain the configured WABA/Phone Number ID filtering and transactional dedup.
5. Use the installed ngrok tool to establish a temporary HTTPS route to loopback,
   with request inspection disabled and no payload/query debug logs. Confirm current
   help/configuration before launch. A candidate command is:

   ```powershell
   ngrok http http://127.0.0.1:3000 --inspect=false --log-level=warn
   ```

   Obtain the actual public HTTPS URL from the tool, not a fabricated hostname.
   If account setup is missing, give the operator one precise private action; do
   not solicit authentication tokens in chat or install another tool unnecessarily.
   Inspect provider retention settings and avoid storing customer payloads or
   verify-token query strings in request dashboards/logs. Disable the inspector
   rather than depending on it to prove delivery. Do not expose backend/private
   files; preserve fixed-origin API authorization and Host/Origin safeguards.
6. Construct the real callback as `https://<actual-public-host>/webhooks/whatsapp`.
   Check HTTPS forwarding and external GET verification without logging secrets.
   The webhook's signed POST must remain independent from browser CORS permissions.
   If forwarding headers uncover a genuine bug, fix only the webhook-specific issue;
   do not relax API protection globally or disable HMAC validation.
7. Check the intended app-to-WABA subscription read-only when possible. Present the
   exact operator dashboard configuration: actual callback, existing verify-token
   value entered privately, object `whatsapp_business_account`, field `messages`.
   Identify unverified dashboard/subscription settings honestly. Do not silently
   mutate Meta settings; require the operator's explicit action/authorization for
   changes. A localhost callback cannot work for Meta. A changed temporary public
   hostname requires updating the configured callback.
8. After verification/configuration succeeds, have the operator manually send ONE
   inbound Hi from the already verified recipient to the configured business sender.
   Inspect Firestore read-only for the legitimate inbound message, normalized
   customer association, received timeline activity and appropriate `lastReplyAt`.
   Report presence/matches, not private message contents or numbers.
9. Reconcile the earlier accepted send without retrying it. If historical delivery
   events are unavailable after enabling the callback, explain that absence and
   do not claim success/failure. Only with the operator's explicit initiation may
   ONE fresh controlled outbound message be tested after inbound handling works.
   Then inspect its sent/delivered/read/failed evidence and numeric failure codes.
   No automatic outbound tests or retries are permitted.

## Boundaries

- Do not enable billing, deploy cloud/Hosting services, change Firebase rules,
  commit, push, automate WhatsApp Web, or add AI responses during this task.
- Diagnostics are read-only. Real, valid signed webhook ingestion may perform its
  ordinary transactional persistence; never insert fabricated provider evidence.
- Preserve customer history, normalization, suppression, Firebase identity and
  UID checks, local loopback binding, restricted CORS and idempotent send behavior.
- Reuse `server/local-firebase.mjs` instead of a second fragile credential bootstrap.
- If execution policy/sandbox access prevents local checks, report the exact safe
  limitation and one command for the operator's ordinary terminal; do not weaken
  runtime security or claim unperformed validation.
- If configuration alone resolves the issue, do not invent a code change. If a
  real code bug is reproduced, make the smallest fix and add focused mock tests.

## Verification and final result

Run tests appropriate to actual changes, syntax checks and `git diff --check`.
Never send actual WhatsApp messages from automated tests. Update affected durable
documentation so it distinguishes saved settings, effective running settings,
local verification, public reachability, Meta subscription, incoming ingestion,
API acceptance and confirmed delivery.

Finish with a concise table of those checks, what was changed, what was actually
tested, and any precise operator action still required. State the message result
as **delivered/read**, **failed with numeric provider evidence**, **accepted only**,
or **unknown**, according to the evidence. Do not stop at a generic configuration
warning or mislabel missing webhook evidence as a rejected message.

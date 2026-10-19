# WhatsApp Cloud API integration

For the new private Genie enquiry feed, manual product-interest/follow-up capture
and notification behavior, see [WhatsApp lead alerts](WHATSAPP_LEAD_ALERTS.md).
`npm run leads:local` supports manual capture without a Meta credential; it does
not replace the public HTTPS webhook required for automatic incoming messages.

## Architecture

Atlas retains its framework-free browser app, Firebase Authentication, Firestore,
and localStorage demo mode. A small Node HTTP service serves only browser assets
and exposes `GET` and `POST /webhooks/whatsapp`. The backend uses native `fetch`
for Meta and Firebase Admin for the existing Firestore database. Meta credentials
stay server-side; web sending requires Firebase authentication and an approved-user
list. No unrestricted sending endpoint, WhatsApp Web automation, or AI execution exists.
Manual Web/desktop links and their manual confirmations remain available.

Messages form a conversation stream through `customerId`, channel and normalized
phone, rather than a separate conversation collection. The backend adds message
activities to the existing profile timeline. Refresh/reopen the profile to see
new events. The existing message dialog now also has **Send via WhatsApp API**;
a dedicated live inbox is not implemented.
The backend cannot access a browser's localStorage demo contacts.

## Local computer sending (no Firebase billing upgrade)

The operator selected local sending instead of Cloud Run. Start the service on
Windows with `npm run start:local`. The live CRM defaults to this computer when
no messaging preference has been saved. In **Settings → WhatsApp sending**, select
**This computer**, then **Check connection**. Permit the browser's local-network
access request if prompted. Open a contact's WhatsApp dialog, enter text, then
click **Send via WhatsApp API**. The service must remain running on this computer.
The fixed endpoint is `http://127.0.0.1:3000`; no public tunnel is needed for sending.

If startup reports that port 3000 is already in use, first use **Check connection**
in the CRM. The service may already be running from an earlier launch. Do not start
another copy or terminate an unrelated process occupying the port. A service that
was left running during setup can be used immediately without another launch.

The launcher uses the four existing Windows WhatsApp environment values. For
this local startup only, an absent Graph version uses `v25.0`, verified against
Meta with a read-only phone lookup before listening. Existing version settings
win; saved environment values are never changed. No actual message is sent on startup.

Local Firestore/Admin access reuses an explicitly configured ADC identity, or
the operator's existing Firebase CLI login. The latter is represented as an
authorized-user ADC file in a new per-process folder under
`%LOCALAPPDATA%/AtlasCRM/runtime`, outside the repository. The folder ACL permits
only the current Windows user and SYSTEM; the file is removed on normal exit.
An abrupt process termination may leave a protected file behind. No new key or
replacement token is generated, and credentials are not printed or uploaded.
Local Firebase Auth/Firestore probes passed without enabling cloud billing.

If an approved UID list exists it is preserved. Otherwise only a unique enabled
account with Admin-set `atlasOperator:true` is selected for this private workspace.
Public Market users are excluded. Zero/multiple operators fail closed and require
an explicit allowlist. The pre-existing operator received this claim during Google
login rollout; see `AUTHENTICATION.md`.
The local service still checks Firebase tokens and revocation for every request.
It listens only on IPv4 loopback, permits CORS only for the two known Atlas Hosting
origins, rejects untrusted Host/Origin headers, and answers restricted preflights.
The browser accepts only the fixed local origin, so it cannot forward tokens to an
arbitrary server. Explicit **Hosted backend** selection uses same-origin APIs.

Outbound local sending does not require the Meta app secret. Incoming messages,
delivery/read events still need a configured app secret and public HTTPS webhook;
they remain unavailable in this outbound-only local setup. API acceptance is not
delivery evidence. Browser permission/authenticated end-to-end sending must be
checked by the operator; all automated sends use mocks.

References: [Chrome local-network permissions](https://developer.chrome.com/blog/local-network-access)
and [Firebase Admin local credentials](https://firebase.google.com/docs/admin/setup).

## Runtime configuration

Keep the existing values of `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
`WHATSAPP_BUSINESS_ACCOUNT_ID`, and `WHATSAPP_VERIFY_TOKEN` in your environment.
Do not put credentials in the browser, source, chat, or documentation. `.env.example`
documents names only; `.env` files are ignored and are not loaded automatically.

Also configure:

- `WHATSAPP_APP_SECRET`: the existing Meta app secret, used for POST HMAC signature verification. The verify token alone cannot authenticate message deliveries.
- `WHATSAPP_GRAPH_API_VERSION`: an explicit supported version selected for your app (format `v<number>.0`). There is deliberately no default or silent fallback.
- `WHATSAPP_ALLOWED_USER_UIDS`: comma-separated Firebase Authentication UIDs permitted to send from the web. An empty list disables web sending. Obtain the UID privately from Firebase Console → Authentication → Users; it is not the user's email. CLI sending remains a separate local operator action.
- Firebase Application Default Credentials: use your hosting platform's least-privilege service identity, or `GOOGLE_APPLICATION_CREDENTIALS` pointing to a private credential file **outside this repository**. Firebase CLI login and browser Firebase configuration do not supply Admin SDK credentials.
- `ATLAS_FIREBASE_PROJECT_ID`: defaults to the existing project `atlascrm-c5722`; select a separate test project for fictional tests. To view those records, the browser Firebase configuration must target the same project.
- `HOST` and `PORT`: default `127.0.0.1` and `3000`. For a container/reverse proxy requiring all-interface binding, set `HOST=0.0.0.0` in that deployment environment.

The Windows npm launcher fills only missing process variables from User, then
Machine environment settings. It never replaces a nonempty process value,
changes saved settings, prints secrets, or generates credentials. Its execution
policy override applies only to the child PowerShell process; it does not change
the machine's policy. On other platforms, export the variables normally and run
`node server/index.mjs` / `node server/send.mjs` directly.

## Start and check

From the repository root on Windows:

```powershell
npm ci --ignore-scripts
npm run whatsapp:check
npm start
```

Open `http://127.0.0.1:3000/` for the Firebase app, or append `?demo=1` for the
browser demo. `npm run preview` starts the static app without any WhatsApp or
server credential requirements. The check command reports configuration names
and probes one Firestore read, without sending messages or logging values.

## Operator-initiated outbound text test

First ensure the specified verified test recipient is an existing Firestore CRM
contact, with the correctly normalized phone. The CLI refuses missing contacts
and customers marked `blocked` or `do_not_contact`. It stores a private send
attempt before making an API request, and stores the accepted message afterward.

```powershell
npm run whatsapp:send -- "+<verified-recipient-digits>" "Hello from AtlasCRM"
```

Replace the angle-bracket placeholder locally. Nothing sends automatically on
install, startup, configuration checks, or tests. Meta's free-form text policy
requires an open customer service window; send an incoming message from the test
recipient first if needed. Template sending is outside this initial text module.
Acceptance means the API accepted the request; delivery/read require webhooks.

Timeouts/network failures have an uncertain send outcome. There is no automatic
retry. Review private `whatsappSendAttempts`, Meta status events, and the recipient
before initiating another attempt. A `message_accepted_storage_failed_do_not_resend`
error means Meta accepted the message but persistence failed; the CLI emits only
a random attempt ID, and the private pending attempt retains the text/recipient
for reconciliation. Reconcile it using Firebase Admin or a trusted administrative
tool; no automatic resend or recovery worker is provided.

## Send directly from the CRM web page

Sign in to Firebase mode, open a contact's WhatsApp dialog, and enter a message.
**Send via WhatsApp API** becomes available when the same-origin backend confirms
your account is authorized. Click it deliberately to send from the configured
business number. The dialog reports **Accepted by WhatsApp**; webhook events
provide delivery/read evidence. Existing manual links remain available whenever
a direct send is not in progress, already accepted, or uncertain. An accepted
message does not need **Mark sent and close**, which remains a manual action.

`GET /api/whatsapp/config` and `POST /api/whatsapp/messages` require Firebase
bearer ID tokens verified with revocation checking, plus the approved UID list.
POST accepts only `customerId`, `body`, and a UUID `requestId`; the backend reads
the phone from Firestore and rejects suppressed/missing contacts. No arbitrary
recipient number can be supplied. Pending send attempts are keyed by user/request
so concurrent identical requests cannot call Meta twice. Accepted repeats return
the existing acceptance; pending/uncertain attempts reject retries. Reusing a
request ID with different content is rejected. There are no automatic retries.

During sending, the dialog disables manual sending links, editing, repeated clicks
and closing. Safe rejections permit correction; uncertain outcomes keep sending
disabled and tell the operator to check history before another attempt. Refreshing
or reopening a dialog does not resolve an uncertain outcome: check private send
attempts and Meta evidence first. Demo mode cannot send. Firebase ID tokens go only
to the same origin, and access tokens/app secrets never enter the browser.

For a local web workflow use `npm start` with configuration completed, sign in at
`http://127.0.0.1:3000`, and use the button. For the existing Firebase-hosted web
page, deploy the backend and configure same-origin rewrites as described below.

## Exact Meta dashboard configuration

- **Callback URL:** `https://<public-HTTPS-backend-host>/webhooks/whatsapp`
- **Verify token:** use the value already stored in `WHATSAPP_VERIFY_TOKEN`; do not replace it.
- **Webhook object:** `whatsapp_business_account`.
- **Webhook field subscription:** `messages`. This field carries both inbound messages and outbound `sent`, `delivered`, `read`, and `failed` status updates; no separate `message_status` field is required.
- Ensure this app is subscribed to the intended WABA. If that link is missing, the official management operation is `POST /<WABA_ID>/subscribed_apps` on your configured Graph version with the appropriate authorized token. Atlas does not change subscriptions automatically.

The repository's existing static Hosting URL is `https://atlascrm-c5722.web.app`.
**It does not currently route to this backend**. Do not enter that site's webhook
path until an HTTPS backend and explicit Hosting rewrite/reverse proxy have been
deployed. No production backend hostname has been established. For local testing,
use your chosen HTTPS tunnel to port 3000; append the exact path above to its
public hostname. Keep tunnel/proxy access logs from capturing verify-token query
strings. A tunnel must forward the raw body and `X-Hub-Signature-256` unchanged.

GET verification returns the challenge exactly when mode is `subscribe` and the
existing token matches, otherwise 403. POST requires a valid raw-body HMAC-SHA256
signature with the Meta app secret, checks configured WABA/Phone Number IDs,
limits bodies to 1 MiB, and accepts only JSON. It acknowledges 200 after durable
transaction processing, without waiting for outbound API calls or intelligence.
Storage failure returns 503 so Meta can retry. For higher-volume workloads, add
a durable queue before increasing event volume; this phase processes synchronously.

## Incoming messages and status verification

After configuring the callback and subscription, send a text from the verified
recipient to the configured business number. Reopen its CRM profile: an existing
normalized phone is linked; an unknown sender conservatively creates a `new`
lead. The profile timeline displays `whatsapp_message_received` and the text.
`lastReplyAt` updates, but qualification, follow-ups, and suppression states are
preserved. Existing import/manual history is retained.

`messages` stores message ID, customer association, channel/direction, sender,
recipient, text/type, profile name, event timestamp, ingestion/update timestamps,
selected business metadata, and delivery state. Unsupported types are stored as
metadata with no media download. No raw full webhook or arbitrary future fields
are stored. Unknown accounts/fields/statuses are ignored safely.

`whatsappEvents` stores durable idempotency records and individual status events;
message and event IDs are hashed for safe document keys. Transactions deduplicate
retries and create message/customer/activity records together. Status events can
arrive before the CLI persists an API result; a stub message keeps that evidence.
Late `sent`/`delivered` events cannot regress `read`; failed events remain in event
history without replacing already delivered/read evidence. Numeric Meta error
codes are retained without provider error text. Duplicate customer merging also
re-associates `messages`; deploy the additive rules before using that browser action.

New transport collections are server-owned. Signed-in browser users can read
messages and re-associate only `customerId` during duplicate merging. Browser
creation/deletion of messages and all browser access to event/send-attempt records
are denied. Existing single-workspace authorization limitations remain; this
integration does not supply multi-user isolation.

## Deployment and troubleshooting

The Node backend needs a public HTTPS reverse proxy or server platform, its
runtime secrets, and Firebase Admin identity. Static Firebase Hosting alone cannot
execute it. Backend deployment and external Meta configuration have not been
performed by this implementation.

`npm run build:hosting` stages only HTML/CSS/browser JS in
`.firebase/hosting-public`; `firebase.json` now targets that directory so backend
code, dependencies, docs and private files cannot be uploaded by a root Hosting
release. Build immediately before every Hosting deployment. Deploy Firestore
rules separately after review. The updated UI and additive rules were deployed on
2026-10-05; the backend and Hosting rewrites remain undeployed. Google Cloud Billing
reports disabled for this project, so the planned Cloud Run deployment needs
billing enabled in addition to the missing app secret/Graph version/approved users.

- Missing configuration: run `npm run whatsapp:check`; Windows saved variables are inherited through the launcher. Do not copy secret values into diagnostic output.
- Firestore unavailable: check project, ADC identity, IAM and connectivity. Browser Auth/CLI login is insufficient. Nothing sends if the pre-send Firestore write fails.
- Verification rejected: check exact callback path, mode, existing token and proxy query preservation. Do not log query strings.
- Signature rejected: confirm the app secret and unchanged raw request body; the verify token is not the signature secret.
- No incoming messages: confirm `messages`, app-to-WABA subscription, and the configured WABA/Phone Number IDs.
- Meta API errors: inspect numeric `metaCode`/`metaSubcode` using Meta documentation. Tokens expiring or text outside the service window are common causes. Raw provider messages are intentionally excluded from logs.
- For a failed local send, run `npm run whatsapp:diagnose` in a normal Windows terminal. Enter the successful Meta test recipient at the hidden prompt. It uses the same protected Firebase CLI/ADC bootstrap and project defaults as `start:local`, reads only the most recent failed private send attempt, and prints state, numeric Meta code/subcode, HTTP status, rejection classification, and a Boolean comparison after Atlas normalization. Errors report fixed reason codes and safe numeric status only. It never prints the recipient or message. This read-only command does not contact Meta or send a message. It diagnoses saved attempts, not the environment inherited by an already-running service.
- Timeline not visible: use Firebase mode, the same project, and reopen the profile. Demo storage is separate.

## Connect Firebase Hosting to the backend

The included `Dockerfile` packages only the runtime and browser assets and starts
the server directly with Node (the npm startup wrapper is Windows-specific).
`.dockerignore` excludes everything except the required source and manifests,
so local credentials, customer data, tests and docs do not enter the build context.
The container binds all interfaces and respects the platform's `PORT`.
Its image has not been built or deployed in this environment.

On Cloud Run, deploy this container with the configured WhatsApp secrets and
approved user list and a service identity that can access Firestore and verify
Firebase Auth revocation. Local Windows environment values are **not** automatically
available in cloud hosting; configure existing values privately using the platform's
secret settings, without printing them or committing them. Meta webhook requests
need public network access to the service; application-level signature/token and
Firebase-ID-token checks protect the corresponding routes.

After the service exists, add these entries to `hosting.rewrites` in `firebase.json`,
replacing both placeholders with the actual deployed service name and a supported
region. No rewrite has been inserted automatically because no backend service
exists yet; deploying a rewrite to a nonexistent service would break deployment.

```json
[
  {
    "source": "/api/whatsapp/**",
    "run": { "serviceId": "<deployed-service-name>", "region": "<deployed-region>" }
  },
  {
    "source": "/webhooks/whatsapp",
    "run": { "serviceId": "<deployed-service-name>", "region": "<deployed-region>" }
  }
]
```

Rebuild the staged assets and deploy Hosting after reviewing the backend and
rules. Only after those rewrites are live, the known callback can be
`https://atlascrm-c5722.web.app/webhooks/whatsapp`, and the existing hosted CRM
will reach the send API on its own origin. No cross-origin token forwarding or
browser access to WhatsApp secrets is needed. Until deployment, the hosted app
keeps direct sending disabled and still offers manual WhatsApp links.

See [Firebase's Cloud Run Hosting integration](https://firebase.google.com/docs/hosting/cloud-run)
and [ID token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens).

## Automated validation

`npm test` uses fictional payloads and mocked Meta calls. It covers challenge
verification, signed/malformed/unsupported events, duplicate protection, contact
association, status ordering, outbound requests, API/timeouts/errors, missing
configuration, tracking failures, HTTP privacy boundaries and static startup.
The transaction adapter is tested in memory; live Firestore/IAM, rules enforcement,
Meta delivery and public HTTPS routing require separate environment validation.

The web follow-up adds token revocation/UID authorization, authenticated HTTP
sending, concurrent send-request deduplication, browser request handling and DOM
tests of acceptance, disabled demo/unavailable sending, double clicks and uncertain
outcomes. All 24 tests passed. Linkedom is a development-only DOM test dependency.

Official references: [Meta webhook signature validation](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/types/webhookCallbackFunction/),
[Meta webhook payload reference](https://www.postman.com/meta/whatsapp-business-platform/folder/tduohwq/webhook-payload-reference),
and [Meta app-to-WABA subscription](https://www.postman.com/meta/whatsapp-business-platform/request/ju40fld/subscribe-app-to-waba-s-webhooks).

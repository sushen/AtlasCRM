# Historical prompt index

Original contents are preserved byte-for-byte. These tasks describe earlier
requirements and may refer to superseded stack choices, filenames, runtime state,
or manual WhatsApp links. They do not establish current implementation or task
authorization. Use the active handoff and authoritative repository documentation.

## Foundation

| Original filename | Archived prompt | Subject |
|---|---|---|
| `atlas-crm-build-prompt.md` | [01-crm-build.md](01-foundation/01-crm-build.md) | Original CRM build specification |
| `MasterPrompt.txt` | [02-master-plan.txt](01-foundation/02-master-plan.txt) | Broader original product plan |
| `01_project_memory_architecture.txt` | [03-project-memory.txt](01-foundation/03-project-memory.txt) | Agent guide and durable documentation bootstrap |
| `firebase-implimentation.txt` | [04-firebase-implementation.txt](01-foundation/04-firebase-implementation.txt) | Firebase integration task |

## Customer workflows

| Original filename | Archived prompt | Subject |
|---|---|---|
| `whatsapp-customer-journey-prompt.md` | [01-whatsapp-customer-journey.md](02-customer-workflows/01-whatsapp-customer-journey.md) | Private imports and manual customer journey |
| `duplicate-manager-import-protection.txt` | [02-import-duplicate-protection.txt](02-customer-workflows/02-import-duplicate-protection.txt) | Duplicate preview and import protection |
| `Merge-All-Duplicates.txt` | [03-merge-all-duplicates.txt](02-customer-workflows/03-merge-all-duplicates.txt) | Batch merging while retaining history |

## WhatsApp integration

The five prompts below form a diagnostic history, not a queue to execute. The
latest notes describe accepted sends with missing inbound/status webhook evidence.
Those operator-provided conclusions must be checked against actual current records.

| Original filename | New location | Subject |
|---|---|---|
| `whatapp_api_fix.txt` | [01-outbound-api-diagnosis.txt](03-whatsapp-integration/01-outbound-api-diagnosis.txt) | Initial Meta rejection diagnosis |
| `whatapp_api_fix_2.txt` | [02-diagnostic-credentials.txt](03-whatsapp-integration/02-diagnostic-credentials.txt) | Read-only diagnostic credential/bootstrap failure |
| `whatapp_api_fix_3.txt` | Local-only `../private/03-accepted-send-reconciliation.txt` | Accepted send and recipient reconciliation; contains private recipient data |
| `whatapp_api_fix_4.txt` | [04-reconciliation-execution.txt](03-whatsapp-integration/04-reconciliation-execution.txt) | Checker execution/path issue |
| `whatapp_api_fix_5.txt` | [05-local-webhook-setup.txt](03-whatsapp-integration/05-local-webhook-setup.txt) | Latest local HTTPS webhook setup task |
| `active/01-local-whatsapp-continuation.md` | [06-local-continuation-handoff.md](03-whatsapp-integration/06-local-continuation-handoff.md) | Prior consolidated handoff, superseded after independent validation |
| `active/02-webhook-runtime-and-delivery-verification.md` | [07-webhook-runtime-and-delivery-verification.md](03-whatsapp-integration/07-webhook-runtime-and-delivery-verification.md) | Webhook follow-up; resume after the new authentication rejection is resolved |
| `active/03-access-token-and-runtime-validation.md` | [08-access-token-and-runtime-validation.md](03-whatsapp-integration/08-access-token-and-runtime-validation.md) | Authentication failure, superseded after the operator refreshed the token |

Sequence 03 is intentionally absent from the trackable archive. Its original file
is preserved locally in the Git-excluded private folder; no phone number is copied
into this index or the active handoff.

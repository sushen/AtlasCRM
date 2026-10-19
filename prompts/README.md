# AtlasCRM prompt library

Start with [the current Codex CLI continuation prompt](active/04-accepted-message-delivery-trace.md).
It follows [the latest validation](../docs/WHATSAPP_VALIDATION.md): after token
refresh the latest CRM send is accepted, but the recipient reports nonreceipt and
there is no webhook status evidence. Trace actual delivery/failure through the
receiving path. The earlier authentication handoff is now historical.

Prompts describe tasks. [AGENTS.md](../AGENTS.md), actual source/configuration,
[current state](../docs/CURRENT_STATE.md), [architecture](../docs/ARCHITECTURE.md)
and domain documentation supply project knowledge. Reading an archived prompt
does not authorize its task. Do not run every historical prompt sequentially.

| Location | Purpose |
|---|---|
| [active](active/04-accepted-message-delivery-trace.md) | One current, copy-ready CLI handoff |
| [archive/01-foundation](archive/README.md#foundation) | Original build, master plan, project-memory and Firebase tasks |
| [archive/02-customer-workflows](archive/README.md#customer-workflows) | Import, journey and duplicate-management history |
| [archive/03-whatsapp-integration](archive/README.md#whatsapp-integration) | Ordered API, diagnostic, reconciliation and webhook task history |
| `private/` | Local-only historical material containing private recipient data; excluded from Git |

All 12 original task prompts were retained unchanged. Descriptive filenames replace
ambiguous fix numbers and spelling errors. [The archive index](archive/README.md)
maps every old filename to its new location. Old paths inside historical prompt
bodies remain historical references; resolve them with the index, not by replaying
their setup instructions. The earlier handoff outside this repository is superseded
by the active prompt here and is retained separately.

For future tasks, use `active/NN-descriptive-task.md`, beginning with repository
context recovery, a concrete goal, scope boundaries, verification, and completion
criteria. Keep only genuinely current tasks in `active/`; move completed or replaced
prompts into the relevant archive category. Store no credentials or private customer
records in trackable prompts.

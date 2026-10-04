# Prompt Archive

Prompts are temporary task instructions and are not the permanent source of architectural truth. Durable knowledge belongs in `AGENTS.md`, `docs/`, ADRs, and `docs/CURRENT_STATE.md`.

Future prompts should begin with:

> Read AGENTS.md, docs/PROJECT.md, docs/CURRENT_STATE.md and the documentation relevant to this task before making changes. Inspect the actual implementation. Do not assume this prompt accurately represents the current repository state. After completing the task, update CURRENT_STATE.md and any authoritative documentation materially affected by the changes.

Use ordered names such as `01_project_memory_architecture.txt`, `02_customer_import.txt`, and `03_customer_journey.txt`. Old prompts do not need to be read every session.

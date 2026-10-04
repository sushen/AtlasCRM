# Data Model

## Implemented Firestore collections

### `customers`

One lead/customer record. Fields written by `createCustomer`: `name`, `phone`, `normalizedPhone`, `whatsappNumber`, `source`, `sourceGroup`, `status`, `customerStatus`, `tags` (array), `notes`, `importedAt`, `firstContactedAt`, `lastContactedAt`, `lastReplyAt`, `nextFollowUpAt`, `contactAttempts`, `createdAt`, and `updatedAt`. Imported WhatsApp leads use `name: "WhatsApp Lead"`, `status: "new"`, `customerStatus: "lead"`, and `tags: ["imported", "whatsapp-lead"]`. Firestore writes use server timestamps for creation/import/update fields. Demo mode uses ISO strings.

`normalizedPhone` is the duplicate-detection key. Bangladesh forms `01712345678`, `8801712345678`, and `+8801712345678` normalize to `+8801712345678`; valid international numbers are retained as `+` plus 8-15 digits. The display `phone` is also retained.

### `activities`

Append-only customer timeline records: `customerId`, `type`, `note`, and `createdAt`. The current code emits `imported`, `status_changed`, `reply_recorded`, `whatsapp_opened`, `follow_up_created`, `follow_up_completed`, and `note_added`. The index orders by `customerId`, then `createdAt`.

### `followups`

Work items with `customerId`, `dueAt`, `status` (`pending` or `completed` in current code), `note`, `createdAt`, and `completedAt`. `dueAt` is a Firestore `Timestamp` in Firebase mode. The index orders by `dueAt`.

## Reserved, not implemented

Rules mention `products`, `purchases`, `subscriptions`, `payments`, and `renewals`, but no application code or schema currently writes them. Do not document them as available features.

## Relationships and security

Activities and follow-ups refer to a customer by ID. Current rules require a signed-in user for these collections but do not enforce per-user ownership; see `docs/SECURITY.md`.

## Fictional example

```js
{ name: "Demo Contact", phone: "01712345678", normalizedPhone: "+8801712345678",
  whatsappNumber: "+8801712345678", status: "not_contacted", contactAttempts: 0 }
```

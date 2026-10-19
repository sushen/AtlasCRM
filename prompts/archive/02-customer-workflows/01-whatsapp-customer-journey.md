# WhatsApp Customer Journey Prompt

Build the next Atlas CRM feature using the existing file:

C:\Users\user\PycharmProjects\AtlasCRM\whatsapp_numbers.txt

## Goal

Treat every valid WhatsApp number as a customer or lead and build a complete customer journey that lets me manually start and track WhatsApp conversations.

## Important rules

- Do not scrape, automate, or control WhatsApp Web.
- Do not automatically send bulk messages.
- Every WhatsApp chat must be opened by a deliberate user click.
- Use click-to-chat links such as https://wa.me/<normalized_number>.
- Never claim a message was delivered.
- Do not expose phone numbers publicly.
- Do not commit imported numbers to frontend source code, static JSON, GitHub Pages assets, or Git.
- Keep numbers in the private backend/database.
- Create a backup of the original file before importing.
- Never silently overwrite existing customer data.

## Implementation

1. Inspect the existing AtlasCRM project and read:
   - prompts/atlas-crm-build-prompt.md
   - prompts/01_project_memory_architecture.txt
   - prompts/MasterPrompt.txt
   - whatsapp_numbers.txt
   - existing index.html and application files

2. Parse whatsapp_numbers.txt:
   - Support one or more numbers per line.
   - Extract valid numbers despite spaces, brackets, and hyphens.
   - Normalize Bangladesh numbers 017XXXXXXXX, 88017XXXXXXXX, and +88017XXXXXXXX to +88017XXXXXXXX.
   - Support valid international numbers.
   - Reject invalid or incomplete numbers.
   - Deduplicate after normalization.

3. Create an import preview showing:
   - total rows detected
   - valid numbers
   - invalid numbers
   - duplicate numbers
   - numbers already in the database
   - numbers ready to import

4. Import each new valid number as a lead with:
   - display_name: WhatsApp Lead
   - phone_number
   - whatsapp_number
   - lead_status: new
   - customer_status: lead
   - source: WhatsApp numbers import
   - source_group: WhatsApp numbers file
   - tags: imported, whatsapp-lead
   - created_at
   - updated_at

5. Use normalized phone number as the unique key. Preserve existing names, notes, tags, statuses, purchases, and subscriptions. Report existing records separately and never create duplicates.

## Customer journey

### New lead

Show imported date, an Open WhatsApp button, a message template selector, and an editable message preview. Support variables {{name}}, {{product}}, {{expiry_date}}, and {{price}}. Record WhatsApp chat opened as an activity, but never as a delivered or sent message.

### Contact attempt

After the user manually uses WhatsApp, allow them to mark message sent, replied, or no response. Record each result. Set last_contacted_at only when message sent is explicitly selected.

### Follow-up

Allow scheduling a date and note. Show due, overdue, and upcoming follow-ups. Provide complete, reschedule, open WhatsApp, and change status actions.

### Qualification

Support statuses: new, not_contacted, contacted, replied, interested, negotiating, customer, inactive, blocked, do_not_contact. Allow notes and tags. Exclude do_not_contact records from outreach queues.

### Conversion

Allow recording a purchase with product, amount, currency, payment method, payment status, and purchase date. Automatically create an activity. Allow creating a subscription with start date and expiry date.

### Retention

Show active, expiring, renewed, cancelled, and expired subscriptions. Highlight subscriptions expiring today, within 3 days, and within 7 days. Provide a renewal WhatsApp action with a previewable message and allow recording the renewal outcome manually.

## Screens

Build these screens and states:

- Import WhatsApp numbers
- Import preview
- Import result summary
- Customers list
- Customer profile
- Follow-up queue
- Subscription renewal queue
- Message template manager
- Loading states
- Empty states
- Validation errors
- Success and failure notifications

## Dashboard metrics

Use database data only:

- new imported leads
- not contacted
- contacted today
- replies
- interested leads
- converted customers
- overdue follow-ups
- renewals due soon
- do-not-contact records

## Default templates

Create Initial outreach, Follow-up, Subscription renewal, Payment reminder, Thank you, and Custom templates.

## Security

Require authentication for all customer data. Use Supabase Row Level Security if configured. Keep secrets in environment variables. Update .env.example and .gitignore. Do not include real phone numbers in sample data, screenshots, fixtures, or committed files.

## Tests

Add tests for Bangladesh and international phone normalization, invalid number rejection, duplicate detection, TXT parsing, import preview counts, customer creation, WhatsApp URL generation, message variable replacement, do-not-contact exclusion, follow-up status calculation, and subscription expiry calculation.

Run lint, typecheck, tests, and build. Review for public phone exposure, duplicate customers, incorrect WhatsApp links, accidental automatic sending, incorrect activity records, mobile layout issues, and missing loading/empty/error states.

## Final report

Report:

- numbers detected
- valid numbers
- invalid numbers
- duplicates
- existing customer matches
- new leads imported
- files changed
- migrations added
- test results
- build result
- exact run command
- remaining limitations

Start by inspecting the existing project and implementing the import preview. Do not stop at a proposal.

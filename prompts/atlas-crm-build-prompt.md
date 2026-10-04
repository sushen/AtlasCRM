# Atlas CRM Build Prompt

You are building a production-quality private customer CRM and subscription-sales tracker for my business.

## Goal

Build a clean web application to manage WhatsApp leads and customers, track purchases and subscriptions, and quickly open WhatsApp chats from customer records. This is NOT a WhatsApp clone and must NOT modify WhatsApp Web. It is a CRM/control panel that sits beside WhatsApp.

Primary flow: Dashboard -> Customers -> Search customer -> Customer profile -> Open WhatsApp chat -> Record contact -> Record purchase -> Track subscription -> Track expiry/renewal -> Follow-up.

## Core requirements

### 1. Customer database

Customer fields: id, display_name, phone_number, whatsapp_number, username/handle, country, source, source_group, notes, tags, lead_status, customer_status, created_at, updated_at, last_contacted_at, next_follow_up_at.

Suggested statuses: new, not_contacted, contacted, replied, interested, negotiating, customer, inactive, blocked, do_not_contact.

Phone numbers must be unique after normalization. Normalize Bangladesh numbers 017XXXXXXXX, 88017XXXXXXXX, and +88017XXXXXXXX to +88017XXXXXXXX. Support international numbers.

### 2. Customer search

Create very fast partial search across name, phone, WhatsApp number, username, notes, and tags. Typing rah should match Rahim Md Rahman or Rahman Store.

### 3. Customer profile page

Show name, phone, WhatsApp number, username, source group, status, tags, notes, last contacted, next follow-up, purchases, active and expired subscriptions, and activity history. Actions: Open WhatsApp, Mark Contacted, Add Purchase, Add Subscription, Add Note, Schedule Follow-up, Change Status.

### 4. WhatsApp action

Do not scrape or manipulate WhatsApp Web. Use click-to-chat links such as https://wa.me/<number>. Open the customer's normalized WhatsApp number, optionally with a prefilled message. Do not claim a message was delivered. Allow manual marking as message sent, replied, or no response.

Create Initial outreach, Follow-up, Subscription renewal, Payment reminder, Thank you, and Custom message templates. Support variables {{name}}, {{product}}, {{expiry_date}}, and {{price}}.

### 5. Activity log

Record important actions: customer imported/edited, WhatsApp chat opened, marked contacted, status changed, note added, purchase added, subscription created/renewed/expired, follow-up scheduled. Fields: id, customer_id, event_type, description, metadata, created_at.

### 6. Products

Manage id, name, description, price, duration_days, active. Example products: ChatGPT subscription, Codex subscription, Canva subscription, Other digital subscription.

### 7. Purchases

Allow multiple purchases per customer. Fields: id, customer_id, product_id, amount, currency, payment_status, payment_method, purchased_at, notes. Payment statuses: pending, paid, partial, refunded, cancelled.

### 8. Subscriptions

Fields: id, customer_id, product_id, start_date, expiry_date, status, amount, auto_renew, notes. Statuses: active, expiring, expired, renewed, cancelled. Derive renewal state from dates. Show expires today, in 3 days, in 7 days, and expired.

### 9. Follow-up system

Create a queue with Follow up today, Overdue, Upcoming, Renewals due, Recently contacted, and New leads not contacted. Allow one-click completion, rescheduling, opening WhatsApp, and status updates.

### 10. Dashboard

Use actual database data for total leads, total customers, active subscriptions, subscriptions expiring soon, overdue follow-ups, revenue this month, revenue last 30 days, leads contacted today, and customers converted. Never create fake analytics.

### 11. Import system

Support TXT and CSV. Recognize phone numbers in TXT, for example +8801712345678, +8801812345678, +8801912345678. CSV columns may include name, phone, whatsapp, username, source, source_group, notes. Normalize numbers, validate, detect duplicates, merge safely, preview before import, and report imported, skipped, duplicate, and invalid counts. Never silently overwrite important data.

### 12. Bulk workflow

Allow filtering and selecting customers, assigning tags/status, setting follow-up dates, exporting selected customers, and preparing templates. Do not automatically send bulk unsolicited WhatsApp messages. Every WhatsApp action remains user-initiated.

### 13. Data privacy

Never expose customer data publicly. Do not store phone numbers in frontend source, public JSON, GitHub Pages static assets, or committed CSV/TXT files. Use a private backend/database. Keep secrets in environment variables; provide .env.example and correct .gitignore rules; never commit .env.

### 14. Recommended stack

Prefer React, TypeScript, Vite, Tailwind CSS, Supabase Auth, PostgreSQL, and Row Level Security. Use alternatives only for strong technical reasons. Do not overengineer.

### 15. Authentication

Implement login and protected routes. Unauthenticated users must not see customer records, phone numbers, purchases, subscriptions, or notes.

### 16. Database design

Create relational tables for customers, products, purchases, subscriptions, activities, follow_ups, message_templates. Use migrations/schema files, indexes, unique constraints, foreign keys, timestamps, and an indexed normalized phone field.

### 17. UI

Build a clean modern CRM, desktop-first and responsive. Main navigation: Dashboard, Customers, Follow-ups, Subscriptions, Products, Message Templates, Imports, Settings. Customer table columns: Name, Phone, Status, Source, Last Contact, Next Follow-up, Subscription, Actions. Include status badges, pagination, and filters. Avoid clutter.

### 18. Quality

Use TypeScript strict mode, reusable components, clean structure, form validation, error handling, loading and empty states, and success/error notifications. Avoid giant components, duplicate logic, and hardcoded customer data.

### 19. Testing

Test phone normalization, duplicate detection, subscription expiry calculation, customer search, and import parsing. Run lint, typecheck, tests, and build; fix issues before completion.

### 20. README

Document purpose, screenshots placeholder, architecture, stack, local setup, Supabase setup, environment variables, database setup, local run, testing, deployment, and privacy.

### 21. GitHub

Initialize Git if needed and make logical commits:
- feat: initialize CRM application
- feat: add customer management
- feat: add subscription tracking
- feat: add WhatsApp actions
- feat: add imports and follow-ups
- test: add core logic tests
- docs: complete setup documentation

Never commit secrets or private customer data. Push only if GitHub authentication is configured and a remote is provided. Otherwise prepare locally and provide exact create/push commands.

### 22. Deployment

Prepare for Vercel/Netlify with Supabase. Use GitHub Pages only if secure and no private data or credentials appear in static files. Do not publicly deploy real customer data without explicit request.

### 23. Initial sample data

Use only small fictional development/test records, such as Rahim Test +8801700000001 and Karim Demo +8801800000002. Never insert real customer data unless explicitly provided or imported.

### 24. Future-ready architecture

Keep room for payment integration, WhatsApp Business API, email notifications, renewal reminders, sales reports, staff accounts, roles/permissions, and customer portal. Do not implement unnecessary complexity now.

### 25. Implementation process

Work autonomously:
1. Inspect the current directory.
2. Understand existing code.
3. Create an implementation plan.
4. Implement core architecture.
5. Build customer management.
6. Build WhatsApp action flow.
7. Build purchases/subscriptions.
8. Build follow-ups.
9. Build imports.
10. Add authentication/security.
11. Add tests.
12. Run full validation.
13. Update documentation.
14. Review bugs and UX problems.

Do not stop after scaffolding. Deliver a usable MVP.

### 26. Final report

Report what was built, project structure, database tables, major features, tests and results, build result, limitations, required environment variables, exact local run command, exact deployment steps, Git status, and repository/remote status. Do not claim anything works unless verified.

Start now.

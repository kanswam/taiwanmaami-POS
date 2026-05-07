# Maami POS — F&B Point of Sale & Operations Platform

A production-grade, multi-channel point of sale and operations platform built for food and beverage businesses. Powers live operations at Taiwan Maami (Chennai, India) across two outlets and three Petpooja channels.

---

## What This Is

Maami POS is a full-stack F&B operations platform that replaces fragmented POS, delivery aggregator, and back-office tools with a single, real-time system. It handles instore orders, delivery aggregator webhooks, kitchen order tickets, loyalty stamps, CMS, and a Supabase-backed data lake — all in one deployable stack.

Built by [Thamarai Foods and Trading Private Limited](https://taiwanmaami.com) as the operational backbone of Taiwan Maami, and productised as the first module of the Maami Tech platform.

---

## Features

- **Multi-channel order management** — instore POS, delivery aggregator webhooks (Petpooja), and direct online orders unified in one view
- **Kitchen Order Ticket (KOT) printing** — authenticated print requests to outlet kitchen printers
- **Real-time Petpooja webhook receiver** — maps orders from multiple outlet licences to your data lake automatically
- **Loyalty stamp system** — customer stamp tracking across visits
- **CMS** — manage menu items, pricing, and outlet content without a developer
- **Supabase data lake** — daily ETL cron pushes sales facts, AOV, and channel data to PostgreSQL for analytics
- **Daily WhatsApp digest** — automated 7am IST operational summary via Twilio
- **Service auth layer** — scoped token registry for secure inter-service communication
- **Role-based access** — staff, admin, and customer roles with session-based authentication

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Tailwind CSS 4 |
| Backend | Node.js + Express 4 + tRPC 11 |
| Database | MySQL / TiDB (via Drizzle ORM) |
| Data Lake | Supabase (PostgreSQL) |
| Authentication | Clerk |
| Payments | Razorpay |
| Messaging | Twilio WhatsApp |
| File Storage | Cloudinary |
| Deployment | Alibaba Cloud Container Service |
| CI | GitHub Actions (pnpm audit + vitest) |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  React Frontend                  │
│         (Staff POS / Admin / Customer)           │
└──────────────────┬──────────────────────────────┘
                   │ tRPC
┌──────────────────▼──────────────────────────────┐
│              Express + tRPC Server               │
│   Orders │ Menu │ Auth │ Webhooks │ ETL │ KOT    │
└──────┬───────────┬──────────────┬───────────────┘
       │           │              │
  ┌────▼───┐  ┌────▼────┐  ┌─────▼──────┐
  │ MySQL  │  │Supabase │  │  Petpooja  │
  │  TiDB  │  │  Lake   │  │  Webhook   │
  └────────┘  └─────────┘  └────────────┘
```

---

## Petpooja Outlet Mapping

The webhook receiver maps Petpooja restIDs to outlet names automatically. Configure your outlet mapping in the service environment:

```
PETPOOJA_OUTLET_MAP={"restId1":"palladium_instore","restId2":"palladium_delivery","restId3":"tnagar_delivery"}
```

---

## Environment Variables

```env
# Database
DATABASE_URL=mysql://user:pass@host:3306/dbname

# Authentication
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Data Lake
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Payments
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=your-secret

# Messaging
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=your-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_WHATSAPP_TO=whatsapp:+91...

# KOT Printer
VITE_KOT_PRINT_SECRET=your-secret

# Service Auth
MAAMITECH_SERVICE_TOKEN=tk_...

# Employee Master
EMP_MASTER_API_URL=https://employees.yourdomain.com
EMP_MASTER_API_KEY=tk_...

# Petpooja
PETPOOJA_UPLOAD_PIN=your-pin
```

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run tests
pnpm vitest run

# Security audit
pnpm audit --audit-level=high
```

---

## Deployment

Designed for Alibaba Cloud Container Service (Mumbai region) with ApsaraDB RDS MySQL. See the [Maami Tech Infrastructure Blueprint](#) for full deployment runbook.

Each client deployment is a separate stack instance with its own database, domain, and token registry. No shared infrastructure between clients.

---

## Security

- Zero hardcoded secrets — all credentials via environment variables with hard-fail validation
- Scoped service token registry — five scoped tokens, no shared admin credentials
- GitHub Actions CI runs `pnpm audit --audit-level=high` on every push
- Snyk monitoring active across the repository
- Security incident response plan documented separately

---

## Part of Maami Tech

This repository is one module of the Maami Tech F&B operations platform:

| Module | Repository | Description |
|---|---|---|
| **POS** | `maami-pos` | This repository |
| **Inventory** | `maami-inventory` | Stock management and low-stock alerts |
| **Employee Master** | `maami-employee-master` | Staff records, contracts, and payroll |
| **Expense Claims** | `maami-expense-claims` | Staff expense submission and approval |

---

## Licence

Proprietary. All rights reserved. Thamarai Foods and Trading Private Limited.

Commercial licensing available. Contact [kannan@thamaraifoods.com](mailto:kannan@thamaraifoods.com) for enterprise pricing.

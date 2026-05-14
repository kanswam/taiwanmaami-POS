# Taiwan Maami POS

**Production-grade point-of-sale, ordering, and operations platform — built for and battle-tested by a real bubble tea chain.**

[![CI](https://github.com/kanswam/taiwanmaami-practice/actions/workflows/ci.yml/badge.svg)](https://github.com/kanswam/taiwanmaami-practice/actions/workflows/ci.yml)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](#licence)
[![Stack](https://img.shields.io/badge/Stack-Node.js%20%2F%20React%20%2F%20MySQL-blue.svg)](#tech-stack)

---

## The Real Story

In 2024 we were running two profitable bubble tea outlets in Chennai, India — one in Palladium Mall and one in T.Nagar — on a combination of legacy POS software, WhatsApp groups, and Excel spreadsheets.

We didn't know our actual gross margin until the end of the month. We couldn't tell which outlet was outperforming the other in real time. Our inventory was a spreadsheet updated once a week if we were lucky. Staff rosters lived in someone's phone.

So we built this.

**What it runs today:**
- Two outlets across Chennai — Palladium Mall and T.Nagar Burkit Road
- Third outlet (Anna Nagar) opening shortly
- ₹1.35 Crore in FY26 revenue across both outlets
- ₹1.04 Lakhs on a single Sunday (138 orders)
- 82–92% gross margin on beverages — calculated automatically, per item, per channel
- A WhatsApp digest arrives every morning at 7am showing the previous day's revenue, margins, discounts, and stock alerts

This is not a demo. This is production code running a real business.

---

## What Problem This Solves

Most restaurant operators — especially independent chains and growing F&B businesses — face the same set of problems:

| Problem | What operators do today | What this system does |
|---|---|---|
| Don't know real-time revenue | Check the POS terminal manually | Live orders dashboard, auto-refreshing |
| Don't know gross margin | End-of-month Excel | Per-item margin calculated from recipe costs at order time |
| Multi-channel chaos | Separate dashboards for Zomato, Swiggy, own POS | Unified view across all channels and outlets |
| Inventory is a black box | Monthly stock count, high wastage | Live WAC costs, daily snapshots, wastage calculation |
| No morning summary | Check three apps before 9am | One WhatsApp message with everything |
| Staff access is all-or-nothing | Everyone has admin or nobody does | Role-based access — customer, staff, manager, admin |
| Multi-outlet is hard | Two sets of everything | Single codebase, outlet-scoped availability matrix |

---

## Live Architecture

```
Customer orders (website/app)
        ↓
Taiwan Maami POS (this repo)
        ↓
DigitalOcean MySQL — Bangalore
        ↓
Petpooja webhook (Zomato/Swiggy delivery orders)
        ↓
GitHub Actions ETL — 1am IST daily
        ↓
Supabase Data Lake — Singapore
        ↓
WhatsApp Digest — 7am IST daily (Twilio)
```

---

## Key Features

### Customer-Facing
- Full menu with category browsing, size variants, boba customisation
- Instore, delivery, and pickup order types
- Razorpay payment integration
- Loyalty stamp system — earn stamps per order, redeem for rewards
- Customer accounts with order history and store credit
- Multi-outlet ordering — route to correct outlet automatically
- Delivery radius and least-busy outlet routing

### Staff POS
- Live KOT (Kitchen Order Ticket) with auto-print
- Order management — accept, prepare, complete
- Real-time order notifications with sound alerts
- Pickup and instore order handling
- Staff login via mobile number

### Admin Panel
- Revenue dashboard by outlet and channel
- Menu management — categories, subcategories, products, pricing
- Availability matrix — toggle items per outlet, per channel, per category
- Customer database with loyalty and stamp history
- Stock alerts and inventory integration
- Events management
- Pricing management with size variants

### Data Lake and Analytics
- Unified sales_facts table across all channels
- Revenue by outlet, channel, date
- Aggregator discounts tracked separately (Zomato/Swiggy promotional deductions)
- GST collected vs net sales
- Gross margin per item (recipe costing engine)
- Daily WhatsApp digest — revenue, margins, top items, stock alerts

### Multi-Outlet Architecture
- Outlet × channel × category availability matrix
- 360-row availability table — independently toggleable per outlet
- Delivery routing — availability-aware, least-busy outlet tiebreaker
- Outlet-scoped staff permissions
- Anna Nagar (third outlet) pre-seeded and ready to activate

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express, tRPC |
| Frontend | React, Vite, Tailwind CSS |
| ORM | Drizzle ORM |
| Primary Database | MySQL 8 — DigitalOcean Managed Database, Bangalore |
| Data Lake | Supabase PostgreSQL — Singapore |
| Auth | Manus OAuth (Clerk migration in progress) |
| Payments | Razorpay |
| Notifications | Twilio WhatsApp |
| File Storage | Cloudinary |
| Media CDN | DigitalOcean Spaces |
| Maps | Google Maps API |
| ETL | GitHub Actions cron — 1am IST daily |
| CI | GitHub Actions — pnpm audit + vitest (924 tests) |
| POS Integration | Petpooja webhook (Zomato, Swiggy, instore aggregator) |

---

## What Makes This Different

**It was built to run a real business, not to demo at a hackathon.**

Every feature in this codebase was built because we needed it. The KOT printer integration because orders were getting missed. The daily WhatsApp digest because we were checking three apps before our morning coffee. The gross margin calculation because we genuinely didn't know if we were making money on Dan Dan Noodles.

**The data lake architecture is production-grade.**

Most restaurant POS systems are transactional silos. This one pushes normalised data into a Supabase data lake every night, with ETL that handles multiple sources — own POS, Petpooja webhook, CSV imports — and merges them into a single sales_facts table with consistent schema.

**The multi-outlet architecture is real.**

Not a flag on a config file. A full outlet × channel × category availability matrix with inheritance resolution, delivery routing, and outlet-scoped staff permissions. Built because we're opening a third outlet and needed it to work properly.

**924 tests. Zero critical security vulnerabilities.**

Vitest test suite covering auth, ETL, API endpoints, and business logic. Snyk security monitoring. pnpm audit on every push.

---

## Numbers (May 2026)

| Metric | Value |
|---|---|
| Annual Revenue (both outlets) | ₹1 Crore+ |
| Peak Single Day | ₹1 Lakh+ |
| Beverage Gross Margin | 80%+ |
| ETL Uptime | Daily — no missed runs |
| Test Coverage | 900+ tests passing |

---

## Repository Structure

```
/server
  /_core          — Auth, context, env, notifications, storage, maps
  /routers.ts     — tRPC router (all API endpoints)
  /etl/           — Data lake ETL pipeline
  /db.ts          — Database queries
/client/src
  /pages/         — Customer-facing pages (Home, Menu, Orders, Checkout)
  /pages/Admin*   — Admin panel pages
  /pages/Staff*   — Staff POS pages
  /components/    — Shared UI components
/drizzle/         — Schema and migrations
/.github/workflows — CI + ETL cron
```

---

## Daily WhatsApp Digest (Sample)

```
🏪 *Taiwan Maami Daily Digest* _2026-05-10_

💰 *REVENUE*
Palladium In-store: ₹XX,XXX (XX orders)
Palladium Delivery: ₹X,XXX (XX orders)
T.Nagar In-store: ₹XX,XXX (XX orders)
T.Nagar Delivery: ₹XX,XXX (XX orders)

Menu Sales: ₹X,XX,XXX
Aggregator Discounts: -₹X,XXX
Packaging & Other: +₹XXX
GST Collected: ₹X,XXX
*Net Collected: ₹X,XX,XXX | Orders: XXX*

📊 *GROSS MARGIN* _(27% of items costed)_
Palladium: ₹X,XXX (XX%)
T.Nagar: ₹X,XXX (XX%)
*Combined: ₹X,XXX (XX%)*

🏆 *TOP 3 ITEMS TODAY*
• 1 Fruit Mochi: 24 orders
• Classic Taiwan Milk Tea: 13 orders
• 3 Fruit Mochis: 11 orders

📦 *STOCK ALERTS*
No alerts today ✅

🗑️ *WASTAGE*
_(populates after stock take sync)_
```

---

## Using This for Your Business

This system is available for licensing and deployment. If you run a restaurant, café, bubble tea chain, or food and beverage business and you recognise any of the problems described above, get in touch.

**What you get:**
- Full source code access via GitHub
- Complete documentation and deployment runbook
- Implementation support for your outlet setup
- Ongoing updates and security patches

**Pricing:**
- India: ₹1,00,000 setup + ₹15,000/month
- International: £2,000 setup + £500/month
- Enterprise (multiple outlets): contact for pricing

**Contact:** kannan.swamy@taiwanmaami.com

---

## Roadmap

- [ ] Clerk authentication (replacing Manus OAuth) — in progress
- [ ] DigitalOcean App Platform hosting (replacing Manus hosting) — in progress
- [ ] JEDAI analytics layer (Tenacium DC POC) — in progress
- [ ] Wastage analytics (stock take sync with inventory system) — planned
- [ ] Full recipe costing coverage (currently 27% — expanding) — in progress
- [ ] Bank statement reconciliation (ICICI integration) — planned
- [ ] Anna Nagar outlet activation — when ready to open

---

## Licence

This software is proprietary. All rights reserved by Thamarai Foods and Trading Private Limited.

You may view this code for evaluation purposes. You may not use, copy, modify, distribute, or deploy this code without a valid commercial licence agreement.

To obtain a licence: kannan.swamy@taiwanmaami.com

---

## Related Repositories

- [Inventory Management System](https://github.com/kanswam/taiwan_maami_inventory) — Live WAC costs, stock takes, purchase orders, wastage tracking
- [Employee Master](https://github.com/kanswam/employee-master-service) — Staff records, outlet assignments, payroll integration
- [Expense Claims](https://github.com/kanswam/expense-claim-system) — Receipt management, approval workflow, audit trail

---

*Built in Chennai. Running on bubble tea margins. Open to the world.*


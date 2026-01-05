# Taiwan Maami - Technical Infrastructure Documentation

**Proprietary Software of Thamarai Foods and Trading Private Limited**

*Last Updated: January 5, 2026*

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Infrastructure & Hosting](#infrastructure--hosting)
4. [Database Architecture](#database-architecture)
5. [File Storage](#file-storage)
6. [Authentication & Security](#authentication--security)
7. [Payment Integration](#payment-integration)
8. [API Architecture](#api-architecture)
9. [Printer Integration](#printer-integration)
10. [Environment Variables](#environment-variables)
11. [Contact Information](#contact-information)

---

## Overview

Taiwan Maami is a full-stack web application serving as:
- **Customer-facing ordering platform** (delivery, pickup, in-store)
- **Point of Sale (POS) system** for in-store operations
- **Admin dashboard** for menu management, analytics, and operations

### Business Information

| Field | Value |
|-------|-------|
| **Company** | Thamarai Foods and Trading Private Limited |
| **Brand** | Taiwan Maami |
| **Website** | https://taiwanmaami.com |
| **Email** | hello@taiwanmaami.com |

### Outlet Locations

| Location | Address | Phone | Hours |
|----------|---------|-------|-------|
| Palladium Mall | First Floor, Palladium Mall, Velachery, Chennai - 600042 | +91 89259 14303 | 10:00 AM - 10:00 PM |
| T Nagar (Moutan) | New No. 29, Burkit Road, T Nagar, Chennai - 600017 | +91 91505 70557 | 12:00 PM - 12:00 AM |

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI Framework |
| TypeScript | 5.x | Type-safe JavaScript |
| Tailwind CSS | 4.x | Styling |
| Vite | 6.x | Build tool & dev server |
| Wouter | 3.x | Client-side routing |
| TanStack Query | 5.x | Server state management |
| shadcn/ui | Latest | UI component library |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 22.x | Runtime |
| Express | 4.x | HTTP server |
| tRPC | 11.x | Type-safe API layer |
| Drizzle ORM | Latest | Database ORM |
| Zod | 3.x | Schema validation |

### Database
| Technology | Purpose |
|------------|---------|
| TiDB (MySQL-compatible) | Primary database |
| Drizzle Kit | Schema migrations |

### External Services
| Service | Purpose |
|---------|---------|
| Razorpay | Payment processing |
| Manus OAuth | User authentication |
| S3-compatible storage | File/image storage |

---

## Infrastructure & Hosting

### Hosting Platform
The application is hosted on **Manus Cloud Infrastructure** with the following characteristics:

| Component | Details |
|-----------|---------|
| **Platform** | Manus Managed Hosting |
| **Region** | Asia (Singapore) - Close to India |
| **CDN** | Manus CDN with edge nodes in India |
| **Domain** | taiwanmaami.com (custom domain) |
| **SSL** | Automatic HTTPS via Let's Encrypt |

### Server Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     Manus Cloud Platform                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   CDN Edge  │───▶│  App Server │───▶│   TiDB      │     │
│  │   (India)   │    │  (Node.js)  │    │  Database   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                  │                  │             │
│         │                  ▼                  │             │
│         │          ┌─────────────┐           │             │
│         │          │  S3 Storage │           │             │
│         │          │  (Images)   │           │             │
│         │          └─────────────┘           │             │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              External Services                       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │   │
│  │  │ Razorpay │  │  Manus   │  │ Employee Master  │  │   │
│  │  │ Payments │  │  OAuth   │  │      API         │  │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Deployment
- **Automatic deployments** via Manus platform
- **Zero-downtime deployments** with rolling updates
- **Checkpoint system** for version control and rollbacks

---

## Database Architecture

### Database Provider
| Field | Value |
|-------|-------|
| **Provider** | TiDB Cloud |
| **Type** | MySQL-compatible distributed database |
| **Region** | Asia |
| **Connection** | SSL encrypted |

### Core Tables

#### Users & Authentication
| Table | Purpose |
|-------|---------|
| `users` | Customer and staff accounts |
| `pos_sessions` | Staff POS login sessions |
| `pos_audit_log` | Audit trail for POS actions |

#### Products & Menu
| Table | Purpose |
|-------|---------|
| `categories` | Menu categories (Bubble Tea, Food, etc.) |
| `subcategories` | Subcategories with base pricing |
| `products` | Individual menu items |
| `addons` | Add-on options (boba, toppings) |
| `outlet_products` | Per-outlet availability & pricing |

#### Orders & Payments
| Table | Purpose |
|-------|---------|
| `orders` | Order records |
| `order_items` | Items within orders |
| `order_item_addons` | Add-ons for order items |
| `guest_orders` | Guest checkout orders |
| `addresses` | Delivery addresses |

#### Operations
| Table | Purpose |
|-------|---------|
| `kot_queue` | Kitchen Order Ticket queue |
| `receipt_queue` | Receipt printing queue |
| `store_locations` | Outlet information |
| `discounts` | Promo codes and discounts |

#### Loyalty & Reviews
| Table | Purpose |
|-------|---------|
| `loyalty_rewards` | Customer reward vouchers |
| `stamp_transactions` | Stamp earning/redemption log |
| `reviews` | Customer reviews |

### Database Schema Location
```
/drizzle/schema.ts
```

### Migration Commands
```bash
# Generate and push schema changes
pnpm db:push

# View database in browser
pnpm db:studio
```

---

## File Storage

### Storage Provider
| Field | Value |
|-------|-------|
| **Type** | S3-compatible object storage |
| **Provider** | Manus Storage |
| **Access** | Public URLs for images |

### Storage Usage
| Content Type | Path Pattern |
|--------------|--------------|
| Product images | `products/{productId}/{filename}` |
| Category images | `categories/{categoryId}/{filename}` |
| User uploads | `uploads/{userId}/{filename}` |

### Storage Helpers
```typescript
// Server-side upload
import { storagePut } from "./server/storage";
const { url } = await storagePut(fileKey, fileBuffer, "image/png");

// Server-side get URL
import { storageGet } from "./server/storage";
const { url } = await storageGet(fileKey);
```

---

## Authentication & Security

### Authentication Provider
| Field | Value |
|-------|-------|
| **Provider** | Manus OAuth |
| **Methods** | Email, Google, Phone |
| **Session** | JWT-based cookies |

### User Roles
| Role | Access Level |
|------|--------------|
| `admin` | Full system access |
| `staff` | POS and order management (planned) |
| `user` | Customer ordering |

### Security Features
- HTTPS enforced on all endpoints
- JWT tokens with secure cookie storage
- CSRF protection via SameSite cookies
- Input validation via Zod schemas
- SQL injection prevention via Drizzle ORM

---

## Payment Integration

### Payment Provider
| Field | Value |
|-------|-------|
| **Provider** | Razorpay |
| **Mode** | Live |
| **Supported Methods** | UPI, Cards, Net Banking, Wallets |

### Payment Flow
```
1. Customer places order
2. Server creates Razorpay order
3. Customer completes payment on Razorpay checkout
4. Razorpay sends callback to server
5. Server verifies signature and updates order status
6. KOT is sent to kitchen printer
```

### Environment Variables
```
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
```

---

## API Architecture

### API Framework
The application uses **tRPC** for type-safe API communication.

### API Endpoints Structure
```
/api/trpc/
├── auth.*          # Authentication
├── users.*         # User management
├── categories.*    # Category CRUD
├── subcategories.* # Subcategory CRUD
├── products.*      # Product CRUD
├── orders.*        # Order management
├── stores.*        # Store locations
├── discounts.*     # Discount codes
├── reviews.*       # Customer reviews
├── analytics.*     # Sales analytics
└── system.*        # System operations
```

### Key Files
| File | Purpose |
|------|---------|
| `server/routers.ts` | All tRPC procedures |
| `server/db.ts` | Database query helpers |
| `client/src/lib/trpc.ts` | Client-side tRPC setup |

---

## Printer Integration

### KOT (Kitchen Order Ticket) Printers
Each outlet has a dedicated KOT printer client running on a local Windows machine.

#### Setup Files
| File | Purpose |
|------|---------|
| `kot-printer-client-palladium.mjs` | Palladium outlet KOT printer |
| `kot-printer-client-tnagar.mjs` | T Nagar outlet KOT printer |

#### How It Works
```
1. Order placed → KOT entry added to kot_queue table
2. Printer client polls /api/kot/poll/{outlet} every 3 seconds
3. New KOTs are printed to thermal printer
4. Client marks KOT as printed via /api/kot/print/{id}
```

### Receipt Printer
Receipt printing is triggered when "Collect Payment" is clicked for in-store orders.

#### Setup File
| File | Purpose |
|------|---------|
| `receipt-printer-client.mjs` | Receipt printer client |

#### Receipt Content
- Order number
- Date/time
- Items with prices
- Subtotal, GST breakdown
- Total amount
- Payment status

### Printer Requirements
- Windows PC at each outlet
- Node.js 18+ installed
- Thermal printer (80mm recommended)
- Printer connected and set as default

---

## Environment Variables

### Required Secrets
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | TiDB connection string |
| `JWT_SECRET` | Session signing key |
| `RAZORPAY_KEY_ID` | Razorpay API key |
| `RAZORPAY_KEY_SECRET` | Razorpay secret |
| `KOT_PRINT_SECRET` | KOT printer authentication |
| `EMP_MASTER_API_URL` | Employee API endpoint |
| `EMP_MASTER_API_KEY` | Employee API key |

### Manus Platform Variables (Auto-injected)
| Variable | Purpose |
|----------|---------|
| `VITE_APP_ID` | Manus OAuth app ID |
| `OAUTH_SERVER_URL` | OAuth backend URL |
| `VITE_OAUTH_PORTAL_URL` | OAuth login portal |
| `BUILT_IN_FORGE_API_URL` | Manus API services |
| `BUILT_IN_FORGE_API_KEY` | Manus API key |
| `OWNER_OPEN_ID` | Owner's Manus ID |
| `OWNER_NAME` | Owner's name |

### Application Configuration
| Variable | Purpose |
|----------|---------|
| `VITE_APP_TITLE` | Application title |
| `VITE_APP_LOGO` | Logo URL |

---

## File Structure

```
taiwan-maami/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts (Cart, etc.)
│   │   ├── pages/          # Page components
│   │   ├── lib/            # Utilities and tRPC client
│   │   ├── App.tsx         # Main app with routing
│   │   └── index.css       # Global styles
│   └── public/             # Static assets
├── server/                 # Backend Express + tRPC
│   ├── _core/              # Framework internals
│   ├── routers.ts          # tRPC procedures
│   ├── db.ts               # Database helpers
│   └── storage.ts          # S3 helpers
├── drizzle/                # Database schema
│   └── schema.ts           # Table definitions
├── shared/                 # Shared types and constants
│   └── types.ts            # Type definitions
├── kot-printer-client-*.mjs # KOT printer clients
├── receipt-printer-client.mjs # Receipt printer client
└── package.json            # Dependencies
```

---

## Operating Hours & Order Restrictions

### Online Ordering Hours
| Parameter | Value |
|-----------|-------|
| **Opens** | 12:00 PM (noon) |
| **Closes** | 11:45 PM |
| **Last Order** | 11:45 PM |

### Outlet-Specific Hours
| Outlet | Opens | Closes |
|--------|-------|--------|
| Palladium Mall | 10:00 AM | 10:00 PM |
| T Nagar (Moutan) | 12:00 PM | 12:00 AM |

### Implementation
- Orders blocked before 12:00 PM and after 11:45 PM
- In-store orders (via POS) are not restricted
- Checkout page shows "Ordering Closed" message outside hours

---

## Contact Information

### Business Contact
| Field | Value |
|-------|-------|
| **Email** | hello@taiwanmaami.com |
| **Palladium Phone** | +91 89259 14303 |
| **T Nagar Phone** | +91 91505 70557 |

### Technical Support
For technical issues with the platform, contact the development team through the Manus support portal.

---

## Legal Notice

This software and all associated documentation are the proprietary property of **Thamarai Foods and Trading Private Limited**. Unauthorized copying, distribution, or modification is strictly prohibited.

© 2024-2026 Thamarai Foods and Trading Private Limited. All rights reserved.

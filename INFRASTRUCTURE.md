# Taiwan Maami - Infrastructure Documentation

## Overview

Taiwan Maami is a full-stack TypeScript web application for online food ordering, in-store POS, and kitchen order management. This document describes the complete technical architecture.

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Frontend | React | 19.x | UI framework |
| Frontend | TypeScript | 5.9.x | Type-safe JavaScript |
| Frontend | Tailwind CSS | 4.x | Utility-first styling |
| Frontend | Wouter | - | Client-side routing |
| Backend | Node.js | 22.x | Runtime environment |
| Backend | Express | 4.x | HTTP server |
| Backend | tRPC | 11.x | Type-safe API layer |
| Database | TiDB (MySQL-compatible) | - | Cloud relational database |
| ORM | Drizzle | - | Database queries & migrations |
| Authentication | OAuth 2.0 | - | User authentication |
| Payments | Razorpay | - | Payment processing |
| Image Storage | Cloudinary | - | Product images & media |
| File Storage | S3-compatible | - | File uploads |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   React     │  │  Tailwind   │  │   tRPC Client           │  │
│  │   Pages     │  │   CSS       │  │   (Type-safe queries)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Express   │  │   tRPC      │  │   Authentication        │  │
│  │   Server    │  │   Router    │  │   (OAuth 2.0)           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│     TiDB        │ │   Cloudinary    │ │    Razorpay     │
│   (Database)    │ │   (Images)      │ │   (Payments)    │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## Project Structure

```
taiwan-maami/
├── client/                    # Frontend React application
│   ├── public/               # Static assets (images, fonts)
│   ├── src/
│   │   ├── _core/           # Core utilities (auth hooks)
│   │   ├── components/      # Reusable UI components
│   │   │   ├── ui/         # shadcn/ui components
│   │   │   ├── Header.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductCustomizationModal.tsx
│   │   │   ├── DashboardLayout.tsx
│   │   │   └── ...
│   │   ├── contexts/        # React contexts
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities (trpc client, image optimizer)
│   │   ├── pages/           # Page components
│   │   │   ├── Home.tsx
│   │   │   ├── Menu.tsx
│   │   │   ├── Checkout.tsx
│   │   │   ├── Admin.tsx
│   │   │   ├── StaffOrders.tsx
│   │   │   └── ...
│   │   ├── App.tsx          # Main app with routes
│   │   ├── main.tsx         # Entry point
│   │   └── index.css        # Global styles & theme
│   └── index.html
│
├── server/                    # Backend Node.js application
│   ├── _core/               # Core server utilities
│   │   ├── context.ts      # tRPC context (auth)
│   │   ├── env.ts          # Environment variables
│   │   ├── llm.ts          # LLM integration
│   │   ├── notification.ts # Push notifications
│   │   └── ...
│   ├── db.ts                # Database query helpers
│   ├── routers.ts           # tRPC API procedures
│   ├── storage.ts           # S3 file storage helpers
│   └── *.test.ts            # Vitest unit tests
│
├── drizzle/                   # Database schema & migrations
│   ├── schema.ts            # Table definitions
│   └── migrations/          # SQL migration files
│
├── shared/                    # Shared types & constants
│   └── types.ts
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── drizzle.config.ts
└── tailwind.config.ts
```

---

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | Customer accounts (OAuth) |
| `categories` | Menu categories (Iced Beverages, Food, etc.) |
| `subcategories` | Menu subcategories with pricing tiers |
| `products` | Individual menu items |
| `orders` | Customer orders |
| `order_items` | Items within each order |
| `cart_items` | Shopping cart (pre-order) |
| `kot_queue` | Kitchen Order Tickets for printing |
| `receipt_queue` | Receipt printing queue |
| `delivery_addresses` | Saved customer addresses |
| `complaints` | Customer feedback/complaints |

### Key Relationships

- Users → Orders (one-to-many)
- Orders → Order Items (one-to-many)
- Categories → Subcategories → Products (hierarchical)
- Orders → KOT Queue / Receipt Queue (for printing)

---

## API Endpoints (tRPC Procedures)

### Public Procedures
- `menu.getCategories` - List all menu categories
- `menu.getProducts` - Get products by subcategory
- `menu.searchProducts` - Search menu items

### Protected Procedures (requires login)
- `auth.me` - Get current user
- `auth.logout` - End session
- `cart.*` - Cart operations
- `orders.*` - Order management
- `delivery.*` - Delivery address management

### Admin Procedures
- `admin.orders.*` - Order management
- `admin.products.*` - Product CRUD
- `admin.analytics.*` - Sales reports
- `admin.kot.*` - Kitchen order management

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | TiDB connection string |
| `JWT_SECRET` | Session token signing |
| `RAZORPAY_KEY_ID` | Razorpay public key |
| `RAZORPAY_KEY_SECRET` | Razorpay secret key |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary secret |
| `KOT_PRINT_SECRET` | Kitchen printer auth |
| `VITE_APP_TITLE` | Site title |
| `VITE_APP_LOGO` | Logo URL |

---

## External Integrations

### Razorpay (Payments)
- Used for online order payments
- Supports UPI, cards, net banking
- Webhook for payment confirmation

### Cloudinary (Images)
- Product image hosting
- Automatic image optimization
- Responsive image delivery

### Kitchen Printer System
- Thermal printer integration (EPSON TM-T82)
- Separate queues for KOT and receipts
- Polling-based architecture
- See `KOT-PRINTER-SETUP.md` for details

---

## Deployment

### Production URL
- Primary: https://www.taiwanmaami.com
- Alternate: https://taiwanmaami.com

### Build Commands
```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Run database migrations
pnpm db:push

# Run tests
pnpm test
```

---

## Security Features

1. **Authentication**: OAuth 2.0 with secure session cookies
2. **Authorization**: Role-based access (admin/user)
3. **Input Validation**: Zod schemas on all API inputs
4. **HTTPS**: All traffic encrypted
5. **CORS**: Configured for production domain only
6. **Rate Limiting**: API rate limits in place

---

## Performance Optimizations

1. **Image Optimization**: Cloudinary auto-format and responsive images
2. **Code Splitting**: Vite automatic chunk splitting
3. **Lazy Loading**: Images load on scroll
4. **Caching**: Static assets cached with content hashes
5. **Database Indexing**: Key columns indexed for fast queries

---

## Monitoring & Analytics

- Built-in analytics endpoint for page views
- Error logging on server
- Order tracking and reporting in Admin dashboard

---

## Support & Maintenance

For technical issues:
- Review server logs
- Check database connectivity
- Verify environment variables
- Test API endpoints via tRPC panel

For business operations:
- Admin dashboard: /admin
- Staff orders: /staff-orders
- Analytics: /analytics

---

*Document last updated: January 2026*

# MaamiTech Scoped Token Access Matrix

**Document Version:** 1.0  
**Date:** 2026-05-03  
**Classification:** Internal — Do not share token values externally

---

## Token Registry Overview

The MaamiTech service API uses scoped tokens to control which agents/systems can access which endpoints. Each token is bound to a specific agent identity with explicitly defined scopes. The token registry is stored as a JSON array in the `MAAMITECH_TOKEN_REGISTRY` environment variable.

**Token format:** `mmt_{agentId}_{32-char-hex}`

---

## Access Matrix

The following table shows which endpoints each token can access. A check mark indicates access is granted.

| Endpoint | Method | Scope Required | aiagent | inventory | pos | etl | kotprinter | legacy |
|----------|--------|----------------|---------|-----------|-----|-----|------------|--------|
| `/api/service/health` | GET | `health:read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/api/service/orders` | GET | `orders:read` | ✓ | | ✓ | ✓ | | ✓ |
| `/api/service/employees` | GET | `employees:read` | | | | ✓ | | ✓ |
| `/api/service/employee-master/*` | ALL | `employees:proxy` | | ✓ | | | | ✓ |
| `/api/service/menu/products` | GET | `menu:read` | | | ✓ | ✓ | | ✓ |
| `/api/service/menu/toggle-availability` | POST | `menu:write` | | | ✓ | | | ✓ |
| `/api/service/etl/run` | POST | `etl:run` | | | | ✓ | | ✓ |
| `/api/service/etl/status` | GET | `etl:read` | ✓ | | | ✓ | | ✓ |

---

## Token Details

### mmt_aiagent

**Purpose:** AI Agent for daily digest generation and data lake queries.

| Field | Value |
|-------|-------|
| Agent ID | `aiagent` |
| Scopes | `orders:read`, `etl:read`, `health:read` |
| Use case | Reads order data for revenue summaries, checks ETL status, health monitoring |
| Consumers | Daily WhatsApp digest script, Manus scheduled tasks |
| Risk level | Low — read-only access to non-sensitive aggregate data |

### mmt_inventory

**Purpose:** Inventory management system for stock tracking and purchase orders.

| Field | Value |
|-------|-------|
| Agent ID | `inventory` |
| Scopes | `employees:proxy`, `health:read` |
| Use case | Proxies to Employee Master API for stock levels, PO creation, wastage reads |
| Consumers | Inventory management dashboard, stock alert system |
| Risk level | Medium — can create purchase orders via proxy |

### mmt_pos

**Purpose:** Point-of-sale system for order visibility and menu management.

| Field | Value |
|-------|-------|
| Agent ID | `pos` |
| Scopes | `orders:read`, `menu:read`, `menu:write`, `health:read` |
| Use case | Reads orders for display, reads menu for sync, toggles item availability |
| Consumers | POS terminals, staff availability management |
| Risk level | Medium — can modify menu availability (write access) |

### mmt_etl

**Purpose:** ETL runner with broadest read access for data extraction across all systems.

| Field | Value |
|-------|-------|
| Agent ID | `etl` |
| Scopes | `orders:read`, `employees:read`, `menu:read`, `etl:run`, `etl:read`, `health:read` |
| Use case | Reads all data sources, triggers ETL runs, monitors ETL status |
| Consumers | Scheduled ETL jobs, data pipeline orchestrator |
| Risk level | Medium — broad read access + ETL trigger capability |

### mmt_kotprinter

**Purpose:** KOT (Kitchen Order Ticket) printer with minimal access.

| Field | Value |
|-------|-------|
| Agent ID | `kotprinter` |
| Scopes | `health:read` |
| Use case | Health check for connectivity verification only. KOT polling uses a separate dedicated endpoint (`/api/kot/*`) with its own auth (`KOT_PRINT_SECRET`). |
| Consumers | KOT printer hardware at each outlet |
| Risk level | Minimal — health check only, no data access |

### legacy_single_token (DEPRECATED — pending retirement)

**Purpose:** Backward compatibility with the original single `MAAMITECH_SERVICE_TOKEN`.

| Field | Value |
|-------|-------|
| Agent ID | `legacy_single_token` |
| Scopes | `admin:*` (full access) |
| Use case | Fallback for any agent not yet migrated to scoped tokens |
| Status | **Active** — will be deactivated once all agents are confirmed running on scoped tokens |
| Risk level | **High** — superuser access to all endpoints |

---

## Scope Definitions

| Scope | Grants Access To | Type |
|-------|-----------------|------|
| `health:read` | `GET /api/service/health` | Read |
| `orders:read` | `GET /api/service/orders` | Read |
| `employees:read` | `GET /api/service/employees` | Read |
| `employees:proxy` | `ALL /api/service/employee-master/*` | Read/Write |
| `menu:read` | `GET /api/service/menu/products` | Read |
| `menu:write` | `POST /api/service/menu/toggle-availability` | Write |
| `etl:run` | `POST /api/service/etl/run` | Write |
| `etl:read` | `GET /api/service/etl/status` | Read |
| `admin:*` | All endpoints (superuser) | Full |

---

## Security Controls

All `/api/service/*` endpoints are protected by a layered middleware chain:

1. **Feature flag** — `MAAMITECH_API_ENABLED` must be `true` or all requests return 503
2. **Scoped auth** — Bearer token validated against registry, scope checked per endpoint
3. **Rate limiting** — 100 requests per minute per token (sliding window)
4. **Input validation** — Zod schemas reject malformed parameters with 400
5. **Audit logging** — All write operations logged to Supabase `audit_log` table with token, IP, timestamp, before/after state

---

## Token Lifecycle

**Creation:** Tokens are generated using `generateScopedToken()` in `server/scopedAuth.ts`. The full token is shown only once at generation time.

**Rotation:** To rotate a token, generate a new one for the same agent, add it to the registry, update the consuming agent, then deactivate the old token.

**Revocation:** Set `active: false` on the token entry in the registry. The token is immediately rejected on next request.

**Expiry:** Optional `expiresAt` field (ISO 8601). If set, the token is rejected after the expiry date even if `active: true`.

---

## Legacy Token Retirement Checklist

Before deactivating the legacy token, confirm each agent is running on its scoped token:

- [ ] aiagent — daily digest confirmed working with scoped token
- [ ] inventory — stock/PO operations confirmed working with scoped token
- [ ] pos — order reads and availability toggle confirmed working with scoped token
- [ ] etl — ETL runs confirmed working with scoped token
- [ ] kotprinter — health check confirmed working with scoped token
- [ ] All agents confirmed → set legacy token `active: false` in registry

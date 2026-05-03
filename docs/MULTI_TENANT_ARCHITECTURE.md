# Multi-Tenant Data Isolation Architecture

**Document Version:** 1.0  
**Date:** 2026-05-03  
**Author:** MaamiTech Engineering  
**Status:** Design Proposal — Awaiting Approval

---

## 1. Executive Summary

This document proposes the data isolation architecture for onboarding external clients to the MaamiTech platform. The recommendation is a **separate Supabase project per client** model, which provides the strongest isolation guarantees while remaining operationally simple at the expected scale of 1–10 clients in the first year.

---

## 2. Context and Requirements

Taiwan Maami currently operates a single-tenant system serving two outlets (Palladium and T.Nagar). The platform is being prepared for external client onboarding, where each client is an independent F&B business with their own outlets, menus, staff, and financial data.

**Hard requirements for external clients:**

| Requirement | Rationale |
|-------------|-----------|
| Complete data isolation | Client A must never see Client B's data, even through bugs |
| Independent backup/restore | One client's disaster recovery must not affect others |
| Separate billing visibility | Each client should see only their own Supabase usage |
| Regulatory compliance | Indian data protection laws may require demonstrable isolation |
| Independent scaling | A high-volume client should not degrade others' performance |

---

## 3. Architecture Options Evaluated

### Option A: Shared Database, Row-Level Security (RLS)

All clients share a single Supabase project. Every table has a `tenant_id` column, and RLS policies enforce isolation.

**Pros:** Lower infrastructure cost, simpler deployment, single codebase.  
**Cons:** One RLS misconfiguration exposes all client data. Shared connection pool means noisy-neighbor risk. Backup/restore is all-or-nothing. Difficult to demonstrate isolation to enterprise clients during due diligence.

**Verdict:** Rejected for external clients. Acceptable for internal multi-outlet use within a single business.

### Option B: Shared Project, Separate Schemas

Each client gets a dedicated PostgreSQL schema within one Supabase project. Application code sets `search_path` per request.

**Pros:** Better logical isolation than RLS. Easier per-client migrations.  
**Cons:** Supabase REST API does not natively support schema switching. Still shares connection pool and compute. Backup granularity remains project-level.

**Verdict:** Rejected. Supabase's architecture does not cleanly support this pattern.

### Option C: Separate Supabase Project Per Client (Recommended)

Each client gets their own Supabase project with independent database, auth, storage, and API keys.

**Pros:** Strongest isolation. Independent scaling, billing, backup. Zero cross-contamination risk. Simple mental model. Each client can be handed their own dashboard if needed.  
**Cons:** Higher base cost (~$25/month per client on Pro plan). Requires routing layer to direct requests to correct project. Schema migrations must be applied to each project.

**Verdict:** Recommended. The cost is negligible relative to client contract value, and the isolation guarantees eliminate an entire class of security incidents.

---

## 4. Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MaamiTech Control Plane                       │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Client Router │  │ Schema Mgmt  │  │ Token Vault  │         │
│  │ (tenant→proj) │  │ (migrations) │  │ (credentials)│         │
│  └──────┬───────┘  └──────────────┘  └──────────────┘         │
│         │                                                       │
└─────────┼───────────────────────────────────────────────────────┘
          │
    ┌─────┼──────────────────────────────────────────┐
    │     ▼                                          │
    │  ┌─────────────┐  ┌─────────────┐  ┌────────┐ │
    │  │ Taiwan Maami│  │  Client B   │  │Client C│ │
    │  │  Supabase   │  │  Supabase   │  │Supabase│ │
    │  │  Project    │  │  Project    │  │Project │ │
    │  │             │  │             │  │        │ │
    │  │ sales_facts │  │ sales_facts │  │  ...   │ │
    │  │ orders      │  │ orders      │  │        │ │
    │  │ employees   │  │ employees   │  │        │ │
    │  └─────────────┘  └─────────────┘  └────────┘ │
    │                                                │
    │           Supabase Infrastructure              │
    └────────────────────────────────────────────────┘
```

---

## 5. Implementation Plan

### Phase 1: Control Plane (Week 1–2)

Build a lightweight tenant registry that maps `client_id` → Supabase credentials:

```typescript
// server/tenants/registry.ts
interface TenantConfig {
  clientId: string;
  clientName: string;
  supabaseUrl: string;
  supabaseServiceKey: string;  // encrypted at rest
  supabaseAnonKey: string;
  outlets: string[];
  createdAt: string;
  status: "active" | "suspended" | "onboarding";
}
```

The registry is stored in the **MaamiTech master database** (current MySQL/TiDB instance), encrypted with AES-256-GCM. At request time, the router resolves the tenant from the scoped token's `agentId` and injects the correct Supabase client.

### Phase 2: Schema Migration Tool (Week 2–3)

Create a CLI tool that applies schema changes across all tenant projects:

```bash
# Apply migration to all active tenants
pnpm tenant:migrate --migration 002_add_wastage_table --target all

# Apply to specific tenant
pnpm tenant:migrate --migration 002_add_wastage_table --target client_b
```

Migrations are versioned in `drizzle/tenant-migrations/` and tracked per-tenant in the master database.

### Phase 3: Onboarding Automation (Week 3–4)

Automate new client setup:

1. Create Supabase project via Supabase Management API
2. Apply base schema (all numbered migrations)
3. Generate scoped tokens with client-specific prefix
4. Register in tenant registry
5. Configure webhook endpoints for client's POS system
6. Run smoke tests against new project

---

## 6. Scoped Token Integration

Each external client receives tokens scoped to their data only. The token registry (from the security hardening sprint) is extended with a `tenantId` field:

```typescript
interface TokenEntry {
  token: string;
  agentId: string;
  tenantId: string;       // NEW: maps to TenantConfig.clientId
  scopes: string[];
  description: string;
  createdAt: string;
  expiresAt?: string;
  active: boolean;
}
```

The middleware chain becomes: **scopedAuth** (validates token + resolves tenant) → **rateLimiter** (per-token) → **tenantContext** (injects correct Supabase client) → **audit** → handler.

---

## 7. Cost Model

| Component | Per Client/Month | Notes |
|-----------|-----------------|-------|
| Supabase Pro | $25 | 8GB database, 250GB bandwidth |
| Additional storage | $0.021/GB | Beyond 8GB included |
| Manus hosting | $0 | Shared application, no per-tenant compute cost |
| Monitoring | $0 | Included in existing Supabase dashboard |
| **Total base** | **$25/month** | Scales with actual usage |

At $25/month infrastructure cost per client, even a minimum contract of $200/month yields 87.5% gross margin on infrastructure.

---

## 8. Security Boundaries

| Boundary | Enforcement |
|----------|-------------|
| Network | Each Supabase project has unique API URL and keys |
| Authentication | Scoped tokens include `tenantId`; cross-tenant requests are impossible |
| Database | Physically separate PostgreSQL instances (Supabase guarantee) |
| Storage | Separate S3 buckets per Supabase project |
| Backups | Independent PITR (Point-in-Time Recovery) per project |
| Audit trail | Separate `audit_log` table per project, plus master audit in control plane |
| Key rotation | Per-client key rotation without affecting other tenants |

---

## 9. Disaster Recovery

Since each client has an independent Supabase project:

- **Backup:** Supabase provides automatic daily backups + PITR on Pro plan
- **Restore:** Can restore one client without touching others
- **Data export:** Each client can receive a full database dump on contract termination
- **Failover:** Supabase handles infrastructure-level failover automatically

---

## 10. Migration Path for Taiwan Maami

The current Taiwan Maami Supabase project (`ouktqqgmipygehhakoie`) becomes the first tenant. No migration needed — it simply gets registered in the tenant registry as `client_id: "taiwan_maami"`. All existing data, tables, and integrations remain unchanged.

---

## 11. Decision Log

| Decision | Rationale | Date |
|----------|-----------|------|
| Separate project per client | Strongest isolation, simplest mental model, acceptable cost | 2026-05-03 |
| Master DB for tenant registry | Single source of truth for routing, encrypted credentials | 2026-05-03 |
| Schema migration CLI | Ensures consistency across tenants, auditable | 2026-05-03 |
| Scoped tokens with tenantId | Leverages existing security infrastructure | 2026-05-03 |

---

## 12. Open Questions

1. **Supabase Organization plan** — Should we use Supabase's Organization feature to group all client projects under one billing account?
2. **Client self-service dashboard** — Do external clients get direct Supabase dashboard access, or only through MaamiTech's API?
3. **Data residency** — Should Indian clients be on `ap-south-1` (Mumbai) region specifically?
4. **Contract minimum** — What is the minimum contract term to justify the $25/month base cost?

---

## 13. Next Steps

1. Approve this architecture design
2. Create the tenant registry table in master database
3. Build the tenant resolution middleware
4. Onboard first external client as pilot
5. Document the client onboarding runbook

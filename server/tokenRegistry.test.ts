/**
 * Token Registry Validation Test
 * Validates that MAAMITECH_TOKEN_REGISTRY env var is properly configured
 */

import { describe, it, expect } from "vitest";

describe("Token Registry Environment Variable", () => {
  it("MAAMITECH_TOKEN_REGISTRY is set and parseable as JSON", () => {
    const registryJson = process.env.MAAMITECH_TOKEN_REGISTRY;
    expect(registryJson).toBeDefined();
    expect(registryJson).not.toBe("");

    const registry = JSON.parse(registryJson!);
    expect(Array.isArray(registry)).toBe(true);
    expect(registry.length).toBeGreaterThanOrEqual(5);
  });

  it("contains all 5 expected agent tokens", () => {
    const registry = JSON.parse(process.env.MAAMITECH_TOKEN_REGISTRY!);
    const agentIds = registry.map((e: any) => e.agentId);

    expect(agentIds).toContain("aiagent");
    expect(agentIds).toContain("inventory");
    expect(agentIds).toContain("pos");
    expect(agentIds).toContain("etl");
    expect(agentIds).toContain("kotprinter");
  });

  it("each token entry has required fields", () => {
    const registry = JSON.parse(process.env.MAAMITECH_TOKEN_REGISTRY!);

    for (const entry of registry) {
      expect(entry.token).toBeDefined();
      expect(typeof entry.token).toBe("string");
      expect(entry.token.length).toBeGreaterThan(10);

      expect(entry.agentId).toBeDefined();
      expect(typeof entry.agentId).toBe("string");

      expect(Array.isArray(entry.scopes)).toBe(true);
      expect(entry.scopes.length).toBeGreaterThan(0);

      expect(typeof entry.active).toBe("boolean");
    }
  });

  it("all tokens are active", () => {
    const registry = JSON.parse(process.env.MAAMITECH_TOKEN_REGISTRY!);
    for (const entry of registry) {
      expect(entry.active).toBe(true);
    }
  });

  it("aiagent has correct scopes", () => {
    const registry = JSON.parse(process.env.MAAMITECH_TOKEN_REGISTRY!);
    const aiagent = registry.find((e: any) => e.agentId === "aiagent");
    expect(aiagent.scopes).toContain("orders:read");
    expect(aiagent.scopes).toContain("etl:read");
    expect(aiagent.scopes).toContain("health:read");
    expect(aiagent.scopes).not.toContain("admin:*");
  });

  it("pos has correct scopes", () => {
    const registry = JSON.parse(process.env.MAAMITECH_TOKEN_REGISTRY!);
    const pos = registry.find((e: any) => e.agentId === "pos");
    expect(pos.scopes).toContain("orders:read");
    expect(pos.scopes).toContain("menu:read");
    expect(pos.scopes).toContain("menu:write");
    expect(pos.scopes).not.toContain("etl:run");
  });

  it("etl has broadest read access", () => {
    const registry = JSON.parse(process.env.MAAMITECH_TOKEN_REGISTRY!);
    const etl = registry.find((e: any) => e.agentId === "etl");
    expect(etl.scopes).toContain("orders:read");
    expect(etl.scopes).toContain("employees:read");
    expect(etl.scopes).toContain("menu:read");
    expect(etl.scopes).toContain("etl:run");
    expect(etl.scopes).toContain("etl:read");
  });

  it("kotprinter has minimal scope", () => {
    const registry = JSON.parse(process.env.MAAMITECH_TOKEN_REGISTRY!);
    const kot = registry.find((e: any) => e.agentId === "kotprinter");
    expect(kot.scopes).toEqual(["health:read"]);
  });

  it("token format follows mmt_{agent}_{hex} pattern", () => {
    const registry = JSON.parse(process.env.MAAMITECH_TOKEN_REGISTRY!);
    for (const entry of registry) {
      expect(entry.token).toMatch(/^mmt_[a-z]+_[a-f0-9]{32}$/);
    }
  });
});

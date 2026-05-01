import { describe, it, expect } from "vitest";

describe("Supabase Credentials Validation", () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  it("should have SUPABASE_URL set", () => {
    expect(supabaseUrl).toBeDefined();
    expect(supabaseUrl).toContain("supabase.co");
  });

  it("should have SUPABASE_SERVICE_ROLE_KEY set", () => {
    expect(supabaseKey).toBeDefined();
    expect(supabaseKey!.length).toBeGreaterThan(50);
  });

  it("should connect to Supabase REST API successfully", async () => {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: supabaseKey!,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });
    // 200 means connected, even if no tables exist yet
    expect(res.status).toBe(200);
  });
});

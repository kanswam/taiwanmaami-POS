import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@taiwanmaami.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createUserContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("admin.getVideoUploadUrl", () => {
  it("returns upload credentials for admin users", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getVideoUploadUrl({
      productId: 1,
      fileName: "test-video.mp4",
      mimeType: "video/mp4",
    });

    expect(result).toHaveProperty("uploadUrl");
    expect(result).toHaveProperty("apiKey");
    expect(result).toHaveProperty("key");
    expect(result.uploadUrl).toContain("storage/upload");
    expect(result.key).toContain("videos/");
    expect(result.key).toContain(".mp4");
  });

  it("generates unique file keys with timestamp", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result1 = await caller.admin.getVideoUploadUrl({
      productId: 1,
      fileName: "video.mp4",
      mimeType: "video/mp4",
    });

    // Wait a tiny bit to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    const result2 = await caller.admin.getVideoUploadUrl({
      productId: 1,
      fileName: "video.mp4",
      mimeType: "video/mp4",
    });

    expect(result1.key).not.toBe(result2.key);
  });

  it("rejects non-admin users", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.getVideoUploadUrl({
        productId: 1,
        fileName: "test.mp4",
        mimeType: "video/mp4",
      })
    ).rejects.toThrow("Admin access required");
  });
});

describe("admin.confirmVideoUpload", () => {
  it("rejects non-admin users", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.confirmVideoUpload({
        productId: 1,
        videoUrl: "https://example.com/video.mp4",
      })
    ).rejects.toThrow("Admin access required");
  });
});

describe("admin.getFeaturedVideos", () => {
  it("returns array of featured videos", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getFeaturedVideos();

    expect(Array.isArray(result)).toBe(true);
  });
});

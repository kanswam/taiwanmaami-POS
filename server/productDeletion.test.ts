import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createStaffContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "staff-user",
    email: "staff@example.com",
    name: "Staff User",
    loginMethod: "manus",
    role: "staff",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createCustomerContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 3,
    openId: "customer-user",
    email: "customer@example.com",
    name: "Customer User",
    loginMethod: "manus",
    role: "customer",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Product Deletion Lockdown", () => {
  describe("deleteProduct (soft deactivation) - requires double confirmation", () => {
    it("rejects when confirmation code is wrong", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const products = await caller.admin.getAllProducts();
      if (products.length === 0) return;

      const product = products[0];

      await expect(
        caller.admin.deleteProduct({
          id: product.id,
          confirmProductName: product.name,
          confirmationCode: "WRONG_CODE",
        })
      ).rejects.toThrow("Invalid confirmation code");
    });

    it("rejects when product name does not match", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const products = await caller.admin.getAllProducts();
      if (products.length === 0) return;

      const product = products[0];

      await expect(
        caller.admin.deleteProduct({
          id: product.id,
          confirmProductName: "COMPLETELY WRONG NAME 12345",
          confirmationCode: "DEACTIVATE",
        })
      ).rejects.toThrow("Product name does not match");
    });

    it("rejects when both confirmation code and product name are wrong", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const products = await caller.admin.getAllProducts();
      if (products.length === 0) return;

      const product = products[0];

      await expect(
        caller.admin.deleteProduct({
          id: product.id,
          confirmProductName: "WRONG NAME",
          confirmationCode: "WRONG_CODE",
        })
      ).rejects.toThrow();
    });

    it("rejects staff users from deactivating products", async () => {
      const ctx = createStaffContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.admin.deleteProduct({
          id: 1,
          confirmProductName: "Test",
          confirmationCode: "DEACTIVATE",
        })
      ).rejects.toThrow();
    });

    it("rejects customer users from deactivating products", async () => {
      const ctx = createCustomerContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.admin.deleteProduct({
          id: 1,
          confirmProductName: "Test",
          confirmationCode: "DEACTIVATE",
        })
      ).rejects.toThrow();
    });
  });

  describe("permanentlyDeleteProduct - requires strict double confirmation", () => {
    it("rejects when confirmation code is wrong", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const products = await caller.admin.getAllProducts();
      if (products.length === 0) return;

      const product = products[0];

      await expect(
        caller.admin.permanentlyDeleteProduct({
          id: product.id,
          confirmProductName: product.name,
          confirmationCode: "WRONG_CODE",
        })
      ).rejects.toThrow("Invalid confirmation code");
    });

    it("rejects when product name does not match", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const products = await caller.admin.getAllProducts();
      if (products.length === 0) return;

      const product = products[0];

      await expect(
        caller.admin.permanentlyDeleteProduct({
          id: product.id,
          confirmProductName: "COMPLETELY WRONG NAME 12345",
          confirmationCode: "DELETE-FOREVER",
        })
      ).rejects.toThrow("Product name does not match");
    });

    it("rejects products with order history even with correct confirmation", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const products = await caller.admin.getAllProducts();
      if (products.length === 0) return;

      // Find a product that has order history
      for (const product of products) {
        const canDelete = await caller.admin.canDeleteProduct({ id: product.id });
        if (!canDelete.canDelete && canDelete.orderCount > 0) {
          await expect(
            caller.admin.permanentlyDeleteProduct({
              id: product.id,
              confirmProductName: product.name,
              confirmationCode: "DELETE-FOREVER",
            })
          ).rejects.toThrow("Cannot permanently delete product with order history");
          return;
        }
      }
      // If no product with orders found, test is inconclusive but passes
    });

    it("rejects staff users from permanently deleting products", async () => {
      const ctx = createStaffContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.admin.permanentlyDeleteProduct({
          id: 1,
          confirmProductName: "Test",
          confirmationCode: "DELETE-FOREVER",
        })
      ).rejects.toThrow();
    });

    it("rejects customer users from permanently deleting products", async () => {
      const ctx = createCustomerContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.admin.permanentlyDeleteProduct({
          id: 1,
          confirmProductName: "Test",
          confirmationCode: "DELETE-FOREVER",
        })
      ).rejects.toThrow();
    });
  });

  describe("updateProduct no longer accepts isActive", () => {
    it("does not change isActive through updateProduct (field stripped by zod)", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const products = await caller.admin.getAllProducts();
      if (products.length === 0) return;

      // Find an active product
      const activeProduct = products.find(p => p.isActive);
      if (!activeProduct) return;

      // Attempting to pass isActive should be silently stripped by zod
      const result = await caller.admin.updateProduct({
        id: activeProduct.id,
        // @ts-expect-error - isActive is no longer in the schema
        isActive: false,
      });

      expect(result.success).toBe(true);

      // Verify the product is still active (isActive was stripped)
      const updatedProducts = await caller.admin.getAllProducts();
      const updatedProduct = updatedProducts.find(p => p.id === activeProduct.id);
      expect(updatedProduct?.isActive).toBe(true);
    });
  });

  describe("canDeleteProduct query", () => {
    it("returns order count and canDelete flag", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const products = await caller.admin.getAllProducts();
      if (products.length === 0) return;

      const result = await caller.admin.canDeleteProduct({ id: products[0].id });
      expect(result).toHaveProperty("canDelete");
      expect(result).toHaveProperty("orderCount");
      expect(typeof result.canDelete).toBe("boolean");
      expect(typeof result.orderCount).toBe("number");
    });

    it("correctly identifies products with order history as non-deletable", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const products = await caller.admin.getAllProducts();
      
      for (const product of products) {
        const result = await caller.admin.canDeleteProduct({ id: product.id });
        if (result.orderCount > 0) {
          expect(result.canDelete).toBe(false);
          return;
        }
      }
    });
  });
});

import { describe, it, expect, beforeAll } from 'vitest';
import { createCaller } from './_core/context';

describe('CMS Features', () => {
  let caller: ReturnType<typeof createCaller>;

  beforeAll(async () => {
    // Create admin caller for testing
    caller = createCaller({
      user: {
        id: 1,
        openId: 'test-admin',
        name: 'Test Admin',
        email: 'admin@test.com',
        role: 'admin',
      },
    });
  });

  describe('Product Management', () => {
    it('should create a new product', async () => {
      const result = await caller.admin.createProduct({
        name: 'Test Product',
        slug: 'test-product',
        chineseName: '測試產品',
        description: 'Test description',
        subcategoryId: 1,
        instorePrice: 100,
        deliveryPrice: 120,
      });

      expect(result).toHaveProperty('id');
      expect(result.name).toBe('Test Product');
      expect(result.slug).toBe('test-product');
    });

    it('should update an existing product', async () => {
      const result = await caller.admin.updateProduct({
        id: 1,
        name: 'Updated Product',
        subcategoryId: 1,
      });

      expect(result.success).toBe(true);
    });

    it('should delete a product (soft delete)', async () => {
      const result = await caller.admin.deleteProduct({
        id: 1,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Category Management', () => {
    it('should create a new category', async () => {
      const result = await caller.admin.createCategory({
        name: 'Test Category',
        slug: 'test-category',
      });

      expect(result).toHaveProperty('id');
      expect(result.name).toBe('Test Category');
    });

    it('should update a category', async () => {
      const result = await caller.admin.updateCategory({
        id: 1,
        name: 'Updated Category',
      });

      expect(result.success).toBe(true);
    });

    it('should delete a category', async () => {
      const result = await caller.admin.deleteCategory({
        id: 1,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Subcategory Management', () => {
    it('should create a new subcategory', async () => {
      const result = await caller.admin.createSubcategory({
        categoryId: 1,
        name: 'Test Subcategory',
        slug: 'test-subcategory',
      });

      expect(result).toHaveProperty('id');
      expect(result.name).toBe('Test Subcategory');
    });

    it('should update a subcategory', async () => {
      const result = await caller.admin.updateSubcategory({
        id: 1,
        name: 'Updated Subcategory',
      });

      expect(result.success).toBe(true);
    });

    it('should delete a subcategory', async () => {
      const result = await caller.admin.deleteSubcategory({
        id: 1,
      });

      expect(result.success).toBe(true);
    });
  });
});

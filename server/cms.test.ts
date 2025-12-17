import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';

describe('CMS Features', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    // Create admin caller for testing
    caller = appRouter.createCaller({
      user: {
        id: 1,
        openId: 'test-admin',
        name: 'Test Admin',
        email: 'admin@test.com',
        role: 'admin',
        phone: '1234567890',
      },
      req: {} as any,
      res: {} as any,
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

    it('should update a subcategory with base pricing', async () => {
      const result = await caller.admin.updateSubcategory({
        id: 1,
        name: 'Updated Subcategory',
        description: 'Updated description',
        basePriceRegularWithBoba: 7000,
        basePriceLargeWithBoba: 9000,
        deliveryPriceRegularWithBoba: 8000,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Product Descriptions', () => {
    it('should create product with description field', async () => {
      const result = await caller.admin.createProduct({
        name: 'Product with Description',
        slug: 'product-with-desc',
        description: 'This is a detailed product description',
        subcategoryId: 1,
        instorePrice: 100,
        deliveryPrice: 120,
      });

      expect(result).toHaveProperty('id');
      expect(result.description).toBe('This is a detailed product description');
    });

    it('should update product description', async () => {
      const result = await caller.admin.updateProduct({
        id: 1,
        description: 'Updated product description',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Reviews Management', () => {
    it('should update review status with admin response', async () => {
      const result = await caller.reviews.updateStatus({
        reviewId: 1,
        status: 'approved',
        adminResponse: 'Thank you for your feedback!',
      });

      expect(result.success).toBe(true);
    });

    it('should get all reviews for admin', async () => {
      const result = await caller.reviews.getAll();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should delete a review', async () => {
      const result = await caller.reviews.delete({
        reviewId: 1,
      });

      expect(result.success).toBe(true);
    });
  });
});

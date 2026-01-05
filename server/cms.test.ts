import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';
import { categories, subcategories, products } from '../drizzle/schema';
import { like } from 'drizzle-orm';

// Use unique prefix to identify test data for cleanup
const TEST_PREFIX = '__VITEST_TEMP__';

describe('CMS Features', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let createdCategoryId: number | null = null;
  let createdSubcategoryId: number | null = null;
  let createdProductId: number | null = null;

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

  // CRITICAL: Clean up all test data after tests complete
  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    try {
      // Delete test products first (due to foreign key constraints)
      await db.delete(products).where(like(products.name, `${TEST_PREFIX}%`));
      await db.delete(products).where(like(products.slug, `${TEST_PREFIX.toLowerCase()}%`));
      
      // Delete test subcategories
      await db.delete(subcategories).where(like(subcategories.name, `${TEST_PREFIX}%`));
      await db.delete(subcategories).where(like(subcategories.slug, `${TEST_PREFIX.toLowerCase()}%`));
      
      // Delete test categories
      await db.delete(categories).where(like(categories.name, `${TEST_PREFIX}%`));
      await db.delete(categories).where(like(categories.slug, `${TEST_PREFIX.toLowerCase()}%`));
      
      console.log('[CMS Test] Cleaned up test data with prefix:', TEST_PREFIX);
    } catch (error) {
      console.warn('[CMS Test] Cleanup warning:', error);
    }
  });

  describe('Category Management', () => {
    it('should create a new category', async () => {
      const testName = `${TEST_PREFIX} Category ${Date.now()}`;
      const testSlug = `${TEST_PREFIX.toLowerCase()}-category-${Date.now()}`;
      
      const result = await caller.admin.createCategory({
        name: testName,
        slug: testSlug,
      });

      expect(result).toHaveProperty('id');
      expect(typeof result.id).toBe('number');
      createdCategoryId = result.id;
    });

    it('should update a category', async () => {
      if (!createdCategoryId) {
        console.log('Skipping update test - no category created');
        return;
      }
      
      const result = await caller.admin.updateCategory({
        id: createdCategoryId,
        name: `${TEST_PREFIX} Updated Category`,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Subcategory Management', () => {
    it('should create a new subcategory', async () => {
      // Use first real category if test category wasn't created
      const categoryId = createdCategoryId || 1;
      const testName = `${TEST_PREFIX} Subcategory ${Date.now()}`;
      const testSlug = `${TEST_PREFIX.toLowerCase()}-subcategory-${Date.now()}`;
      
      const result = await caller.admin.createSubcategory({
        categoryId,
        name: testName,
        slug: testSlug,
      });

      expect(result).toHaveProperty('id');
      expect(typeof result.id).toBe('number');
      createdSubcategoryId = result.id;
    });

    it('should update a subcategory with base pricing', async () => {
      if (!createdSubcategoryId) {
        console.log('Skipping update test - no subcategory created');
        return;
      }
      
      const result = await caller.admin.updateSubcategory({
        id: createdSubcategoryId,
        name: `${TEST_PREFIX} Updated Subcategory`,
        description: 'Updated description',
        basePriceRegularWithBoba: 7000,
        basePriceLargeWithBoba: 9000,
        deliveryPriceRegularWithBoba: 8000,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Product Management', () => {
    it('should create a new product', async () => {
      // Use first real subcategory if test subcategory wasn't created
      const subcategoryId = createdSubcategoryId || 1;
      const testName = `${TEST_PREFIX} Product ${Date.now()}`;
      const testSlug = `${TEST_PREFIX.toLowerCase()}-product-${Date.now()}`;
      
      const result = await caller.admin.createProduct({
        name: testName,
        slug: testSlug,
        chineseName: '測試產品',
        description: 'Test description - will be cleaned up',
        subcategoryId,
        instorePrice: 100,
        deliveryPrice: 120,
      });

      expect(result).toHaveProperty('id');
      expect(typeof result.id).toBe('number');
      createdProductId = result.id;
    });

    it('should update an existing product', async () => {
      if (!createdProductId) {
        console.log('Skipping update test - no product created');
        return;
      }
      
      const result = await caller.admin.updateProduct({
        id: createdProductId,
        name: `${TEST_PREFIX} Updated Product`,
        subcategoryId: createdSubcategoryId || 1,
      });

      expect(result.success).toBe(true);
    });

    it('should create product with description field', async () => {
      const subcategoryId = createdSubcategoryId || 1;
      const testName = `${TEST_PREFIX} Product Desc ${Date.now()}`;
      const testSlug = `${TEST_PREFIX.toLowerCase()}-product-desc-${Date.now()}`;
      
      const result = await caller.admin.createProduct({
        name: testName,
        slug: testSlug,
        description: 'This is a detailed product description',
        subcategoryId,
        instorePrice: 100,
        deliveryPrice: 120,
      });

      expect(result).toHaveProperty('id');
      expect(typeof result.id).toBe('number');
    });
  });

  describe('Reviews Management', () => {
    it('should get all reviews for admin', async () => {
      const result = await caller.reviews.getAll();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

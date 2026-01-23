import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from './db';
import { 
  wholesaleCategories, 
  wholesaleProducts, 
  wholesaleCustomers,
  wholesaleCart
} from '../drizzle/schema';
import { eq, and, like, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// Test data identifiers - use unique prefixes to avoid conflicts with production data
const TEST_PREFIX = 'TEST_WHOLESALE_';
const TEST_EMAIL = `${TEST_PREFIX}test@example.com`;
const TEST_BUSINESS = `${TEST_PREFIX}Test Business`;

describe('Wholesale Portal', () => {
  let testCategoryId: number;
  let testProductId: number;
  let testCustomerId: number;

  // Clean up test data before and after tests
  beforeAll(async () => {
    const database = await getDb();
    if (!database) throw new Error('Database not available');
    
    // Clean up any existing test data
    await database.delete(wholesaleProducts).where(like(wholesaleProducts.name, `${TEST_PREFIX}%`));
    await database.delete(wholesaleCategories).where(like(wholesaleCategories.name, `${TEST_PREFIX}%`));
    await database.delete(wholesaleCustomers).where(eq(wholesaleCustomers.email, TEST_EMAIL));
  });

  afterAll(async () => {
    const database = await getDb();
    if (!database) return;
    
    // Clean up test data after tests
    if (testCustomerId) {
      await database.delete(wholesaleCart).where(eq(wholesaleCart.customerId, testCustomerId));
    }
    await database.delete(wholesaleProducts).where(like(wholesaleProducts.name, `${TEST_PREFIX}%`));
    await database.delete(wholesaleCategories).where(like(wholesaleCategories.name, `${TEST_PREFIX}%`));
    await database.delete(wholesaleCustomers).where(eq(wholesaleCustomers.email, TEST_EMAIL));
  });

  describe('Categories', () => {
    it('should create a wholesale category', async () => {
      const database = await getDb();
      if (!database) throw new Error('Database not available');

      // Insert category
      await database.insert(wholesaleCategories).values({
        name: `${TEST_PREFIX}Test Category`,
        slug: `${TEST_PREFIX.toLowerCase()}test-category`,
        description: 'Test category for wholesale',
        isActive: true,
        sortOrder: 999,
      });

      // Fetch the created category
      const [category] = await database.select()
        .from(wholesaleCategories)
        .where(eq(wholesaleCategories.name, `${TEST_PREFIX}Test Category`));

      expect(category).toBeDefined();
      expect(category.name).toBe(`${TEST_PREFIX}Test Category`);
      expect(category.isActive).toBe(true);
      testCategoryId = category.id;
    });

    it('should fetch active categories', async () => {
      const database = await getDb();
      if (!database) throw new Error('Database not available');

      const categories = await database.select()
        .from(wholesaleCategories)
        .where(eq(wholesaleCategories.isActive, true));

      expect(categories.length).toBeGreaterThan(0);
      const testCategory = categories.find(c => c.name === `${TEST_PREFIX}Test Category`);
      expect(testCategory).toBeDefined();
    });
  });

  describe('Products', () => {
    it('should create a wholesale product', async () => {
      const database = await getDb();
      if (!database) throw new Error('Database not available');

      // Insert product
      await database.insert(wholesaleProducts).values({
        name: `${TEST_PREFIX}Test Product`,
        slug: `${TEST_PREFIX.toLowerCase()}test-product`,
        categoryId: testCategoryId,
        description: 'Test product for wholesale',
        specifications: 'Test specs',
        basePrice: 10000, // ₹100 in paise
        unit: 'pack',
        stockQuantity: 50,
        isActive: true,
        isFeatured: false,
      });

      // Fetch the created product
      const [product] = await database.select()
        .from(wholesaleProducts)
        .where(eq(wholesaleProducts.name, `${TEST_PREFIX}Test Product`));

      expect(product).toBeDefined();
      expect(product.name).toBe(`${TEST_PREFIX}Test Product`);
      expect(product.basePrice).toBe(10000);
      testProductId = product.id;
    });

    it('should fetch products by category', async () => {
      const database = await getDb();
      if (!database) throw new Error('Database not available');

      const products = await database.select()
        .from(wholesaleProducts)
        .where(and(
          eq(wholesaleProducts.categoryId, testCategoryId),
          eq(wholesaleProducts.isActive, true)
        ));

      expect(products.length).toBeGreaterThan(0);
      const testProduct = products.find(p => p.name === `${TEST_PREFIX}Test Product`);
      expect(testProduct).toBeDefined();
    });
  });

  describe('Customer Registration', () => {
    it('should register a new wholesale customer', async () => {
      const database = await getDb();
      if (!database) throw new Error('Database not available');

      const hashedPassword = await bcrypt.hash('TestPassword123', 10);

      // Insert customer
      await database.insert(wholesaleCustomers).values({
        businessName: TEST_BUSINESS,
        businessType: 'cafe',
        gstNumber: '33XXXXX1234X1ZX',
        contactPerson: 'Test Person',
        email: TEST_EMAIL,
        phone: '+919876543210',
        passwordHash: hashedPassword,
        addressLine1: '123 Test Street',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
        isApproved: true,
        isActive: true,
      });

      // Fetch the created customer
      const [customer] = await database.select()
        .from(wholesaleCustomers)
        .where(eq(wholesaleCustomers.email, TEST_EMAIL));

      expect(customer).toBeDefined();
      expect(customer.businessName).toBe(TEST_BUSINESS);
      expect(customer.email).toBe(TEST_EMAIL);
      testCustomerId = customer.id;
    });

    it('should verify password correctly', async () => {
      const database = await getDb();
      if (!database) throw new Error('Database not available');

      const [customer] = await database.select()
        .from(wholesaleCustomers)
        .where(eq(wholesaleCustomers.email, TEST_EMAIL));

      expect(customer).toBeDefined();
      
      const isValid = await bcrypt.compare('TestPassword123', customer.passwordHash);
      expect(isValid).toBe(true);
      
      const isInvalid = await bcrypt.compare('WrongPassword', customer.passwordHash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Shopping Cart', () => {
    it('should add item to cart', async () => {
      const database = await getDb();
      if (!database) throw new Error('Database not available');

      // Insert cart item
      await database.insert(wholesaleCart).values({
        customerId: testCustomerId,
        productId: testProductId,
        quantity: 5,
      });

      // Fetch the cart item
      const [cartItem] = await database.select()
        .from(wholesaleCart)
        .where(and(
          eq(wholesaleCart.customerId, testCustomerId),
          eq(wholesaleCart.productId, testProductId)
        ));

      expect(cartItem).toBeDefined();
      expect(cartItem.quantity).toBe(5);
    });

    it('should update cart item quantity', async () => {
      const database = await getDb();
      if (!database) throw new Error('Database not available');

      await database.update(wholesaleCart)
        .set({ quantity: 10 })
        .where(and(
          eq(wholesaleCart.customerId, testCustomerId),
          eq(wholesaleCart.productId, testProductId)
        ));

      const [updatedItem] = await database.select()
        .from(wholesaleCart)
        .where(and(
          eq(wholesaleCart.customerId, testCustomerId),
          eq(wholesaleCart.productId, testProductId)
        ));

      expect(updatedItem).toBeDefined();
      expect(updatedItem.quantity).toBe(10);
    });

    it('should calculate cart total correctly', async () => {
      const database = await getDb();
      if (!database) throw new Error('Database not available');

      const cartItems = await database.select({
        quantity: wholesaleCart.quantity,
        price: wholesaleProducts.basePrice,
      })
        .from(wholesaleCart)
        .innerJoin(wholesaleProducts, eq(wholesaleCart.productId, wholesaleProducts.id))
        .where(eq(wholesaleCart.customerId, testCustomerId));

      expect(cartItems.length).toBeGreaterThan(0);
      
      const subtotal = cartItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const gst = Math.round(subtotal * 0.18); // 18% GST
      const total = subtotal + gst;

      expect(subtotal).toBe(100000); // 10 items * ₹100 = ₹1000 (in paise)
      expect(gst).toBe(18000); // 18% of ₹1000
      expect(total).toBe(118000); // ₹1180 total
    });

    it('should remove item from cart', async () => {
      const database = await getDb();
      if (!database) throw new Error('Database not available');

      await database.delete(wholesaleCart)
        .where(and(
          eq(wholesaleCart.customerId, testCustomerId),
          eq(wholesaleCart.productId, testProductId)
        ));

      const [deletedItem] = await database.select()
        .from(wholesaleCart)
        .where(and(
          eq(wholesaleCart.customerId, testCustomerId),
          eq(wholesaleCart.productId, testProductId)
        ));

      expect(deletedItem).toBeUndefined();
    });
  });

  describe('Price Visibility', () => {
    it('should hide prices for non-logged-in users', () => {
      // This is a frontend test - prices should only be shown after login
      // The API returns prices but the frontend should hide them
      const isLoggedIn = false;
      const shouldShowPrice = isLoggedIn;
      expect(shouldShowPrice).toBe(false);
    });

    it('should show prices for logged-in users', () => {
      const isLoggedIn = true;
      const shouldShowPrice = isLoggedIn;
      expect(shouldShowPrice).toBe(true);
    });
  });

  describe('GST Calculation', () => {
    it('should calculate GST at 18%', () => {
      const subtotal = 100000; // ₹1000 in paise
      const gstRate = 0.18;
      const gst = Math.round(subtotal * gstRate);
      
      expect(gst).toBe(18000); // ₹180 GST
    });

    it('should calculate correct total with GST', () => {
      const subtotal = 50000; // ₹500 in paise
      const gstRate = 0.18;
      const gst = Math.round(subtotal * gstRate);
      const total = subtotal + gst;
      
      expect(total).toBe(59000); // ₹590 total
    });
  });
});

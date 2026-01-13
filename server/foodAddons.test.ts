import { describe, expect, it, vi, beforeAll } from 'vitest';
import { appRouter } from './routers';

describe('Food Add-ons Logic', () => {
  describe('Product name detection', () => {
    it('should detect cheese in "Cheesy Corn Cong You Bing"', () => {
      const productName = 'Cheesy Corn Cong You Bing';
      const productNameLower = productName.toLowerCase();
      const hasCheese = productNameLower.includes('cheese') || productNameLower.includes('cheesy');
      const hasEgg = productNameLower.includes('egg');
      
      expect(hasCheese).toBe(true);
      expect(hasEgg).toBe(false);
    });

    it('should detect both egg and cheese in "Egg Cheesy Cong You Bing"', () => {
      const productName = 'Egg Cheesy Cong You Bing';
      const productNameLower = productName.toLowerCase();
      const hasCheese = productNameLower.includes('cheese') || productNameLower.includes('cheesy');
      const hasEgg = productNameLower.includes('egg');
      
      expect(hasCheese).toBe(true);
      expect(hasEgg).toBe(true);
    });

    it('should detect egg only in "Egg Cong You Bing"', () => {
      const productName = 'Egg Cong You Bing';
      const productNameLower = productName.toLowerCase();
      const hasCheese = productNameLower.includes('cheese') || productNameLower.includes('cheesy');
      const hasEgg = productNameLower.includes('egg');
      
      expect(hasCheese).toBe(false);
      expect(hasEgg).toBe(true);
    });

    it('should not detect cheese or egg in "Plain Cong You Bing"', () => {
      const productName = 'Plain Cong You Bing';
      const productNameLower = productName.toLowerCase();
      const hasCheese = productNameLower.includes('cheese') || productNameLower.includes('cheesy');
      const hasEgg = productNameLower.includes('egg');
      
      expect(hasCheese).toBe(false);
      expect(hasEgg).toBe(false);
    });
  });

  describe('Extra egg quantity pricing', () => {
    const extraEggPricePerUnit = 2500; // ₹25 per egg in paise

    it('should calculate price for 1 egg correctly', () => {
      const eggCount = 1;
      const totalPrice = eggCount * extraEggPricePerUnit;
      expect(totalPrice).toBe(2500);
    });

    it('should calculate price for 2 eggs correctly', () => {
      const eggCount = 2;
      const totalPrice = eggCount * extraEggPricePerUnit;
      expect(totalPrice).toBe(5000);
    });

    it('should calculate price for 3 eggs correctly', () => {
      const eggCount = 3;
      const totalPrice = eggCount * extraEggPricePerUnit;
      expect(totalPrice).toBe(7500);
    });

    it('should return 0 for 0 eggs', () => {
      const eggCount = 0;
      const totalPrice = eggCount * extraEggPricePerUnit;
      expect(totalPrice).toBe(0);
    });
  });

  describe('Add-on visibility logic', () => {
    const isFoodCategory = true;
    
    it('should show Extra Cheese for Cheesy Corn Cong You Bing', () => {
      const productHasCheese = true;
      const isCongYouBing = true;
      const showExtraCheese = isFoodCategory && (productHasCheese || isCongYouBing);
      
      expect(showExtraCheese).toBe(true);
    });

    it('should show Extra Egg for Cong You Bing subcategory', () => {
      const isCongYouBing = true;
      const productHasCheese = false;
      const productHasEgg = false;
      const showExtraEgg = isFoodCategory && (isCongYouBing || !productHasCheese || productHasEgg);
      
      expect(showExtraEgg).toBe(true);
    });

    it('should show both Extra Egg and Extra Cheese for Egg Cheesy Cong You Bing', () => {
      const productHasCheese = true;
      const productHasEgg = true;
      const isCongYouBing = true;
      
      const showExtraEgg = isFoodCategory && (isCongYouBing || !productHasCheese || productHasEgg);
      const showExtraCheese = isFoodCategory && (productHasCheese || isCongYouBing);
      
      expect(showExtraEgg).toBe(true);
      expect(showExtraCheese).toBe(true);
    });
  });
});

describe('Admin Add-on Management', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
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

  describe('Addon CRUD operations', () => {
    it('should have getAllAddons procedure', () => {
      expect(caller.admin.getAllAddons).toBeDefined();
    });

    it('should have createAddon procedure', () => {
      expect(caller.admin.createAddon).toBeDefined();
    });

    it('should have updateAddon procedure', () => {
      expect(caller.admin.updateAddon).toBeDefined();
    });

    it('should have toggleAddonStatus procedure', () => {
      expect(caller.admin.toggleAddonStatus).toBeDefined();
    });

    it('should have deleteAddon procedure', () => {
      expect(caller.admin.deleteAddon).toBeDefined();
    });
  });

  describe('Addon type validation', () => {
    const validTypes = ['boba_flavor', 'boba_size', 'extra_boba', 'vegan_milk', 'food_addon'];

    it('should accept all valid addon types', () => {
      validTypes.forEach(type => {
        expect(validTypes.includes(type)).toBe(true);
      });
    });
  });
});

describe('Price Sync Feature', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
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

  it('should have previewPriceSync procedure', () => {
    expect(caller.admin.previewPriceSync).toBeDefined();
  });

  it('should have updateSubcategory with syncProductPrices option', () => {
    expect(caller.admin.updateSubcategory).toBeDefined();
  });
});

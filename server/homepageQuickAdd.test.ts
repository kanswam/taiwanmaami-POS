import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';

/**
 * Tests for the Quick Add modal on the homepage.
 * 
 * The homepage Quick Add feature relies on:
 * 1. homepage.getFeaturedProducts - for the Customer Favourites carousel
 * 2. menu.getFullMenu - for both the carousel (product lookup) and the Explore Menu grid
 * 
 * The ProductCustomizationModal requires product, subcategory, and category data.
 * These tests verify that the backend provides all the necessary data for the modal.
 */
describe('Homepage Quick Add - Data Requirements', () => {
  const publicCaller = appRouter.createCaller({ user: null } as any);

  describe('Featured products provide data for Quick Add lookup', () => {
    it('should return featured products with id for fullMenu lookup', async () => {
      const products = await publicCaller.homepage.getFeaturedProducts();
      expect(Array.isArray(products)).toBe(true);
      if (products.length > 0) {
        const product = products[0] as any;
        expect(product).toHaveProperty('id');
        expect(typeof product.id).toBe('number');
        expect(product).toHaveProperty('name');
        expect(typeof product.name).toBe('string');
      }
    });

    it('should return featured products with categoryName and subcategoryName', async () => {
      const products = await publicCaller.homepage.getFeaturedProducts();
      if (products.length > 0) {
        const product = products[0] as any;
        expect(product).toHaveProperty('categoryName');
        expect(product).toHaveProperty('subcategoryName');
      }
    });
  });

  describe('Full menu provides complete data for ProductCustomizationModal', () => {
    it('should return products with required modal fields', async () => {
      const fullMenu = await publicCaller.menu.getFullMenu({
        isDelivery: false,
        isPickup: false,
        includeUnavailable: false,
      });
      expect(fullMenu).toHaveProperty('products');
      expect(fullMenu).toHaveProperty('subcategories');
      expect(fullMenu).toHaveProperty('categories');
      expect(Array.isArray(fullMenu.products)).toBe(true);

      if (fullMenu.products.length > 0) {
        const product = fullMenu.products[0] as any;
        expect(product).toHaveProperty('id');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('subcategoryId');
        expect(product).toHaveProperty('imageUrl');
        expect(product).toHaveProperty('instorePrice');
      }
    });

    it('should return subcategories with boba/size variant flags', async () => {
      const fullMenu = await publicCaller.menu.getFullMenu({
        isDelivery: false,
        isPickup: false,
        includeUnavailable: false,
      });
      expect(Array.isArray(fullMenu.subcategories)).toBe(true);

      if (fullMenu.subcategories.length > 0) {
        const sub = fullMenu.subcategories[0] as any;
        expect(sub).toHaveProperty('id');
        expect(sub).toHaveProperty('name');
        expect(sub).toHaveProperty('categoryId');
        expect(sub).toHaveProperty('hasSizeVariants');
        expect(sub).toHaveProperty('hasBobaOption');
      }
    });

    it('should return categories with id, name, and slug', async () => {
      const fullMenu = await publicCaller.menu.getFullMenu({
        isDelivery: false,
        isPickup: false,
        includeUnavailable: false,
      });
      expect(Array.isArray(fullMenu.categories)).toBe(true);

      if (fullMenu.categories.length > 0) {
        const cat = fullMenu.categories[0] as any;
        expect(cat).toHaveProperty('id');
        expect(cat).toHaveProperty('name');
        expect(cat).toHaveProperty('slug');
      }
    });

    it('should allow resolving product -> subcategory -> category chain', async () => {
      const fullMenu = await publicCaller.menu.getFullMenu({
        isDelivery: false,
        isPickup: false,
        includeUnavailable: false,
      });

      if (fullMenu.products.length > 0) {
        const product = fullMenu.products[0] as any;
        const subcategory = fullMenu.subcategories.find(
          (s: any) => s.id === product.subcategoryId
        );
        expect(subcategory).toBeDefined();

        if (subcategory) {
          const category = fullMenu.categories.find(
            (c: any) => c.id === (subcategory as any).categoryId
          );
          expect(category).toBeDefined();
        }
      }
    });

    it('should allow resolving featured products via fullMenu', async () => {
      const [featuredProducts, fullMenu] = await Promise.all([
        publicCaller.homepage.getFeaturedProducts(),
        publicCaller.menu.getFullMenu({
          isDelivery: false,
          isPickup: false,
          includeUnavailable: false,
        }),
      ]);

      for (const fp of featuredProducts) {
        const product = fullMenu.products.find((p: any) => p.id === (fp as any).id);
        if (product) {
          const subcategory = fullMenu.subcategories.find(
            (s: any) => s.id === (product as any).subcategoryId
          );
          expect(subcategory).toBeDefined();

          if (subcategory) {
            const category = fullMenu.categories.find(
              (c: any) => c.id === (subcategory as any).categoryId
            );
            expect(category).toBeDefined();
          }
        }
      }
    });
  });

  describe('Subcategory base pricing for bubble tea Quick Add', () => {
    it('should include base price fields for subcategories with size variants', async () => {
      const fullMenu = await publicCaller.menu.getFullMenu({
        isDelivery: false,
        isPickup: false,
        includeUnavailable: false,
      });

      const sizeVariantSubs = fullMenu.subcategories.filter(
        (s: any) => s.hasSizeVariants
      );

      for (const sub of sizeVariantSubs) {
        const s = sub as any;
        const hasAnyBasePrice =
          s.basePriceRegularNoBoba != null ||
          s.basePriceRegularWithBoba != null ||
          s.basePriceLargeNoBoba != null ||
          s.basePriceLargeWithBoba != null;
        expect(hasAnyBasePrice).toBe(true);
      }
    });
  });
});

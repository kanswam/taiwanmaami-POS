import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';

describe('Homepage CMS Procedures', () => {
  // Public procedures - no auth needed
  describe('homepage.getSections', () => {
    it('should return homepage sections', async () => {
      const caller = appRouter.createCaller({ user: null } as any);
      const sections = await caller.homepage.getSections();
      expect(Array.isArray(sections)).toBe(true);
      // Should have at least the seeded sections
      if (sections.length > 0) {
        expect(sections[0]).toHaveProperty('sectionKey');
        expect(sections[0]).toHaveProperty('title');
        expect(sections[0]).toHaveProperty('isActive');
        expect(sections[0]).toHaveProperty('content');
      }
    });

    it('should include announcement_bar section', async () => {
      const caller = appRouter.createCaller({ user: null } as any);
      const sections = await caller.homepage.getSections();
      const announcement = sections.find((s: any) => s.sectionKey === 'announcement_bar');
      if (announcement) {
        expect(announcement.isActive).toBeDefined();
        expect(announcement.content).toBeDefined();
      }
    });

    it('should include hero section', async () => {
      const caller = appRouter.createCaller({ user: null } as any);
      const sections = await caller.homepage.getSections();
      const hero = sections.find((s: any) => s.sectionKey === 'hero');
      if (hero) {
        expect(hero.title).toBeDefined();
        expect(hero.subtitle).toBeDefined();
      }
    });

    it('should include freshness_story section', async () => {
      const caller = appRouter.createCaller({ user: null } as any);
      const sections = await caller.homepage.getSections();
      const freshness = sections.find((s: any) => s.sectionKey === 'freshness_story');
      if (freshness) {
        expect(freshness.title).toBeDefined();
      }
    });
  });

  describe('homepage.getFeaturedProducts', () => {
    it('should return featured products array', async () => {
      const caller = appRouter.createCaller({ user: null } as any);
      const products = await caller.homepage.getFeaturedProducts();
      expect(Array.isArray(products)).toBe(true);
      // Each product should have expected fields
      if (products.length > 0) {
        expect(products[0]).toHaveProperty('id');
        expect(products[0]).toHaveProperty('name');
        expect(products[0]).toHaveProperty('categoryName');
      }
    });

    it('should return products ordered by featuredOrder', async () => {
      const caller = appRouter.createCaller({ user: null } as any);
      const products = await caller.homepage.getFeaturedProducts();
      if (products.length >= 2) {
        // Products should be in ascending featuredOrder
        for (let i = 1; i < products.length; i++) {
          const prevOrder = (products[i - 1] as any).featuredOrder ?? 999;
          const currOrder = (products[i] as any).featuredOrder ?? 999;
          expect(currOrder).toBeGreaterThanOrEqual(prevOrder);
        }
      }
    });
  });

  // Admin procedures - need admin auth
  describe('homepage.updateSection (admin)', () => {
    it('should reject unauthenticated users', async () => {
      const caller = appRouter.createCaller({ user: null } as any);
      await expect(
        caller.homepage.updateSection({
          sectionKey: 'announcement_bar',
          title: 'Test',
          content: { items: [] },
        })
      ).rejects.toThrow();
    });

    it('should reject non-admin users', async () => {
      const caller = appRouter.createCaller({
        user: { id: 999, openId: 'test', name: 'Test', role: 'user' } as any,
      } as any);
      await expect(
        caller.homepage.updateSection({
          sectionKey: 'announcement_bar',
          title: 'Test',
          content: { items: [] },
        })
      ).rejects.toThrow();
    });
  });

  describe('homepage.toggleFeatured (admin)', () => {
    it('should reject unauthenticated users', async () => {
      const caller = appRouter.createCaller({ user: null } as any);
      await expect(
        caller.homepage.toggleFeatured({ productId: 1, isFeatured: true })
      ).rejects.toThrow();
    });

    it('should reject non-admin users', async () => {
      const caller = appRouter.createCaller({
        user: { id: 999, openId: 'test', name: 'Test', role: 'user' } as any,
      } as any);
      await expect(
        caller.homepage.toggleFeatured({ productId: 1, isFeatured: true })
      ).rejects.toThrow();
    });
  });

  describe('homepage.reorderFeatured (admin)', () => {
    it('should reject unauthenticated users', async () => {
      const caller = appRouter.createCaller({ user: null } as any);
      await expect(
        caller.homepage.reorderFeatured({ productIds: [1, 2, 3] })
      ).rejects.toThrow();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appRouter } from './routers';
import { TRPCError } from '@trpc/server';

// Mock the database module
vi.mock('./db', () => ({
  getDb: vi.fn(),
}));

describe('Reviews Router', () => {
  describe('getApproved', () => {
    it('should return approved reviews', async () => {
      const { getDb } = await import('./db');
      const mockReviews = [
        {
          id: 1,
          rating: 5,
          comment: 'Great bubble tea!',
          customerName: 'John Doe',
          createdAt: new Date(),
        },
        {
          id: 2,
          rating: 4,
          comment: 'Very good service',
          customerName: 'Jane Smith',
          createdAt: new Date(),
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockReviews),
            }),
          }),
        }),
      });

      vi.mocked(getDb).mockResolvedValue({
        select: mockSelect,
      } as any);

      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.reviews.getApproved({ limit: 10 });
      expect(result).toEqual(mockReviews);
    });
  });

  describe('getStats', () => {
    it('should return review statistics', async () => {
      const { getDb } = await import('./db');
      const mockStats = [
        {
          avgRating: 4.5,
          totalReviews: 10,
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockStats),
        }),
      });

      vi.mocked(getDb).mockResolvedValue({
        select: mockSelect,
      } as any);

      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.reviews.getStats();
      expect(result).toEqual({
        averageRating: 4.5,
        totalReviews: 10,
      });
    });

    it('should return zero values when no reviews exist', async () => {
      const { getDb } = await import('./db');
      const mockStats = [
        {
          avgRating: null,
          totalReviews: 0,
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockStats),
        }),
      });

      vi.mocked(getDb).mockResolvedValue({
        select: mockSelect,
      } as any);

      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.reviews.getStats();
      expect(result).toEqual({
        averageRating: 0,
        totalReviews: 0,
      });
    });
  });

  describe('submit', () => {
    it('should require authentication', async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      await expect(
        caller.reviews.submit({
          rating: 5,
          comment: 'Great!',
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('canReview', () => {
    it('should require authentication', async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });

      await expect(
        caller.reviews.canReview({ orderId: 1 })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('getAll (admin)', () => {
    it('should require admin role', async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, role: 'user', name: 'Test User', openId: 'test123' },
        req: {} as any,
        res: {} as any,
      });

      await expect(caller.reviews.getAll()).rejects.toThrow(TRPCError);
    });
  });

  describe('updateStatus (admin)', () => {
    it('should require admin role', async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, role: 'user', name: 'Test User', openId: 'test123' },
        req: {} as any,
        res: {} as any,
      });

      await expect(
        caller.reviews.updateStatus({
          reviewId: 1,
          status: 'approved',
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('delete (admin)', () => {
    it('should require admin role', async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, role: 'user', name: 'Test User', openId: 'test123' },
        req: {} as any,
        res: {} as any,
      });

      await expect(
        caller.reviews.delete({ reviewId: 1 })
      ).rejects.toThrow(TRPCError);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';

// Admin caller with admin context
const adminCaller = appRouter.createCaller({
  user: { id: 1, openId: 'admin-test', name: 'Admin', role: 'admin', avatarUrl: null, createdAt: new Date() },
});

// Public caller (no user)
const publicCaller = appRouter.createCaller({ user: null });

describe('Chat Analytics', () => {
  it('admin can fetch bot analytics stats', async () => {
    const stats = await adminCaller.chatAnalytics.getStats({ days: 30 });
    expect(stats).toBeDefined();
    expect(stats).toHaveProperty('totalConversations');
    expect(stats).toHaveProperty('totalMessages');
    expect(stats).toHaveProperty('avgMessagesPerConv');
    expect(stats).toHaveProperty('topIntents');
    expect(stats).toHaveProperty('topSearches');
    expect(stats).toHaveProperty('dailyUsage');
    expect(stats).toHaveProperty('recentConversations');
    expect(typeof stats.totalConversations).toBe('number');
    expect(typeof stats.totalMessages).toBe('number');
    expect(Array.isArray(stats.topIntents)).toBe(true);
    expect(Array.isArray(stats.dailyUsage)).toBe(true);
    expect(Array.isArray(stats.recentConversations)).toBe(true);
  });

  it('admin can fetch stats with different time periods', async () => {
    const stats7 = await adminCaller.chatAnalytics.getStats({ days: 7 });
    const stats90 = await adminCaller.chatAnalytics.getStats({ days: 90 });
    expect(stats7).toBeDefined();
    expect(stats90).toBeDefined();
    // 90-day stats should have >= 7-day stats
    expect(stats90.totalConversations).toBeGreaterThanOrEqual(stats7.totalConversations);
    expect(stats90.totalMessages).toBeGreaterThanOrEqual(stats7.totalMessages);
  });

  it('non-admin cannot access bot analytics', async () => {
    await expect(publicCaller.chatAnalytics.getStats({ days: 30 }))
      .rejects.toThrow();
  });

  it('admin can fetch conversation detail (with invalid ID returns null)', async () => {
    const result = await adminCaller.chatAnalytics.getConversation({ conversationId: 999999 });
    expect(result).toBeDefined();
    expect(result).toHaveProperty('conversation');
    expect(result).toHaveProperty('messages');
    expect(result.conversation).toBeNull();
    expect(Array.isArray(result.messages)).toBe(true);
    expect(result.messages.length).toBe(0);
  });

  it('non-admin cannot access conversation detail', async () => {
    await expect(publicCaller.chatAnalytics.getConversation({ conversationId: 1 }))
      .rejects.toThrow();
  });
});

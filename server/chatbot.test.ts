import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the LLM module
const mockInvokeLLM = vi.fn();
vi.mock('./_core/llm.js', () => ({
  invokeLLM: (...args: any[]) => mockInvokeLLM(...args),
}));

// Mock the db module
vi.mock('./db.js', () => ({
  getCategories: vi.fn().mockResolvedValue([
    { id: 1, name: 'Iced Beverages', slug: 'bubble-tea', description: 'Refreshing iced drinks' },
    { id: 2, name: 'Food', slug: 'food', description: 'Taiwanese street food' },
    { id: 3, name: 'Hot Beverages', slug: 'coffee', description: 'Hot drinks' },
    { id: 4, name: 'Asian Sweet Bites', slug: 'mochis', description: 'Mochi desserts' },
  ]),
  getSubcategories: vi.fn().mockResolvedValue([
    { id: 1, categoryId: 1, name: 'Milk Tea', description: 'Classic milk teas' },
    { id: 2, categoryId: 2, name: 'Chicken', description: 'Taiwanese chicken' },
    { id: 3, categoryId: 4, name: 'Mochi', description: 'Japanese mochi' },
  ]),
  getProducts: vi.fn().mockImplementation((subId: number) => {
    if (subId === 1) return Promise.resolve([
      { id: 1, name: 'Classic Milk Tea', slug: 'classic-milk-tea', description: 'Traditional Taiwanese milk tea', priceRegular: 250, priceLarge: 350, pricePetite: 180, isActive: true, isFeatured: true, isVegetarian: true, isVegan: false, containsEgg: false, isNonVeg: false, chineseName: '奶茶', hasBoba: true },
    ]);
    if (subId === 2) return Promise.resolve([
      { id: 2, name: 'ChickGozilla', slug: 'chickgozilla', description: 'Crispy Taiwanese fried chicken steak', priceRegular: 450, priceLarge: null, pricePetite: null, isActive: true, isFeatured: true, isVegetarian: false, isVegan: false, containsEgg: false, isNonVeg: true, chineseName: null, hasBoba: false },
    ]);
    if (subId === 3) return Promise.resolve([
      { id: 3, name: 'Mango Mochi', slug: 'mango-mochi', description: 'Fresh mango mochi', priceRegular: 270, priceLarge: null, pricePetite: null, isActive: true, isFeatured: false, isVegetarian: true, isVegan: false, containsEgg: false, isNonVeg: false, chineseName: null, hasBoba: false },
    ]);
    return Promise.resolve([]);
  }),
  getAddons: vi.fn().mockResolvedValue([
    { id: 1, name: 'Extra Boba', price: 40 },
    { id: 2, name: 'Egg', price: 30 },
  ]),
  getCustomizationOptions: vi.fn().mockResolvedValue([
    { id: 1, type: 'sugar', name: '100%' },
    { id: 2, type: 'sugar', name: '50%' },
    { id: 3, type: 'ice', name: 'Regular Ice' },
    { id: 4, type: 'ice', name: 'Less Ice' },
  ]),
}));

import { chatWithBot } from './chatbot.js';

describe('Chatbot - Intent-Based Pre-Fetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Intent Detection', () => {
    it('should detect search_menu intent for product queries', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'We have ChickGozilla!' }, finish_reason: 'stop' }],
      });

      await chatWithBot([{ role: 'user', content: 'Do you have chicken?' }]);

      expect(mockInvokeLLM).toHaveBeenCalledTimes(1);
      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;
      expect(systemPrompt).toContain('MENU SEARCH');
      expect(systemPrompt).toContain('ChickGozilla');
    });

    it('should detect get_popular_items intent', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Our popular items are...' }, finish_reason: 'stop' }],
      });

      await chatWithBot([{ role: 'user', content: "What's popular?" }]);

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;
      expect(systemPrompt).toContain('POPULAR ITEMS');
    });

    it('should detect get_categories intent', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'We have these categories...' }, finish_reason: 'stop' }],
      });

      await chatWithBot([{ role: 'user', content: 'Show me the menu' }]);

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;
      expect(systemPrompt).toContain('MENU CATEGORIES');
    });

    it('should detect get_store_info intent for delivery questions', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'We deliver within 15km!' }, finish_reason: 'stop' }],
      });

      await chatWithBot([{ role: 'user', content: 'Do you deliver to Adyar?' }]);

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;
      expect(systemPrompt).toContain('STORE INFORMATION');
    });

    it('should handle general chat without extra context', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Hello! How can I help?' }, finish_reason: 'stop' }],
      });

      await chatWithBot([{ role: 'user', content: 'Hello!' }]);

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;
      expect(systemPrompt).not.toContain('CONTEXT DATA');
    });

    it('should handle multiple intents in one message', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Our popular tea...' }, finish_reason: 'stop' }],
      });

      await chatWithBot([{ role: 'user', content: 'What is your most popular tea?' }]);

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;
      expect(systemPrompt).toContain('MENU SEARCH');
      expect(systemPrompt).toContain('POPULAR ITEMS');
    });
  });

  describe('Response Handling', () => {
    it('should return the LLM text response', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Here are our popular items!' }, finish_reason: 'stop' }],
      });

      const result = await chatWithBot([{ role: 'user', content: 'Hello' }]);
      expect(result).toBe('Here are our popular items!');
    });

    it('should handle array content responses', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: [{ type: 'text', text: 'Array response' }] }, finish_reason: 'stop' }],
      });

      const result = await chatWithBot([{ role: 'user', content: 'Hello' }]);
      expect(result).toBe('Array response');
    });

    it('should handle LLM errors gracefully', async () => {
      mockInvokeLLM.mockRejectedValueOnce(new Error('LLM API error'));

      const result = await chatWithBot([{ role: 'user', content: 'Hello' }]);
      expect(result).toContain('having trouble');
    });

    it('should handle empty LLM response gracefully', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: '' }, finish_reason: 'stop' }],
      });

      const result = await chatWithBot([{ role: 'user', content: 'Hello' }]);
      expect(result).toContain('trouble processing');
    });

    it('should preserve conversation history in LLM call', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Follow up response' }, finish_reason: 'stop' }],
      });

      await chatWithBot([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'Thanks' },
      ]);

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      // system + 3 conversation messages
      expect(callArgs.messages).toHaveLength(4);
      expect(callArgs.messages[1].content).toBe('Hello');
      expect(callArgs.messages[2].content).toBe('Hi there!');
      expect(callArgs.messages[3].content).toBe('Thanks');
    });

    it('should not pass tools to the LLM (intent-based approach)', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
      });

      await chatWithBot([{ role: 'user', content: 'Hello' }]);

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      expect(callArgs.tools).toBeUndefined();
    });
  });

  describe('Search Query Extraction', () => {
    it('should find chicken products when searching for chicken', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'We have chicken!' }, finish_reason: 'stop' }],
      });

      await chatWithBot([{ role: 'user', content: 'Do you have chicken?' }]);

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;
      expect(systemPrompt).toContain('ChickGozilla');
    });

    it('should find mochi products when searching for mochi', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'We have mochi!' }, finish_reason: 'stop' }],
      });

      await chatWithBot([{ role: 'user', content: 'Tell me about your mochi' }]);

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;
      expect(systemPrompt).toContain('Mango Mochi');
    });
  });
});

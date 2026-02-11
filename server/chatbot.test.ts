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
      { id: 1, name: 'Classic Milk Tea', slug: 'classic-milk-tea', description: 'Traditional Taiwanese milk tea', imageUrl: 'https://res.cloudinary.com/test/milk-tea.jpg', priceRegular: 250, priceLarge: 350, pricePetite: 180, isActive: true, isFeatured: true, isVegetarian: true, isVegan: false, containsEgg: false, isNonVeg: false, chineseName: '奶茶', hasBoba: true },
    ]);
    if (subId === 2) return Promise.resolve([
      { id: 2, name: 'ChickGozilla', slug: 'chickgozilla', description: 'Crispy Taiwanese fried chicken steak', imageUrl: 'https://res.cloudinary.com/test/chicken.jpg', priceRegular: 450, priceLarge: null, pricePetite: null, isActive: true, isFeatured: true, isVegetarian: false, isVegan: false, containsEgg: false, isNonVeg: true, chineseName: null, hasBoba: false },
    ]);
    if (subId === 3) return Promise.resolve([
      { id: 3, name: 'Mango Mochi', slug: 'mango-mochi', description: 'Fresh mango mochi', imageUrl: 'https://res.cloudinary.com/test/mochi.jpg', priceRegular: 270, priceLarge: null, pricePetite: null, isActive: true, isFeatured: false, isVegetarian: true, isVegan: false, containsEgg: false, isNonVeg: false, chineseName: null, hasBoba: false },
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
  getDb: vi.fn().mockResolvedValue(null), // For workshop/blog queries that use getDb
}));

// Mock drizzle schema imports (for workshops/blog fetchers)
vi.mock('../drizzle/schema.js', () => ({
  workshops: {},
  workshopDates: {},
  blogArticles: {},
}));

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  asc: vi.fn(),
  desc: vi.fn(),
}));

import { chatWithBot, type ChatbotResponse } from './chatbot.js';

describe('Chatbot - Enhanced with Rich Cards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Response Shape', () => {
    it('should return ChatbotResponse with reply and cards', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Hello! How can I help?' }, finish_reason: 'stop' }],
      });

      const result: ChatbotResponse = await chatWithBot([{ role: 'user', content: 'Hello!' }]);
      expect(result).toHaveProperty('reply');
      expect(result).toHaveProperty('cards');
      expect(typeof result.reply).toBe('string');
      expect(Array.isArray(result.cards)).toBe(true);
    });

    it('should return empty cards for general chat', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Hello!' }, finish_reason: 'stop' }],
      });

      const result = await chatWithBot([{ role: 'user', content: 'Hello!' }]);
      expect(result.cards).toHaveLength(0);
    });
  });

  describe('Intent Detection', () => {
    it('should detect search_menu intent and return product cards', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'We have ChickGozilla!' }, finish_reason: 'stop' }],
      });

      const result = await chatWithBot([{ role: 'user', content: 'Do you have chicken?' }]);

      // Check LLM was called with search context
      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;
      expect(systemPrompt).toContain('MENU SEARCH');
      expect(systemPrompt).toContain('ChickGozilla');

      // Check product cards are returned
      expect(result.cards.length).toBeGreaterThan(0);
      const productCards = result.cards.filter(c => c.type === 'product');
      expect(productCards.length).toBeGreaterThan(0);
      expect(productCards[0]).toHaveProperty('imageUrl');
      expect(productCards[0]).toHaveProperty('name');
      expect(productCards[0]).toHaveProperty('priceRegular');
    });

    it('should return product cards with imageUrl for menu search', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Here is our milk tea!' }, finish_reason: 'stop' }],
      });

      const result = await chatWithBot([{ role: 'user', content: 'Show me milk tea' }]);

      const productCards = result.cards.filter(c => c.type === 'product');
      expect(productCards.length).toBeGreaterThan(0);
      const milkTeaCard = productCards.find((c: any) => c.name === 'Classic Milk Tea');
      expect(milkTeaCard).toBeDefined();
      expect(milkTeaCard!.imageUrl).toContain('cloudinary');
    });

    it('should detect get_popular_items intent and return product cards', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Our popular items are...' }, finish_reason: 'stop' }],
      });

      const result = await chatWithBot([{ role: 'user', content: "What's popular?" }]);

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;
      expect(systemPrompt).toContain('POPULAR ITEMS');

      // Should have product cards
      const productCards = result.cards.filter(c => c.type === 'product');
      expect(productCards.length).toBeGreaterThan(0);
    });

    it('should detect get_categories intent and return category link cards', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'We have these categories...' }, finish_reason: 'stop' }],
      });

      const result = await chatWithBot([{ role: 'user', content: 'Show me the menu' }]);

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;
      expect(systemPrompt).toContain('MENU CATEGORIES');

      // Should have category link cards
      const categoryCards = result.cards.filter(c => c.type === 'category_link');
      expect(categoryCards.length).toBe(4);
      expect(categoryCards[0]).toHaveProperty('link');
      expect(categoryCards[0].link).toContain('/menu?category=');
    });

    it('should detect get_store_info intent', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'We deliver within 15km!' }, finish_reason: 'stop' }],
      });

      const result = await chatWithBot([{ role: 'user', content: 'Do you deliver to Adyar?' }]);

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;
      expect(systemPrompt).toContain('STORE INFORMATION');
      // Store info doesn't generate cards
      expect(result.cards).toHaveLength(0);
    });

    it('should detect workshop intent', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'We have workshops!' }, finish_reason: 'stop' }],
      });

      const result = await chatWithBot([{ role: 'user', content: 'Any upcoming workshops?' }]);

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;
      expect(systemPrompt).toContain('WORKSHOPS');
    });

    it('should detect blog intent', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Check out our blog!' }, finish_reason: 'stop' }],
      });

      const result = await chatWithBot([{ role: 'user', content: 'Tell me the history of bubble tea' }]);

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;
      expect(systemPrompt).toContain('BLOG');
    });

    it('should detect biang biang workshop query', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'The Biang Biang workshop...' }, finish_reason: 'stop' }],
      });

      const result = await chatWithBot([{ role: 'user', content: 'Tell me about the biang biang workshop' }]);

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;
      expect(systemPrompt).toContain('WORKSHOPS');
    });

    it('should handle general chat without extra context', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Hello! How can I help?' }, finish_reason: 'stop' }],
      });

      const result = await chatWithBot([{ role: 'user', content: 'Hello!' }]);

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;
      expect(systemPrompt).not.toContain('CONTEXT DATA');
      expect(result.cards).toHaveLength(0);
    });

    it('should handle multiple intents in one message', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Our popular tea...' }, finish_reason: 'stop' }],
      });

      const result = await chatWithBot([{ role: 'user', content: 'What is your most popular tea?' }]);

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;
      expect(systemPrompt).toContain('MENU SEARCH');
      expect(systemPrompt).toContain('POPULAR ITEMS');

      // Should have product cards from both intents (deduplicated by the LLM)
      expect(result.cards.length).toBeGreaterThan(0);
    });
  });

  describe('Product Card Data', () => {
    it('should include imageUrl in product cards', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Here are our chicken items!' }, finish_reason: 'stop' }],
      });

      const result = await chatWithBot([{ role: 'user', content: 'Show me chicken' }]);

      const productCards = result.cards.filter(c => c.type === 'product');
      expect(productCards.length).toBeGreaterThan(0);
      const chickenCard = productCards.find((c: any) => c.name === 'ChickGozilla');
      expect(chickenCard).toBeDefined();
      expect(chickenCard!.imageUrl).toBe('https://res.cloudinary.com/test/chicken.jpg');
      expect(chickenCard!.isNonVeg).toBe(true);
      expect(chickenCard!.category).toBe('Food');
      expect(chickenCard!.categorySlug).toBe('food');
    });

    it('should include category and subcategory for menu navigation', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Mochi!' }, finish_reason: 'stop' }],
      });

      const result = await chatWithBot([{ role: 'user', content: 'Tell me about your mochi' }]);

      const productCards = result.cards.filter(c => c.type === 'product');
      const mochiCard = productCards.find((c: any) => c.name === 'Mango Mochi');
      expect(mochiCard).toBeDefined();
      expect(mochiCard!.category).toBe('Asian Sweet Bites');
      expect(mochiCard!.subcategory).toBe('Mochi');
    });
  });

  describe('Response Handling', () => {
    it('should return the LLM text response in reply field', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Here are our popular items!' }, finish_reason: 'stop' }],
      });

      const result = await chatWithBot([{ role: 'user', content: 'Hello' }]);
      expect(result.reply).toBe('Here are our popular items!');
    });

    it('should handle array content responses', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: [{ type: 'text', text: 'Array response' }] }, finish_reason: 'stop' }],
      });

      const result = await chatWithBot([{ role: 'user', content: 'Hello' }]);
      expect(result.reply).toBe('Array response');
    });

    it('should handle LLM errors gracefully', async () => {
      mockInvokeLLM.mockRejectedValueOnce(new Error('LLM API error'));

      const result = await chatWithBot([{ role: 'user', content: 'Hello' }]);
      expect(result.reply).toContain('having trouble');
      expect(result.cards).toHaveLength(0);
    });

    it('should handle empty LLM response gracefully', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: '' }, finish_reason: 'stop' }],
      });

      const result = await chatWithBot([{ role: 'user', content: 'Hello' }]);
      expect(result.reply).toContain('trouble processing');
      expect(result.cards).toHaveLength(0);
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

      const result = await chatWithBot([{ role: 'user', content: 'Do you have chicken?' }]);

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;
      expect(systemPrompt).toContain('ChickGozilla');

      // Verify cards include the chicken product with image
      const productCards = result.cards.filter(c => c.type === 'product');
      expect(productCards.some((c: any) => c.name === 'ChickGozilla')).toBe(true);
    });

    it('should find mochi products when searching for mochi', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'We have mochi!' }, finish_reason: 'stop' }],
      });

      const result = await chatWithBot([{ role: 'user', content: 'Tell me about your mochi' }]);

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;
      expect(systemPrompt).toContain('Mango Mochi');

      // Verify cards include the mochi product with image
      const productCards = result.cards.filter(c => c.type === 'product');
      expect(productCards.some((c: any) => c.name === 'Mango Mochi')).toBe(true);
    });
  });

  describe('System Prompt Enhancement', () => {
    it('should include action-oriented guidance in system prompt', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
      });

      await chatWithBot([{ role: 'user', content: 'Hello' }]);

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;
      expect(systemPrompt).toContain('Action-Oriented');
      expect(systemPrompt).toContain('workshop');
      expect(systemPrompt).toContain('blog');
    });

    it('should instruct LLM that product cards are shown automatically', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Here is milk tea!' }, finish_reason: 'stop' }],
      });

      await chatWithBot([{ role: 'user', content: 'Show me milk tea' }]);

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;
      expect(systemPrompt).toContain('Use ONLY the data provided in the context sections below');
    });
  });
});

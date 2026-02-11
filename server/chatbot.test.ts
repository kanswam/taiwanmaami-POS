import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the LLM module before importing chatbot
vi.mock('./_core/llm.js', () => ({
  invokeLLM: vi.fn(),
}));

// Mock the db module
vi.mock('./db.js', () => ({
  getCategories: vi.fn().mockResolvedValue([
    { id: 1, name: 'Iced Beverages', slug: 'iced-beverages', description: 'Cold drinks', displayOrder: 1 },
    { id: 2, name: 'Food', slug: 'food', description: 'Taiwanese food', displayOrder: 2 },
    { id: 3, name: 'Sweet Bites', slug: 'sweet-bites', description: 'Mochis', displayOrder: 3 },
  ]),
  getSubcategories: vi.fn().mockResolvedValue([
    { id: 1, name: 'Black Tea', categoryId: 1, displayOrder: 1 },
    { id: 2, name: 'Green Tea', categoryId: 1, displayOrder: 2 },
    { id: 3, name: 'Chicken', categoryId: 2, displayOrder: 1 },
    { id: 4, name: 'Fruit Mochis', categoryId: 3, displayOrder: 1 },
  ]),
  getProducts: vi.fn().mockImplementation((subcategoryId: number) => {
    const productsBySubcategory: Record<number, any[]> = {
      1: [
        { id: 1, name: 'Classic Milk Tea', slug: 'classic-milk-tea', description: 'Traditional black milk tea with boba', subcategoryId: 1, priceRegular: 250, priceLarge: 350, pricePetite: 180, isVegetarian: true, isVegan: false, containsEgg: false, isNonVeg: false, isActive: true, isFeatured: true, hasBoba: true },
        { id: 2, name: 'Brown Sugar Boba', slug: 'brown-sugar-boba', description: 'Rich brown sugar milk tea', subcategoryId: 1, priceRegular: 280, priceLarge: 380, pricePetite: 200, isVegetarian: true, isVegan: false, containsEgg: false, isNonVeg: false, isActive: true, isFeatured: true, hasBoba: true },
      ],
      2: [
        { id: 3, name: 'Jasmine Green Tea', slug: 'jasmine-green-tea', description: 'Fragrant jasmine green tea', subcategoryId: 2, priceRegular: 220, priceLarge: 320, pricePetite: 160, isVegetarian: true, isVegan: true, containsEgg: false, isNonVeg: false, isActive: true, isFeatured: false, hasBoba: true },
      ],
      3: [
        { id: 4, name: 'Taiwanese Popcorn Chicken', slug: 'taiwanese-popcorn-chicken', description: 'Crispy Taiwanese fried chicken', subcategoryId: 3, priceRegular: 300, priceLarge: null, pricePetite: null, isVegetarian: false, isVegan: false, containsEgg: false, isNonVeg: true, isActive: true, isFeatured: true, hasBoba: false },
      ],
      4: [
        { id: 5, name: 'Mango Mochi', slug: 'mango-mochi', description: 'Fresh mango mochi', subcategoryId: 4, priceRegular: 180, priceLarge: null, pricePetite: null, isVegetarian: true, isVegan: false, containsEgg: false, isNonVeg: false, isActive: true, isFeatured: false, hasBoba: false },
      ],
    };
    return Promise.resolve(productsBySubcategory[subcategoryId] || []);
  }),
  getAddons: vi.fn().mockResolvedValue([
    { id: 1, name: 'Extra Boba', price: 40, type: 'topping' },
    { id: 2, name: 'Coconut Jelly', price: 40, type: 'topping' },
  ]),
  getCustomizationOptions: vi.fn().mockResolvedValue([
    { id: 1, name: '0%', type: 'sugar' },
    { id: 2, name: '25%', type: 'sugar' },
    { id: 3, name: '50%', type: 'sugar' },
    { id: 4, name: '75%', type: 'sugar' },
    { id: 5, name: '100%', type: 'sugar' },
    { id: 6, name: 'No Ice', type: 'ice' },
    { id: 7, name: 'Less Ice', type: 'ice' },
    { id: 8, name: 'Regular Ice', type: 'ice' },
  ]),
}));

import { chatWithBot } from './chatbot';
import { invokeLLM } from './_core/llm.js';

const mockInvokeLLM = invokeLLM as unknown as ReturnType<typeof vi.fn>;

describe('Chatbot Server Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('chatWithBot', () => {
    it('should return a text response for a simple greeting', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{
          message: {
            role: 'assistant',
            content: 'Hi there! Welcome to Taiwan Maami 🧋 How can I help you today?',
          },
          finish_reason: 'stop',
        }],
      });

      const result = await chatWithBot([
        { role: 'user', content: 'Hello!' },
      ]);

      expect(result).toBe('Hi there! Welcome to Taiwan Maami 🧋 How can I help you today?');
      expect(mockInvokeLLM).toHaveBeenCalledTimes(1);
      
      // Verify system prompt is included
      const callArgs = mockInvokeLLM.mock.calls[0][0];
      expect(callArgs.messages[0].role).toBe('system');
      expect(callArgs.messages[0].content).toContain('Maami Bot');
      expect(callArgs.tools).toBeDefined();
      expect(callArgs.tools.length).toBe(5);
    });

    it('should handle tool calls for menu search', async () => {
      // First call returns a tool call
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [{
              id: 'call_1',
              type: 'function',
              function: {
                name: 'search_menu',
                arguments: JSON.stringify({ query: 'chicken' }),
              },
            }],
          },
          finish_reason: 'tool_calls',
        }],
      });

      // Second call returns the final response
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{
          message: {
            role: 'assistant',
            content: 'We have **Taiwanese Popcorn Chicken** (₹300) - crispy Taiwanese fried chicken! Would you like to add it to your order?',
          },
          finish_reason: 'stop',
        }],
      });

      const result = await chatWithBot([
        { role: 'user', content: 'Do you have chicken?' },
      ]);

      expect(result).toContain('Taiwanese Popcorn Chicken');
      expect(mockInvokeLLM).toHaveBeenCalledTimes(2);

      // Verify tool result was passed back
      const secondCallArgs = mockInvokeLLM.mock.calls[1][0];
      const toolMessage = secondCallArgs.messages.find((m: any) => m.role === 'tool');
      expect(toolMessage).toBeDefined();
      expect(toolMessage.tool_call_id).toBe('call_1');
      const toolContent = JSON.parse(toolMessage.content);
      expect(toolContent.found).toBe(true);
    });

    it('should handle get_categories tool call', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [{
              id: 'call_2',
              type: 'function',
              function: {
                name: 'get_categories',
                arguments: '{}',
              },
            }],
          },
          finish_reason: 'tool_calls',
        }],
      });

      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{
          message: {
            role: 'assistant',
            content: 'We have 3 categories: Iced Beverages, Food, and Sweet Bites!',
          },
          finish_reason: 'stop',
        }],
      });

      const result = await chatWithBot([
        { role: 'user', content: 'What categories do you have?' },
      ]);

      expect(result).toContain('categories');
      expect(mockInvokeLLM).toHaveBeenCalledTimes(2);
    });

    it('should handle get_product_details tool call', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [{
              id: 'call_3',
              type: 'function',
              function: {
                name: 'get_product_details',
                arguments: JSON.stringify({ productName: 'Classic Milk Tea' }),
              },
            }],
          },
          finish_reason: 'tool_calls',
        }],
      });

      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{
          message: {
            role: 'assistant',
            content: '**Classic Milk Tea** - Petite ₹180 | Regular ₹250 | Large ₹350. You can customize sugar and ice levels!',
          },
          finish_reason: 'stop',
        }],
      });

      const result = await chatWithBot([
        { role: 'user', content: 'Tell me about the Classic Milk Tea' },
      ]);

      expect(result).toContain('Classic Milk Tea');
      expect(mockInvokeLLM).toHaveBeenCalledTimes(2);

      // Verify product details were returned with customization options
      const secondCallArgs = mockInvokeLLM.mock.calls[1][0];
      const toolMessage = secondCallArgs.messages.find((m: any) => m.role === 'tool');
      const toolContent = JSON.parse(toolMessage.content);
      expect(toolContent.found).toBe(true);
      expect(toolContent.product.name).toBe('Classic Milk Tea');
      expect(toolContent.product.prices.regular).toBe(250);
      expect(toolContent.customizations.sugarLevels).toContain('0%');
      expect(toolContent.customizations.iceLevels).toContain('No Ice');
    });

    it('should handle get_store_info tool call', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [{
              id: 'call_4',
              type: 'function',
              function: {
                name: 'get_store_info',
                arguments: JSON.stringify({ topic: 'delivery' }),
              },
            }],
          },
          finish_reason: 'tool_calls',
        }],
      });

      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{
          message: {
            role: 'assistant',
            content: 'We deliver within 15km! Flat ₹100 delivery fee, free on orders above ₹2500.',
          },
          finish_reason: 'stop',
        }],
      });

      const result = await chatWithBot([
        { role: 'user', content: 'Do you deliver?' },
      ]);

      expect(result).toContain('deliver');
    });

    it('should handle get_popular_items tool call', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [{
              id: 'call_5',
              type: 'function',
              function: {
                name: 'get_popular_items',
                arguments: JSON.stringify({ count: 3 }),
              },
            }],
          },
          finish_reason: 'tool_calls',
        }],
      });

      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{
          message: {
            role: 'assistant',
            content: 'Our top picks: Classic Milk Tea, Brown Sugar Boba, and Taiwanese Popcorn Chicken!',
          },
          finish_reason: 'stop',
        }],
      });

      const result = await chatWithBot([
        { role: 'user', content: "What's popular?" },
      ]);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should limit tool call rounds to prevent infinite loops', async () => {
      // Simulate 4 consecutive tool calls (should stop at 3)
      for (let i = 0; i < 4; i++) {
        mockInvokeLLM.mockResolvedValueOnce({
          choices: [{
            message: {
              role: 'assistant',
              content: i === 3 ? 'Final answer' : '',
              tool_calls: i < 3 ? [{
                id: `call_loop_${i}`,
                type: 'function',
                function: {
                  name: 'get_categories',
                  arguments: '{}',
                },
              }] : undefined,
            },
            finish_reason: i < 3 ? 'tool_calls' : 'stop',
          }],
        });
      }

      const result = await chatWithBot([
        { role: 'user', content: 'test' },
      ]);

      // Should have called LLM at most 4 times (1 initial + 3 tool rounds)
      expect(mockInvokeLLM).toHaveBeenCalledTimes(4);
    });

    it('should handle array content in response', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{
          message: {
            role: 'assistant',
            content: [
              { type: 'text', text: 'Hello from ' },
              { type: 'text', text: 'Taiwan Maami!' },
            ],
          },
          finish_reason: 'stop',
        }],
      });

      const result = await chatWithBot([
        { role: 'user', content: 'Hi' },
      ]);

      expect(result).toBe('Hello from \nTaiwan Maami!');
    });

    it('should handle empty/null content gracefully', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{
          message: {
            role: 'assistant',
            content: null,
          },
          finish_reason: 'stop',
        }],
      });

      const result = await chatWithBot([
        { role: 'user', content: 'Hi' },
      ]);

      expect(result).toBe('Sorry, I had trouble processing that. Could you try again?');
    });

    it('should maintain conversation history', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{
          message: {
            role: 'assistant',
            content: 'Sure, here are our teas!',
          },
          finish_reason: 'stop',
        }],
      });

      await chatWithBot([
        { role: 'user', content: 'Show me teas' },
        { role: 'assistant', content: 'We have many teas!' },
        { role: 'user', content: 'Tell me more about the first one' },
      ]);

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      // System prompt + user/assistant messages
      expect(callArgs.messages.length).toBeGreaterThanOrEqual(2);
      // Verify the system prompt is first
      expect(callArgs.messages[0].role).toBe('system');
      // Verify conversation messages are included
      const nonSystemMessages = callArgs.messages.filter((m: any) => m.role !== 'system');
      expect(nonSystemMessages.length).toBe(3);
      expect(nonSystemMessages[0].content).toBe('Show me teas');
      expect(nonSystemMessages[1].content).toBe('We have many teas!');
      expect(nonSystemMessages[2].content).toBe('Tell me more about the first one');
    });

    it('should search menu with no results gracefully', async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [{
              id: 'call_noresult',
              type: 'function',
              function: {
                name: 'search_menu',
                arguments: JSON.stringify({ query: 'pizza' }),
              },
            }],
          },
          finish_reason: 'tool_calls',
        }],
      });

      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{
          message: {
            role: 'assistant',
            content: "Sorry, we don't have pizza. But we have amazing Taiwanese food!",
          },
          finish_reason: 'stop',
        }],
      });

      const result = await chatWithBot([
        { role: 'user', content: 'Do you have pizza?' },
      ]);

      // Verify the bot responded (the actual search might find partial matches)
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(mockInvokeLLM).toHaveBeenCalled();
    });
  });
});

import { invokeLLM, type Message } from './_core/llm.js';
import * as db from './db.js';

// ─── Data Fetchers ─────────────────────────────────────────────────────────

async function searchMenu(query: string): Promise<any[]> {
  const categories = await db.getCategories();
  const subcategories = await db.getSubcategories();

  const allProducts: any[] = [];
  for (const sub of subcategories) {
    const products = await db.getProducts(sub.id);
    for (const p of products) {
      allProducts.push({
        ...p,
        subcategoryName: sub.name,
        categoryName: categories.find(c => c.id === sub.categoryId)?.name || '',
        categorySlug: categories.find(c => c.id === sub.categoryId)?.slug || '',
      });
    }
  }

  // Split query into words and match any word
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (queryWords.length === 0) return [];

  const results = allProducts.filter(p => {
    const searchable = [
      p.name, p.description, p.subcategoryName, p.categoryName, p.chineseName
    ].filter(Boolean).join(' ').toLowerCase();
    return queryWords.some(word => searchable.includes(word));
  });

  return results.slice(0, 10).map(p => ({
    name: p.name,
    chineseName: p.chineseName || null,
    description: p.description || null,
    category: p.categoryName,
    subcategory: p.subcategoryName,
    priceRegular: p.priceRegular,
    priceLarge: p.priceLarge,
    pricePetite: p.pricePetite,
    isVegetarian: p.isVegetarian,
    isVegan: p.isVegan,
    containsEgg: p.containsEgg,
    isNonVeg: p.isNonVeg,
    slug: p.slug,
  }));
}

async function getCategories(): Promise<any[]> {
  const categories = await db.getCategories();
  const subcategories = await db.getSubcategories();
  return categories.map(cat => ({
    name: cat.name,
    description: cat.description,
    subcategories: subcategories
      .filter(sub => sub.categoryId === cat.id)
      .map(sub => ({ name: sub.name, description: sub.description })),
  }));
}

async function getPopularItems(): Promise<any[]> {
  const categories = await db.getCategories();
  const subcategories = await db.getSubcategories();

  const allProducts: any[] = [];
  for (const sub of subcategories) {
    const products = await db.getProducts(sub.id);
    for (const p of products) {
      if (p.isActive) {
        allProducts.push({
          ...p,
          subcategoryName: sub.name,
          categoryName: categories.find(c => c.id === sub.categoryId)?.name || '',
        });
      }
    }
  }

  const featured = allProducts.filter(p => p.isFeatured);
  const popular = featured.length >= 5
    ? featured.slice(0, 5)
    : [...featured, ...allProducts.filter(p => !p.isFeatured).slice(0, 5 - featured.length)];

  return popular.map(p => ({
    name: p.name,
    description: p.description,
    category: p.categoryName,
    subcategory: p.subcategoryName,
    priceRegular: p.priceRegular,
    priceLarge: p.priceLarge,
    isVegetarian: p.isVegetarian,
    isNonVeg: p.isNonVeg,
    slug: p.slug,
  }));
}

function getStoreInfo(): Record<string, any> {
  return {
    locations: {
      stores: [
        {
          name: 'Taiwan Maami - T. Nagar',
          address: '64, G N Chetty Rd, T. Nagar, Chennai, Tamil Nadu 600017',
          phone: '+91 91505 70557',
          mapLink: 'https://maps.google.com/?q=Taiwan+Maami+T+Nagar',
        },
        {
          name: 'Taiwan Maami - Velachery (Palladium)',
          address: 'Palladium Mall, 1, Velachery Main Rd, Velachery, Chennai, Tamil Nadu 600042',
          phone: '+91 91505 70557',
          mapLink: 'https://maps.google.com/?q=Taiwan+Maami+Velachery',
        },
      ],
    },
    hours: {
      message: 'Our stores are typically open from 11:00 AM to 10:00 PM, 7 days a week. Hours may vary on holidays. Please call the store to confirm.',
    },
    delivery: {
      message: 'We offer delivery within a 15km radius of our stores. Flat delivery fee of ₹100 on all orders. Free delivery on orders above ₹2500. You can order through our website for delivery or pickup.',
      minimumOrder: 'No minimum order for delivery.',
      paymentOptions: ['Online Payment (Razorpay)', 'Cash at Pickup (for pickup orders only)'],
    },
    promotions: {
      current: [
        { code: 'BOBALOVE10', description: '10% off your first order' },
        { description: 'Free delivery on orders above ₹2500' },
        { description: '₹100 flat delivery within our delivery zone' },
      ],
    },
    loyalty: {
      program: 'Digital Stamp Card - Collect 10 stamps and get 1 FREE large bubble tea!',
      howItWorks: 'Every bubble tea purchase earns you a stamp. After 10 stamps, your next bubble tea is on us! The free drink is automatically applied at checkout.',
    },
    allergens: {
      message: 'Our products may contain milk, soy, gluten, eggs, and nuts. Mochi products contain glutinous rice flour. Our chicken products are Non-Veg. Please check individual product labels for dietary information (Vegetarian, Vegan, Contains Egg, Non-Veg). If you have specific allergies, please inform our staff.',
    },
    general: {
      about: 'Taiwan Maami is Chennai\'s premier Taiwanese bubble tea and street food destination. We serve authentic Taiwanese beverages including bubble tea, oolong tea, matcha, taro drinks, and traditional Asian street food and mochis. We have two locations in Chennai - T. Nagar and Velachery (Palladium Mall).',
      website: 'https://www.taiwanmaami.com',
    },
  };
}

// ─── Intent Detection ──────────────────────────────────────────────────────

type Intent = 'search_menu' | 'get_categories' | 'get_popular_items' | 'get_store_info' | 'general_chat';

function detectIntents(userMessage: string): Intent[] {
  const msg = userMessage.toLowerCase();
  const intents: Intent[] = [];

  // Search menu intent — specific product/ingredient/flavor mentions
  const searchTerms = [
    'bubble tea', 'boba', 'milk tea', 'oolong', 'matcha', 'taro', 'mango', 'passion',
    'lychee', 'strawberry', 'peach', 'jasmine', 'green tea', 'black tea', 'coffee',
    'latte', 'mochi', 'chicken', 'noodle', 'rice', 'croissant', 'salad', 'sandwich',
    'waffle', 'pancake', 'egg', 'chocolate', 'vanilla', 'caramel', 'oreo', 'cheese',
    'fruit', 'smoothie', 'frappe', 'cold', 'hot', 'iced', 'warm', 'drink', 'food',
    'snack', 'dessert', 'sweet', 'spicy', 'vegan', 'vegetarian', 'non-veg', 'nonveg',
    'falooda', 'kung fu', 'popcorn', 'drumstick', 'cutlet', 'biryani', 'noodles',
    'bread', 'toast', 'tea', 'beverages', 'lavazza',
  ];
  if (searchTerms.some(term => msg.includes(term))) {
    intents.push('search_menu');
  }

  // Popular items intent
  const popularTerms = ['popular', 'best', 'recommend', 'suggestion', 'top', 'favourite', 'favorite', 'must try', 'must-try', 'bestseller', 'best seller', 'what should i', 'what do you suggest'];
  if (popularTerms.some(term => msg.includes(term))) {
    intents.push('get_popular_items');
  }

  // Categories intent
  const categoryTerms = ['menu', 'categories', 'category', 'what do you have', 'what do you serve', 'what\'s available', 'browse', 'options', 'selection', 'full menu', 'show me'];
  if (categoryTerms.some(term => msg.includes(term))) {
    intents.push('get_categories');
  }

  // Store info intent
  const storeTerms = ['location', 'address', 'where', 'hours', 'open', 'close', 'delivery', 'deliver', 'pickup', 'pick up', 'promotion', 'promo', 'discount', 'offer', 'coupon', 'code', 'loyalty', 'stamp', 'reward', 'allergen', 'allergy', 'allergic', 'gluten', 'nut', 'dairy', 'store', 'branch', 'outlet', 'contact', 'phone', 'call'];
  if (storeTerms.some(term => msg.includes(term))) {
    intents.push('get_store_info');
  }

  // Default to general chat if no specific intent detected
  if (intents.length === 0) {
    intents.push('general_chat');
  }

  return intents;
}

function extractSearchQuery(userMessage: string): string {
  const msg = userMessage.toLowerCase();
  // Remove common filler words
  let cleaned = msg.replace(/\b(do you have|can i get|i want|i'd like|show me|what about|tell me about|any|some|the|a|an|is there|are there|looking for|find|search|what|your|most|best|good)\b/g, '').trim();
  // Remove punctuation
  cleaned = cleaned.replace(/[?!.,;:]+/g, '').trim();
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned || userMessage;
}

// ─── System Prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Maami Bot 🧋, the friendly ordering assistant for Taiwan Maami — Chennai's premier Taiwanese bubble tea and street food destination.

## Your Personality
- Warm, friendly, and enthusiastic about Taiwanese food & drinks
- Knowledgeable about bubble tea, mochis, and Taiwanese cuisine
- Helpful but concise — don't overwhelm with too much info at once
- Use occasional food emojis naturally (🧋 🍵 🧁 🍗) but don't overdo it

## What You Can Do
1. **Help customers browse the menu** — search for items, show categories, recommend popular items
2. **Provide product details** — prices, sizes, customization options, dietary info
3. **Guide ordering** — explain how to customize drinks (size, boba, sugar, ice), how to add items to cart
4. **Answer questions** — store locations, hours, delivery info, promotions, loyalty program, allergens

## Important Rules
- Use ONLY the data provided in the context sections below — never make up products or prices
- When showing products, include the price in ₹ (Indian Rupees)
- Sizes are: Petite, Regular, Large (not all products have all sizes)
- For bubble tea: customers can choose sugar level (0%, 25%, 50%, 75%, 100%) and ice level (No Ice, Less Ice, Regular Ice)
- Mochis are sold in pairs (2 pieces) for delivery/pickup
- When a customer seems ready to order, guide them to click on the product in the menu or tell them they can browse the menu page to add items to their cart
- If asked about something you don't know, be honest and suggest they contact the store
- Keep responses SHORT and scannable — use bullet points for lists of products
- When listing products, show name, a brief description, and price range
- Do NOT try to process payments or place orders — guide customers to use the website's ordering system

## Conversation Starters
When greeting, offer 2-3 quick options like:
- Browse our menu categories
- Get recommendations
- Ask about delivery or promotions

## Formatting
- Use **bold** for product names and prices
- Use bullet points for lists
- Keep responses under 200 words unless the customer asks for detailed info`;

// ─── Main Chat Function ────────────────────────────────────────────────────

export async function chatWithBot(
  conversationHistory: Array<{ role: string; content: string }>
): Promise<string> {
  // Get the latest user message for intent detection
  const lastUserMessage = [...conversationHistory].reverse().find(m => m.role === 'user')?.content || '';

  console.log('[Chatbot] User message:', lastUserMessage);

  // Detect intents from the user message
  const intents = detectIntents(lastUserMessage);
  console.log('[Chatbot] Detected intents:', intents);

  // Pre-fetch relevant data based on detected intents
  const contextParts: string[] = [];

  try {
    for (const intent of intents) {
      switch (intent) {
        case 'search_menu': {
          const query = extractSearchQuery(lastUserMessage);
          console.log('[Chatbot] Search query:', query);
          const results = await searchMenu(query);
          if (results.length > 0) {
            contextParts.push(`\n## MENU SEARCH RESULTS for "${query}"\n${JSON.stringify(results, null, 2)}`);
          } else {
            contextParts.push(`\n## MENU SEARCH for "${query}"\nNo products found matching this query. Suggest the customer browse the menu page or try different keywords.`);
          }
          break;
        }
        case 'get_categories': {
          const cats = await getCategories();
          contextParts.push(`\n## MENU CATEGORIES\n${JSON.stringify(cats, null, 2)}`);
          break;
        }
        case 'get_popular_items': {
          const popular = await getPopularItems();
          contextParts.push(`\n## POPULAR ITEMS\n${JSON.stringify(popular, null, 2)}`);
          break;
        }
        case 'get_store_info': {
          const info = getStoreInfo();
          contextParts.push(`\n## STORE INFORMATION\n${JSON.stringify(info, null, 2)}`);
          break;
        }
        case 'general_chat':
          // No extra data needed for general chat
          break;
      }
    }
  } catch (err) {
    console.error('[Chatbot] Error fetching context data:', err);
    // Continue with whatever context we have
  }

  console.log('[Chatbot] Calling LLM with', contextParts.length, 'context parts');

  // Build the system prompt with injected context
  let fullSystemPrompt = SYSTEM_PROMPT;
  if (contextParts.length > 0) {
    fullSystemPrompt += '\n\n# CONTEXT DATA (use this to answer the customer)\n' + contextParts.join('\n');
  }

  // Build messages for LLM (no tools — just direct text response)
  const messages: Message[] = [
    { role: 'system', content: fullSystemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
  ];

  try {
    const response = await invokeLLM({ messages });

    const content = response?.choices?.[0]?.message?.content;
    if (typeof content === 'string' && content.trim().length > 0) {
      return content;
    }
    if (Array.isArray(content)) {
      const text = content
        .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
        .map(c => c.text)
        .join('\n');
      if (text.trim().length > 0) return text;
    }

    console.error('[Chatbot] LLM returned empty content:', JSON.stringify(response?.choices?.[0]?.message));
    return 'Sorry, I had trouble processing that. Could you try asking in a different way?';
  } catch (err) {
    console.error('[Chatbot] LLM invocation error:', err);
    return 'Sorry, I\'m having trouble right now. Please try again in a moment, or browse our menu directly!';
  }
}

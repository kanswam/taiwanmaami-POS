import { invokeLLM, type Message, type Tool, type ToolCall } from './_core/llm.js';
import * as db from './db.js';

// ─── Tool Definitions ───────────────────────────────────────────────────────

const chatbotTools: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'search_menu',
      description: 'Search the Taiwan Maami menu for products matching a query. Use this when the customer asks about specific items, flavors, or types of drinks/food.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search term (e.g., "mango", "black tea", "mochi", "chicken", "coffee")',
          },
          categoryFilter: {
            type: 'string',
            description: 'Optional category filter: "iced-beverages", "hot-beverages", "food", "sweet-bites"',
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_categories',
      description: 'Get all menu categories and subcategories. Use when customer wants to browse the menu or asks what types of items are available.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_product_details',
      description: 'Get detailed information about a specific product including sizes, prices, and available customizations. Use when customer wants to know more about a specific item.',
      parameters: {
        type: 'object',
        properties: {
          productName: {
            type: 'string',
            description: 'The name of the product to look up',
          },
        },
        required: ['productName'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_popular_items',
      description: 'Get the most popular/recommended items from the menu. Use when customer asks for recommendations or what\'s popular.',
      parameters: {
        type: 'object',
        properties: {
          count: {
            type: 'number',
            description: 'Number of items to return (default 5)',
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_store_info',
      description: 'Get store information including locations, hours, delivery info, and promotions. Use when customer asks about store details, delivery, or offers.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            enum: ['locations', 'hours', 'delivery', 'promotions', 'loyalty', 'allergens', 'general'],
            description: 'The topic the customer is asking about',
          },
        },
        required: ['topic'],
        additionalProperties: false,
      },
    },
  },
];

// ─── Tool Handlers ──────────────────────────────────────────────────────────

async function handleSearchMenu(args: { query: string; categoryFilter?: string }): Promise<string> {
  const categories = await db.getCategories();
  const subcategories = await db.getSubcategories();
  
  // Get all products with their subcategory info
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

  // Filter by category if specified
  let filtered = allProducts;
  if (args.categoryFilter) {
    filtered = filtered.filter(p => 
      p.categorySlug?.toLowerCase().includes(args.categoryFilter!.toLowerCase()) ||
      p.categoryName?.toLowerCase().includes(args.categoryFilter!.toLowerCase())
    );
  }

  // Search by query
  const query = args.query.toLowerCase();
  const results = filtered.filter(p =>
    p.name?.toLowerCase().includes(query) ||
    p.description?.toLowerCase().includes(query) ||
    p.subcategoryName?.toLowerCase().includes(query) ||
    p.categoryName?.toLowerCase().includes(query) ||
    p.chineseName?.toLowerCase().includes(query)
  );

  if (results.length === 0) {
    return JSON.stringify({ found: false, message: `No products found matching "${args.query}"` });
  }

  const items = results.slice(0, 10).map(p => ({
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
    isActive: p.isActive,
    slug: p.slug,
  }));

  return JSON.stringify({ found: true, count: results.length, items });
}

async function handleGetCategories(): Promise<string> {
  const categories = await db.getCategories();
  const subcategories = await db.getSubcategories();

  const result = categories.map(cat => ({
    name: cat.name,
    description: cat.description,
    subcategories: subcategories
      .filter(sub => sub.categoryId === cat.id)
      .map(sub => ({ name: sub.name, description: sub.description })),
  }));

  return JSON.stringify(result);
}

async function handleGetProductDetails(args: { productName: string }): Promise<string> {
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
      });
    }
  }

  const query = args.productName.toLowerCase();
  const product = allProducts.find(p => 
    p.name?.toLowerCase().includes(query) ||
    p.slug?.toLowerCase().includes(query)
  );

  if (!product) {
    return JSON.stringify({ found: false, message: `Product "${args.productName}" not found` });
  }

  // Get addons
  const addons = await db.getAddons();
  
  // Get customization options
  const customizations = await db.getCustomizationOptions();

  return JSON.stringify({
    found: true,
    product: {
      name: product.name,
      chineseName: product.chineseName,
      description: product.description,
      category: product.categoryName,
      subcategory: product.subcategoryName,
      prices: {
        petite: product.pricePetite,
        regular: product.priceRegular,
        large: product.priceLarge,
      },
      dietary: {
        vegetarian: product.isVegetarian,
        vegan: product.isVegan,
        containsEgg: product.containsEgg,
        nonVeg: product.isNonVeg,
      },
      hasBoba: product.hasBoba,
      slug: product.slug,
    },
    customizations: {
      sugarLevels: customizations.filter((c: any) => c.type === 'sugar').map((c: any) => c.name),
      iceLevels: customizations.filter((c: any) => c.type === 'ice').map((c: any) => c.name),
      addons: addons.slice(0, 8).map((a: any) => ({ name: a.name, price: a.price })),
    },
  });
}

async function handleGetPopularItems(args: { count?: number }): Promise<string> {
  const count = args.count || 5;
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

  // Pick featured/popular items (prioritize those with isFeatured flag, then random selection)
  const featured = allProducts.filter(p => p.isFeatured);
  const popular = featured.length >= count 
    ? featured.slice(0, count)
    : [...featured, ...allProducts.filter(p => !p.isFeatured).slice(0, count - featured.length)];

  const items = popular.slice(0, count).map(p => ({
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

  return JSON.stringify({ items });
}

function handleGetStoreInfo(args: { topic: string }): string {
  const info: Record<string, any> = {
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

  return JSON.stringify(info[args.topic] || info.general);
}

// ─── Tool Call Executor ─────────────────────────────────────────────────────

async function executeToolCall(toolCall: ToolCall): Promise<string> {
  const args = JSON.parse(toolCall.function.arguments);
  
  switch (toolCall.function.name) {
    case 'search_menu':
      return handleSearchMenu(args);
    case 'get_categories':
      return handleGetCategories();
    case 'get_product_details':
      return handleGetProductDetails(args);
    case 'get_popular_items':
      return handleGetPopularItems(args);
    case 'get_store_info':
      return handleGetStoreInfo(args);
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolCall.function.name}` });
  }
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
- ALWAYS use the tools to look up real menu data — never make up products or prices
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

// ─── Main Chat Function ─────────────────────────────────────────────────────

export async function chatWithBot(
  conversationHistory: Array<{ role: string; content: string }>
): Promise<string> {
  // Build messages array with system prompt
  const messages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
  ];

  // First LLM call — may return tool calls
  let response = await invokeLLM({
    messages,
    tools: chatbotTools,
    tool_choice: 'auto',
  });

  let assistantMessage = response.choices[0]?.message;

  // Handle tool calls (up to 3 rounds to prevent infinite loops)
  let rounds = 0;
  while (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0 && rounds < 3) {
    rounds++;

    // Add assistant message with tool calls to conversation
    messages.push({
      role: 'assistant',
      content: assistantMessage.content || '',
    });

    // Execute each tool call and add results
    for (const toolCall of assistantMessage.tool_calls) {
      const toolResult = await executeToolCall(toolCall);
      messages.push({
        role: 'tool',
        content: toolResult,
        tool_call_id: toolCall.id,
      });
    }

    // Call LLM again with tool results
    response = await invokeLLM({
      messages,
      tools: chatbotTools,
      tool_choice: 'auto',
    });

    assistantMessage = response.choices[0]?.message;
  }

  // Extract the final text response
  const content = assistantMessage?.content;
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
      .map(c => c.text)
      .join('\n');
  }
  return 'Sorry, I had trouble processing that. Could you try again?';
}

import { invokeLLM, type Message } from './_core/llm.js';
import * as db from './db.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductCard = {
  type: 'product';
  name: string;
  chineseName?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  priceRegular?: number | null;
  priceLarge?: number | null;
  pricePetite?: number | null;
  isVegetarian?: boolean;
  isNonVeg?: boolean;
  category: string;
  categorySlug: string;
  subcategory: string;
  slug: string;
};

export type WorkshopCard = {
  type: 'workshop';
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  date: string;
  time: string;
  price: number; // in rupees
  earlyBirdPrice?: number | null;
  venue?: string | null;
  availableSeats: number;
  isSoldOut: boolean;
  link: string;
};

export type BlogCard = {
  type: 'blog';
  title: string;
  excerpt?: string | null;
  imageUrl?: string | null;
  slug: string;
  link: string;
};

export type CategoryLink = {
  type: 'category_link';
  name: string;
  slug: string;
  link: string;
};

export type RichCard = ProductCard | WorkshopCard | BlogCard | CategoryLink;

export type ChatbotResponse = {
  reply: string;
  cards: RichCard[];
};

// ─── Data Fetchers ─────────────────────────────────────────────────────────

async function searchMenu(query: string): Promise<{ results: any[]; cards: ProductCard[] }> {
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
  if (queryWords.length === 0) return { results: [], cards: [] };

  const results = allProducts.filter(p => {
    const searchable = [
      p.name, p.description, p.subcategoryName, p.categoryName, p.chineseName
    ].filter(Boolean).join(' ').toLowerCase();
    return queryWords.some(word => searchable.includes(word));
  });

  const topResults = results.slice(0, 8);

  const cards: ProductCard[] = topResults.map(p => ({
    type: 'product' as const,
    name: p.name,
    chineseName: p.chineseName || null,
    description: p.description || null,
    imageUrl: p.imageUrl || null,
    priceRegular: p.priceRegular,
    priceLarge: p.priceLarge,
    pricePetite: p.pricePetite,
    isVegetarian: p.isVegetarian,
    isNonVeg: p.isNonVeg,
    category: p.categoryName,
    categorySlug: p.categorySlug,
    subcategory: p.subcategoryName,
    slug: p.slug,
  }));

  const textResults = topResults.map(p => ({
    name: p.name,
    chineseName: p.chineseName || null,
    description: p.description || null,
    category: p.categoryName,
    subcategory: p.subcategoryName,
    priceRegular: p.priceRegular,
    priceLarge: p.priceLarge,
    pricePetite: p.pricePetite,
    isVegetarian: p.isVegetarian,
    isNonVeg: p.isNonVeg,
    slug: p.slug,
  }));

  return { results: textResults, cards };
}

async function getCategories(): Promise<{ data: any[]; cards: CategoryLink[] }> {
  const categories = await db.getCategories();
  const subcategories = await db.getSubcategories();

  const data = categories.map(cat => ({
    name: cat.name,
    description: cat.description,
    slug: cat.slug,
    subcategories: subcategories
      .filter(sub => sub.categoryId === cat.id)
      .map(sub => ({ name: sub.name, description: sub.description })),
  }));

  const cards: CategoryLink[] = categories.map(cat => ({
    type: 'category_link' as const,
    name: cat.name,
    slug: cat.slug,
    link: `/menu?category=${encodeURIComponent(cat.name)}`,
  }));

  return { data, cards };
}

async function getPopularItems(): Promise<{ results: any[]; cards: ProductCard[] }> {
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
          categorySlug: categories.find(c => c.id === sub.categoryId)?.slug || '',
        });
      }
    }
  }

  const featured = allProducts.filter(p => p.isFeatured);
  const popular = featured.length >= 5
    ? featured.slice(0, 5)
    : [...featured, ...allProducts.filter(p => !p.isFeatured).slice(0, 5 - featured.length)];

  const cards: ProductCard[] = popular.map(p => ({
    type: 'product' as const,
    name: p.name,
    chineseName: p.chineseName || null,
    description: p.description || null,
    imageUrl: p.imageUrl || null,
    priceRegular: p.priceRegular,
    priceLarge: p.priceLarge,
    pricePetite: p.pricePetite,
    isVegetarian: p.isVegetarian,
    isNonVeg: p.isNonVeg,
    category: p.categoryName,
    categorySlug: p.categorySlug,
    subcategory: p.subcategoryName,
    slug: p.slug,
  }));

  const textResults = popular.map(p => ({
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

  return { results: textResults, cards };
}

async function getWorkshops(): Promise<{ data: any[]; cards: WorkshopCard[] }> {
  try {
    const { getDb } = await import('./db.js');
    const { workshops, workshopDates } = await import('../drizzle/schema.js');
    const { eq, asc } = await import('drizzle-orm');
    const database = await getDb();
    if (!database) return { data: [], cards: [] };

    const result = await database.select().from(workshops)
      .where(eq(workshops.status, 'published'))
      .orderBy(asc(workshops.workshopDate));

    const data = result.map(w => ({
      title: w.title,
      description: w.shortDescription || w.description,
      date: w.workshopDate ? new Date(w.workshopDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '',
      time: `${w.startTime} - ${w.endTime}`,
      price: (w.price || w.ticketPrice || 0) / 100,
      earlyBirdPrice: w.earlyBirdPrice ? w.earlyBirdPrice / 100 : null,
      venue: w.venue || w.location || '',
      instructor: w.instructorName || '',
      availableSeats: (w.maxCapacity || w.totalCapacity || 0) - (w.bookedCount || w.ticketsSold || 0),
    }));

    const cards: WorkshopCard[] = result.map(w => ({
      type: 'workshop' as const,
      title: w.title,
      description: w.shortDescription || (w.description ? w.description.substring(0, 120) + '...' : null),
      imageUrl: w.imageUrl || null,
      date: w.workshopDate ? new Date(w.workshopDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '',
      time: `${w.startTime} - ${w.endTime}`,
      price: (w.price || w.ticketPrice || 0) / 100,
      earlyBirdPrice: w.earlyBirdPrice ? w.earlyBirdPrice / 100 : null,
      venue: w.venue || w.location || '',
      availableSeats: (w.maxCapacity || w.totalCapacity || 0) - (w.bookedCount || w.ticketsSold || 0),
      isSoldOut: ((w.maxCapacity || w.totalCapacity || 0) - (w.bookedCount || w.ticketsSold || 0)) <= 0,
      link: '/events#workshops',
    }));

    return { data, cards };
  } catch (err) {
    console.error('[Chatbot] Error fetching workshops:', err);
    return { data: [], cards: [] };
  }
}

async function getBlogPosts(): Promise<{ data: any[]; cards: BlogCard[] }> {
  try {
    const { getDb } = await import('./db.js');
    const { blogArticles } = await import('../drizzle/schema.js');
    const { eq, desc } = await import('drizzle-orm');
    const database = await getDb();
    if (!database) return { data: [], cards: [] };

    const articles = await database.select({
      id: blogArticles.id,
      title: blogArticles.title,
      slug: blogArticles.slug,
      excerpt: blogArticles.excerpt,
      imageUrl: blogArticles.imageUrl,
      keywords: blogArticles.keywords,
    }).from(blogArticles)
      .where(eq(blogArticles.status, 'published'))
      .orderBy(desc(blogArticles.publishedAt))
      .limit(10);

    const data = articles.map(a => ({
      title: a.title,
      excerpt: a.excerpt,
      slug: a.slug,
      keywords: a.keywords,
    }));

    const cards: BlogCard[] = articles.map(a => ({
      type: 'blog' as const,
      title: a.title,
      excerpt: a.excerpt || null,
      imageUrl: a.imageUrl || null,
      slug: a.slug,
      link: `/blog/${a.slug}`,
    }));

    return { data, cards };
  } catch (err) {
    console.error('[Chatbot] Error fetching blog posts:', err);
    return { data: [], cards: [] };
  }
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

type Intent = 'search_menu' | 'get_categories' | 'get_popular_items' | 'get_store_info' | 'get_workshops' | 'get_blog' | 'general_chat';

function detectIntents(userMessage: string): Intent[] {
  const msg = userMessage.toLowerCase();
  const intents: Intent[] = [];

  // Workshop/event intent
  const workshopTerms = ['workshop', 'class', 'cooking class', 'event', 'biang biang', 'noodle making', 'learn to cook', 'cooking event', 'book a workshop', 'book workshop', 'upcoming event', 'upcoming workshop', 'kung fu tea', 'hands-on', 'hands on', 'ticket', 'booking'];
  if (workshopTerms.some(term => msg.includes(term))) {
    intents.push('get_workshops');
  }

  // Blog intent — bubble tea knowledge, how-to, stories
  const blogTerms = ['blog', 'article', 'read', 'story', 'history', 'how to order', 'guide', 'learn about', 'tell me about bubble tea', 'what is bubble tea', 'what is boba', 'what is mochi', 'origin', 'taiwan tea', 'tea journey', 'behind the menu', 'street food culture'];
  if (blogTerms.some(term => msg.includes(term))) {
    intents.push('get_blog');
  }

  // Search menu intent — specific product/ingredient/flavor mentions
  const searchTerms = [
    'bubble tea', 'boba', 'milk tea', 'oolong', 'matcha', 'taro', 'mango', 'passion',
    'lychee', 'strawberry', 'peach', 'jasmine', 'green tea', 'black tea', 'coffee',
    'latte', 'mochi', 'chicken', 'noodle', 'rice', 'croissant', 'salad', 'sandwich',
    'waffle', 'pancake', 'egg', 'chocolate', 'vanilla', 'caramel', 'oreo', 'cheese',
    'fruit', 'smoothie', 'frappe', 'cold', 'hot', 'iced', 'warm', 'drink', 'food',
    'snack', 'dessert', 'sweet', 'spicy', 'vegan', 'vegetarian', 'non-veg', 'nonveg',
    'falooda', 'kung fu', 'popcorn', 'drumstick', 'cutlet', 'biryani', 'noodles',
    'bread', 'toast', 'tea', 'beverages', 'lavazza', 'brioche', 'katsu', 'curry',
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
5. **Share workshop info** — upcoming cooking workshops, dates, prices, and booking links
6. **Share blog content** — interesting articles about bubble tea, mochis, and Taiwanese food culture

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
- IMPORTANT: Product images and cards are automatically shown below your message. Do NOT describe images or say "here's a photo". Just mention products by name and the cards will appear.
- When mentioning workshops, encourage customers to book by visiting the Events page
- When relevant, mention blog articles the customer might enjoy reading

## Action-Oriented Responses
- Always guide customers toward taking action: ordering, booking workshops, reading blog posts
- For menu queries: "Tap on any item below to customize and order!"
- For workshops: "Book your spot on our Events page before it sells out!"
- For blog topics: "Check out our blog post for the full story!"

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
): Promise<ChatbotResponse> {
  // Get the latest user message for intent detection
  const lastUserMessage = [...conversationHistory].reverse().find(m => m.role === 'user')?.content || '';

  console.log('[Chatbot] User message:', lastUserMessage);

  // Detect intents from the user message
  const intents = detectIntents(lastUserMessage);
  console.log('[Chatbot] Detected intents:', intents);

  // Pre-fetch relevant data based on detected intents
  const contextParts: string[] = [];
  const allCards: RichCard[] = [];

  try {
    for (const intent of intents) {
      switch (intent) {
        case 'search_menu': {
          const query = extractSearchQuery(lastUserMessage);
          console.log('[Chatbot] Search query:', query);
          const { results, cards } = await searchMenu(query);
          if (results.length > 0) {
            contextParts.push(`\n## MENU SEARCH RESULTS for "${query}"\n${JSON.stringify(results, null, 2)}\n\nNote: Product photo cards are shown automatically below your message. Just mention products by name.`);
            allCards.push(...cards);
          } else {
            contextParts.push(`\n## MENU SEARCH for "${query}"\nNo products found matching this query. Suggest the customer browse the menu page or try different keywords.`);
          }
          break;
        }
        case 'get_categories': {
          const { data, cards } = await getCategories();
          contextParts.push(`\n## MENU CATEGORIES\n${JSON.stringify(data, null, 2)}\n\nNote: Category link buttons are shown automatically below your message.`);
          allCards.push(...cards);
          break;
        }
        case 'get_popular_items': {
          const { results, cards } = await getPopularItems();
          contextParts.push(`\n## POPULAR ITEMS\n${JSON.stringify(results, null, 2)}\n\nNote: Product photo cards are shown automatically below your message. Just mention products by name.`);
          allCards.push(...cards);
          break;
        }
        case 'get_store_info': {
          const info = getStoreInfo();
          contextParts.push(`\n## STORE INFORMATION\n${JSON.stringify(info, null, 2)}`);
          break;
        }
        case 'get_workshops': {
          const { data, cards } = await getWorkshops();
          if (data.length > 0) {
            contextParts.push(`\n## UPCOMING WORKSHOPS & EVENTS\n${JSON.stringify(data, null, 2)}\n\nNote: Workshop cards with booking links are shown automatically below your message. Encourage customers to book!`);
            allCards.push(...cards);
          } else {
            contextParts.push(`\n## WORKSHOPS\nNo upcoming workshops at the moment. Suggest following Taiwan Maami on Instagram (@taiwanmaami) to be the first to know about new workshops.`);
          }
          break;
        }
        case 'get_blog': {
          const { data, cards } = await getBlogPosts();
          if (data.length > 0) {
            contextParts.push(`\n## BLOG ARTICLES\n${JSON.stringify(data, null, 2)}\n\nNote: Blog post cards with read links are shown automatically below your message. Recommend relevant articles!`);
            allCards.push(...cards);
          } else {
            contextParts.push(`\n## BLOG\nNo published blog articles available yet. More content coming soon!`);
          }
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

  console.log('[Chatbot] Calling LLM with', contextParts.length, 'context parts and', allCards.length, 'cards');

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
    let replyText = '';

    if (typeof content === 'string' && content.trim().length > 0) {
      replyText = content;
    } else if (Array.isArray(content)) {
      const text = content
        .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
        .map(c => c.text)
        .join('\n');
      if (text.trim().length > 0) replyText = text;
    }

    if (!replyText) {
      console.error('[Chatbot] LLM returned empty content:', JSON.stringify(response?.choices?.[0]?.message));
      return {
        reply: 'Sorry, I had trouble processing that. Could you try asking in a different way?',
        cards: [],
      };
    }

    return {
      reply: replyText,
      cards: allCards,
    };
  } catch (err) {
    console.error('[Chatbot] LLM invocation error:', err);
    return {
      reply: 'Sorry, I\'m having trouble right now. Please try again in a moment, or browse our menu directly!',
      cards: [],
    };
  }
}

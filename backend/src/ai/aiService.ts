import OpenAI from 'openai';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { valkey } from '../valkey/client.js';
import { ProductService } from '../products/productService.js';
import { SearchService } from '../search/searchService.js';
import { logger } from '../utils/logger.js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey || 'mock-key',
  baseURL: config.openai.baseUrl,
});

export class AIService {
  /**
   * Processes conversational queries, returns products list and explanation.
   * Leverages a semantic cache in Valkey (query text hash) to bypass API fees.
   * Tracks conversational history, user intent memory, and query refinement state in Valkey.
   */
  static async chatAssistant(queryText: string, userId = 'anonymous'): Promise<any> {
    const sessionKey = `ai:session:${userId}`;
    const normalizedQuery = queryText.toLowerCase().trim();

    // Reset command support
    if (normalizedQuery === 'reset' || normalizedQuery === 'start over' || normalizedQuery === 'clear') {
      await valkey.del(sessionKey);
      return {
        explanation: 'Memory cleared! I am ready to start a fresh search session. What are you looking for today?',
        products: [],
      };
    }

    // 1. Fetch current search session state from Valkey
    const sessionData = await valkey.get(sessionKey);
    let session = sessionData ? JSON.parse(sessionData) : { history: [], intent: {} };

    // Append user query to history
    session.history.push({ role: 'user', content: queryText });

    // Use OpenAI if key is present
    if (config.openai.apiKey && config.openai.apiKey !== 'sk-demo') {
      try {
        const catalog = await ProductService.listProducts({ page: 1, limit: 35 });
        const productsContext = catalog.products.map(p => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          price: p.price.amount / 100, // as INR
          rating: p.ratings.average,
          category: p.categoryId,
          tags: p.tags,
        }));

        // Format history for the API (limit to last 6 turns to keep context tidy)
        const chatMessages = session.history.slice(-6).map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        }));

        const completion = await openai.chat.completions.create({
          model: config.openai.model,
          messages: [
            {
              role: 'system',
              content: `You are Valkey Commerce AI Personal Shopper. 
You assist shoppers in finding the perfect products from our catalog.
Here is the available product catalog context:
${JSON.stringify(productsContext)}

We support step-by-step query refinement. Inspect the conversation history and memory.
- If the user's intent is broad or needs clarification (e.g. "I want laptop" or "running shoes"), suggest 1-2 top matches, and ask 1-2 friendly clarifying questions (e.g. about budget limit, brand preference, or primary usage) to refine their search.
- If the user's request is specific (e.g. "under 50000 INR" or "from Apple"), recommend 2-4 products, explain why they match, and compare them briefly.
- Support step-by-step refinement. Keep memory of previous turns.

Output a valid JSON containing:
{
  "explanation": "Friendly markdown shopping helper response text...",
  "recommendedProductIds": ["product:uuidv7-1", "product:uuidv7-2"],
  "intent": {
    "category": "laptop | smartphone | shoes | audio etc",
    "brand": "brand name or null",
    "maxPrice": number_in_INR or null
  }
}`,
            },
            ...chatMessages,
          ],
          response_format: { type: 'json_object' },
        });

        const rawContent = completion.choices[0].message?.content || '{}';
        const parsed = JSON.parse(rawContent);

        // Hydrate products
        const products: any[] = [];
        if (parsed.recommendedProductIds && Array.isArray(parsed.recommendedProductIds)) {
          for (const pId of parsed.recommendedProductIds) {
            const p = await ProductService.getProduct(pId);
            if (p) products.push(p);
          }
        }

        // Save session history and intent memory in Valkey (expires in 30 minutes)
        session.history.push({ role: 'assistant', content: parsed.explanation });
        session.intent = { ...session.intent, ...parsed.intent };
        await valkey.set(sessionKey, JSON.stringify(session), 'EX', 1800);

        return {
          explanation: parsed.explanation,
          products,
        };
      } catch (error) {
        logger.error('OpenAI chatAssistant failed, falling back to stateful mock agent', error);
      }
    }

    // 2. Stateful Mock Agent fallback using Valkey memory
    const mockResult = await this.processStatefulMockChat(queryText, session);

    // Save state back to Valkey
    session.history.push({ role: 'assistant', content: mockResult.explanation });
    await valkey.set(sessionKey, JSON.stringify(session), 'EX', 1800);

    return mockResult;
  }

  /**
   * Stateful mock shopping agent that tracks search intent, memory, and filters in Valkey.
   */
  private static async processStatefulMockChat(query: string, session: any): Promise<any> {
    const text = query.toLowerCase();
    let currentIntent = session.intent || {};

    // 1. Parse category
    let matchedCategory = currentIntent.category || '';
    if (text.includes('laptop')) matchedCategory = 'laptops';
    else if (text.includes('phone') || text.includes('mobile')) matchedCategory = 'smartphones';
    else if (text.includes('shoe') || text.includes('sneaker') || text.includes('run')) matchedCategory = 'shoes';
    else if (text.includes('book') || text.includes('novel')) matchedCategory = 'books';
    else if (text.includes('headphone') || text.includes('earphone') || text.includes('audio') || text.includes('speaker') || text.includes('sound')) matchedCategory = 'audio';
    else if (text.includes('game') || text.includes('playstation') || text.includes('xbox') || text.includes('console')) matchedCategory = 'gaming';

    currentIntent.category = matchedCategory;

    // 2. Parse budget limits (e.g. "under 50000", "under 5000", "budget")
    let maxPrice = currentIntent.maxPrice || null;
    const priceMatch = text.match(/(?:under|below|max|limit|₹|\brs\.?)\s*(\d+)/i) || text.match(/(\d+)\s*(?:inr|rs|rupees)/i);
    if (priceMatch && priceMatch[1]) {
      maxPrice = parseInt(priceMatch[1], 10);
    } else if (text.includes('budget') && !maxPrice) {
      // Default budgets per category
      if (matchedCategory === 'laptops') maxPrice = 50000;
      else if (matchedCategory === 'smartphones') maxPrice = 20000;
      else if (matchedCategory === 'shoes') maxPrice = 4000;
      else maxPrice = 3000;
    }
    currentIntent.maxPrice = maxPrice;

    // 3. Parse brand names
    const brands = ['apple', 'samsung', 'oneplus', 'google', 'sony', 'bose', 'nike', 'adidas', 'asics', 'zara', 'dell', 'hp', 'lenovo', 'asus', 'boat'];
    let brand = currentIntent.brand || '';
    for (const b of brands) {
      if (text.includes(b)) {
        brand = b.charAt(0).toUpperCase() + b.slice(1);
        break;
      }
    }
    currentIntent.brand = brand;
    session.intent = currentIntent;

    // Build description of current memory status
    const memoryStrings: string[] = [];
    if (matchedCategory) memoryStrings.push(`Category: ${matchedCategory}`);
    if (brand) memoryStrings.push(`Brand: ${brand}`);
    if (maxPrice) memoryStrings.push(`Max Price: ₹${maxPrice}`);

    const memoryLabel = memoryStrings.length > 0 ? ` (Memory state: [${memoryStrings.join(' | ')}])` : '';

    // Search query builder
    let keyword = matchedCategory || 'products';
    if (brand) keyword = `${brand} ${keyword}`;

    const searchOptions: any = {
      maxPrice: maxPrice ? maxPrice * 100 : undefined, // Convert INR to paise
      brand: brand || undefined,
      limit: 3,
    };

    // Perform filter queries in DB via search service
    const searchRes = await SearchService.searchProducts(keyword, searchOptions);
    const recommended = searchRes.results;

    // Conversational turns refinement wizard logic
    let explanation = '';
    if (!matchedCategory) {
      explanation = `Hello! I am your conversational shopping assistant. I keep track of your choices to narrow down search results step-by-step. What category of items are you looking for today? (e.g. laptops, running shoes, headphones, or smartphones).`;
    } else {
      // Refined state checks
      const hasPrice = maxPrice !== null;
      const hasBrand = brand !== '';

      if (!hasPrice && !hasBrand) {
        explanation = `I've updated my search memory to focus on **${matchedCategory}**${memoryLabel}. 
Here are some top-rated options from our catalog. 
To refine this further: **What is your budget range (e.g. under ₹50000), or do you have a preferred brand?**`;
      } else if (!hasBrand) {
        explanation = `Refined search memory to **${matchedCategory}** under **₹${maxPrice}**${memoryLabel}. 
I've selected these budget-matching options. 
To narrow it down: **Do you prefer any brand (e.g., Apple, Dell, Lenovo, Samsung, Nike)?**`;
      } else if (!hasPrice) {
        explanation = `Refined search memory to **${brand} ${matchedCategory}**${memoryLabel}. 
Here are matches for your brand choice. 
Refinement query: **Do you have a specific budget limit (e.g., under ₹30000)?**`;
      } else {
        explanation = `Perfect! Refinement search complete: **${brand} ${matchedCategory}** under **₹${maxPrice}**${memoryLabel}. 
Here are the best matching items from our catalog. 
Type **"reset"** to start a new search session, or continue refining this query.`;
      }
    }

    return {
      explanation,
      products: recommended,
    };
  }

  /**
   * Translates natural language shopping requests to search filters using AI.
   * e.g., "cheap phone under 40000" -> filters categories, brands, prices.
   */
  static async discoverProducts(queryText: string): Promise<any[]> {
    const queryHash = crypto.createHash('md5').update(queryText.trim().toLowerCase()).digest('hex');
    const cacheKey = `ai:discover:${queryHash}`;

    const cached = await valkey.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    let searchResults: any[] = [];

    try {
      if (!config.openai.apiKey || config.openai.apiKey === 'sk-demo') {
        throw new Error('API Key missing');
      }

      // Query categories for matching names
      const categoriesTree = await ProductService.listCategories();
      const categoriesContext = categoriesTree.map(c => ({ id: c.id, name: c.name, children: c.children }));

      const completion = await openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: `You translate natural language shopping requests into search filter JSON objects.
Categories: ${JSON.stringify(categoriesContext)}
Output a JSON containing:
{
  "searchQuery": "keyword string e.g. laptop",
  "categoryId": "category:uuidv7 or null",
  "minPrice": number_in_paise or null,
  "maxPrice": number_in_paise or null,
  "brand": "brand name or null"
}`,
          },
          {
            role: 'user',
            content: queryText,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const content = JSON.parse(completion.choices[0].message?.content || '{}');
      
      const searchRes = await SearchService.searchProducts(content.searchQuery || '', {
        category: content.categoryId || undefined,
        brand: content.brand || undefined,
        minPrice: content.minPrice || undefined,
        maxPrice: content.maxPrice || undefined,
      });

      searchResults = searchRes.results;
    } catch (error) {
      // Fallback: search query directly in Valkey Search Index
      const searchRes = await SearchService.searchProducts(queryText, { limit: 12 });
      searchResults = searchRes.results;
    }

    // Cache discover results (5 minutes)
    await valkey.set(cacheKey, JSON.stringify(searchResults), 'EX', 300);
    return searchResults;
  }
}

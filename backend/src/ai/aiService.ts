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
   */
  static async chatAssistant(queryText: string, userId = 'anonymous'): Promise<any> {
    const queryHash = crypto.createHash('md5').update(queryText.trim().toLowerCase()).digest('hex');
    const cacheKey = `ai:chat:${queryHash}`;

    // 1. Check Valkey cache
    const cachedResponse = await valkey.get(cacheKey);
    if (cachedResponse) {
      logger.info(`✨ Serving AI chat response from Valkey semantic cache: ${queryHash}`);
      return JSON.parse(cachedResponse);
    }

    // Mock response helper in case API Key is missing or invalid
    if (!config.openai.apiKey || config.openai.apiKey === 'sk-demo') {
      const mockResult = await this.generateMockAIResponse(queryText);
      await valkey.set(cacheKey, JSON.stringify(mockResult), 'EX', 600); // 10m TTL
      return mockResult;
    }

    try {
      // 2. Fetch all products briefly for AI context
      const catalog = await ProductService.listProducts({ page: 1, limit: 30 });
      const productsContext = catalog.products.map(p => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        price: p.price.amount / 100, // as INR
        rating: p.ratings.average,
        category: p.categoryId,
        tags: p.tags,
      }));

      // Call OpenAI Chat API
      const completion = await openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: `You are Valkey Commerce AI Personal Shopper. 
You assist shoppers in finding perfect products from our catalog.
Here is the available product catalog context:
${JSON.stringify(productsContext)}

Based on user query, recommend 1 to 4 matching product IDs.
Explain why you recommend them and compare them briefly.
You must output a valid JSON containing:
{
  "explanation": "Friendly shopping advice text...",
  "recommendedProductIds": ["product:uuidv7-1", "product:uuidv7-2"]
}`,
          },
          {
            role: 'user',
            content: queryText,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const rawContent = completion.choices[0].message?.content || '{}';
      const parsed = JSON.parse(rawContent);

      // Hydrate actual product documents
      const products: any[] = [];
      if (Array.isArray(parsed.recommendedProductIds)) {
        for (const pId of parsed.recommendedProductIds) {
          const p = await ProductService.getProduct(pId);
          if (p) products.push(p);
        }
      }

      const responseObj = {
        explanation: parsed.explanation || 'Here are my top recommendations:',
        products,
      };

      // Store in Valkey cache (10 minutes)
      await valkey.set(cacheKey, JSON.stringify(responseObj), 'EX', 600);

      return responseObj;
    } catch (error: any) {
      logger.error('OpenAI call failed, serving mock response', error);
      return this.generateMockAIResponse(queryText);
    }
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

  /**
   * Mock responses generator when AI credentials are not provided.
   */
  private static async generateMockAIResponse(queryText: string): Promise<any> {
    const text = queryText.toLowerCase();
    
    // Find some products from catalog matching keywords
    let keyword = 'phone';
    if (text.includes('laptop')) keyword = 'laptop';
    else if (text.includes('shoe') || text.includes('run')) keyword = 'shoe';
    else if (text.includes('book')) keyword = 'book';
    else if (text.includes('headphone') || text.includes('ear') || text.includes('sound')) keyword = 'audio';
    else if (text.includes('game') || text.includes('play')) keyword = 'game';

    const searchRes = await SearchService.searchProducts(keyword, { limit: 3 });
    const recommended = searchRes.results;

    let explanation = `I've analyzed your request: "${queryText}". `;
    if (keyword === 'laptop') {
      explanation += `I recommend premium computing devices engineered with modern processors and solid state drives for smooth performance, high refresh rates, and long battery life.`;
    } else if (keyword === 'shoe') {
      explanation += `Here are the top-rated sports shoes featuring premium memory cushioning soles, lightweight designs, and mesh fabric layers that reduce heel impact for run training.`;
    } else {
      explanation += `I suggest these top-tier matches selected from our local inventory. They represent the best ratings and best price ratios in our e-commerce platform.`;
    }

    return {
      explanation,
      products: recommended,
    };
  }
}

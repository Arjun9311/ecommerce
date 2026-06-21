import { Request, Response } from 'express';
import { SearchService } from './searchService.js';
import { valkey } from '../valkey/client.js';

export async function searchController(req: Request, res: Response): Promise<void> {
  const { q, category, minPrice, maxPrice, brand, sort, page, limit } = req.query;

  try {
    const data = await SearchService.searchProducts(q as string || '', {
      category: category as string,
      minPrice: minPrice ? parseInt(minPrice as string, 10) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice as string, 10) : undefined,
      brand: brand as string,
      sort: sort as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    // Record top search metrics asynchronously in Valkey
    if (q) {
      await valkey.zincrby('metrics:searches', 1, (q as string).toLowerCase().trim());
      await valkey.publish('analytics:events', JSON.stringify({ type: 'search', query: q }));
    }

    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}

export async function suggestController(req: Request, res: Response): Promise<void> {
  const { q } = req.query;

  try {
    const list = await SearchService.suggest(q as string || '');
    res.status(200).json(list);
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}

export async function facetsController(req: Request, res: Response): Promise<void> {
  const { q } = req.query;

  try {
    const facets = await SearchService.searchFacets(q as string || '');
    res.status(200).json(facets);
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}

export async function semanticSearchController(req: Request, res: Response): Promise<void> {
  const { q, category } = req.query;

  try {
    const results = await SearchService.semanticSearch(q as string || '', { category: category as string });
    res.status(200).json(results);
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}

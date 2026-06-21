import { Request, Response } from 'express';
import { ProductService } from './productService.js';
import { valkey } from '../valkey/client.js';

export async function getProductsController(req: Request, res: Response): Promise<void> {
  const { category, brand, minPrice, maxPrice, rating, sort, page, limit } = req.query;

  try {
    const data = await ProductService.listProducts({
      category: category as string,
      brand: brand as string,
      minPrice: minPrice ? parseInt(minPrice as string, 10) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice as string, 10) : undefined,
      rating: rating ? parseFloat(rating as string) : undefined,
      sort: sort as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });
    
    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}

export async function getProductController(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const product = await ProductService.getProduct(id);
    if (!product) {
      res.status(404).json({ error: 'NotFound', message: 'Product not found' });
      return;
    }

    // Capture product view analytics asynchronously
    valkey.publish('analytics:events', JSON.stringify({ type: 'view', productId: id }));

    res.status(200).json(product);
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}

export async function getCategoriesController(req: Request, res: Response): Promise<void> {
  try {
    const tree = await ProductService.listCategories();
    res.status(200).json(tree);
  } catch (error: any) {
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
}

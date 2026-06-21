import { query, queryOne } from '../db/postgres.js';
import { valkey, jsonGet, jsonSet, jsonMGet } from '../valkey/client.js';
import { createId, slugify } from '../utils/helpers.js';

export interface ProductQuery {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  sort?: string; // 'price_asc' | 'price_desc' | 'rating_desc' | 'newest'
  page?: number;
  limit?: number;
}

export class ProductService {
  /**
   * Retrieves products using Valkey JSON indices and secondary indices (price, category_products).
   */
  static async listProducts(queryOptions: ProductQuery): Promise<{ products: any[]; total: number }> {
    const {
      category,
      brand,
      minPrice = 0,
      maxPrice = 99999999, // default big number
      rating = 0,
      sort = 'newest',
      page = 1,
      limit = 20,
    } = queryOptions;

    // We can query from PostgreSQL for complex filters, then retrieve details/sync with Valkey
    // This showcases hybrid store strategy: complex query in PG, detail retrieval from Valkey JSON
    let sql = `SELECT id FROM products WHERE price >= $1 AND price <= $2 AND rating_average >= $3 AND status = 'active'`;
    const params: any[] = [minPrice, maxPrice, rating];
    let paramIndex = 4;

    if (category) {
      sql += ` AND category_id = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (brand) {
      sql += ` AND brand = $${paramIndex}`;
      params.push(brand);
      paramIndex++;
    }

    // Sort order
    if (sort === 'price_asc') {
      sql += ` ORDER BY price ASC`;
    } else if (sort === 'price_desc') {
      sql += ` ORDER BY price DESC`;
    } else if (sort === 'rating_desc') {
      sql += ` ORDER BY rating_average DESC`;
    } else {
      sql += ` ORDER BY created_at DESC`;
    }

    const allIds = await query(sql, params);
    const total = allIds.length;
    
    // Paginate IDs
    const start = (page - 1) * limit;
    const paginatedIds = allIds.slice(start, start + limit).map((r) => r.id);

    if (paginatedIds.length === 0) {
      return { products: [], total };
    }

    // Get JSON documents from Valkey
    const valkeyProducts = await jsonMGet<any>(paginatedIds);

    // Filter nulls (in case some keys expired or didn't sync yet, fallback to pg fetch)
    const products: any[] = [];
    const missingIds: string[] = [];

    for (let idx = 0; idx < paginatedIds.length; idx++) {
      const p = valkeyProducts[idx];
      if (p) {
        products.push(p);
      } else {
        missingIds.push(paginatedIds[idx]);
      }
    }

    if (missingIds.length > 0) {
      // Fetch from Postgres & rebuild Valkey JSON cache
      const dbProducts = await query(
        `SELECT id, sku, name, slug, description, short_description as "shortDescription", 
                category_id as "categoryId", vendor_id as "vendorId", brand, price, compare_at as "compareAt", 
                images, attributes, tags, stock, warehouse, rating_average as "ratingAverage", 
                rating_count as "ratingCount", status FROM products WHERE id = ANY($1)`,
        [missingIds]
      );

      for (const row of dbProducts) {
        const fullProduct = {
          id: row.id,
          sku: row.sku,
          name: row.name,
          slug: row.slug,
          description: row.description,
          shortDescription: row.shortDescription,
          categoryId: row.categoryId,
          vendorId: row.vendorId,
          brand: row.brand,
          price: {
            amount: parseInt(row.price),
            currency: 'INR',
            compareAt: row.compareAt ? parseInt(row.compareAt) : null,
          },
          images: row.images,
          attributes: row.attributes,
          tags: row.tags,
          inventory: {
            quantity: row.stock,
            reserved: 0,
            warehouse: row.warehouse,
          },
          ratings: {
            average: parseFloat(row.ratingAverage || 0),
            count: parseInt(row.ratingCount || 0),
          },
          status: row.status,
        };
        products.push(fullProduct);
        await jsonSet(row.id, fullProduct);
      }
    }

    // Preserve sorting order of paginatedIds
    const orderedProducts = paginatedIds.map(id => products.find(p => p.id === id)).filter(Boolean);

    return { products: orderedProducts, total };
  }

  /**
   * Fetch single product. Try Valkey first, fallback to PG.
   */
  static async getProduct(id: string): Promise<any | null> {
    let p = await jsonGet<any>(id);
    if (!p) {
      const row = await queryOne('SELECT * FROM products WHERE id = $1', [id]);
      if (!row) return null;
      p = {
        id: row.id,
        sku: row.sku,
        name: row.name,
        slug: row.slug,
        description: row.description,
        shortDescription: row.short_description,
        categoryId: row.category_id,
        vendorId: row.vendor_id,
        brand: row.brand,
        price: {
          amount: parseInt(row.price),
          currency: row.currency || 'INR',
          compareAt: row.compare_at ? parseInt(row.compare_at) : null,
        },
        images: row.images,
        attributes: row.attributes,
        tags: row.tags,
        inventory: {
          quantity: row.stock,
          reserved: row.reserved || 0,
          warehouse: row.warehouse,
        },
        ratings: {
          average: parseFloat(row.rating_average || 0),
          count: parseInt(row.rating_count || 0),
        },
        status: row.status,
      };
      await jsonSet(id, p);
    }
    return p;
  }

  /**
   * List all categories (category tree).
   */
  static async listCategories(): Promise<any[]> {
    const cachedTree = await valkey.get('categories:tree');
    if (cachedTree) {
      return JSON.parse(cachedTree);
    }

    const allCategories = await query('SELECT * FROM categories');
    
    // Create hierarchy
    const rootCategories = allCategories.filter((c) => !c.parent_id);
    const categoryTree = rootCategories.map((root) => {
      const children = allCategories
        .filter((c) => c.parent_id === root.id)
        .map((child) => ({
          id: child.id,
          name: child.name,
          slug: child.slug,
          icon: child.icon,
          parentId: child.parent_id,
        }));
      return {
        id: root.id,
        name: root.name,
        slug: root.slug,
        icon: root.icon,
        parentId: root.parent_id,
        children,
      };
    });

    // Save to Valkey with 1-hour cache
    await valkey.set('categories:tree', JSON.stringify(categoryTree), 'EX', 3600);
    return categoryTree;
  }

  /**
   * Fetch single category.
   */
  static async getCategory(id: string): Promise<any | null> {
    const cacheKey = `category:${id}`;
    let cat = await jsonGet<any>(cacheKey);
    if (!cat) {
      const row = await queryOne('SELECT * FROM categories WHERE id = $1', [id]);
      if (!row) return null;
      
      const childrenRows = await query('SELECT id FROM categories WHERE parent_id = $1', [id]);
      cat = {
        id: row.id,
        name: row.name,
        slug: row.slug,
        icon: row.icon,
        parentId: row.parent_id,
        children: childrenRows.map((r) => r.id),
      };
      await jsonSet(cacheKey, cat);
    }
    return cat;
  }
}

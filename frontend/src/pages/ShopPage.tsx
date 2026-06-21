import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { api } from '../api/client.js';
import ProductCard from '../components/product/ProductCard.js';

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Category list for filters
  const [categories, setCategories] = useState<any[]>([]);
  
  // Filter states
  const categoryParam = searchParams.get('category') || '';
  const brandParam = searchParams.get('brand') || '';
  const sortParam = searchParams.get('sort') || 'newest';

  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(100000); // 1,000 INR to 1,00,000 INR
  const [rating, setRating] = useState(0);
  const [page, setPage] = useState(1);

  // Fetch categories tree
  useEffect(() => {
    api.get('/api/products/categories')
      .then((res) => {
        // Flatten list for filters
        const flat: any[] = [];
        res.data.forEach((parent: any) => {
          flat.push({ id: parent.id, slug: parent.slug, name: parent.name });
          parent.children.forEach((child: any) => {
            flat.push({ id: child.id, slug: child.slug, name: `└─ ${child.name}` });
          });
        });
        setCategories(flat);
      })
      .catch(() => {});
  }, []);

  // Fetch product list on filter change
  useEffect(() => {
    setLoading(true);
    
    // Convert current filter category slug to ID if selected
    let catId = '';
    if (categoryParam) {
      // Find category ID by slug in flat lists
      const matched = categories.find((c) => c.slug === categoryParam);
      if (matched) catId = matched.id;
    }

    const params: any = {
      sort: sortParam,
      page,
      limit: 12,
      minPrice: minPrice * 100, // INR to paise
      maxPrice: maxPrice * 100,
      rating,
    };

    if (catId) params.category = catId;
    if (brandParam) params.brand = brandParam;

    api.get('/api/products', { params })
      .then((res) => {
        setProducts(res.data.products);
        setTotal(res.data.total);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [categoryParam, brandParam, sortParam, minPrice, maxPrice, rating, page, categories]);

  const handleCategoryChange = (slug: string) => {
    setPage(1);
    if (slug === '') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', slug);
    }
    setSearchParams(searchParams);
  };

  const handleBrandChange = (brand: string) => {
    setPage(1);
    if (brand === '') {
      searchParams.delete('brand');
    } else {
      searchParams.set('brand', brand);
    }
    setSearchParams(searchParams);
  };

  const handleSortChange = (sort: string) => {
    searchParams.set('sort', sort);
    setSearchParams(searchParams);
  };

  const totalPages = Math.ceil(total / 12) || 1;

  const brandsList = [
    'Apple', 'Samsung', 'OnePlus', 'Google', 'Sony', 'Bose', 'Nike', 'Adidas', 'Asics', 'Zara', 'Penguin', 'Logitech G', 'Razer'
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 flex flex-col gap-8">
      
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white">Product Catalog</h1>
        <p className="text-gray-400 text-sm mt-1">Showing {products.length} of {total} products</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Side: Sidebar Filters */}
        <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-6">
          <div className="glass-card rounded-3xl p-6 flex flex-col gap-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
              <SlidersHorizontal className="w-4.5 h-4.5 text-violet-400" /> Filters
            </h2>

            {/* Category Filter */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Category</label>
              <select
                value={categoryParam}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="bg-[#12121a] border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Brand Filter */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Brand</label>
              <select
                value={brandParam}
                onChange={(e) => handleBrandChange(e.target.value)}
                className="bg-[#12121a] border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none"
              >
                <option value="">All Brands</option>
                {brandsList.map((brand, idx) => (
                  <option key={idx} value={brand}>{brand}</option>
                ))}
              </select>
            </div>

            {/* Price range */}
            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Price Range (INR)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice || ''}
                  onChange={(e) => setMinPrice(Number(e.target.value))}
                  className="w-full bg-[#12121a] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none"
                />
                <span className="text-gray-600">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice || ''}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full bg-[#12121a] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none"
                />
              </div>
            </div>

            {/* Minimum Rating */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Min Rating</label>
              <div className="flex gap-2">
                {[0, 3, 4, 4.5].map((val) => (
                  <button
                    key={val}
                    onClick={() => setRating(val)}
                    className={`flex-1 text-center py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      rating === val
                        ? 'bg-violet-600 border-violet-500 text-white'
                        : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    {val === 0 ? 'All' : `${val}★`}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset Filters */}
            <button
              onClick={() => {
                setSearchParams({});
                setMinPrice(0);
                setMaxPrice(100000);
                setRating(0);
                setPage(1);
              }}
              className="bg-white/5 border border-white/10 text-xs font-bold py-2 rounded-xl text-gray-300 hover:text-white transition-all text-center"
            >
              Reset All
            </button>
          </div>
        </aside>

        {/* Right Side: Product Catalog Grid */}
        <div className="flex-1 flex flex-col gap-8">
          
          {/* Top Sort Header */}
          <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-2xl py-3 px-5">
            <span className="text-xs text-gray-400 font-medium">Found {total} matches</span>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
              <select
                value={sortParam}
                onChange={(e) => handleSortChange(e.target.value)}
                className="bg-transparent text-xs text-gray-300 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="newest">Sort: Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating_desc">Ratings: High to Low</option>
              </select>
            </div>
          </div>

          {/* Grid list */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 items-center">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass-card rounded-3xl p-5 h-80 animate-pulse bg-white/5" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5 flex flex-col items-center gap-3">
              <Filter className="w-8 h-8 text-gray-500" />
              <h3 className="text-base font-bold text-gray-300">No matches found</h3>
              <p className="text-xs text-gray-500">Try adjusting your pricing, ratings or category filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs text-gray-300 hover:text-white disabled:opacity-30 disabled:text-gray-500 transition-all font-semibold"
              >
                Prev
              </button>
              <span className="text-xs font-semibold text-gray-400">Page {page} of {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs text-gray-300 hover:text-white disabled:opacity-30 disabled:text-gray-500 transition-all font-semibold"
              >
                Next
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

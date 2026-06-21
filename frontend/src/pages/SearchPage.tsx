import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Sparkles, Filter, AlertCircle, ShoppingBag } from 'lucide-react';
import { api } from '../api/client.js';
import ProductCard from '../components/product/ProductCard.js';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const isAI = searchParams.get('ai') === 'true';

  const [products, setProducts] = useState<any[]>([]);
  const [facets, setFacets] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) return;
    setLoading(true);

    const apiEndpoint = isAI ? `/api/ai/discover?query=${encodeURIComponent(query)}` : `/api/search?q=${encodeURIComponent(query)}`;

    // Fetch search results
    api.get(apiEndpoint)
      .then((res) => {
        // AI returns flat array of products, standard search returns { total, results }
        const list = isAI ? res.data : res.data.results;
        setProducts(list);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    // Fetch facet counts (only for standard search)
    if (!isAI) {
      api.get(`/api/search/facets?q=${encodeURIComponent(query)}`)
        .then((res) => {
          setFacets(res.data);
        })
        .catch(() => {});
    } else {
      setFacets(null);
    }
  }, [query, isAI]);

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 flex flex-col gap-8">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest flex items-center gap-1">
            {isAI ? <><Sparkles className="w-3.5 h-3.5 text-violet-400" /> AI Natural Search Mode</> : <><Search className="w-3.5 h-3.5 text-gray-500" /> Standard Search Mode</>}
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-2">
            Search results for: <span className="text-violet-400">"{query}"</span>
          </h1>
        </div>
        <div className="flex gap-3">
          <Link
            to={`/search?ai=${!isAI}&q=${encodeURIComponent(query)}`}
            className="bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold py-2 px-5 rounded-full text-white flex items-center gap-1.5 transition-all"
          >
            {isAI ? 'Switch to Keyword Match' : 'Switch to Semantic AI'}
          </Link>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Left Facet Column (only in standard search) */}
        {!isAI && facets && (
          <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-6">
            <div className="glass-card rounded-3xl p-6 flex flex-col gap-6">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                <Filter className="w-4.5 h-4.5 text-violet-400" /> Filter Aggregates
              </h3>

              {/* Brands Facet */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Matched Brands</span>
                <div className="flex flex-col gap-2 mt-1">
                  {facets.brands.length === 0 ? (
                    <span className="text-xs text-gray-600">No brand facets</span>
                  ) : (
                    facets.brands.map((b: any, idx: number) => (
                      <Link
                        key={idx}
                        to={`/shop?brand=${encodeURIComponent(b.name)}`}
                        className="flex justify-between items-center text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        <span>{b.name}</span>
                        <span className="bg-white/5 border border-white/5 px-2 py-0.5 rounded text-[10px] text-gray-500">{b.count}</span>
                      </Link>
                    ))
                  )}
                </div>
              </div>

            </div>
          </aside>
        )}

        {/* Right Search Results Column */}
        <div className="flex-1 w-full">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass-card rounded-3xl p-5 h-80 animate-pulse bg-white/5" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 bg-white/5 border border-white/5 rounded-3xl flex flex-col items-center justify-center gap-3">
              <AlertCircle className="w-10 h-10 text-gray-600" />
              <h3 className="text-base font-bold text-gray-300">No results found</h3>
              <p className="text-xs text-gray-500 max-w-sm">
                We couldn't find any products matching your query. Try adjusting terms, switching search modes, or browsing category lists.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

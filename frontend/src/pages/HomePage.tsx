import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Smartphone, Laptop, Headphones, Shirt, Footprints, Gamepad, Award, Flame, Zap } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuthStore } from '../stores/authStore.js';
import ProductCard from '../components/product/ProductCard.js';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [trending, setTrending] = useState<any[]>([]);
  const [personalized, setPersonalized] = useState<any[]>([]);
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [discoverLoading, setDiscoverLoading] = useState(false);

  useEffect(() => {
    // Fetch global trending
    api.get('/api/trending?window=24h&limit=4')
      .then(res => setTrending(res.data))
      .catch(() => {});

    // Fetch personalized recommends
    api.get('/api/recommendations/personalized?limit=4')
      .then(res => setPersonalized(res.data))
      .catch(() => {});
  }, [user]);

  const handleAISearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discoverQuery.trim()) return;

    setDiscoverLoading(true);
    try {
      navigate(`/search?ai=true&q=${encodeURIComponent(discoverQuery)}`);
    } finally {
      setDiscoverLoading(false);
    }
  };

  const categories = [
    { name: 'Smartphones', icon: Smartphone, slug: 'smartphones' },
    { name: 'Laptops', icon: Laptop, slug: 'laptops' },
    { name: 'Audio', icon: Headphones, slug: 'audio' },
    { name: 'Mens Wear', icon: Shirt, slug: 'mens-wear' },
    { name: 'Running Shoes', icon: Footprints, slug: 'running-shoes' },
    { name: 'Gaming Accessories', icon: Gamepad, slug: 'gaming-accessories' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 flex flex-col gap-16 bg-gradient-radial">
      
      {/* Premium Hero Section */}
      <section className="flex flex-col items-center text-center gap-6 py-12 md:py-20 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl -z-10" />
        
        {/* Hackathon Badge */}
        <span className="flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold py-1.5 px-4 rounded-full">
          <Sparkles className="w-3.5 h-3.5" /> Built Beyond Limits — Valkey Hackathon
        </span>

        {/* Title */}
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-3xl leading-tight">
          Supercharge Your Discovery With{' '}
          <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-amber-400 bg-clip-text text-transparent">
            Valkey AI Intelligence
          </span>
        </h1>

        <p className="text-base md:text-lg text-gray-400 max-w-xl leading-relaxed">
          Experience ultra-fast sub-millisecond page loads, persistent carts, and deep semantic search queries powered by Valkey JSON & Search.
        </p>

        {/* AI Search Bar */}
        <form onSubmit={handleAISearch} className="w-full max-w-xl relative mt-4">
          <input
            type="text"
            placeholder="Try: 'cheap gaming laptop under 50000' or 'gifts for marathon runners'"
            value={discoverQuery}
            onChange={(e) => setDiscoverQuery(e.target.value)}
            disabled={discoverLoading}
            className="w-full bg-[#12121a]/95 border border-white/10 rounded-full py-4 px-6 pl-14 text-sm md:text-base text-gray-200 placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 shadow-2xl transition-all"
          />
          <Sparkles className="absolute left-5 top-4.5 w-5 h-5 text-violet-400 animate-pulse" />
          <button
            type="submit"
            disabled={discoverLoading}
            className="absolute right-3 top-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs md:text-sm font-semibold px-5 py-2 rounded-full transition-all shadow-md active:scale-95"
          >
            {discoverLoading ? 'Analyzing...' : 'Discover'}
          </button>
        </form>
      </section>

      {/* Categories Grid */}
      <section className="flex flex-col gap-6">
        <h2 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-violet-500" /> Explore Premium Collections
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <Link
                key={idx}
                to={`/shop?category=${cat.slug}`}
                className="glass-card rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-3 text-gray-400 hover:text-white transition-all"
              >
                <div className="p-3 bg-white/5 rounded-xl">
                  <Icon className="w-6 h-6 text-violet-400" />
                </div>
                <span className="text-xs font-semibold">{cat.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Trending Products */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-500" /> Trending Products
          </h2>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1">
            Real-time updates <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {trending.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Personalized Recommendations Section */}
      <section className="flex flex-col gap-6 bg-[#0f0e1a]/40 border border-violet-950/20 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" /> Selected For You
            </h2>
            <p className="text-xs text-gray-400 mt-1">Personalized scores dynamically computed by Valkey</p>
          </div>
          <Link to="/shop" className="text-violet-400 hover:text-violet-300 text-sm font-semibold flex items-center gap-1 transition-colors self-start md:self-auto">
            View full catalog <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {personalized.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

    </div>
  );
}

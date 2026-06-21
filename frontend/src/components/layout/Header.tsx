import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User as UserIcon, Search, LayoutDashboard, Brain, LogOut, Sparkles, Menu, X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore.js';
import { useCartStore } from '../../stores/cartStore.js';
import { api } from '../../api/client.js';

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { cart, fetchCart } = useCartStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchCart();
  }, [user]);

  // Fetch autocomplete suggestions as the user types
  useEffect(() => {
    const fetchSuggests = async () => {
      if (searchQuery.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await api.get(`/api/search/suggest?q=${searchQuery}`);
        setSuggestions(res.data);
      } catch (err) {
        // ignore
      }
    };

    const timeout = setTimeout(fetchSuggests, 150);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleSuggestionClick = (s: string) => {
    setSearchQuery(s);
    setShowSuggestions(false);
    navigate(`/search?q=${encodeURIComponent(s)}`);
  };

  const cartCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-white/5 py-4 px-6 md:px-12 flex items-center justify-between">
      {/* Brand Logo */}
      <Link to="/" className="flex items-center gap-2 group">
        <div className="bg-purple-600 p-1.5 rounded-lg group-hover:scale-105 transition-transform duration-300">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-amber-400 bg-clip-text text-transparent">
          Valkey Commerce AI
        </span>
      </Link>

      {/* Center Search Bar */}
      <form onSubmit={handleSearchSubmit} className="hidden md:flex relative w-1/3 max-w-md">
        <input
          type="text"
          placeholder="Search products, brands, tags..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          className="w-full bg-[#12121a]/80 border border-white/10 rounded-full py-2 px-5 pl-11 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
        />
        <Search className="absolute left-4 top-2.5 w-4 h-4 text-gray-500" />

        {/* Search suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#12121e] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 overflow-hidden">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSuggestionClick(s)}
                className="w-full text-left px-4 py-2 hover:bg-white/5 rounded-xl text-sm text-gray-300 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Nav Actions */}
      <div className="hidden md:flex items-center gap-6">
        <Link to="/shop" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
          Shop
        </Link>
        <Link to="/ai-assistant" className="flex items-center gap-1.5 text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors">
          <Sparkles className="w-4 h-4" /> AI Assistant
        </Link>
        
        {user?.role === 'admin' && (
          <Link to="/admin" className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Link>
        )}

        <Link to="/cart" className="relative p-2 text-gray-300 hover:text-white transition-colors">
          <ShoppingCart className="w-5 h-5" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-violet-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white min-w-4 text-center">
              {cartCount}
            </span>
          )}
        </Link>

        {user ? (
          <div className="flex items-center gap-4 border-l border-white/10 pl-6">
            <Link to="/account" className="flex items-center gap-2 hover:text-white text-gray-300 text-sm transition-all">
              <UserIcon className="w-4 h-4" /> {user.firstName}
            </Link>
            <button onClick={logout} className="p-2 text-gray-400 hover:text-red-400 transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link to="/account" className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-5 py-1.5 text-sm text-white font-medium transition-all">
            <UserIcon className="w-4 h-4" /> Login
          </Link>
        )}
      </div>

      {/* Mobile Menu Icon */}
      <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-gray-300 hover:text-white">
        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-[#0b0b0f] border-b border-white/5 p-6 flex flex-col gap-4 md:hidden shadow-2xl z-40 animate-in slide-in-from-top">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#12121a]/80 border border-white/10 rounded-full py-2 px-5 pl-11 text-sm text-gray-200 placeholder-gray-500 focus:outline-none"
            />
            <Search className="absolute left-4 top-2.5 w-4 h-4 text-gray-500" />
          </form>

          <Link to="/shop" onClick={() => setMobileMenuOpen(false)} className="text-gray-300 hover:text-white py-2">
            Shop
          </Link>
          <Link to="/ai-assistant" onClick={() => setMobileMenuOpen(false)} className="text-violet-400 hover:text-violet-300 py-2 flex items-center gap-1">
            <Sparkles className="w-4 h-4" /> AI Assistant
          </Link>

          {user?.role === 'admin' && (
            <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="text-amber-400 hover:text-amber-300 py-2 flex items-center gap-1">
              <LayoutDashboard className="w-4 h-4" /> Admin Dashboard
            </Link>
          )}

          <Link to="/cart" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between text-gray-300 hover:text-white py-2">
            <span>Cart</span>
            <span className="bg-violet-600 text-xs font-bold px-2 py-0.5 rounded-full text-white">
              {cartCount}
            </span>
          </Link>

          {user ? (
            <>
              <Link to="/account" onClick={() => setMobileMenuOpen(false)} className="text-gray-300 hover:text-white py-2 flex items-center gap-2">
                <UserIcon className="w-4 h-4" /> Account ({user.firstName})
              </Link>
              <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="text-left text-red-400 py-2 flex items-center gap-2">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </>
          ) : (
            <Link to="/account" onClick={() => setMobileMenuOpen(false)} className="bg-white/5 border border-white/10 rounded-full px-5 py-2 text-center text-sm text-white font-medium">
              Login / Register
            </Link>
          )}
        </div>
      )}
    </header>
  );
}

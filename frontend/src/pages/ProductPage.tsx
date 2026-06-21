import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Shield, Truck, RotateCcw, ShoppingCart, Info, Award, Users } from 'lucide-react';
import { api } from '../api/client.js';
import { useCartStore } from '../stores/cartStore.js';
import ProductCard from '../components/product/ProductCard.js';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<any | null>(null);
  const [alsoBought, setAlsoBought] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const { addItem } = useCartStore();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setQty(1);

    // Fetch product details
    api.get(`/api/products/${id}`)
      .then((res) => {
        setProduct(res.data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    // Fetch Also Bought recommendations
    api.get(`/api/recommendations/also-bought/${id}`)
      .then((res) => {
        setAlsoBought(res.data);
      })
      .catch(() => {});

    // Track page view event in the recommendation system
    api.post('/api/recommendations/action', { productId: id, action: 'view' });
    // Track view event in the trending system
    api.post('/api/trending/event', { type: 'view', productId: id });
  }, [id]);

  const handleAddToCart = async () => {
    if (!product) return;
    try {
      await addItem(product.id, qty);
      api.post('/api/recommendations/action', { productId: product.id, action: 'cart' });
      api.post('/api/trending/event', { type: 'cart_add', productId: product.id });
      alert('Added to cart!');
    } catch (err: any) {
      alert(err.message || 'Could not add to cart');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-20 flex flex-col gap-8 animate-pulse">
        <div className="flex flex-col md:flex-row gap-12">
          <div className="w-full md:w-1/2 aspect-square bg-white/5 rounded-3xl" />
          <div className="flex-1 flex flex-col gap-6">
            <div className="h-8 bg-white/5 rounded w-3/4" />
            <div className="h-6 bg-white/5 rounded w-1/4" />
            <div className="h-20 bg-white/5 rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-20 text-center flex flex-col items-center gap-4">
        <Info className="w-12 h-12 text-violet-500" />
        <h2 className="text-xl font-extrabold text-white">Product Not Found</h2>
        <Link to="/shop" className="text-sm font-semibold text-violet-400 hover:underline">Return to Shop</Link>
      </div>
    );
  }

  const isLowStock = product.inventory.quantity > 0 && product.inventory.quantity <= 5;
  const isOutOfStock = product.inventory.quantity === 0;

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 flex flex-col gap-16">
      
      {/* Product Main Section */}
      <section className="flex flex-col md:flex-row gap-12 items-start">
        {/* Left Image Column */}
        <div className="w-full md:w-1/2 rounded-3xl overflow-hidden glass-panel border border-white/5 aspect-square relative flex items-center justify-center p-8">
          <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/5 to-amber-500/5" />
          <span className="text-gray-600 font-extrabold text-xl tracking-widest uppercase">{product.brand}</span>
        </div>

        {/* Right Info Column */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Brand & Stock */}
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <span className="text-sm font-bold text-violet-400 uppercase tracking-widest">{product.brand}</span>
            <div className="flex items-center gap-1 bg-white/5 border border-white/5 px-3 py-1 rounded-full text-xs text-gray-300 font-semibold">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>{product.ratings.average} ({product.ratings.count} reviews)</span>
            </div>
          </div>

          {/* Name & Desc */}
          <div>
            <h1 className="text-3xl font-extrabold text-white leading-tight">{product.name}</h1>
            <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>
            <p className="text-gray-400 text-sm mt-4 leading-relaxed">{product.description}</p>
          </div>

          {/* Pricing Box */}
          <div className="glass-card rounded-2xl p-5 flex items-center justify-between border border-white/5">
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Price</span>
              <span className="text-2xl font-black text-white mt-1">₹{product.price.amount / 100}</span>
              {product.price.compareAt && (
                <span className="text-xs text-gray-500 line-through">₹{product.price.compareAt / 100}</span>
              )}
            </div>
            
            {/* Stock details */}
            <div className="text-right">
              {isOutOfStock ? (
                <span className="text-red-400 text-xs font-bold bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">Out of Stock</span>
              ) : isLowStock ? (
                <span className="text-amber-400 text-xs font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">Only {product.inventory.quantity} left!</span>
              ) : (
                <span className="text-emerald-400 text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">In Stock</span>
              )}
            </div>
          </div>

          {/* Action Box */}
          {!isOutOfStock && (
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-[#12121a] border border-white/10 rounded-2xl">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="px-4 py-2.5 text-gray-400 hover:text-white transition-colors text-sm font-semibold"
                >
                  -
                </button>
                <span className="px-4 text-sm font-bold text-white">{qty}</span>
                <button
                  onClick={() => setQty(Math.min(product.inventory.quantity, qty + 1))}
                  className="px-4 py-2.5 text-gray-400 hover:text-white transition-colors text-sm font-semibold"
                >
                  +
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                className="flex-1 glow-button text-white text-sm font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-600/30 hover:scale-[1.01]"
              >
                <ShoppingCart className="w-4 h-4" /> Add to Shopping Cart
              </button>
            </div>
          )}

          {/* Shipping guidelines list */}
          <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-6 text-gray-400 text-xs">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-violet-400 shrink-0" />
              <span>Standard delivery within 3 days</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-violet-400 shrink-0" />
              <span>1 Year warranty protection</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-violet-400 shrink-0" />
              <span>7 Days easy return options</span>
            </div>
          </div>

        </div>
      </section>

      {/* Specifications Box */}
      <section className="glass-panel border border-white/5 rounded-3xl p-8 flex flex-col gap-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Info className="w-4.5 h-4.5 text-violet-400" /> Technical Specifications
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm border-t border-white/5 pt-4">
          {Object.entries(product.attributes || {}).map(([key, val]) => (
            <div key={key} className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-gray-500 capitalize">{key}</span>
              <span className="text-gray-300 font-semibold">{val as string}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Recommendations visual flow section */}
      <section className="flex flex-col gap-6">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-400" /> Customers Also Bought
          </h2>
          <p className="text-xs text-gray-400 mt-1">Cross-purchases dynamically aggregated from checkout logs</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {alsoBought.slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

    </div>
  );
}

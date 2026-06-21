import React from 'react';
import { Link } from 'react-router-dom';
import { Star, ShoppingCart, AlertCircle } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore.js';
import { api } from '../../api/client.js';

interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  price: {
    amount: number;
    compareAt: number | null;
    currency: string;
  };
  ratings: {
    average: number;
    count: number;
  };
  inventory: {
    quantity: number;
  };
  brand: string;
}

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCartStore();

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await addItem(product.id, 1);
      // Record cart add action to recommendation engine
      api.post('/api/recommendations/action', { productId: product.id, action: 'cart' });
    } catch (err: any) {
      alert(err.message || 'Could not add to cart');
    }
  };

  const handleProductClick = () => {
    // Record view action to recommendation engine
    api.post('/api/recommendations/action', { productId: product.id, action: 'view' });
  };

  const isLowStock = product.inventory.quantity > 0 && product.inventory.quantity <= 5;
  const isOutOfStock = product.inventory.quantity === 0;

  return (
    <Link
      to={`/products/${product.id}`}
      onClick={handleProductClick}
      className="glass-card rounded-3xl p-5 flex flex-col relative overflow-hidden group"
    >
      {/* Stock indicators */}
      {isLowStock && (
        <span className="absolute top-4 left-4 bg-amber-500/20 text-amber-300 text-[10px] font-bold py-1 px-2.5 rounded-full border border-amber-500/20 flex items-center gap-1 z-10">
          <AlertCircle className="w-3 h-3" /> Only {product.inventory.quantity} left
        </span>
      )}
      {isOutOfStock && (
        <span className="absolute top-4 left-4 bg-red-500/20 text-red-300 text-[10px] font-bold py-1 px-2.5 rounded-full border border-red-500/20 z-10">
          Out of Stock
        </span>
      )}

      {/* Product Image container */}
      <div className="aspect-square bg-white/5 rounded-2xl mb-4 overflow-hidden relative flex items-center justify-center">
        {/* Mock visual gradients based on product type */}
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/10 to-amber-500/5 group-hover:scale-105 transition-transform duration-500" />
        <span className="text-gray-600 font-medium text-xs tracking-wider uppercase">
          {product.brand}
        </span>
      </div>

      {/* Brand & Stars */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">
          {product.brand}
        </span>
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          <span className="text-xs text-gray-300 font-medium">
            {product.ratings.average}
          </span>
        </div>
      </div>

      {/* Name */}
      <h3 className="text-sm font-semibold text-gray-100 group-hover:text-white line-clamp-1 mb-2 transition-colors">
        {product.name}
      </h3>

      {/* Price and Cart Action */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
        <div className="flex flex-col">
          <span className="text-base font-bold text-white">
            {formatPrice(product.price.amount)}
          </span>
          {product.price.compareAt && (
            <span className="text-xs text-gray-500 line-through">
              {formatPrice(product.price.compareAt)}
            </span>
          )}
        </div>
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className="bg-violet-600/90 hover:bg-violet-600 disabled:bg-gray-800 disabled:text-gray-600 text-white p-2.5 rounded-2xl transition-all duration-300 flex items-center justify-center hover:scale-105 active:scale-95 shadow-lg shadow-violet-600/20"
          title="Add to Cart"
        >
          <ShoppingCart className="w-4 h-4" />
        </button>
      </div>
    </Link>
  );
}

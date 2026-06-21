import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, ArrowRight, Ticket, Sparkles } from 'lucide-react';
import { useCartStore } from '../stores/cartStore.js';

export default function CartPage() {
  const navigate = useNavigate();
  const { cart, fetchCart, updateQuantity, removeItem, applyCoupon, removeCoupon, error } = useCartStore();
  const [couponCode, setCouponCode] = useState('');

  useEffect(() => {
    fetchCart();
  }, []);

  const handleQtyChange = async (pId: string, quantity: number) => {
    try {
      await updateQuantity(pId, quantity);
    } catch (err: any) {
      alert(err.message || 'Error updating quantity');
    }
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    try {
      await applyCoupon(couponCode.trim());
      setCouponCode('');
      alert('Coupon code applied successfully!');
    } catch (err: any) {
      alert(err.message || 'Invalid coupon code');
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-20 text-center flex flex-col items-center justify-center gap-4">
        <ShoppingBag className="w-16 h-16 text-gray-600" />
        <h2 className="text-xl font-extrabold text-white">Your Cart is Empty</h2>
        <p className="text-sm text-gray-500 max-w-sm">Looks like you haven't added anything to your cart yet.</p>
        <Link to="/shop" className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-6 py-2.5 rounded-full transition-all mt-4">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 flex flex-col gap-8">
      
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white">Your Shopping Cart</h1>
        <p className="text-gray-400 text-sm mt-1">Review your selected items and discounts</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Left Side: Cart Items list */}
        <div className="flex-1 flex flex-col gap-4 w-full">
          {cart.items.map((item) => (
            <div
              key={item.productId}
              className="glass-card rounded-2xl p-4 flex items-center gap-4 border border-white/5"
            >
              {/* Product Info */}
              <div className="w-16 h-16 bg-white/5 rounded-xl overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs text-gray-600 uppercase">
                IMG
              </div>

              <div className="flex-1 min-w-0">
                <Link to={`/products/${item.productId}`} className="text-sm font-bold text-white hover:text-violet-400 transition-colors line-clamp-1">
                  {item.name}
                </Link>
                <p className="text-xs text-gray-500 mt-0.5">SKU: {item.sku}</p>
                <span className="text-sm font-bold text-gray-300 block mt-1">{formatPrice(item.price)}</span>
              </div>

              {/* Quantity Changer */}
              <div className="flex items-center bg-[#12121a] border border-white/10 rounded-xl shrink-0">
                <button
                  onClick={() => handleQtyChange(item.productId, item.quantity - 1)}
                  className="px-3 py-1.5 text-gray-400 hover:text-white transition-colors font-semibold"
                >
                  -
                </button>
                <span className="px-2 text-xs font-bold text-white">{item.quantity}</span>
                <button
                  onClick={() => handleQtyChange(item.productId, item.quantity + 1)}
                  className="px-3 py-1.5 text-gray-400 hover:text-white transition-colors font-semibold"
                >
                  +
                </button>
              </div>

              {/* Delete button */}
              <button
                onClick={() => removeItem(item.productId)}
                className="p-2 text-gray-500 hover:text-red-400 transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Right Side: Totals Summary & Coupons */}
        <div className="w-full lg:w-96 shrink-0 flex flex-col gap-6">
          
          {/* Coupon Code section */}
          <div className="glass-card rounded-3xl p-6 flex flex-col gap-4 border border-white/5">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Ticket className="w-4 h-4 text-violet-400" /> Apply Coupon
            </h3>
            
            {cart.couponCode ? (
              <div className="bg-violet-950/40 border border-violet-500/20 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-violet-300 uppercase tracking-widest">{cart.couponCode}</span>
                  <span className="text-[10px] text-gray-400 block">Redeemed successfully</span>
                </div>
                <button onClick={removeCoupon} className="text-xs font-bold text-red-400 hover:underline">
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Promo Code (e.g. VALKEY10)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1 bg-[#12121a] border border-white/10 rounded-xl py-2 px-4 text-xs text-gray-200 focus:outline-none focus:border-violet-500"
                />
                <button
                  type="submit"
                  className="bg-white/5 border border-white/10 text-xs font-bold px-4 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all"
                >
                  Apply
                </button>
              </form>
            )}
            
            <p className="text-[10px] text-gray-500">Hint: Try applying coupon <strong>VALKEY10</strong> for orders above ₹2000</p>
          </div>

          {/* Pricing Totals Card */}
          <div className="glass-panel rounded-3xl p-6 flex flex-col gap-4 border border-white/5">
            <h3 className="text-sm font-bold text-white border-b border-white/5 pb-3">Order Summary</h3>
            
            <div className="flex flex-col gap-2.5 text-xs text-gray-400 border-b border-white/5 pb-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-gray-200 font-medium">{formatPrice(cart.subtotal)}</span>
              </div>
              
              {cart.discount > 0 && (
                <div className="flex justify-between text-violet-400 font-medium">
                  <span>Coupon Discount</span>
                  <span>-{formatPrice(cart.discount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="text-gray-200 font-medium">{cart.total > 50000 ? 'FREE' : '₹150'}</span>
              </div>
            </div>

            <div className="flex justify-between text-sm font-extrabold text-white">
              <span>Estimated Total</span>
              <span>{formatPrice(cart.total)}</span>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full glow-button text-white text-sm font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-violet-600/30 hover:scale-[1.01]"
            >
              Proceed to checkout <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}

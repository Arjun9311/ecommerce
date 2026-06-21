import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, ArrowLeft, CreditCard, ShoppingBag, ShieldCheck, CheckCircle } from 'lucide-react';
import { useCartStore } from '../stores/cartStore.js';
import { api } from '../api/client.js';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, fetchCart, clearCartLocal } = useCartStore();
  const [shippingAddress, setShippingAddress] = useState({
    street: '42 MG Road, Banjara Hills',
    city: 'Hyderabad',
    state: 'Telangana',
    postalCode: '500034',
    country: 'IN',
  });
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);

  useEffect(() => {
    fetchCart();
  }, []);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      const res = await api.post('/api/orders/checkout', {
        shippingAddress,
        paymentMethod,
      });
      setOrderSuccess(res.data);
      clearCartLocal();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  // If order was successfully completed, show success screen
  if (orderSuccess) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center flex flex-col items-center justify-center gap-6">
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-full text-emerald-400">
          <CheckCircle className="w-16 h-16 animate-bounce" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-white">Order Confirmed!</h1>
          <p className="text-gray-400 text-sm mt-2">Your payment was simulated successfully and your order has been received.</p>
        </div>

        <div className="glass-card rounded-2xl p-6 w-full text-left flex flex-col gap-3 border border-white/5">
          <div className="flex justify-between border-b border-white/5 pb-2 text-xs">
            <span className="text-gray-500">Order ID</span>
            <span className="text-gray-300 font-semibold">{orderSuccess.id}</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-2 text-xs">
            <span className="text-gray-500">Est. Delivery</span>
            <span className="text-gray-300 font-semibold">{new Date(orderSuccess.delivery.estimatedAt).toDateString()}</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-2 text-xs">
            <span className="text-gray-500">Tracking Code</span>
            <span className="text-gray-300 font-semibold">{orderSuccess.delivery.trackingId}</span>
          </div>
          <div className="flex justify-between text-sm font-extrabold text-white mt-1">
            <span>Total Paid</span>
            <span>{formatPrice(orderSuccess.total)}</span>
          </div>
        </div>

        <div className="flex gap-4 mt-2 w-full">
          <Link to="/shop" className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold py-3.5 rounded-full transition-all text-center">
            Continue Shopping
          </Link>
          <Link to="/account" className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold py-3.5 rounded-full transition-all text-center">
            View Orders
          </Link>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h2 className="text-xl font-bold text-white">No items to checkout</h2>
        <Link to="/shop" className="text-violet-400 font-semibold hover:underline mt-2 inline-block">Return to shop</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 flex flex-col gap-8">
      
      {/* Back to cart */}
      <Link to="/cart" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors self-start">
        <ArrowLeft className="w-4 h-4" /> Back to Cart
      </Link>

      <div>
        <h1 className="text-3xl font-extrabold text-white">Checkout</h1>
        <p className="text-gray-400 text-sm mt-1">Place secure transaction backed by Valkey concurrency locks</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Left Form Column */}
        <form onSubmit={handlePlaceOrder} className="flex-1 flex flex-col gap-6 w-full">
          {/* Shipping Address Box */}
          <div className="glass-panel border border-white/5 rounded-3xl p-6 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
              <ShoppingBag className="w-4.5 h-4.5 text-violet-400" /> Shipping Details
            </h3>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Street Address</label>
              <input
                type="text"
                required
                value={shippingAddress.street}
                onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                className="bg-[#12121a] border border-white/10 rounded-xl py-2.5 px-4 text-xs text-gray-200 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">City</label>
                <input
                  type="text"
                  required
                  value={shippingAddress.city}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                  className="bg-[#12121a] border border-white/10 rounded-xl py-2.5 px-4 text-xs text-gray-200 focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Postal Code</label>
                <input
                  type="text"
                  required
                  value={shippingAddress.postalCode}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                  className="bg-[#12121a] border border-white/10 rounded-xl py-2.5 px-4 text-xs text-gray-200 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Payment Method simulation */}
          <div className="glass-panel border border-white/5 rounded-3xl p-6 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
              <CreditCard className="w-4.5 h-4.5 text-violet-400" /> Payment Simulation
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'upi', label: 'UPI / PhonePe' },
                { id: 'card', label: 'Credit / Debit Card' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`border p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 transition-all ${
                    paymentMethod === m.id
                      ? 'border-violet-500 bg-violet-600/10 text-white'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-bold">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-center gap-2 text-[10px] text-gray-500 bg-white/5 border border-white/5 rounded-xl p-3.5">
            <ShieldCheck className="w-4.5 h-4.5 text-violet-500 shrink-0" />
            <span>Secure connection established. Stock reservations lock items in inventory for 5 minutes during pay processing.</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="glow-button text-white text-sm font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-600/30 hover:scale-[1.01]"
          >
            <Lock className="w-4 h-4" /> {loading ? 'Acquiring inventory lock...' : `Pay & Place Order: ${formatPrice(cart.total)}`}
          </button>
        </form>

        {/* Right Cart Summary Column */}
        <div className="w-full lg:w-96 shrink-0 flex flex-col gap-4">
          <div className="glass-panel rounded-3xl p-6 flex flex-col gap-4 border border-white/5">
            <h3 className="text-sm font-bold text-white border-b border-white/5 pb-3">Summary</h3>

            <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
              {cart.items.map((item) => (
                <div key={item.productId} className="flex justify-between items-center text-xs text-gray-300">
                  <div className="truncate pr-3 max-w-[70%]">
                    <span className="font-bold">{item.quantity}x</span> {item.name}
                  </div>
                  <span className="font-semibold text-gray-400">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2.5 text-xs text-gray-400 border-t border-white/5 pt-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(cart.subtotal)}</span>
              </div>
              {cart.discount > 0 && (
                <div className="flex justify-between text-violet-400">
                  <span>Discount</span>
                  <span>-{formatPrice(cart.discount)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between text-sm font-extrabold text-white border-t border-white/5 pt-3 mt-1">
              <span>Payable Total</span>
              <span>{formatPrice(cart.total)}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore.js';
import { api } from '../api/client.js';
import { User, LogIn, Key, Mail, RefreshCw, ShoppingBag, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AccountPage() {
  const { user, login, register, loadMe, loading, error } = useAuthStore();
  const [isRegister, setIsRegister] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    loadMe();
  }, []);

  // Fetch orders if user is authenticated
  useEffect(() => {
    if (user) {
      api.get('/api/orders')
        .then((res) => setOrders(res.data))
        .catch(() => {});
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isRegister) {
        await register(email, password, firstName, lastName);
        alert('Registration successful! Please login.');
        setIsRegister(false);
      } else {
        await login(email, password);
      }
    } catch (err) {
      // handled by authStore error state
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  // ─── LOGIN / REGISTER PANELS ───────────────────────────────────────────────
  if (!user) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 flex flex-col gap-6">
        <div className="text-center flex flex-col items-center gap-2">
          <div className="bg-violet-600 p-3 rounded-full text-white">
            <User className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-white">{isRegister ? 'Create Account' : 'Welcome Back'}</h1>
          <p className="text-xs text-gray-500">{isRegister ? 'Sign up to lock carts and recommendations' : 'Access your session profile cached in Valkey'}</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-panel border border-white/5 rounded-3xl p-6 flex flex-col gap-4 shadow-2xl">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold p-3 rounded-xl">
              {error}
            </div>
          )}

          {isRegister && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-[#12121a] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-[#12121a] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#12121a] border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-violet-500"
              />
              <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-500" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#12121a] border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-violet-500"
              />
              <Key className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-500" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full glow-button text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-violet-600/20 active:scale-95 transition-all mt-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : isRegister ? 'Register' : 'Login'}
          </button>

          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="text-center text-[10px] text-gray-400 hover:text-white mt-2 transition-colors font-semibold"
          >
            {isRegister ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
          </button>
        </form>
        
        <div className="text-center text-[10px] text-gray-600 border border-white/5 rounded-xl p-3 bg-white/5">
          Demo Customer: <strong>customer@valkey.com</strong> / password: <strong>password123</strong>
        </div>
      </div>
    );
  }

  // ─── AUTHENTICATED ACCOUNT & ORDERS PANEL ───────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 flex flex-col gap-10">
      
      {/* Dashboard Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white">My Account</h1>
          <p className="text-gray-400 text-sm mt-1">Hello, {user.firstName} {user.lastName} ({user.email})</p>
        </div>
        <span className="bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold py-1 px-4 rounded-full self-start md:self-auto uppercase tracking-wider">
          Role: {user.role}
        </span>
      </div>

      {/* Orders List */}
      <section className="flex flex-col gap-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <ShoppingBag className="w-4.5 h-4.5 text-violet-400" /> Order History
        </h2>

        {orders.length === 0 ? (
          <div className="text-center py-16 bg-white/5 border border-white/5 rounded-3xl flex flex-col items-center gap-2">
            <ShoppingBag className="w-10 h-10 text-gray-600" />
            <h3 className="text-sm font-bold text-gray-300">No orders yet</h3>
            <p className="text-xs text-gray-500">Go buy some premium items from our store!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((o) => (
              <div key={o.id} className="glass-card rounded-2xl p-5 flex flex-col gap-4 border border-white/5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-xs border-b border-white/5 pb-3">
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <span className="text-gray-500 block">Order ID</span>
                      <span className="text-gray-300 font-semibold">{o.id}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Date</span>
                      <span className="text-gray-300 font-semibold">{new Date(o.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Status</span>
                      <span className="bg-emerald-500/15 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/10 uppercase tracking-wider text-[10px]">
                        {o.status}
                      </span>
                    </div>
                  </div>
                  <span className="text-base font-black text-white">{formatPrice(o.total)}</span>
                </div>

                {/* Items in this order */}
                <div className="flex flex-col gap-2">
                  {o.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs text-gray-400">
                      <span className="truncate pr-3 max-w-[80%]">{item.name} <strong className="text-gray-500">x{item.quantity}</strong></span>
                      <span className="font-semibold text-gray-300">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}

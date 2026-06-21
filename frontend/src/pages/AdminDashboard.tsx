import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Database, TrendingUp, Users, ShoppingCart, Search, Eye, AlertCircle, RefreshCw } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [systemMetric, setSystemMetric] = useState<{ status: string; latencyMs: number } | null>(null);

  const fetchStats = () => {
    setLoading(true);
    // Fetch Valkey-derived dashboard metrics
    api.get('/api/analytics/dashboard')
      .then((res) => {
        setStats(res.data);
      })
      .catch(() => {});

    // Fetch Valkey connection health
    api.get('/api/health')
      .then((res) => {
        setSystemMetric(res.data.valkey);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStats();
    // Poll metrics every 10 seconds for real-time updates
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  if (loading && !stats) {
    return (
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-20 text-center flex flex-col items-center justify-center gap-4">
        <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
        <h2 className="text-sm font-bold text-gray-400">Loading Valkey metrics engine...</h2>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 flex flex-col gap-10">
      
      {/* Header and Refresh */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <Database className="w-8 h-8 text-violet-500" /> Valkey Operations Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-1">Real-time statistics monitored and aggregated inside Valkey structures</p>
        </div>
        <button
          onClick={fetchStats}
          className="bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold py-2 px-5 rounded-full text-white flex items-center gap-1.5 self-start md:self-auto transition-all active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Now
        </button>
      </div>

      {/* Primary KPI Grid */}
      {stats && (
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Visitors HLL */}
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4 border border-white/5">
            <div className="bg-violet-600/10 border border-violet-500/20 p-3.5 rounded-xl text-violet-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Unique Visitors (HLL)</span>
              <span className="text-2xl font-black text-white">{stats.uniqueVisitors}</span>
            </div>
          </div>

          {/* Orders Counter */}
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4 border border-white/5">
            <div className="bg-indigo-600/10 border border-indigo-500/20 p-3.5 rounded-xl text-indigo-400">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Today's Orders</span>
              <span className="text-2xl font-black text-white">{stats.ordersCount}</span>
            </div>
          </div>

          {/* Revenue */}
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4 border border-white/5">
            <div className="bg-amber-600/10 border border-amber-500/20 p-3.5 rounded-xl text-amber-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Sales Revenue</span>
              <span className="text-2xl font-black text-white">{formatPrice(stats.revenue)}</span>
            </div>
          </div>

          {/* Conversion */}
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4 border border-white/5">
            <div className="bg-emerald-600/10 border border-emerald-500/20 p-3.5 rounded-xl text-emerald-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Conversion Rate</span>
              <span className="text-2xl font-black text-white">{stats.conversionRate}%</span>
            </div>
          </div>
        </section>
      )}

      {/* System Metrics */}
      {systemMetric && (
        <section className="bg-[#0f0e1a]/40 border border-violet-950/20 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider">Valkey Cache Server Status</span>
              <p className="text-[10px] text-gray-500 mt-0.5">Primary connection health and system metrics</p>
            </div>
          </div>
          <div className="flex gap-6 text-xs">
            <div className="flex flex-col">
              <span className="text-gray-500">Connection</span>
              <span className="text-emerald-400 font-bold uppercase mt-0.5">{systemMetric.status}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500">PING Latency</span>
              <span className="text-white font-bold mt-0.5">{systemMetric.latencyMs} ms</span>
            </div>
          </div>
        </section>
      )}

      {/* Analytics Lists */}
      {stats && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Top Searches */}
          <div className="glass-panel border border-white/5 rounded-3xl p-6 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 border-b border-white/5 pb-3">
              <Search className="w-4 h-4 text-violet-400" /> Top Search Queries Today
            </h3>
            {stats.topSearches.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">No queries logged yet today</p>
            ) : (
              <div className="flex flex-col gap-2">
                {stats.topSearches.map((s: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-xl text-xs text-gray-300">
                    <span className="font-semibold">"{s.query}"</span>
                    <span className="bg-violet-950/60 border border-violet-500/10 px-2 py-0.5 rounded-full text-violet-300 font-bold">
                      {s.count} hits
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Viewed Products */}
          <div className="glass-panel border border-white/5 rounded-3xl p-6 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 border-b border-white/5 pb-3">
              <Eye className="w-4 h-4 text-violet-400" /> Top Viewed Products Today
            </h3>
            {stats.topProducts.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">No products viewed yet today</p>
            ) : (
              <div className="flex flex-col gap-2">
                {stats.topProducts.map((p: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-xl text-xs text-gray-300">
                    <span className="truncate pr-3 max-w-[70%] font-semibold">{p.name}</span>
                    <span className="bg-indigo-950/60 border border-indigo-500/10 px-2 py-0.5 rounded-full text-indigo-300 font-bold shrink-0">
                      {p.views} views
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Brain, Bot, User, Send, ArrowRight } from 'lucide-react';
import { api } from '../api/client.js';
import { useCartStore } from '../stores/cartStore.js';
import { Link } from 'react-router-dom';

interface Message {
  sender: 'user' | 'ai';
  text: string;
  products?: any[];
}

export default function AIAssistantPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: 'Hello! I am your Valkey Commerce AI Personal Shopper. Ask me anything, like "Suggest shoes for marathon training" or "I need a laptop for coding". I can recommend items instantly!',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addItem } = useCartStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuery = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userQuery }]);
    setLoading(true);

    try {
      const res = await api.post('/api/ai/chat', { query: userQuery });
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: res.data.explanation,
          products: res.data.products || [],
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Sorry, I encountered an issue while processing your request. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (pId: string) => {
    try {
      await addItem(pId, 1);
      alert('Added to cart!');
    } catch (err: any) {
      alert(err.message || 'Out of stock');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col h-[calc(100vh-140px)] gap-6">
      
      {/* Page Title */}
      <div className="border-b border-white/5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-violet-600 p-2 rounded-xl text-white">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
              AI Conversational Shopper <span className="bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[10px] font-bold py-0.5 px-2 rounded-full uppercase tracking-wider">Active</span>
            </h1>
            <p className="text-gray-400 text-xs mt-0.5">Semantic suggestions powered by Valkey indexes</p>
          </div>
        </div>
      </div>

      {/* Chat Messages Block */}
      <div className="flex-1 glass-panel border border-white/5 rounded-3xl p-6 overflow-y-auto flex flex-col gap-6">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex gap-4 max-w-[80%] ${m.sender === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
            <div className={`p-2 rounded-xl h-9 w-9 flex items-center justify-center shrink-0 ${m.sender === 'user' ? 'bg-white/10' : 'bg-violet-950/80 border border-violet-500/10 text-violet-400'}`}>
              {m.sender === 'user' ? <User className="w-4.5 h-4.5" /> : <Bot className="w-4.5 h-4.5" />}
            </div>

            <div className="flex flex-col gap-3">
              <div className={`rounded-3xl p-4 text-sm leading-relaxed ${m.sender === 'user' ? 'bg-violet-600 text-white rounded-tr-none' : 'bg-white/5 text-gray-200 rounded-tl-none border border-white/5'}`}>
                {m.text}
              </div>

              {m.products && m.products.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  {m.products.map((p) => (
                    <div key={p.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4 hover:bg-white/10 transition-colors">
                      <div className="min-w-0 flex-1">
                        <Link to={`/products/${p.id}`} className="text-xs font-bold text-gray-200 truncate hover:text-violet-400 transition-colors block">
                          {p.name}
                        </Link>
                        <span className="text-[10px] text-gray-400 mt-1 block">₹{p.price.amount / 100}</span>
                      </div>
                      <button
                        onClick={() => handleAddToCart(p.id)}
                        className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold py-1.5 px-4 rounded-xl transition-all shrink-0 flex items-center gap-1 active:scale-95"
                      >
                        Add <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-4 self-start items-center">
            <div className="p-2 rounded-xl bg-violet-950/80 border border-violet-500/10 text-violet-400 shrink-0">
              <Bot className="w-4.5 h-4.5 animate-pulse" />
            </div>
            <div className="bg-white/5 border border-white/5 rounded-3xl p-4 text-xs text-gray-400 animate-pulse">
              Parsing query context & retrieving catalog maps...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Query input form */}
      <form onSubmit={handleSendMessage} className="flex gap-3">
        <input
          type="text"
          placeholder="Ask e.g. 'Suggest a laptop under 50000 for gaming'"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="flex-1 bg-[#12121a] border border-white/10 rounded-2xl py-3 px-5 text-sm text-gray-200 focus:outline-none focus:border-violet-500"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-violet-600 hover:bg-violet-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-2xl px-6 py-3 transition-all flex items-center gap-1.5 shadow-lg shadow-violet-600/20 shrink-0 font-semibold text-sm active:scale-95"
        >
          Send <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
}

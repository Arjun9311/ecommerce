import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Brain, Bot, User, ArrowRight } from 'lucide-react';
import { api } from '../../api/client.js';
import { useCartStore } from '../../stores/cartStore.js';
import { Link } from 'react-router-dom';

interface Message {
  sender: 'user' | 'ai';
  text: string;
  products?: any[];
}

export default function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
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
  }, [messages, isOpen]);

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
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full p-4 hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center gap-2 group glow-purple"
        >
          <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
          <span className="text-sm font-semibold pr-1">AI Shopper</span>
        </button>
      )}

      {/* Main Chat Panel */}
      {isOpen && (
        <div className="w-80 md:w-96 h-[500px] rounded-3xl glass-panel shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-950/80 to-indigo-950/80 p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-violet-600 p-1.5 rounded-lg">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  Valkey AI Assistant <span className="bg-violet-500/20 text-violet-300 text-[9px] px-1.5 py-0.5 rounded-full border border-violet-500/20">Active</span>
                </h3>
                <span className="text-[10px] text-gray-400">Powered by Valkey Semantic Cache</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex gap-3 max-w-[85%] ${m.sender === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
                {/* Avatar */}
                <div className={`p-1.5 rounded-lg h-8 w-8 flex items-center justify-center shrink-0 ${m.sender === 'user' ? 'bg-white/10' : 'bg-violet-950/80 border border-violet-500/10'}`}>
                  {m.sender === 'user' ? <User className="w-4 h-4 text-gray-300" /> : <Bot className="w-4 h-4 text-violet-400" />}
                </div>

                <div className="flex flex-col gap-2">
                  {/* Text bubble */}
                  <div className={`rounded-2xl p-3 text-xs leading-relaxed ${m.sender === 'user' ? 'bg-violet-600 text-white rounded-tr-none' : 'bg-white/5 text-gray-200 rounded-tl-none border border-white/5'}`}>
                    {m.text}
                  </div>

                  {/* Render recommended products */}
                  {m.products && m.products.length > 0 && (
                    <div className="flex flex-col gap-2 mt-1">
                      {m.products.map((p) => (
                        <div key={p.id} className="bg-white/5 border border-white/5 rounded-xl p-2.5 flex items-center justify-between gap-3 hover:bg-white/10 transition-colors">
                          <Link to={`/products/${p.id}`} onClick={() => setIsOpen(false)} className="flex-1 min-w-0">
                            <h4 className="text-[11px] font-bold text-gray-200 truncate hover:text-violet-400 transition-colors">{p.name}</h4>
                            <span className="text-[10px] font-semibold text-gray-400">₹{p.price.amount / 100}</span>
                          </Link>
                          <button
                            onClick={() => handleAddToCart(p.id)}
                            className="bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold py-1 px-2.5 rounded-lg transition-colors flex items-center gap-1 shrink-0"
                          >
                            Add <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 self-start items-center">
                <div className="p-1.5 rounded-lg bg-violet-950/80 border border-violet-500/10 shrink-0">
                  <Bot className="w-4 h-4 text-violet-400 animate-pulse" />
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-3 text-[10px] text-gray-400 animate-pulse">
                  Analyzing semantic catalog...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 flex gap-2">
            <input
              type="text"
              placeholder="Ask for recommendations..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 bg-white/5 border border-white/5 rounded-full py-2 px-4 text-xs text-gray-200 focus:outline-none focus:border-violet-500/50 placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-violet-600 hover:bg-violet-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-full p-2 hover:scale-105 active:scale-95 transition-all shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

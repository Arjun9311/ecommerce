import React from 'react';
import { Database, Github, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#08080c] py-12 px-6 md:px-12 mt-20 text-gray-500 text-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left Side */}
        <div className="flex flex-col gap-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-gray-300 font-semibold">
            <Database className="w-4 h-4 text-violet-500" />
            <span>Valkey Commerce AI</span>
          </div>
          <p className="max-w-md text-gray-500">
            A premium high-performance e-commerce platform built for the Valkey Hackathon. Demonstrating real-world usage of Valkey JSON, Search, Bloom filters, and Pub/Sub.
          </p>
        </div>

        {/* Right Side */}
        <div className="flex flex-col items-center md:items-end gap-2 text-center">
          <div className="flex items-center gap-4 text-gray-400">
            <a href="https://github.com/opensource-for-valkey/valkey-ecommerce-demo" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              <Github className="w-5 h-5" />
            </a>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span>Powered by Valkey 9.0</span>
            <span className="text-gray-600">|</span>
            <span>Created with</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
            <span>in Hyderabad</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

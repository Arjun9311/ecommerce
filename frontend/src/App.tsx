import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/layout/Header.js';
import Footer from './components/layout/Footer.js';
import AIAssistantWidget from './components/ai/AIAssistantWidget.js';

import HomePage from './pages/HomePage.js';
import ShopPage from './pages/ShopPage.js';
import ProductPage from './pages/ProductPage.js';
import CartPage from './pages/CartPage.js';
import CheckoutPage from './pages/CheckoutPage.js';
import AccountPage from './pages/AccountPage.js';
import SearchPage from './pages/SearchPage.js';
import AdminDashboard from './pages/AdminDashboard.js';
import AIAssistantPage from './pages/AIAssistantPage.js';

import { useAuthStore } from './stores/authStore.js';

export default function App() {
  const { loadMe } = useAuthStore();

  useEffect(() => {
    loadMe();
  }, []);

  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        <Header />
        
        {/* Main Content Area */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/products/:id" element={<ProductPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/ai-assistant" element={<AIAssistantPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>

        <Footer />
        
        {/* Floating AI Widget available across all pages */}
        <AIAssistantWidget />
      </div>
    </BrowserRouter>
  );
}

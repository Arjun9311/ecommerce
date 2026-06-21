import { create } from 'zustand';
import { api } from '../api/client.js';

export interface CartItem {
  productId: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  couponCode: string | null;
  discount: number;
  subtotal: number;
  total: number;
}

interface CartState {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  clearCartLocal: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  cart: null,
  loading: false,
  error: null,

  fetchCart: async () => {
    set({ loading: true });
    try {
      const res = await api.get('/api/cart');
      set({ cart: res.data, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message });
    }
  },

  addItem: async (productId, quantity) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/api/cart/items', { productId, quantity });
      set({ cart: res.data, loading: false });
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to add item';
      set({ loading: false, error: errMsg });
      throw new Error(errMsg);
    }
  },

  removeItem: async (productId) => {
    set({ loading: true, error: null });
    try {
      const res = await api.delete(`/api/cart/items/${productId}`);
      set({ cart: res.data, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message });
    }
  },

  updateQuantity: async (productId, quantity) => {
    set({ error: null });
    try {
      const res = await api.patch(`/api/cart/items/${productId}`, { quantity });
      set({ cart: res.data });
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to update quantity';
      set({ error: errMsg });
      throw new Error(errMsg);
    }
  },

  applyCoupon: async (code) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/api/cart/coupon', { code });
      set({ cart: res.data, loading: false });
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to apply coupon';
      set({ loading: false, error: errMsg });
      throw new Error(errMsg);
    }
  },

  removeCoupon: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.delete('/api/cart/coupon');
      set({ cart: res.data, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message });
    }
  },

  clearCartLocal: () => {
    set({ cart: null });
  },
}));

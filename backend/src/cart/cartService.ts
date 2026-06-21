import { valkey, jsonGet, jsonSet } from '../valkey/client.js';
import { config } from '../config/index.js';
import { ProductService } from '../products/productService.js';

export interface CartItem {
  productId: string;
  sku: string;
  name: string;
  price: number; // in paise
  quantity: number;
  imageUrl: string;
}

export interface Cart {
  userId: string; // or sessionId for guest
  items: CartItem[];
  couponCode: string | null;
  discount: number; // in paise
  subtotal: number;
  total: number;
  updatedAt: string;
}

export class CartService {
  /**
   * Helper to fetch a cart by userId or guest sessionId from Valkey JSON.
   */
  static async getCart(userId: string): Promise<Cart> {
    const key = `cart:${userId}`;
    let cart = await jsonGet<Cart>(key);
    
    if (!cart) {
      cart = {
        userId,
        items: [],
        couponCode: null,
        discount: 0,
        subtotal: 0,
        total: 0,
        updatedAt: new Date().toISOString(),
      };
      await jsonSet(key, cart);
      await valkey.expire(key, config.cartTTL);
    }
    
    return cart;
  }

  /**
   * Add or update items in cart.
   */
  static async addItem(userId: string, productId: string, quantity: number): Promise<Cart> {
    const cart = await this.getCart(userId);
    
    // Check if product exists and get price/name details
    const product = await ProductService.getProduct(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (product.inventory.quantity < quantity) {
      throw new Error('Insufficient product stock available');
    }

    const itemIndex = cart.items.findIndex((item) => item.productId === productId);
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
      if (cart.items[itemIndex].quantity <= 0) {
        cart.items.splice(itemIndex, 1);
      }
    } else if (quantity > 0) {
      cart.items.push({
        productId,
        sku: product.sku,
        name: product.name,
        price: product.price.amount,
        quantity,
        imageUrl: product.images[0]?.url || '',
      });
    }

    await this.calculateTotals(cart);
    
    const key = `cart:${userId}`;
    await jsonSet(key, cart);
    await valkey.expire(key, config.cartTTL);
    
    return cart;
  }

  /**
   * Remove item from cart.
   */
  static async removeItem(userId: string, productId: string): Promise<Cart> {
    const cart = await this.getCart(userId);
    cart.items = cart.items.filter((item) => item.productId !== productId);
    
    await this.calculateTotals(cart);
    
    const key = `cart:${userId}`;
    await jsonSet(key, cart);
    await valkey.expire(key, config.cartTTL);
    
    return cart;
  }

  /**
   * Update item quantity directly.
   */
  static async updateQuantity(userId: string, productId: string, quantity: number): Promise<Cart> {
    const cart = await this.getCart(userId);
    const itemIndex = cart.items.findIndex((item) => item.productId === productId);
    
    if (itemIndex > -1) {
      if (quantity <= 0) {
        cart.items.splice(itemIndex, 1);
      } else {
        // Validate stock
        const product = await ProductService.getProduct(productId);
        if (product && product.inventory.quantity < quantity) {
          throw new Error(`Only ${product.inventory.quantity} units are in stock`);
        }
        cart.items[itemIndex].quantity = quantity;
      }
    }
    
    await this.calculateTotals(cart);
    
    const key = `cart:${userId}`;
    await jsonSet(key, cart);
    await valkey.expire(key, config.cartTTL);
    
    return cart;
  }

  /**
   * Clear cart.
   */
  static async clearCart(userId: string): Promise<void> {
    const key = `cart:${userId}`;
    await valkey.del(key);
  }

  /**
   * Apply coupon code and validate rules using coupon object in Valkey JSON.
   */
  static async applyCoupon(userId: string, code: string): Promise<Cart> {
    const cart = await this.getCart(userId);
    const couponKey = `coupon:${code.toUpperCase()}`;
    const coupon = await jsonGet<any>(couponKey);

    if (!coupon || !coupon.active) {
      throw new Error('Invalid or inactive coupon code');
    }

    const now = new Date();
    if (new Date(coupon.validFrom) > now || new Date(coupon.validUntil) < now) {
      throw new Error('This coupon has expired');
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      throw new Error('Coupon usage limit reached');
    }

    // Check if user already used this coupon
    const hasUsed = await valkey.sismember(`coupon_used:${code.toUpperCase()}`, userId);
    if (hasUsed) {
      throw new Error('You have already redeemed this coupon');
    }

    if (cart.subtotal < coupon.minOrderAmount) {
      throw new Error(`Minimum order value of ${coupon.minOrderAmount / 100} INR required`);
    }

    cart.couponCode = code.toUpperCase();
    await this.calculateTotals(cart);

    const key = `cart:${userId}`;
    await jsonSet(key, cart);
    await valkey.expire(key, config.cartTTL);

    return cart;
  }

  /**
   * Remove coupon.
   */
  static async removeCoupon(userId: string): Promise<Cart> {
    const cart = await this.getCart(userId);
    cart.couponCode = null;
    cart.discount = 0;
    cart.total = cart.subtotal;

    const key = `cart:${userId}`;
    await jsonSet(key, cart);
    await valkey.expire(key, config.cartTTL);

    return cart;
  }

  /**
   * Merge guest cart into user cart upon login.
   */
  static async mergeCarts(guestSessionId: string, userId: string): Promise<Cart> {
    const guestCart = await this.getCart(guestSessionId);
    const userCart = await this.getCart(userId);

    for (const guestItem of guestCart.items) {
      const userItemIndex = userCart.items.findIndex((item) => item.productId === guestItem.productId);
      if (userItemIndex > -1) {
        userCart.items[userItemIndex].quantity += guestItem.quantity;
      } else {
        userCart.items.push(guestItem);
      }
    }

    if (guestCart.couponCode && !userCart.couponCode) {
      userCart.couponCode = guestCart.couponCode;
    }

    await this.calculateTotals(userCart);
    
    // Save user cart
    const userKey = `cart:${userId}`;
    await jsonSet(userKey, userCart);
    await valkey.expire(userKey, config.cartTTL);

    // Delete guest cart
    await this.clearCart(guestSessionId);

    return userCart;
  }

  /**
   * Recalculates subtotal, discount and totals.
   */
  private static async calculateTotals(cart: Cart): Promise<void> {
    cart.subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    cart.updatedAt = new Date().toISOString();

    if (cart.couponCode) {
      const coupon = await jsonGet<any>(`coupon:${cart.couponCode}`);
      if (coupon) {
        if (coupon.type === 'percentage') {
          const calculatedDiscount = Math.floor(cart.subtotal * (coupon.value / 100));
          cart.discount = Math.min(calculatedDiscount, coupon.maxDiscount);
        } else if (coupon.type === 'fixed') {
          cart.discount = Math.min(coupon.value, cart.subtotal);
        }
      } else {
        cart.couponCode = null;
        cart.discount = 0;
      }
    } else {
      cart.discount = 0;
    }

    cart.total = Math.max(0, cart.subtotal - cart.discount);
  }
}

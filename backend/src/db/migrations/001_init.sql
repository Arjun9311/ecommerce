-- Valkey Commerce AI - Database Schema
-- Migration 001: Initial schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (canonical persistence)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  avatar TEXT,
  role TEXT NOT NULL DEFAULT 'customer',
  preferences JSONB DEFAULT '{"currency":"INR","language":"en","notifications":true}',
  addresses JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  parent_id TEXT REFERENCES categories(id),
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  logo TEXT,
  rating NUMERIC(3,2) DEFAULT 4.5,
  total_products INT DEFAULT 0,
  total_sales INT DEFAULT 0,
  address JSONB,
  verified BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products table (canonical persistence)
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  short_description TEXT,
  category_id TEXT REFERENCES categories(id),
  vendor_id TEXT REFERENCES vendors(id),
  brand TEXT NOT NULL,
  price BIGINT NOT NULL,           -- in paise (smallest currency unit)
  compare_at BIGINT,               -- original price in paise
  currency TEXT DEFAULT 'INR',
  images JSONB DEFAULT '[]',
  attributes JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  stock INT NOT NULL DEFAULT 0,
  reserved INT DEFAULT 0,
  warehouse TEXT DEFAULT 'HYD-WH-01',
  rating_average NUMERIC(3,2) DEFAULT 0,
  rating_count INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  subtotal BIGINT NOT NULL,
  discount BIGINT DEFAULT 0,
  coupon_code TEXT,
  tax BIGINT DEFAULT 0,
  shipping BIGINT DEFAULT 0,
  total BIGINT NOT NULL,
  shipping_address JSONB,
  payment JSONB,
  delivery JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id),
  product_id TEXT REFERENCES products(id),
  vendor_id TEXT REFERENCES vendors(id),
  sku TEXT,
  name TEXT NOT NULL,
  quantity INT NOT NULL,
  price BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id),
  user_id TEXT REFERENCES users(id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  verified_purchase BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Wishlist table
CREATE TABLE IF NOT EXISTS wishlist_items (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  product_id TEXT REFERENCES products(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist_items(user_id);

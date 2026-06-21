import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';

import { config } from './config/index.js';
import { rateLimiter } from './middleware/rateLimit.js';
import { errorHandler } from './middleware/error.js';

import authRoutes from './auth/authRoutes.js';
import productRoutes from './products/productRoutes.js';
import cartRoutes from './cart/cartRoutes.js';
import orderRoutes from './orders/orderRoutes.js';
import trendingRoutes from './trending/trendingRoutes.js';
import recRoutes from './recommendations/recommendationRoutes.js';
import adRoutes from './ads/adRoutes.js';
import aiRoutes from './ai/aiRoutes.js';
import analyticsRoutes from './analytics/analyticsRoutes.js';
import searchRoutes from './search/searchRoutes.js';

import { checkValkeyHealth } from './valkey/client.js';

const app = express();

// Security Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: config.cors.origin, credentials: true }));

// Performance Middlewares
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

// Rate Limiting
app.use(rateLimiter);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const valkeyHealth = await checkValkeyHealth();
    res.status(200).json({
      status: 'healthy',
      env: config.env,
      valkey: valkeyHealth,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// Routes API Mapping
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/trending', trendingRoutes);
app.use('/api/recommendations', recRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/search', searchRoutes);

// Error handling
app.use(errorHandler);

export default app;

// ===== TryOnix — Vercel Serverless Function Entry Point =====
// This wraps the Express app so all /api/* routes work as a single serverless function.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import authRoutes from '../server/routes/auth.js';
import recommendRoutes from '../server/routes/recommend.js';
import tryonRoutes from '../server/routes/tryon.js';
import outfitRoutes from '../server/routes/outfits.js';
import avatarRoutes from '../server/routes/avatar.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/recommend', recommendRoutes);
app.use('/api/tryon', tryonRoutes);
app.use('/api/outfits', outfitRoutes);
app.use('/api/avatar', avatarRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;

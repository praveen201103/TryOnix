// ===== TryOnix — Express Server =====
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import recommendRoutes from './routes/recommend.js';
import tryonRoutes from './routes/tryon.js';
import outfitRoutes from './routes/outfits.js';
import avatarRoutes from './routes/avatar.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// Static files — serve uploaded avatars
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

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

// Start server
app.listen(PORT, () => {
  console.log(`\n  🎨 TryOnix API server running on http://localhost:${PORT}`);
  console.log(`  📂 Uploads: ${path.join(__dirname, '..', 'uploads')}\n`);
});

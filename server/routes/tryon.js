// ===== Try-On Routes =====
import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();
const FASHN_API_URL = 'https://api.fashn.ai/v1';

// POST /api/tryon/start — start a virtual try-on
router.post('/start', optionalAuth, async (req, res) => {
  try {
    const apiKey = process.env.FASHN_API_KEY;
    if (!apiKey || apiKey === 'your_api_key_here') {
      return res.status(503).json({
        error: 'Virtual try-on is not configured. Please add your FASHN.ai API key to the .env file.',
        code: 'API_KEY_MISSING',
      });
    }

    const { modelImage, garmentImage, category } = req.body;

    if (!modelImage || !garmentImage) {
      return res.status(400).json({ error: 'Both model image and garment image are required' });
    }

    const response = await fetch(`${FASHN_API_URL}/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_image: modelImage,
        garment_image: garmentImage,
        category: category || 'auto',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('FASHN API error:', err);
      return res.status(response.status).json({ error: 'Try-on API error', details: err });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Try-on start error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tryon/:id — poll for try-on status
router.get('/:id', async (req, res) => {
  try {
    const apiKey = process.env.FASHN_API_KEY;
    if (!apiKey || apiKey === 'your_api_key_here') {
      return res.status(503).json({ error: 'API key not configured' });
    }

    const response = await fetch(`${FASHN_API_URL}/status/${req.params.id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Status check failed' });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Try-on status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

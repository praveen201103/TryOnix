// ===== Auth Routes =====
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { generateToken, authenticate } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, gender } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = db.run(
      'INSERT INTO users (email, password_hash, name, gender) VALUES (?, ?, ?, ?)',
      [email, passwordHash, name, gender || 'unisex']
    );

    const user = { id: result.lastInsertRowid, email, name };
    const token = generateToken(user);

    res.status(201).json({ token, user: { id: user.id, email, name, gender: gender || 'unisex' } });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        gender: user.gender,
        body_type: user.body_type,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  try {
    const user = db.get('SELECT id, email, name, gender, body_type, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const avatar = db.get('SELECT image_path FROM avatars WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1', [user.id]);
    const savedCount = db.get('SELECT COUNT(*) as count FROM saved_outfits WHERE user_id = ?', [user.id]);

    res.json({
      ...user,
      avatar: avatar ? avatar.image_path : null,
      savedOutfitsCount: savedCount ? savedCount.count : 0,
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

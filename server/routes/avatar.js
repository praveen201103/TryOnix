// ===== Avatar Routes =====
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isVercel = process.env.VERCEL === '1';
const uploadsDir = isVercel
  ? '/tmp/uploads/avatars'
  : path.join(__dirname, '..', '..', 'uploads', 'avatars');
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

const router = Router();

// POST /api/avatar
router.post('/', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });

    await db.run('UPDATE avatars SET is_active = 0 WHERE user_id = ?', [req.user.id]);

    const imagePath = `/uploads/avatars/${req.file.filename}`;
    await db.run('INSERT INTO avatars (user_id, image_path, is_active) VALUES (?, ?, 1)', [req.user.id, imagePath]);

    res.status(201).json({ avatar: imagePath });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/avatar
router.get('/', authenticate, async (req, res) => {
  try {
    const avatar = await db.get('SELECT * FROM avatars WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1', [req.user.id]);
    res.json({ avatar: avatar ? avatar.image_path : null });
  } catch (err) {
    console.error('Get avatar error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/avatar/all
router.get('/all', authenticate, async (req, res) => {
  try {
    const avatars = await db.all('SELECT * FROM avatars WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(avatars);
  } catch (err) {
    console.error('List avatars error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/avatar/:id/activate
router.put('/:id/activate', authenticate, async (req, res) => {
  try {
    await db.run('UPDATE avatars SET is_active = 0 WHERE user_id = ?', [req.user.id]);
    const result = await db.run('UPDATE avatars SET is_active = 1 WHERE id = ? AND user_id = ?', [parseInt(req.params.id), req.user.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Avatar not found' });
    res.json({ message: 'Avatar activated' });
  } catch (err) {
    console.error('Activate avatar error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

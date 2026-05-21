// ===== Saved Outfits Routes =====
import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/outfits
router.get('/', authenticate, async (req, res) => {
  try {
    const outfits = await db.all('SELECT * FROM saved_outfits WHERE user_id = ? ORDER BY saved_at DESC', [req.user.id]);
    res.json(outfits);
  } catch (err) {
    console.error('List outfits error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/outfits
router.post('/', authenticate, async (req, res) => {
  try {
    const { outfitId, tryonResultUrl, notes } = req.body;
    if (!outfitId) return res.status(400).json({ error: 'Outfit ID is required' });

    // Check if already saved
    const existing = await db.get('SELECT id FROM saved_outfits WHERE user_id = ? AND outfit_id = ?', [req.user.id, outfitId]);
    if (existing) return res.status(409).json({ error: 'Outfit already saved' });

    const result = await db.run(
      'INSERT INTO saved_outfits (user_id, outfit_id, tryon_result_url, notes) VALUES (?, ?, ?, ?)',
      [req.user.id, outfitId, tryonResultUrl || null, notes || null]
    );

    res.status(201).json({ message: 'Outfit saved', id: result.lastInsertRowid });
  } catch (err) {
    console.error('Save outfit error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/outfits/:outfitId
router.delete('/:outfitId', authenticate, async (req, res) => {
  try {
    const result = await db.run('DELETE FROM saved_outfits WHERE user_id = ? AND outfit_id = ?', [req.user.id, req.params.outfitId]);
    if (result.changes === 0) return res.status(404).json({ error: 'Saved outfit not found' });
    res.json({ message: 'Outfit removed' });
  } catch (err) {
    console.error('Delete outfit error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

// ===== Recommendation Routes =====
import { Router } from 'express';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// Load outfit catalog
let outfits = [];
try {
  const raw = readFileSync(path.join(__dirname, '..', 'data', 'outfits.json'), 'utf-8');
  outfits = JSON.parse(raw);
} catch {
  console.warn('outfits.json not found or invalid, using empty catalog');
}

// POST /api/recommend
router.post('/', async (req, res) => {
  try {
    const { itemType, occasion, bodyType, budget, gender } = req.body;

    if (!occasion) {
      return res.status(400).json({ error: 'Occasion is required' });
    }

    // ---- Basic filtering (always runs as a fallback) ----
    let filteredResults = [...outfits];

    // Filter by item type
    if (itemType && itemType !== 'all') {
      if (itemType === 'Bottom') {
        filteredResults = filteredResults.filter(o => o.category === 'Bottom' || o.category === 'Jeans');
      } else {
        filteredResults = filteredResults.filter(o => o.category === itemType);
      }
    }

    // Filter by gender
    if (gender && gender !== 'all') {
      filteredResults = filteredResults.filter(o =>
        o.gender === gender || o.gender === 'unisex'
      );
    }

    // Score and filter by occasion
    filteredResults = filteredResults.map(outfit => {
      let score = 0;

      // Occasion match
      if (outfit.occasions.includes(occasion)) {
        score += 10;
      }

      // Body type match
      if (bodyType && outfit.bodyTypes.includes(bodyType)) {
        score += 5;
      } else if (bodyType && outfit.bodyTypes.includes('all')) {
        score += 3;
      }

      // Budget match
      if (budget && outfit.priceRange === budget) {
        score += 5;
      }

      return { ...outfit, score };
    });

    // Filter out zero-score outfits (no occasion match)
    filteredResults = filteredResults.filter(o => o.score > 0);

    // Sort by score descending
    filteredResults.sort((a, b) => b.score - a.score);

    // ---- Gemini AI Recommendation ----
    let results = filteredResults;
    let aiRecommendation = null;

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey !== '') {
      try {
        const ai = new GoogleGenAI({ apiKey });

        // Build a compact catalog summary for Gemini (send only matching items to save tokens)
        const catalogForAI = filteredResults.slice(0, 30).map(o => ({
          id: o.id,
          name: o.name,
          price: o.price,
          category: o.category,
          occasions: o.occasions,
          bodyTypes: o.bodyTypes,
          gender: o.gender,
          priceRange: o.priceRange
        }));

        const prompt = `You are an expert AI fashion stylist for the TryOnix platform.

USER PREFERENCES:
- Gender: ${gender || 'any'}
- Occasion: ${occasion}
- Body Type: ${bodyType || 'not specified'}
- Budget Range: ${budget || 'flexible'}
- Looking for: ${itemType || 'any item'}

Here is our available catalog (JSON):
${JSON.stringify(catalogForAI, null, 0)}

Please do TWO things:
1. Pick the TOP 8 best outfit IDs from the catalog that suit the user's preferences. Rank them by relevance. Return them as a JSON array of IDs.
2. Write a short, engaging, personalized 2-3 sentence stylist note explaining your picks and what styles work best for their body type and occasion. Be encouraging and fashionable.

RESPOND in this EXACT JSON format only, no extra text:
{"topPicks": ["item_1", "item_2", ...], "stylistNote": "Your personalized note here..."}`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        const text = response.text.trim();
        // Extract JSON from the response (handle possible markdown code fences)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);

          if (parsed.topPicks && Array.isArray(parsed.topPicks)) {
            // Re-order results: put Gemini's top picks first, then the rest
            const pickedIds = new Set(parsed.topPicks);
            const topItems = [];
            const restItems = [];

            for (const item of filteredResults) {
              if (pickedIds.has(item.id)) {
                topItems.push({ ...item, aiPicked: true });
              } else {
                restItems.push(item);
              }
            }

            // Sort top items in the order Gemini recommended
            topItems.sort((a, b) => {
              return parsed.topPicks.indexOf(a.id) - parsed.topPicks.indexOf(b.id);
            });

            results = [...topItems, ...restItems];
          }

          if (parsed.stylistNote) {
            aiRecommendation = parsed.stylistNote;
          }
        }

        console.log('✨ Gemini AI recommendation generated successfully');
      } catch (aiErr) {
        console.error('Gemini API error:', aiErr.message || aiErr);
        // Fall through to return basic filtered results
      }
    }

    // ---- Attempt live product fetch (Snitch.in) ----
    let liveResults = [];
    try {
      if ((gender === 'male' || gender === 'unisex') && (itemType === 'Top' || itemType === 'Bottom')) {
        const collection = itemType === 'Top' ? 'shirts' : 'jeans';
        const response = await fetch(`https://www.snitch.in/collections/${collection}/products.json?limit=5`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(3000)
        });

        if (response.ok) {
          const data = await response.json();
          liveResults = data.products.map(p => ({
            id: `snitch_${p.id}`,
            name: p.title,
            description: p.body_html?.replace(/<[^>]+>/g, '') || 'Premium quality from Snitch.in',
            price: parseFloat(p.variants[0]?.price || 0),
            priceRange: budget || '2000-4000',
            gender: 'male',
            occasions: [occasion, 'casual', 'party'],
            bodyTypes: ['slim', 'athletic', 'average', 'all'],
            pieces: [itemType],
            imageUrl: p.images[0]?.src || 'https://placehold.co/400x500/1A1A2E/E94560?text=TryOnix',
            category: itemType,
            score: 20
          }));
          console.log(`Successfully fetched ${liveResults.length} live products from Snitch.in`);
        }
      }
    } catch (apiErr) {
      console.log('Real-time API fetch failed (likely bot protection), falling back to local database.');
    }

    // Combine: live results first, then AI-ordered results
    results = [...liveResults, ...results];

    res.json({
      results,
      total: results.length,
      filters: { occasion, bodyType, budget, gender },
      aiRecommendation
    });
  } catch (err) {
    console.error('Recommendation error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/recommend/occasions — list available occasions
router.get('/occasions', (req, res) => {
  const occasions = [
    { id: 'casual', name: 'Casual', icon: '👕', description: 'Everyday relaxed looks' },
    { id: 'office', name: 'Office / Formal', icon: '💼', description: 'Professional work attire' },
    { id: 'wedding', name: 'Wedding / Festive', icon: '🎊', description: 'Celebrations & ceremonies' },
    { id: 'party', name: 'Party / Nightlife', icon: '🎉', description: 'Night out & club wear' },
    { id: 'date-night', name: 'Date Night', icon: '💕', description: 'Romantic evening looks' },
    { id: 'beach', name: 'Beach / Vacation', icon: '🏖️', description: 'Tropical & resort wear' },
    { id: 'workout', name: 'Workout / Athleisure', icon: '🏋️', description: 'Active & sporty styles' },
    { id: 'interview', name: 'Interview', icon: '🤝', description: 'Make a great first impression' },
  ];
  res.json(occasions);
});

// GET /api/recommend/outfits/:id — get single outfit
router.get('/outfits/:id', (req, res) => {
  const outfit = outfits.find(o => o.id === req.params.id);
  if (!outfit) return res.status(404).json({ error: 'Outfit not found' });
  res.json(outfit);
});

export default router;

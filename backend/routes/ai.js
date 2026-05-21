const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const ai = require('../services/ai');

/**
 * POST /api/ai/enhance
 * Enhances text for the manual post creator.
 */
router.post('/enhance', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { text, mode } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required for enhancement.' });
    }
    if (!mode) {
      return res.status(400).json({ error: 'Mode is required.' });
    }

    // Fetch user settings for context
    const { data: settings } = await supabase
      .from('automation_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    let result = await ai.enhanceText(text, mode, settings || {});
    
    if (mode === 'image') {
      const seed = Math.floor(Math.random() * 1000000);
      result = `https://image.pollinations.ai/prompt/${encodeURIComponent(result)}?width=1080&height=1080&nologo=true&seed=${seed}`;
    }

    return res.json({ success: true, result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
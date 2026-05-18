const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET /api/profile/me
router.get('/me', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.sub)
      .single();

    if (error) return res.status(404).json({ error: 'Profile not found' });

    res.json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
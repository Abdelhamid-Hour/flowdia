const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// POST /api/automation/run
router.post('/run', async (req, res, next) => {
  try {
    const userId = req.user.sub; // Extracted from JWT by middleware
    const { action } = req.body;

    // Example database operation
    const { data, error } = await supabase
      .from('automation_logs')
      .insert([{ user_id: userId, action, status: 'started' }]);

    if (error) throw error;

    res.status(200).json({ 
      success: true, 
      message: 'Automation triggered',
      data 
    });
  } catch (error) {
    next(error); // Sends to the Global Error Handler in server.js
  }
});

module.exports = router;
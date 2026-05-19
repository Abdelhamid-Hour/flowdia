const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

/**
 * GET /api/notifications
 * Returns a list of notifications for the user.
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return res.json({ success: true, notifications: data || [] });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Marks a notification as read.
 */
router.patch('/:id/read', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, notification: data });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/notifications/mark-all-read
 * Marks all notifications for the user as read.
 */
router.patch('/mark-all-read', async (req, res, next) => {
  try {
    const userId = req.user.sub;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

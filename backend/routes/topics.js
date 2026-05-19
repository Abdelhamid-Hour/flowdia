const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const automation = require('../services/automation');

/**
 * GET /api/topics
 * Returns a list of topics for the user, with status/search filters.
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { status, search, page = 1, limit = 20 } = req.query;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('topics')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('target_date', { ascending: false })
      .range(from, to);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return res.json({
      success: true,
      topics: data || [],
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: count > from + data.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/topics
 * Manually create a new topic.
 */
router.post('/', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { title, brief, target_date, status = 'scheduled' } = req.body;

    if (!title || !target_date) {
      return res.status(400).json({ error: 'Title and target_date are required.' });
    }

    const { data, error } = await supabase
      .from('topics')
      .insert({
        user_id: userId,
        title,
        brief,
        target_date,
        status
      })
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, topic: data });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/topics/:id
 * Update title, brief, or target_date.
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { id } = req.params;
    const { title, brief, target_date, status } = req.body;

    // 1. Fetch current status
    const { data: existing, error: fetchError } = await supabase
      .from('topics')
      .select('status')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Topic not found.' });
    }

    if (existing.status === 'archived') {
      return res.status(400).json({ 
        error: 'ValidationError', 
        message: 'Archived topics cannot be edited. Please create a new version instead.' 
      });
    }

    // 2. Perform update
    const { data, error } = await supabase
      .from('topics')
      .update({ title, brief, target_date, status })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, topic: data });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/topics/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { id } = req.params;

    const { error } = await supabase
      .from('topics')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return res.json({ success: true, message: 'Topic deleted.' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/topics/:id/promote
 * Archives previous in_use topic and promotes this one.
 */
router.post('/:id/promote', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { id } = req.params;

    // 1. Archive current in_use
    await supabase
      .from('topics')
      .update({ status: 'archived' })
      .eq('user_id', userId)
      .eq('status', 'in_use');

    // 2. Promote this one
    const { data, error } = await supabase
      .from('topics')
      .update({ status: 'in_use' })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    // 3. Trigger immediate post generation for today
    const { data: settings } = await supabase
      .from('automation_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (settings) {
      automation.handleUserAutomation(settings).catch(err => {
        console.error('[Topics Route] Failed to trigger immediate run:', err);
      });
    }

    return res.json({ success: true, topic: data });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/topics/swap-dates
 * Swaps target_dates between two topics for reordering.
 */
router.post('/swap-dates', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { id1, date1, id2, date2 } = req.body;

    // Use RPC or separate updates (Supabase doesn't have cross-row transaction in REST easy)
    const update1 = supabase.from('topics').update({ target_date: date2 }).eq('id', id1).eq('user_id', userId);
    const update2 = supabase.from('topics').update({ target_date: date1 }).eq('id', id2).eq('user_id', userId);

    const results = await Promise.all([update1, update2]);
    const error = results.find(r => r.error);
    if (error) throw error.error;

    return res.json({ success: true, message: 'Dates swapped.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
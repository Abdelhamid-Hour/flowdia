const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const facebook = require('../services/facebook');

/**
 * GET /api/history
 * Returns a paginated list of pushed or failed posts for the authenticated user.
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { status, search, page = 1, limit = 10 } = req.query;

    // Validate status: history only shows 'pushed', 'failed', or 'deleted'
    const allowedStatuses = ['pushed', 'failed', 'deleted'];
    const targetStatus = allowedStatuses.includes(status) ? status : 'pushed';

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('posts')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', targetStatus)
      .order('scheduled_publish_time', { ascending: false })
      .range(from, to);

    if (search) {
      query = query.ilike('caption', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return res.json({
      success: true,
      posts: data || [],
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
 * POST /api/history/:id/reschedule
 * Endpoint to immediately retry publishing a failed post natively to Facebook.
 */
router.post('/:id/reschedule', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { id } = req.params;

    // 1. Fetch the failed post
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    let nativePostId = null;
    let finalStatus = 'scheduled';
    let errorLog = null;

    // 2. Attempt to publish immediately to Facebook
    try {
      const fbResponse = await facebook.publishNow(userId, post.caption, post.image_url);
      nativePostId = fbResponse.id || fbResponse.post_id;
      finalStatus = 'pushed';
    } catch (fbError) {
      console.error(`[History API] Reschedule failed for post ${id}:`, fbError);
      finalStatus = 'failed';
      errorLog = fbError.message;
    }

    // 3. Update database
    const { data, error } = await supabase
      .from('posts')
      .update({ 
        status: finalStatus, 
        error_log: errorLog,
        native_post_id: nativePostId,
        scheduled_publish_time: new Date().toISOString() 
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    if (finalStatus === 'failed') {
      throw new Error(`Retry failed: ${errorLog}`);
    }

    return res.json({
      success: true,
      message: 'Post successfully published.',
      post: data
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

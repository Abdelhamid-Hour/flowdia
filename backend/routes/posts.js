const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const ai = require('../services/ai');
const facebook = require('../services/facebook');

/**
 * GET /api/posts
 * Returns a list of posts for the calendar/dashboard.
 * Query params: start, end (dates), status.
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { start, end, status } = req.query;

    let query = supabase
      .from('posts')
      .select('*, topics(title)')
      .eq('user_id', userId);

    if (start) query = query.gte('scheduled_publish_time', start);
    if (end) query = query.lte('scheduled_publish_time', end);
    if (status && status !== 'all') query = query.eq('status', status);

    const { data, error } = await query.order('scheduled_publish_time', { ascending: true });

    if (error) throw error;

    return res.json({ success: true, posts: data || [] });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/posts
 * Create a manual post. Modes: 'draft', 'now', 'schedule'.
 */
router.post('/', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { topic_id, caption, image_url, scheduled_publish_time, mode = 'schedule' } = req.body;

    let nativePostId = null;
    let finalStatus = 'pending'; // Default for draft
    let errorLog = null;
    let finalTime = scheduled_publish_time || new Date().toISOString();

    if (mode === 'now') {
      try {
         const fbResponse = await facebook.publishNow(userId, caption, image_url);
         nativePostId = fbResponse.id || fbResponse.post_id;
         finalStatus = 'pushed'; // Published immediately
         finalTime = new Date().toISOString();
      } catch (fbError) {
         console.error(`[Posts API] Immediate publish failed:`, fbError);
         finalStatus = 'failed';
         errorLog = fbError.message;
      }
    } else if (mode === 'schedule') {
      try {
         const fbResponse = await facebook.schedulePost(userId, caption, scheduled_publish_time, image_url);
         nativePostId = fbResponse.id || fbResponse.post_id;
         finalStatus = 'pushed'; // Scheduled on Facebook natively
      } catch (fbError) {
         console.error(`[Posts API] Native scheduling failed:`, fbError);
         finalStatus = 'failed';
         errorLog = fbError.message;
      }
    }

    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        topic_id,
        caption,
        image_url,
        scheduled_publish_time: finalTime,
        status: finalStatus,
        native_post_id: nativePostId,
        error_log: errorLog
      })
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, post: data });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/posts/:id
 * Update post details (rescheduling, caption edits).
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { id } = req.params;
    const updates = req.body;

    // 1. Get the current post to check if it's already natively scheduled
    const { data: currentPost } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!currentPost) return res.status(404).json({ error: 'Post not found.' });

    let finalUpdates = { ...updates, updated_at: new Date().toISOString() };

    // 2. If the user changed the caption, image, or time, we must update Facebook.
    // Facebook Graph API does not allow updating a scheduled post's media/time easily.
    // Standard practice: Delete the native scheduled post and recreate it.
    if ((updates.caption || updates.image_url || updates.scheduled_publish_time) && currentPost.native_post_id) {
       await facebook.deleteScheduledPost(userId, currentPost.native_post_id);
       
       const newCaption = updates.caption || currentPost.caption;
       const newImageUrl = updates.image_url !== undefined ? updates.image_url : currentPost.image_url;
       const newTime = updates.scheduled_publish_time || currentPost.scheduled_publish_time;

       try {
         const fbResponse = await facebook.schedulePost(userId, newCaption, newTime, newImageUrl);
         finalUpdates.native_post_id = fbResponse.id || fbResponse.post_id;
         finalUpdates.status = 'pushed';
         finalUpdates.error_log = null;
       } catch (fbError) {
         finalUpdates.status = 'failed';
         finalUpdates.error_log = fbError.message;
       }
    } else if (updates.status === 'scheduled' && currentPost.status === 'failed') {
       // Manual trigger to retry a failed post without changing its content
       try {
         const fbResponse = await facebook.schedulePost(userId, currentPost.caption, currentPost.scheduled_publish_time, currentPost.image_url);
         finalUpdates.native_post_id = fbResponse.id || fbResponse.post_id;
         finalUpdates.status = 'pushed';
         finalUpdates.error_log = null;
       } catch (fbError) {
         finalUpdates.status = 'failed';
         finalUpdates.error_log = fbError.message;
       }
    }

    const { data, error } = await supabase
      .from('posts')
      .update(finalUpdates)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*, topics(title)')
      .single();

    if (error) throw error;

    return res.json({ success: true, post: data });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/posts/:id/regenerate
 * Completely regenerates the post caption and image prompt using AI based on its original Topic.
 */
router.post('/:id/regenerate', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { id } = req.params;

    // 1. Fetch the post and its associated topic
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*, topics(*)')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (postError) throw postError;
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    if (!post.topic_id || !post.topics) {
      return res.status(400).json({ error: 'This is a manual post without an underlying topic. You cannot regenerate it entirely, but you can edit and enhance it manually.' });
    }

    // 2. Fetch user automation settings for context
    const { data: settings } = await supabase
      .from('automation_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!settings) {
      return res.status(400).json({ error: 'Automation settings missing.' });
    }

    // 3. Call AI to generate fresh content
    const content = await ai.generatePostContent(post.topics, settings);
    
    // Convert the text prompt into a live image URL
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(content.image_prompt)}?width=1080&height=1080&nologo=true`;

    // 4. Update Native Facebook Scheduler
    let nativePostId = post.native_post_id;
    let finalStatus = post.status;
    let errorLog = post.error_log;

    if (nativePostId) {
       await facebook.deleteScheduledPost(userId, nativePostId);
       try {
         const fbResponse = await facebook.schedulePost(userId, content.caption, post.scheduled_publish_time, imageUrl);
         nativePostId = fbResponse.id || fbResponse.post_id;
         finalStatus = 'pushed';
         errorLog = null;
       } catch (fbError) {
         finalStatus = 'failed';
         errorLog = fbError.message;
       }
    }

    // 5. Save back to database
    const { data: updatedPost, error: updateError } = await supabase
      .from('posts')
      .update({
        caption: content.caption,
        image_url: imageUrl,
        status: finalStatus,
        native_post_id: nativePostId,
        error_log: errorLog,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*, topics(title)')
      .single();

    if (updateError) throw updateError;

    return res.json({ success: true, post: updatedPost });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/posts/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { id } = req.params;

    // Check if it's natively scheduled
    const { data: post } = await supabase.from('posts').select('native_post_id').eq('id', id).single();
    if (post && post.native_post_id) {
       await facebook.deleteScheduledPost(userId, post.native_post_id);
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return res.json({ success: true, message: 'Post deleted.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

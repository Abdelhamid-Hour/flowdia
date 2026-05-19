const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const automation = require('../services/automation');
const notifications = require('../services/notifications');

const TOPIC_CYCLES = new Set(['daily', 'weekly', 'monthly']);
const IMAGE_SOURCES = new Set(['ai', 'stock', 'auto']);

function normalizeSettingsRow(row, userId) {
  return {
    user_id: userId,
    is_active: Boolean(row?.is_active),
    topic_cycle: row?.topic_cycle || 'weekly',
    niche: row?.niche || '',
    target_audience: row?.target_audience || '',
    language: row?.language || 'English (US)',
    custom_instructions: row?.custom_instructions || '',
    image_source: row?.image_source || 'ai',
    image_instructions: row?.image_instructions || '',
    frequency_per_day: row?.frequency_per_day || 2,
    active_days: Array.isArray(row?.active_days) ? row.active_days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    global_times: Array.isArray(row?.global_times) ? row.global_times : ['09:00', '15:00'],
    updated_at: row?.updated_at || null,
  };
}

async function ensureSettingsRow(userId) {
  const { data, error } = await supabase
    .from('automation_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const { data: created, error: createError } = await supabase
    .from('automation_settings')
    .upsert(
      {
        user_id: userId,
        is_active: false,
        topic_cycle: 'weekly',
        niche: '',
        target_audience: '',
        language: 'English (US)',
        custom_instructions: '',
        image_source: 'ai',
        image_instructions: '',
        frequency_per_day: 2,
        active_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        global_times: ['09:00', '15:00'],
      },
      { onConflict: 'user_id' }
    )
    .select('*')
    .single();

  if (createError) throw createError;
  return created;
}

// GET /api/automation/settings
router.get('/settings', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const row = await ensureSettingsRow(userId);
    return res.json({ success: true, settings: normalizeSettingsRow(row, userId) });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/automation/settings
router.patch('/settings', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const payload = req.body || {};

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: 'ValidationError', message: 'Request body is empty.' });
    }

    const updates = {};

    if (payload.is_active !== undefined) {
      if (typeof payload.is_active !== 'boolean') {
        return res.status(400).json({ error: 'ValidationError', message: 'is_active must be boolean.' });
      }
      updates.is_active = payload.is_active;
    }

    if (payload.topic_cycle !== undefined) {
      if (typeof payload.topic_cycle !== 'string' || !TOPIC_CYCLES.has(payload.topic_cycle)) {
        return res.status(400).json({ error: 'ValidationError', message: 'topic_cycle must be one of: daily, weekly, monthly.' });
      }
      updates.topic_cycle = payload.topic_cycle;
    }

    if (payload.image_source !== undefined) {
      if (typeof payload.image_source !== 'string' || !IMAGE_SOURCES.has(payload.image_source)) {
        return res.status(400).json({ error: 'ValidationError', message: 'image_source must be one of: ai, stock, auto.' });
      }
      updates.image_source = payload.image_source;
    }

    if (payload.niche !== undefined) {
      if (typeof payload.niche !== 'string') {
        return res.status(400).json({ error: 'ValidationError', message: 'niche must be a string.' });
      }
      updates.niche = payload.niche.trim();
    }

    if (payload.target_audience !== undefined) {
      if (typeof payload.target_audience !== 'string') {
        return res.status(400).json({ error: 'ValidationError', message: 'target_audience must be a string.' });
      }
      updates.target_audience = payload.target_audience.trim();
    }

    if (payload.language !== undefined) {
      if (typeof payload.language !== 'string') {
        return res.status(400).json({ error: 'ValidationError', message: 'language must be a string.' });
      }
      updates.language = payload.language.trim();
    }

    if (payload.custom_instructions !== undefined) {
      if (typeof payload.custom_instructions !== 'string') {
        return res.status(400).json({ error: 'ValidationError', message: 'custom_instructions must be a string.' });
      }
      updates.custom_instructions = payload.custom_instructions;
    }

    if (payload.image_instructions !== undefined) {
      if (typeof payload.image_instructions !== 'string') {
        return res.status(400).json({ error: 'ValidationError', message: 'image_instructions must be a string.' });
      }
      updates.image_instructions = payload.image_instructions;
    }

    if (payload.frequency_per_day !== undefined) {
      const freq = Number(payload.frequency_per_day);
      if (!Number.isInteger(freq) || freq < 1 || freq > 25) {
        return res.status(400).json({ error: 'ValidationError', message: 'frequency_per_day must be integer 1-25.' });
      }
      updates.frequency_per_day = freq;
    }

    if (payload.active_days !== undefined) {
      if (!Array.isArray(payload.active_days)) {
        return res.status(400).json({ error: 'ValidationError', message: 'active_days must be an array.' });
      }
      updates.active_days = payload.active_days;
    }

    if (payload.global_times !== undefined) {
      if (!Array.isArray(payload.global_times)) {
        return res.status(400).json({ error: 'ValidationError', message: 'global_times must be an array.' });
      }
      updates.global_times = payload.global_times;
    }

    await ensureSettingsRow(userId);

    const { data: updated, error: updateError } = await supabase
      .from('automation_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select('*')
      .single();

    if (updateError) throw updateError;

    // Trigger immediate run if active to ensure first day isn't skipped
    if (updated.is_active) {
      automation.handleUserAutomation(updated).catch(err => {
        console.error('[Automation Route] Failed to trigger immediate run:', err);
      });
    }

    return res.json({
      success: true,
      message: 'Automation settings updated.',
      settings: normalizeSettingsRow(updated, userId),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/automation/settings/reset
router.post('/settings/reset', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { data, error } = await supabase
      .from('automation_settings')
      .upsert(
        {
          user_id: userId,
          is_active: false,
          topic_cycle: 'weekly',
          niche: '',
          target_audience: '',
          language: 'English (US)',
          custom_instructions: '',
          image_source: 'ai',
          image_instructions: '',
          frequency_per_day: 2,
          active_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          global_times: ['09:00', '15:00'],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select('*')
      .single();

    if (error) throw error;
    return res.json({
      success: true,
      message: 'Automation settings reset to defaults.',
      settings: normalizeSettingsRow(data, userId),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/automation/run
router.post('/run', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const settings = await ensureSettingsRow(userId);
    const { count } = req.body || {};
    
    // Trigger the automation process for this user immediately
    const result = await automation.handleUserAutomation(settings, count);

    // Notify user if posts were generated
    if (result && result.postsGenerated > 0) {
      await notifications.notifyPostsGenerated(userId, result.postsGenerated);
    }

    return res.status(200).json({
      success: true,
      message: 'Automation processed.',
      data: {
        action: req.body?.action || 'run',
        is_active: settings.is_active,
        processed_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
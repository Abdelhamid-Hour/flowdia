const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

const TIMEZONE_MAP = {
  pst: 'pst',
  est: 'est',
  utc: 'utc',
  gmt: 'gmt',
  'pacific time (us & canada)': 'pst',
  'eastern time (us & canada)': 'est',
  'utc': 'utc',
  'gmt (london)': 'gmt',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeTimezone(value) {
  if (typeof value !== 'string') return null;
  const normalized = TIMEZONE_MAP[value.trim().toLowerCase()];
  return normalized || null;
}

function sanitizeIntegrationRow(row) {
  return {
    id: row.id,
    platform: row.platform,
    account_id: row.account_id,
    account_name: row.account_name,
    avatar_url: row.avatar_url,
    status: row.status,
    token_expires_at: row.token_expires_at,
    created_at: row.created_at,
    selected: row.status === 'connected',
  };
}

async function ensureProfileAndUserRows(userId, fallbackEmail) {
  let profile;
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, email, mfa_enabled, is_mfa_active, updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) throw profileError;

  if (!profileData) {
    const { data: createdProfile, error: createProfileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          email: fallbackEmail || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select('id, full_name, avatar_url, email, mfa_enabled, is_mfa_active, updated_at')
      .single();

    if (createProfileError) throw createProfileError;
    profile = createdProfile;
  } else {
    profile = profileData;
  }

  let userRow;
  const { data: existingUser, error: userError } = await supabase
    .from('users')
    .select('id, email, full_name, timezone')
    .eq('id', userId)
    .maybeSingle();

  if (userError) throw userError;

  if (!existingUser) {
    const { data: createdUser, error: createUserError } = await supabase
      .from('users')
      .upsert(
        {
          id: userId,
          email: profile.email || fallbackEmail || '',
          full_name: profile.full_name || null,
          timezone: 'utc',
        },
        { onConflict: 'id' }
      )
      .select('id, email, full_name, timezone')
      .single();

    if (createUserError) throw createUserError;
    userRow = createdUser;
  } else {
    userRow = existingUser;
  }

  return { profile, user: userRow };
}

async function getProfileSnapshot(userId, fallbackEmail) {
  const { profile, user } = await ensureProfileAndUserRows(userId, fallbackEmail);
  const timezone = normalizeTimezone(user.timezone) || 'utc';

  return {
    id: userId,
    full_name: user.full_name || profile.full_name || null,
    email: user.email || profile.email || fallbackEmail || null,
    timezone,
    avatar_url: profile.avatar_url || null,
    mfa_enabled: Boolean(profile.mfa_enabled),
    is_mfa_active: Boolean(profile.is_mfa_active),
    updated_at: profile.updated_at || null,
  };
}

// GET /api/profile/me
router.get('/me', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const profile = await getProfileSnapshot(userId, req.user.email || null);
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/profile/me
router.patch('/me', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { full_name, email, timezone } = req.body || {};

    if (full_name === undefined && email === undefined && timezone === undefined) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'At least one field is required: full_name, email, timezone.',
      });
    }

    const updates = {};
    const userUpdates = {};

    if (full_name !== undefined) {
      if (typeof full_name !== 'string' || !full_name.trim()) {
        return res.status(400).json({ error: 'ValidationError', message: 'full_name must be a non-empty string.' });
      }
      if (full_name.trim().length > 120) {
        return res.status(400).json({ error: 'ValidationError', message: 'full_name is too long (max 120 chars).' });
      }
      updates.full_name = full_name.trim();
      userUpdates.full_name = full_name.trim();
    }

    if (email !== undefined) {
      if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
        return res.status(400).json({ error: 'ValidationError', message: 'A valid email is required.' });
      }
      const normalizedEmail = email.trim().toLowerCase();
      updates.email = normalizedEmail;
      userUpdates.email = normalizedEmail;

      const { error: authEmailError } = await supabase.auth.admin.updateUserById(userId, {
        email: normalizedEmail,
      });
      if (authEmailError) {
        authEmailError.statusCode = 400;
        throw authEmailError;
      }
    }

    if (timezone !== undefined) {
      const normalizedTimezone = normalizeTimezone(timezone);
      if (!normalizedTimezone) {
        return res.status(400).json({
          error: 'ValidationError',
          message: 'timezone must be one of: pst, est, utc, gmt.',
        });
      }
      userUpdates.timezone = normalizedTimezone;
    }

    updates.updated_at = new Date().toISOString();

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          ...updates,
        },
        { onConflict: 'id' }
      );

    if (profileUpdateError) throw profileUpdateError;

    if (Object.keys(userUpdates).length > 0) {
      const { error: userUpdateError } = await supabase
        .from('users')
        .upsert(
          {
            id: userId,
            ...userUpdates,
          },
          { onConflict: 'id' }
        );

      if (userUpdateError) throw userUpdateError;
    }

    const profile = await getProfileSnapshot(userId, req.user.email || null);
    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      profile,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/profile/reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const profile = await getProfileSnapshot(userId, req.user.email || null);

    if (!profile.email) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'No email is available for this account.',
      });
    }

    const redirectTo = process.env.PASSWORD_RESET_REDIRECT_TO
      || `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, { redirectTo });
    if (error) throw error;

    return res.json({
      success: true,
      message: 'Password reset email sent.',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/profile/integrations
router.get('/integrations', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { data, error } = await supabase
      .from('social_accounts')
      .select('id, platform, account_id, account_name, avatar_url, status, token_expires_at, created_at')
      .eq('user_id', userId)
      .order('platform', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({
      integrations: (data || []).map(sanitizeIntegrationRow),
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/profile/integrations/:id/select-account
router.patch('/integrations/:id/select-account', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const integrationId = req.params.id;

    const { data: selected, error: selectedError } = await supabase
      .from('social_accounts')
      .select('id, user_id, platform')
      .eq('id', integrationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (selectedError) throw selectedError;
    if (!selected) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Integration account not found.',
      });
    }

    const { error: clearError } = await supabase
      .from('social_accounts')
      .update({ status: 'disconnected' })
      .eq('user_id', userId)
      .eq('platform', selected.platform)
      .neq('id', integrationId);

    if (clearError) throw clearError;

    const { data: connected, error: connectError } = await supabase
      .from('social_accounts')
      .update({ status: 'connected' })
      .eq('id', integrationId)
      .eq('user_id', userId)
      .select('id, platform, account_id, account_name, avatar_url, status, token_expires_at, created_at')
      .single();

    if (connectError) throw connectError;

    return res.json({
      success: true,
      message: 'Integration account selected.',
      integration: sanitizeIntegrationRow(connected),
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/profile/integrations/:id
router.delete('/integrations/:id', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const integrationId = req.params.id;

    const { data, error } = await supabase
      .from('social_accounts')
      .delete()
      .eq('id', integrationId)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Integration account not found.',
      });
    }

    return res.json({
      success: true,
      message: 'Integration removed successfully.',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
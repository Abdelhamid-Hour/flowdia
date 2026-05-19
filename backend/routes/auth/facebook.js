const express = require('express');
const router = express.Router();
const axios = require('axios');
const supabase = require('../../config/supabase');

/**
 * GET /api/auth/facebook/url
 * Generates the Facebook OAuth login URL.
 */
router.get('/url', (req, res, next) => {
  try {
    const appId = process.env.FACEBOOK_APP_ID;
    const redirectUri = encodeURIComponent(`${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/facebook/callback`);
    
    // Scopes required for page management and publishing
    // Note: pages_manage_posts and pages_read_engagement require App Review for live apps,
    // but can be used in Development Mode by App Admins/Developers/Testers.
    const scopes = 'pages_show_list,business_management,public_profile,pages_read_engagement,pages_manage_posts';
    
    // We pass the userId in the state so we know who to attach the token to later
    const state = req.user.sub;

    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${state}&scope=${scopes}`;

    res.json({ success: true, url: authUrl });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/facebook/callback
 * Exchanges the code for a Long-Lived Page Access Token and saves it.
 */
router.post('/callback', async (req, res, next) => {
  try {
    const { code, state: userId } = req.body;
    
    if (!code || !userId) {
      return res.status(400).json({ error: 'Missing authorization code or state.' });
    }

    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = `${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/facebook/callback`;

    // 1. Exchange code for a short-lived user token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`;
    const tokenRes = await axios.get(tokenUrl);
    const shortLivedUserToken = tokenRes.data.access_token;

    // 2. Exchange short-lived user token for a long-lived user token (lasts 60 days)
    const longLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedUserToken}`;
    const longLivedRes = await axios.get(longLivedUrl);
    const longLivedUserToken = longLivedRes.data.access_token;

    // 3. Get the user's Facebook Pages (and their specific page access tokens)
    const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedUserToken}`;
    const pagesRes = await axios.get(pagesUrl);
    
    if (!pagesRes.data.data || pagesRes.data.data.length === 0) {
      return res.status(400).json({ error: 'No Facebook Pages found. You must be an admin of a Facebook Page to connect.' });
    }

    // For simplicity, we just grab the first page they administer.
    const page = pagesRes.data.data[0];
    const pageToken = page.access_token; // This page token is long-lived because the user token was long-lived
    const pageId = page.id;
    const pageName = page.name;

    // 4. Save to database
    // We disconnect any old facebook accounts first
    await supabase.from('social_accounts').update({ status: 'disconnected' }).eq('user_id', userId).eq('platform', 'facebook');

    // Insert the new one
    const { data: savedAccount, error: saveError } = await supabase
      .from('social_accounts')
      .upsert({
        user_id: userId,
        platform: 'facebook',
        account_id: pageId,
        account_name: pageName,
        access_token: pageToken, // Storing the PAGE token, not the user token
        status: 'connected'
      }, { onConflict: 'user_id,platform' })
      .select()
      .single();

    if (saveError) throw saveError;

    return res.json({ success: true, account: savedAccount });
  } catch (error) {
    console.error("Facebook Callback Error:", error.response?.data || error.message);
    next(error);
  }
});

module.exports = router;
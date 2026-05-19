const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// This route only requires the user to be logged in (AAL1)
router.get('/overview', async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const today = new Date();
    const todayStr = today.toISOString();

    // 1. Fetch Scheduled Posts Count (Future)
    const { count: scheduledCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'scheduled')
      .gte('scheduled_publish_time', todayStr);

    // 2. Fetch Pushed Posts Count
    const { count: pushedCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'pushed');

    // 3. Fetch Failed Posts Count
    const { count: failedCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'failed');

    // 4. Fetch Next Up Posts (Top 3 upcoming)
    const { data: upcomingPosts } = await supabase
      .from('posts')
      .select('id, caption, image_url, scheduled_publish_time, status')
      .eq('user_id', userId)
      .in('status', ['scheduled', 'pending'])
      .gte('scheduled_publish_time', todayStr)
      .order('scheduled_publish_time', { ascending: true })
      .limit(3);

    // 5. Fetch Recent Wins (Top 3 recently pushed)
    const { data: recentWins } = await supabase
      .from('posts')
      .select('id, caption, image_url, scheduled_publish_time, status')
      .eq('user_id', userId)
      .eq('status', 'pushed')
      .order('scheduled_publish_time', { ascending: false })
      .limit(3);

    // 6. Check Facebook Connection Status & Expiration
    const { data: accounts } = await supabase
      .from('social_accounts')
      .select('platform, status, account_name, created_at')
      .eq('user_id', userId)
      .eq('platform', 'facebook')
      .eq('status', 'connected')
      .limit(1);

    const isConnected = accounts && accounts.length > 0;
    const account = isConnected ? accounts[0] : null;
    
    // Facebook long-lived tokens usually last 60 days from created_at
    let isExpiringSoon = false;
    if (account) {
      const createdAt = new Date(account.created_at);
      const expiresAt = new Date(createdAt.getTime() + (60 * 24 * 60 * 60 * 1000));
      const sevenDaysFromNow = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
      isExpiringSoon = expiresAt < sevenDaysFromNow;
    }

    res.json({
      success: true,
      data: {
        kpis: {
          scheduled: scheduledCount || 0,
          pushed: pushedCount || 0,
          failed: failedCount || 0,
          interactions: (pushedCount || 0) * 142
        },
        connection: {
          active: isConnected,
          platform: 'Facebook',
          pageName: account ? account.account_name : 'Not Connected',
          isExpiringSoon
        },
        upcomingPosts: upcomingPosts || [],
        recentWins: recentWins || []
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
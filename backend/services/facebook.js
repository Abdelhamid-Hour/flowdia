const axios = require('axios');
const supabase = require('../config/supabase');

/**
 * Service to interact directly with the Facebook Graph API.
 */
class FacebookService {
  /**
   * Retrieves the active Facebook Page token for a user.
   */
  async getAccount(userId) {
    const { data, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'connected')
      .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  }

  /**
   * Publishes a post immediately to Facebook.
   */
  async publishNow(userId, caption, imageUrl = null) {
    const account = await this.getAccount(userId);
    
    if (!account) {
      throw new Error("No connected Facebook account found. Please connect your page in Settings.");
    }

    const endpoint = imageUrl 
      ? `https://graph.facebook.com/v19.0/${account.account_id}/photos` 
      : `https://graph.facebook.com/v19.0/${account.account_id}/feed`;

    const payload = {
      published: true,
      access_token: account.access_token
    };

    if (imageUrl) {
      payload.url = imageUrl;
      payload.caption = caption;
    } else {
      payload.message = caption;
    }

    try {
      const response = await axios.post(endpoint, payload);
      return response.data;
    } catch (error) {
      const fbError = error.response?.data?.error?.message || error.message;
      throw new Error(`Facebook API Error: ${fbError}`);
    }
  }

  /**
   * Schedules a post natively on Facebook.
   * If imageUrl is provided, publishes a photo. Otherwise, a text feed post.
   */
  async schedulePost(userId, caption, scheduledPublishTimeIso, imageUrl = null) {
    const account = await this.getAccount(userId);
    
    if (!account) {
      throw new Error("No connected Facebook account found. Please connect your page in Settings.");
    }

    // Facebook requires scheduled times to be Unix timestamps in seconds
    const scheduledTimeUnix = Math.floor(new Date(scheduledPublishTimeIso).getTime() / 1000);
    
    // Facebook API restricts scheduling to between 10 minutes and 75 days from now
    const nowUnix = Math.floor(Date.now() / 1000);
    if (scheduledTimeUnix < nowUnix + (11 * 60)) {
       throw new Error("Facebook requires scheduled posts to be at least 10 minutes in the future.");
    }

    const endpoint = imageUrl 
      ? `https://graph.facebook.com/v19.0/${account.account_id}/photos` 
      : `https://graph.facebook.com/v19.0/${account.account_id}/feed`;

    const payload = {
      published: false,
      scheduled_publish_time: scheduledTimeUnix,
      access_token: account.access_token
    };

    if (imageUrl) {
      payload.url = imageUrl;
      payload.caption = caption;
    } else {
      payload.message = caption;
    }

    try {
      const response = await axios.post(endpoint, payload);
      // Returns { id: "native_post_id", post_id: "native_post_id" }
      return response.data;
    } catch (error) {
      // Extract the specific Facebook Graph API error message if available
      const fbError = error.response?.data?.error?.message || error.message;
      throw new Error(`Facebook API Error: ${fbError}`);
    }
  }

  /**
   * Attempts to delete a natively scheduled post from Facebook.
   */
  async deleteScheduledPost(userId, nativePostId) {
    if (!nativePostId) return true; // Nothing to delete on FB side

    const account = await this.getAccount(userId);
    if (!account) return false;

    try {
      await axios.delete(`https://graph.facebook.com/v19.0/${nativePostId}`, {
        params: { access_token: account.access_token }
      });
      return true;
    } catch (error) {
      console.error(`[FacebookService] Failed to delete native post ${nativePostId}:`, error.response?.data?.error || error.message);
      return false; // We don't throw here to avoid blocking local DB deletion
    }
  }
}

module.exports = new FacebookService();
const supabase = require('../config/supabase');

/**
 * Utility service to create and manage system notifications.
 */
class NotificationService {
  /**
   * Creates a notification for a specific user.
   * @param {string} userId - The unique ID of the user.
   * @param {Object} data - The notification details.
   * @param {string} data.title - Short, catchy title.
   * @param {string} data.message - Detailed explanation.
   * @param {string} [data.type='info'] - 'info', 'warning', 'error', 'success'.
   * @param {string} [data.action_url] - Optional link for the 'View' button.
   */
  async create(userId, { title, message, type = 'info', action_url = null }) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          message,
          type,
          action_url
        })
        .select()
        .single();

      if (error) {
        console.error('[NotificationService] Failed to insert notification:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[NotificationService] Unexpected error:', error);
      return null;
    }
  }

  /**
   * Specifically handles Facebook-related errors.
   */
  async notifyFacebookError(userId, errorMessage) {
    let title = "Facebook Error";
    let message = errorMessage;
    let type = "error";

    if (errorMessage.includes("Permissions error") || errorMessage.includes("#200")) {
      title = "Facebook Permissions Expired";
      message = "Flowdia can no longer publish to your page. Please reconnect your account in Settings.";
    }

    return this.create(userId, {
      title,
      message,
      type,
      action_url: "/profile"
    });
  }

  /**
   * Specifically handles successful post generation.
   */
  async notifyPostsGenerated(userId, count) {
    return this.create(userId, {
      title: "Content Ready",
      message: `Successfully generated ${count} new posts for your schedule.`,
      type: "success",
      action_url: "/calendar"
    });
  }
}

module.exports = new NotificationService();

const supabase = require("../config/supabase");
const ai = require("./ai");
const facebook = require("./facebook");

/**
 * Service to orchestrate the automation business logic.
 */
class AutomationService {
  /**
   * Main entry point for the background worker.
   */
  async processAllAutomations() {
    try {
      // 1. Get all active users
      const { data: activeSettings, error } = await supabase
        .from("automation_settings")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;
      if (!activeSettings) return;

      for (const settings of activeSettings) {
        await this.handleUserAutomation(settings);
      }
    } catch (error) {
      console.error("[AutomationService] Error processing automations:", error);
    }
  }

  /**
   * Handles automation logic for a single user.
   */
  async handleUserAutomation(settings, forcedCount = null) {
    try {
      const userId = settings.user_id;

      // Ensure we only run if the master switch is ON, 
      // unless this is a forced manual trigger (forcedCount != null).
      if (!settings.is_active && forcedCount === null) {
        console.log(`[AutomationService] Automation is PAUSED for user ${userId}. Skipping.`);
        return { topicsGenerated: 0, postsGenerated: 0, promotedTopic: null };
      }

      const result = {
        topicsGenerated: 0,
        postsGenerated: 0,
        promotedTopic: null
      };

      // A. Topic Maintenance: Ensure the roadmap is full
      result.topicsGenerated = await this.ensureTopicRoadmap(settings, forcedCount);

      // B. Promotion: Promote today's topic to 'in_use' if needed
      result.promotedTopic = await this.promoteTodayTopic(userId);

      // C. Post Generation: Generate posts for 'in_use' topics for TODAY
      result.postsGenerated = await this.generatePostsForToday(settings);

      return result;
    } catch (error) {
      console.error(`[AutomationService] Error for user ${settings.user_id}:`, error);
      if (forcedCount !== null) throw error; // Re-throw for manual API triggers
      return null;
    }
  }

  /**
   * Ensures the user has enough topics scheduled in advance.
   */
  async ensureTopicRoadmap(settings, forcedCount = null) {
    const { user_id, topic_cycle, active_days } = settings;
    let topicsGeneratedCount = 0;
    
    // Find the latest scheduled topic
    const { data: latestTopicArr } = await supabase
      .from("topics")
      .select("target_date")
      .eq("user_id", user_id)
      .neq("status", "archived")
      .order("target_date", { ascending: false })
      .limit(1);

    const latestTopic = latestTopicArr && latestTopicArr.length > 0 ? latestTopicArr[0] : null;

    let lastDate;
    let hasExistingFutureTopic = false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (latestTopic) {
      lastDate = new Date(latestTopic.target_date + "T00:00:00");
      if (lastDate >= today) {
        hasExistingFutureTopic = true;
      } else {
        lastDate = new Date(today);
      }
    } else {
      lastDate = new Date(today);
    }
    
    // Determine if we need to generate more
    let needsMore = forcedCount !== null;
    let countToGenerate = forcedCount || 0;
    let incrementDays = 0;

    if (!needsMore) {
      if (topic_cycle === "daily") {
        const threshold = new Date(today);
        threshold.setDate(threshold.getDate() + 3);
        if (lastDate < threshold) {
          needsMore = true;
          countToGenerate = 5;
          incrementDays = 1;
        }
      } else if (topic_cycle === "weekly") {
        const threshold = new Date(today);
        threshold.setDate(threshold.getDate() + 7);
        if (lastDate < threshold) {
          needsMore = true;
          countToGenerate = 4;
          incrementDays = 7;
        }
      } else if (topic_cycle === "monthly") {
        const threshold = new Date(today);
        threshold.setMonth(threshold.getMonth() + 1);
        if (lastDate < threshold) {
          needsMore = true;
          countToGenerate = 2;
          incrementDays = 30;
        }
      }
    } else {
      // If forcedCount is provided, we still need to know the increment for the dates
      if (topic_cycle === "daily") incrementDays = 1;
      else if (topic_cycle === "weekly") incrementDays = 7;
      else if (topic_cycle === "monthly") incrementDays = 30;
    }

    if (needsMore && countToGenerate > 0) {
      console.log(`[AutomationService] Generating ${countToGenerate} topics for user ${user_id}`);
      
      const { data: historyData } = await supabase
        .from("topics")
        .select("title")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(15);
      
      const historyTitles = historyData ? historyData.map(t => t.title) : [];
      
      const newTopics = await ai.generateTopics(settings, countToGenerate, historyTitles);
      
      const inserts = [];
      let currentTarget = new Date(lastDate);

      // Local time formatter to prevent UTC shift bugs
      const getLocalDateStr = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      // CRITICAL FIX: If there are no future topics, we want the very first topic to be scheduled for TODAY 
      // (or the first valid active day starting today). We offset currentTarget backward so the loop's 
      // pre-increment lands exactly on today.
      if (!hasExistingFutureTopic) {
        if (topic_cycle === "daily") {
           currentTarget.setDate(currentTarget.getDate() - 1);
        } else {
           currentTarget.setDate(currentTarget.getDate() - incrementDays);
        }
      }

      for (let i = 0; i < newTopics.length; i++) {
        // Move to next valid date based on cycle and active_days
        if (topic_cycle === "daily") {
          do {
            currentTarget.setDate(currentTarget.getDate() + 1);
          } while (active_days && active_days.length > 0 && !this.isDayActive(currentTarget, active_days));
        } else {
          currentTarget.setDate(currentTarget.getDate() + incrementDays);
          // If the landing day is not an active day, move forward until we find one
          while (active_days && active_days.length > 0 && !this.isDayActive(currentTarget, active_days)) {
             currentTarget.setDate(currentTarget.getDate() + 1);
          }
        }

        inserts.push({
          user_id,
          title: newTopics[i].title,
          brief: newTopics[i].brief,
          target_date: getLocalDateStr(currentTarget),
          status: "scheduled"
        });
      }

      if (inserts.length > 0) {
        await supabase.from("topics").insert(inserts);
        topicsGeneratedCount = inserts.length;
      }
    }
    return topicsGeneratedCount;
  }

  isDayActive(date, activeDays) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayName = days[date.getDay()];
    return activeDays.includes(dayName);
  }

  /**
   * Finds the topic for today and sets it to 'in_use'.
   */
  async promoteTodayTopic(userId) {
    const todayStr = new Date().toISOString().split("T")[0];

    // Check current in_use
    const { data: currentActiveArray } = await supabase
      .from("topics")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "in_use")
      .limit(1);
    const currentActive = currentActiveArray && currentActiveArray.length > 0 ? currentActiveArray[0] : null;

    // If it's already today's topic, we are done
    if (currentActive && currentActive.target_date === todayStr) return null;

    // Find if there is a scheduled topic for today
    const { data: todayTopicArray } = await supabase
      .from("topics")
      .select("*")
      .eq("user_id", userId)
      .eq("target_date", todayStr)
      .eq("status", "scheduled")
      .limit(1);
    const todayTopic = todayTopicArray && todayTopicArray.length > 0 ? todayTopicArray[0] : null;

    if (todayTopic) {
      // Archive previous
      if (currentActive) {
        await supabase.from("topics").update({ status: "archived" }).eq("id", currentActive.id);
      }
      // Promote new
      await supabase.from("topics").update({ status: "in_use" }).eq("id", todayTopic.id);
      console.log(`[AutomationService] Promoted topic ${todayTopic.id} to in_use for user ${userId}`);
      return todayTopic;
    } else {
      // If no topic for today but we have an old in_use, should we keep it?
      // For weekly/monthly, we keep it until the next scheduled one arrives
      if (currentActive) {
        const lastTarget = new Date(currentActive.target_date + "T00:00:00");
        const today = new Date();
        today.setHours(0,0,0,0);
        
        // If the active topic is from the past but we don't have a new one yet, 
        // we keep it active (it represents the current cycle).
        // However, if it's REALLY old (e.g. > 32 days), we might want to archive it.
        const diffDays = Math.floor((today - lastTarget) / (1000 * 60 * 60 * 24));
        if (diffDays > 32) {
           await supabase.from("topics").update({ status: "archived" }).eq("id", currentActive.id);
        }
      }
      return null;
    }
  }

  /**
   * Generates posts for "today" based on the current active topic and frequency.
   * Directly schedules them natively to the connected platform (e.g. Facebook).
   */
  async generatePostsForToday(settings) {
    const { user_id, frequency_per_day, global_times, active_days } = settings;
    const today = new Date();
    
    // Check if today is an active day
    if (active_days && !this.isDayActive(today, active_days)) return 0;

    const todayStr = today.toISOString().split("T")[0];

    const { data: activeTopics } = await supabase
      .from("topics")
      .select("*")
      .eq("user_id", user_id)
      .eq("status", "in_use")
      .limit(1);

    const activeTopic = activeTopics && activeTopics.length > 0 ? activeTopics[0] : null;

    if (!activeTopic) return 0;

    // Check if posts already exist for today
    const { data: existingPosts } = await supabase
      .from("posts")
      .select("id")
      .eq("user_id", user_id)
      .gte("scheduled_publish_time", `${todayStr}T00:00:00`)
      .lte("scheduled_publish_time", `${todayStr}T23:59:59`);

    if (existingPosts && existingPosts.length > 0) {
      console.log(`[AutomationService] Posts already exist for today (${todayStr}) for user ${user_id}. Skipping generation.`);
      return 0;
    }

    console.log(`[AutomationService] No posts found for today (${todayStr}) for user ${user_id}. Proceeding to generate ${frequency_per_day} posts using topic: "${activeTopic.title}".`);

    const postsToCreate = [];
    for (let i = 0; i < frequency_per_day; i++) {
      const timeStr = global_times[i] || "12:00";
      const publishTime = new Date(`${todayStr}T${timeStr}:00`);
      
      // Ensure the publish time is in the future for Facebook's native scheduler requirements
      if (publishTime <= new Date()) {
         publishTime.setMinutes(publishTime.getMinutes() + 15); // Bump it 15 mins into the future
      }

      try {
        const content = await ai.generatePostContent(activeTopic, settings);
        
        // Convert the text prompt into a live image URL using Pollinations.ai (Free, No API Key)
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(content.image_prompt)}?width=1080&height=1080&nologo=true`;

        // Direct-to-Platform Architecture Pivot
        let nativePostId = null;
        let finalStatus = 'scheduled';
        let errorLog = null;

        try {
           const fbResponse = await facebook.schedulePost(user_id, content.caption, publishTime.toISOString(), imageUrl);
           nativePostId = fbResponse.id || fbResponse.post_id;
           finalStatus = 'pushed'; // We consider it pushed because Facebook now owns it
        } catch (fbError) {
           console.error(`[AutomationService] Native scheduling failed for user ${user_id}:`, fbError);
           finalStatus = 'failed';
           errorLog = fbError.message;
        }

        postsToCreate.push({
          user_id,
          topic_id: activeTopic.id,
          caption: content.caption,
          image_url: imageUrl,
          status: finalStatus,
          native_post_id: nativePostId,
          error_log: errorLog,
          scheduled_publish_time: publishTime.toISOString()
        });
      } catch (aiError) {
        console.error(`[AutomationService] AI generation failed for user ${user_id}:`, aiError);
        break; // Stop for today if AI fails
      }
    }

    if (postsToCreate.length > 0) {
      await supabase.from("posts").insert(postsToCreate);
    }
    return postsToCreate.length;
  }
}

module.exports = new AutomationService();

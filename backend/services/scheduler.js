const cron = require("node-cron");
const automation = require("./automation");

/**
 * Initializes all background cron jobs for the Flowdia backend.
 */
function initScheduler() {
  console.log("🕒 Scheduler Service Initialized.");

  // 1. Daily Midnight Automation Cycle (Runs at 00:00 every day)
  // This triggers the topic roadmap maintenance and daily post generation.
  // Because we now use Native Facebook Scheduling, we do not need to poll hourly.
  cron.schedule("0 0 * * *", async () => {
    console.log("🔄 Running Daily Midnight Automation Cycle...");
    await automation.processAllAutomations();
  });

  // Run on startup for development (Optional)
  if (process.env.NODE_ENV === "development") {
    console.log("[Scheduler] Performing initial startup check...");
    automation.processAllAutomations();
  }
}

module.exports = initScheduler;

// Import the node-cron library to schedule tasks based on time patterns (like a clock)
const cron = require("node-cron");
// Import the automation service which contains the actual logic for generating topics and posts
const automation = require("./automation");

/**
 * Function to start the background tasks (cron jobs) for the application.
 */
function initScheduler() {
  console.log("🕒 Scheduler Service Initialized.");

  cron.schedule("0 0 * * *", async () => {
    console.log("🔄 Running Daily Midnight Automation Cycle...");
    await automation.processAllAutomations();
  });

  if (process.env.NODE_ENV === "development") {
    console.log("[Scheduler] Performing initial startup check...");
    automation.processAllAutomations();
  }
}

// Export the function so it can be called in index.js to start the scheduler
module.exports = initScheduler;

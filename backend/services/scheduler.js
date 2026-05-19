// Import the node-cron library to schedule tasks based on time patterns (like a clock)
const cron = require("node-cron");
// Import the automation service which contains the actual logic for generating topics and posts
const automation = require("./automation");

/**
 * Function to start the background tasks (cron jobs) for the application.
 */
function initScheduler() {
  // Log to the console so we know the scheduler has started successfully
  console.log("🕒 Scheduler Service Initialized.");

  // Schedule a task to run once every day at exactly midnight (00:00)
  // The pattern "0 0 * * *" means: Minute 0, Hour 0, Every Day, Every Month, Every Weekday
  cron.schedule("0 0 * * *", async () => {
    console.log("🔄 Running Daily Midnight Automation Cycle...");
    // Call the service to check every user's settings and generate content if needed
    await automation.processAllAutomations();
  });

  // If we are in development mode, run the automation once immediately when the server starts
  // This is helpful for testing without waiting for midnight.
  if (process.env.NODE_ENV === "development") {
    console.log("[Scheduler] Performing initial startup check...");
    automation.processAllAutomations();
  }
}

// Export the function so it can be called in index.js to start the scheduler
module.exports = initScheduler;

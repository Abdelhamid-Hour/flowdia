// Import the createClient function from the Supabase SDK to connect to the database
const { createClient } = require('@supabase/supabase-js');
// Load environment variables from the .env file into process.env
require('dotenv').config();

// Initialize the Supabase client with your project URL and the Service Role Key
// The Service Role Key allows the backend to bypass Row Level Security (RLS) and perform admin tasks
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY 
);

// Export the supabase instance so it can be reused in other files (like routes and services)
module.exports = supabase;
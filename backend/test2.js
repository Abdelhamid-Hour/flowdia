require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const supabase = require('./config/supabase');


const BACKEND_URL = 'http://localhost:5000/api';

async function runTest() {
  const email = `testuser_${Date.now()}@example.com`;
  const password = 'Password123!';

  console.log('--- 1. Creating/Logging in Test User ---');
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    console.error('Auth Error:', authError.message);
    return;
  }

  const token = authData.session.access_token;
  console.log('✅ JWT Obtained successfully.');

  console.log('\n--- 2. Testing Node.js API (Semi-Secure Route) ---');
  try {
    const res = await axios.get(`${BACKEND_URL}/analytics/overview`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Node.js Response:', res.data);
  } catch (err) {
    console.error('❌ API Error:', err.response?.data || err.message);
  }

  console.log('\n--- 3. Testing MFA Requirement (Should fail with 403) ---');
  try {
    const res = await axios.post(`${BACKEND_URL}/automation/run`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Unexpected Success:', res.data);
  } catch (err) {
    console.log('✅ Correctly Blocked:', err.response?.status, err.response?.data.error);
    console.log('Reason: This user has not completed 2FA (aal1 status).');
  }
}

runTest();
// test-jwks.js
require('dotenv').config();

async function testJWKS() {
  
  // test-jwks.js  — just change the URL
const url = 'https://uqqkcgyjunhblcecbyig.supabase.co/auth/v1/.well-known/jwks.json';
  console.log('ANON KEY exists:', !!process.env.SUPABASE_ANON_KEY);
  console.log('ANON KEY preview:', process.env.SUPABASE_ANON_KEY?.slice(0, 30));

  // Test 1: No headers
  console.log('\n--- Test 1: No headers ---');
  const r1 = await fetch(url);
  console.log('Status:', r1.status);
  console.log('Body:', await r1.text());

  // Test 2: apikey header
  console.log('\n--- Test 2: apikey header ---');
  const r2 = await fetch(url, { headers: { 'apikey': process.env.SUPABASE_ANON_KEY } });
  console.log('Status:', r2.status);
  console.log('Body:', await r2.text());

  // Test 3: Authorization header
  console.log('\n--- Test 3: Authorization Bearer ---');
  const r3 = await fetch(url, { headers: { 'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}` } });
  console.log('Status:', r3.status);
  console.log('Body:', await r3.text());

  // Test 4: Both headers
  console.log('\n--- Test 4: Both headers ---');
  const r4 = await fetch(url, { headers: {
    'apikey': process.env.SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
  }});
  console.log('Status:', r4.status);
  console.log('Body:', await r4.text());

  // Test 5: service_role key
  console.log('\n--- Test 5: service_role key ---');
  const r5 = await fetch(url, { headers: { 'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY } });
  console.log('Status:', r5.status);
  console.log('Body:', await r5.text());
}

testJWKS().catch(console.error);
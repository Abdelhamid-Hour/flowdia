require('dotenv').config();

async function check() {
  // Inside check.js
const res = await fetch('https://uqqkcgyjunhblcecbyig.supabase.co/auth/v1/.well-known/jwks', {
    headers: { 'apikey': 'PASTE_YOUR_ACTUAL_ANON_KEY_HERE' }
});
  console.log('Status:', res.status);
  if (res.ok) console.log('✅ Success! The URL and Key are correct.');
  else console.log('❌ Failed:', await res.text());
}
check();
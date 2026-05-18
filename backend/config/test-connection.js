const supabase = require('./supabase'); // Path to the file you just showed me

async function testConnection() {
  // We try to list the tables or just select from a known table
  // If you haven't made a table yet, this will still return a 200 or a specific error
  const { data, error } = await supabase.from('profiles').select('*').limit(1);

  if (error) {
    console.error('❌ Connection failed:');
    console.error(`Error Code: ${error.code}`);
    console.error(`Message: ${error.message}`);
    
    if (error.message.includes('failed to fetch')) {
        console.log('👉 Tip: Check your internet or your SUPABASE_URL.');
    }
    if (error.code === '401' || error.code === 'PGRST301') {
        console.log('👉 Tip: Your SERVICE_ROLE_KEY is likely incorrect.');
    }
  } else {
    console.log('✅ Successfully connected to Supabase!');
    console.log('Data received:', data);
  }
}

testConnection();
const supabase = require('./config/supabase');


async function runTest() {
  const email =  'otmanimohsine@gmailcom' ; 
   const  password =  'mohsine123';
const fullName = 'Manual Tester';

  console.log("--- Starting Manual Registration Test ---");

  // STEP 1: Register the user in Supabase Auth
  // This puts the user in the "Second Floor" (auth.users)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    
    options: {
      data: { full_name: fullName }
    }
  });

  if (authError) {
    console.error("❌ Step 1 (Auth) Failed:", authError.message);
    return;
  }

  const userId = authData.user.id;
  console.log(`✅ Step 1 Success: User created in Auth with ID: ${userId}`);

  // STEP 2: Manually create the profile in the Public table
  // This puts the user in the "First Floor" (public.profiles)
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .insert([
      { 
        id: userId, 
        email: email, 
        full_name: fullName,
        mfa_enabled: false,
        is_mfa_active: false
      }
    ]);

  if (profileError) {
    console.error("❌ Step 2 (Profile) Failed:", profileError.message);
    console.log("Tip: Ensure your 'profiles' table has RLS disabled or you are using the service_role key.");
  } else {
    console.log("✅ Step 2 Success: Profile created manually in database!");
  }

  // STEP 3: Now login to get your token
  const { data: loginData } = await supabase.auth.signInWithPassword({ email, password });
  console.log("\n🚀 YOUR JWT TOKEN:");
  console.log(loginData.session.access_token);
}

runTest();
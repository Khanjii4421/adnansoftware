// ============================================
// RESET ADMIN USER SCRIPT
// Deletes all existing users and creates a new admin user
// Usage: node reset-admin-user.js
// ============================================

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetAdminUser() {
  try {
    // New admin credentials
    const email = 'akh7323098@gmail.com';
    const password = 'usman1002@';
    const name = 'Admin';
    const role = 'admin';

    console.log('================================');
    console.log('🔧 RESET ADMIN USER');
    console.log('================================\n');

    // Step 1: Delete all existing users
    console.log('🗑️  Step 1: Deleting all existing users...');
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // This will delete all users

    if (deleteError) {
      console.error('❌ Error deleting users:', deleteError);
      // Continue anyway - maybe table is empty or has constraints
      console.log('⚠️  Continuing despite error...');
    } else {
      console.log('✅ All users deleted successfully');
    }

    // Step 2: Hash the password
    console.log('\n🔐 Step 2: Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✅ Password hashed successfully');

    // Step 3: Create new admin user
    console.log('\n➕ Step 3: Creating new admin user...');
    const { data, error } = await supabase
      .from('users')
      .insert([{
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name: name,
        role: role,
        is_active: true,
        dc_manual: false
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating admin user:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      process.exit(1);
    }

    console.log('✅ Admin user created successfully!\n');

    // Step 4: Display credentials
    console.log('================================');
    console.log('✅ SUCCESS!');
    console.log('================================');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('👤 Name:', data.name);
    console.log('🎭 Role:', data.role);
    console.log('🆔 User ID:', data.id);
    console.log('================================\n');

    console.log('🎉 You can now login with:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}\n`);

    // Verify the user was created
    console.log('🔍 Verifying user creation...');
    const { data: verifyUser, error: verifyError } = await supabase
      .from('users')
      .select('id, email, name, role, is_active')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (verifyError || !verifyUser) {
      console.error('⚠️  Warning: Could not verify user creation:', verifyError);
    } else {
      console.log('✅ User verified successfully!');
      console.log('   Email:', verifyUser.email);
      console.log('   Role:', verifyUser.role);
      console.log('   Active:', verifyUser.is_active);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

// Run the function
resetAdminUser();


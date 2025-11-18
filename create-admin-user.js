// ============================================
// CREATE ADMIN USER SCRIPT
// Run this after creating the database schema
// Usage: node create-admin-user.js
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

async function createAdminUser() {
  try {
    const email = 'khanjii4421@gmail.com';
    const password = 'Khan';
    const name = 'Adnan Admin';
    const role = 'admin';

    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✅ Password hashed successfully');

    // Check if user already exists
    console.log('🔍 Checking if user already exists...');
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', email)
      .single();

    if (existingUser) {
      console.log('⚠️  User already exists. Updating...');
      const { data, error } = await supabase
        .from('users')
        .update({
          password: hashedPassword,
          name: name,
          role: role,
          is_active: true,
          dc_manual: false
        })
        .eq('email', email)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating user:', error);
        process.exit(1);
      }

      console.log('✅ Admin user updated successfully!');
      console.log('📧 Email:', email);
      console.log('🔑 Password:', password);
      console.log('👤 Name:', data.name);
      console.log('🎭 Role:', data.role);
    } else {
      console.log('➕ Creating new admin user...');
      const { data, error } = await supabase
        .from('users')
        .insert([{
          email: email,
          password: hashedPassword,
          name: name,
          role: role,
          is_active: true,
          dc_manual: false
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating user:', error);
        process.exit(1);
      }

      console.log('✅ Admin user created successfully!');
      console.log('📧 Email:', email);
      console.log('🔑 Password:', password);
      console.log('👤 Name:', data.name);
      console.log('🎭 Role:', data.role);
    }

    console.log('\n🎉 Done! You can now login with:');
    console.log('   Email: khanjii4421@gmail.com');
    console.log('   Password: khan\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the function
createAdminUser();


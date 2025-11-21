// Test Environment Variables
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Checking Environment Variables...\n');

// Check SUPABASE_URL
const supabaseUrl = process.env.SUPABASE_URL;
console.log('1. SUPABASE_URL:');
if (supabaseUrl) {
  console.log(`   ✅ Found: ${supabaseUrl}`);
  if (supabaseUrl.includes('supabase.co')) {
    console.log('   ✅ Format looks valid (contains supabase.co)');
  } else {
    console.log('   ⚠️  Warning: URL format might be incorrect');
  }
} else {
  console.log('   ❌ Missing!');
}

// Check SUPABASE_SERVICE_ROLE_KEY
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log('\n2. SUPABASE_SERVICE_ROLE_KEY:');
if (supabaseKey) {
  console.log(`   ✅ Found: ${supabaseKey.substring(0, 20)}...`);
  if (supabaseKey.startsWith('eyJ')) {
    console.log('   ✅ Format looks valid (JWT token)');
  } else if (supabaseKey.startsWith('yeyJ')) {
    console.log('   ⚠️  Warning: Key starts with "yeyJ" instead of "eyJ" - might be invalid');
  } else {
    console.log('   ⚠️  Warning: Key format might be incorrect');
  }
  console.log(`   Length: ${supabaseKey.length} characters`);
} else {
  console.log('   ❌ Missing!');
}

// Check JWT_SECRET_KEY
const jwtSecret = process.env.JWT_SECRET_KEY;
console.log('\n3. JWT_SECRET_KEY:');
if (jwtSecret) {
  console.log(`   ✅ Found: ${jwtSecret.substring(0, 20)}...`);
  console.log(`   Length: ${jwtSecret.length} characters`);
  if (jwtSecret.length < 32) {
    console.log('   ⚠️  Warning: Secret key should be at least 32 characters for security');
  } else {
    console.log('   ✅ Length is sufficient');
  }
} else {
  console.log('   ❌ Missing!');
}

// Test Supabase Connection
console.log('\n4. Testing Supabase Connection...');
if (supabaseUrl && supabaseKey) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Try a simple query to test connection
    supabase.from('users').select('count').limit(1)
      .then(({ data, error }) => {
        if (error) {
          if (error.message.includes('JWT')) {
            console.log('   ❌ Connection failed: Invalid JWT token/Service Role Key');
            console.log(`   Error: ${error.message}`);
          } else if (error.message.includes('relation') || error.message.includes('does not exist')) {
            console.log('   ⚠️  Connection successful but table might not exist');
            console.log('   ✅ Supabase credentials are valid!');
          } else {
            console.log(`   ⚠️  Connection test error: ${error.message}`);
            console.log('   ✅ Supabase credentials might be valid (connection established)');
          }
        } else {
          console.log('   ✅ Connection successful! Supabase credentials are valid.');
        }
        process.exit(0);
      })
      .catch((err) => {
        console.log(`   ❌ Connection failed: ${err.message}`);
        if (err.message.includes('fetch')) {
          console.log('   ⚠️  Network error - check your internet connection');
        }
        process.exit(1);
      });
  } catch (error) {
    console.log(`   ❌ Failed to create Supabase client: ${error.message}`);
    process.exit(1);
  }
} else {
  console.log('   ⚠️  Cannot test - missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}


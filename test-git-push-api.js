/**
 * Test script for Git Push API
 * 
 * Usage:
 * 1. Start your server: npm run server
 * 2. Login as admin and get your JWT token
 * 3. Update TOKEN below with your JWT token
 * 4. Run: node test-git-push-api.js
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with your actual JWT token

// Test Git Status
async function testGitStatus() {
  console.log('\n📊 Testing Git Status API...');
  console.log('='.repeat(50));
  
  try {
    const response = await axios.get(`${API_BASE_URL}/api/git/status`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });
    
    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.error('   → Invalid or missing JWT token');
    } else if (error.response?.status === 403) {
      console.error('   → Access denied. Admin role required.');
    }
    return false;
  }
}

// Test Git Push
async function testGitPush(branch = 'main', force = false) {
  console.log('\n🚀 Testing Git Push API...');
  console.log('='.repeat(50));
  console.log(`Branch: ${branch}, Force: ${force}`);
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/git/push`,
      { branch, force },
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.output) {
      console.log('\nGit Output:');
      console.log(response.data.output);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.error('   → Invalid or missing JWT token');
      console.error('   → Get token by logging in as admin');
    } else if (error.response?.status === 403) {
      console.error('   → Access denied. Admin role required.');
    } else if (error.response?.status === 400) {
      console.error('   → Bad request. Check if git is initialized.');
    } else if (error.response?.data?.output) {
      console.error('\nGit Output:');
      console.error(error.response.data.output);
    }
    
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🧪 Git Push API Test Suite');
  console.log('='.repeat(50));
  console.log(`API URL: ${API_BASE_URL}`);
  console.log(`Token: ${TOKEN.substring(0, 20)}...`);
  
  if (TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    console.error('\n❌ Please update TOKEN variable with your actual JWT token');
    console.error('   1. Login as admin in your application');
    console.error('   2. Get JWT token from browser localStorage or network tab');
    console.error('   3. Update TOKEN in this file');
    process.exit(1);
  }
  
  // Test 1: Git Status
  const statusSuccess = await testGitStatus();
  
  if (!statusSuccess) {
    console.error('\n❌ Git Status test failed. Check your token and admin access.');
    process.exit(1);
  }
  
  // Ask before pushing
  console.log('\n⚠️  Ready to test Git Push');
  console.log('This will attempt to push to GitHub.');
  console.log('Make sure you have:');
  console.log('  1. Git initialized');
  console.log('  2. Remote repository configured');
  console.log('  3. Changes committed (or nothing to push)');
  console.log('\nPress Ctrl+C to cancel, or wait 3 seconds to continue...');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test 2: Git Push
  const pushSuccess = await testGitPush('main', false);
  
  console.log('\n' + '='.repeat(50));
  if (pushSuccess) {
    console.log('✅ All tests passed!');
  } else {
    console.log('❌ Some tests failed. Check the errors above.');
  }
  console.log('='.repeat(50));
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

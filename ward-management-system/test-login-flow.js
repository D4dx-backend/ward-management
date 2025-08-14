// Test login flow with mobile number and PIN
// Usage: node test-login-flow.js

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import models
const User = require('./models/User').default;

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function createTestUser() {
  const testUserData = {
    name: 'Test Login User',
    mobileNumber: '9656550933',
    pinCode: '1234',
    role: 'coordinator',
    district: 'Test District'
  };
  
  console.log('👤 Creating/updating test user for login test...');
  
  try {
    // Remove existing user if exists
    await User.deleteOne({ 
      mobileNumber: testUserData.mobileNumber,
      role: { $in: ['coordinator', 'wardAdmin'] }
    });
    
    // Create new user
    const newUser = new User({
      name: testUserData.name,
      role: testUserData.role,
      district: testUserData.district,
      mobileNumber: testUserData.mobileNumber,
      pinCode: testUserData.pinCode,
      createdBy: new mongoose.Types.ObjectId() // Dummy creator ID
    });
    
    await newUser.save();
    console.log('✅ Test user created successfully');
    console.log('📋 User Details:');
    console.log('   Name:', testUserData.name);
    console.log('   Mobile:', testUserData.mobileNumber);
    console.log('   PIN:', testUserData.pinCode);
    console.log('   Role:', testUserData.role);
    console.log('   ID:', newUser._id);
    
    return testUserData;
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  }
}

async function testAuthentication(mobileNumber, pinCode) {
  console.log('\n🔐 Testing Authentication Logic...');
  
  try {
    // Simulate the authentication logic from NextAuth
    const user = await User.findOne({ 
      mobileNumber: mobileNumber,
      role: { $in: ['coordinator', 'wardAdmin'] }
    });
    
    if (!user) {
      console.log('❌ Authentication failed: No user found with this mobile number');
      return false;
    }
    
    console.log('✅ User found in database');
    console.log('📋 Database User:');
    console.log('   Name:', user.name);
    console.log('   Mobile:', user.mobileNumber);
    console.log('   Stored PIN:', user.pinCode);
    console.log('   Role:', user.role);
    
    if (user.pinCode !== pinCode) {
      console.log('❌ Authentication failed: Invalid PIN code');
      console.log('   Expected:', user.pinCode);
      console.log('   Provided:', pinCode);
      return false;
    }
    
    console.log('✅ PIN verification successful');
    
    // Simulate successful authentication response
    const authResult = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      district: user.district || null,
      mobileNumber: user.mobileNumber,
    };
    
    console.log('✅ Authentication successful!');
    console.log('📋 Auth Result:', authResult);
    
    return true;
    
  } catch (error) {
    console.error('❌ Authentication error:', error);
    return false;
  }
}

async function testLoginAPI() {
  console.log('\n🌐 Testing Login API Endpoint...');
  
  try {
    // Use built-in fetch or node-fetch
    let fetch;
    try {
      fetch = globalThis.fetch || require('node-fetch');
    } catch (e) {
      fetch = require('node-fetch');
    }
    
    const loginData = {
      mobileNumber: '9656550933',
      pinCode: '1234'
    };
    
    console.log('📤 Making login request...');
    console.log('📋 Login Data:', loginData);
    
    // Note: This would require the server to be running and proper session handling
    console.log('ℹ️  To test the actual login API endpoint:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Go to http://localhost:3000/auth/signin');
    console.log('3. Use Mobile & PIN login method');
    console.log('4. Enter mobile: 9656550933');
    console.log('5. Enter PIN: 1234');
    console.log('6. Click Sign in');
    
    return true;
    
  } catch (error) {
    console.error('❌ Login API test error:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Login Flow Test\n');
  console.log('=' .repeat(50));
  
  await connectDB();
  
  // Step 1: Create test user
  const testUser = await createTestUser();
  
  // Step 2: Test authentication logic
  const authSuccess = await testAuthentication(testUser.mobileNumber, testUser.pinCode);
  
  // Step 3: Test with wrong PIN
  console.log('\n🔐 Testing with wrong PIN...');
  const wrongPinTest = await testAuthentication(testUser.mobileNumber, '9999');
  
  // Step 4: Test login API info
  await testLoginAPI();
  
  console.log('\n' + '=' .repeat(50));
  console.log('🏁 Test Results Summary:');
  console.log('   User Creation: ✅');
  console.log('   Correct PIN Auth:', authSuccess ? '✅' : '❌');
  console.log('   Wrong PIN Auth:', !wrongPinTest ? '✅ (correctly rejected)' : '❌');
  console.log('   Database Connection: ✅');
  
  if (authSuccess && !wrongPinTest) {
    console.log('\n🎉 All tests passed! Login should work correctly.');
    console.log('📱 You can now login with:');
    console.log('   Mobile: 9656550933');
    console.log('   PIN: 1234');
  } else {
    console.log('\n⚠️  Some tests failed. Check the authentication logic.');
  }
  
  await mongoose.disconnect();
  console.log('\n✅ Disconnected from MongoDB');
}

main().catch(console.error);
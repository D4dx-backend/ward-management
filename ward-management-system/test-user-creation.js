// Test script to create a user and verify WhatsApp message
// Run with: node test-user-creation.js

const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function testUserCreation() {
  console.log('🧪 Testing User Creation with WhatsApp Integration...\n');
  
  // Test user data
  const testUser = {
    name: 'Test Coordinator',
    mobileNumber: '9656550933',
    pinCode: '1234',
    role: 'coordinator',
    district: 'Test District'
  };
  
  console.log('📋 Test User Data:');
  console.log('Name:', testUser.name);
  console.log('Mobile:', testUser.mobileNumber);
  console.log('PIN:', testUser.pinCode);
  console.log('Role:', testUser.role);
  console.log('District:', testUser.district);
  console.log('');
  
  try {
    console.log('📤 Creating user via API...');
    
    // First, let's test the WhatsApp API directly
    console.log('🔍 Testing WhatsApp API directly first...');
    
    const testMessage = `🎉 Welcome to Model Ward Management System!

👤 New Account Created for you Successfully

Your Ward and Login Details:
☎️ Phone Number: ${testUser.mobileNumber}
🔐 PIN: ${testUser.pinCode}
👥 Role: ${testUser.role === 'coordinator' ? 'Coordinator' : 'Ward Incharge'}
🌐 Login URL: https://model.myward.in

⚠️ Important Security Notes:
• Keep your PIN secure
• Do not share your PIN with anyone
• Use this 4-digit PIN to login

Need help? Contact the State Admin
Ph: 8606016678

Best regards,
State Election Committee
Welfare Party Kerala`;

    const whatsappResponse = await fetch(process.env.DXING_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DXING_API_SECRET}`
      },
      body: JSON.stringify({
        account_id: process.env.DXING_ACCOUNT_ID,
        recipient: testUser.mobileNumber,
        message: testMessage,
        type: 'text'
      })
    });

    const whatsappResult = await whatsappResponse.json();
    
    console.log('📊 WhatsApp API Response Status:', whatsappResponse.status);
    console.log('📊 WhatsApp API Response:', JSON.stringify(whatsappResult, null, 2));
    
    if (whatsappResponse.ok) {
      console.log('✅ WhatsApp API test successful!');
      console.log('📱 Check WhatsApp on', testUser.mobileNumber, 'for the test message');
    } else {
      console.log('❌ WhatsApp API test failed');
      console.log('Error details:', whatsappResult);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Now test user creation (this would require authentication)
    console.log('ℹ️  To test user creation via the API endpoint, you would need:');
    console.log('1. A valid session token (stateAdmin role)');
    console.log('2. The server to be running (npm run dev)');
    console.log('3. Make a POST request to /api/users with the test data');
    console.log('');
    console.log('📝 Example curl command (replace YOUR_SESSION_TOKEN):');
    console.log(`curl -X POST http://localhost:3000/api/users \\
  -H "Content-Type: application/json" \\
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \\
  -d '${JSON.stringify(testUser)}'`);
    
  } catch (error) {
    console.error('💥 Test error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Check environment variables
function checkConfig() {
  console.log('🔧 Configuration Check:');
  console.log('DXING_API_URL:', process.env.DXING_API_URL || '❌ Missing');
  console.log('DXING_ACCOUNT_ID:', process.env.DXING_ACCOUNT_ID || '❌ Missing');
  console.log('DXING_API_SECRET:', process.env.DXING_API_SECRET ? '✅ Set' : '❌ Missing');
  console.log('');
}

// Run the test
async function main() {
  console.log('🚀 Starting User Creation Test\n');
  console.log('=' .repeat(50));
  
  checkConfig();
  await testUserCreation();
  
  console.log('\n' + '=' .repeat(50));
  console.log('🏁 Test completed!');
}

main().catch(console.error);
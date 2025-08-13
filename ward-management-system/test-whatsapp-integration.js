// Comprehensive test for WhatsApp integration
// Run with: node test-whatsapp-integration.js

const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function testWhatsAppAPI() {
  console.log('🧪 Testing DXing WhatsApp API Integration...\n');
  
  // Test configuration
  const testMessage = `🎉 Welcome to Model Ward Management System!

👤 Test Message - PIN Reset

Your Updated Login Details:
☎️ Phone Number: 9876543210
🔐 New PIN: 1234
👥 Role: Coordinator
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

  const testPhoneNumber = '919876543210'; // Replace with your test number
  
  console.log('📋 Configuration:');
  console.log('API URL:', process.env.DXING_API_URL);
  console.log('Account ID:', process.env.DXING_ACCOUNT_ID);
  console.log('API Secret:', process.env.DXING_API_SECRET ? '✅ Set' : '❌ Missing');
  console.log('Test Phone:', testPhoneNumber);
  console.log('');
  
  try {
    console.log('📤 Sending test WhatsApp message...');
    
    const response = await fetch(process.env.DXING_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DXING_API_SECRET}`
      },
      body: JSON.stringify({
        account_id: process.env.DXING_ACCOUNT_ID,
        recipient: testPhoneNumber,
        message: testMessage,
        type: 'text'
      })
    });
    
    const result = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers));
    console.log('📊 Response Body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n✅ WhatsApp API test successful!');
      console.log('📱 Check your WhatsApp for the test message');
    } else {
      console.log('\n❌ WhatsApp API test failed');
      console.log('Error details:', result);
    }
    
  } catch (error) {
    console.error('\n💥 Test error:', error.message);
    console.error('Stack:', error.stack);
  }
}

async function testPinResetEndpoint() {
  console.log('\n🔐 Testing PIN Reset Endpoint...\n');
  
  const testMobileNumber = '9876543210'; // Replace with a test mobile number that exists in your database
  
  try {
    console.log('📤 Testing PIN reset for mobile:', testMobileNumber);
    
    const response = await fetch('http://localhost:3000/api/auth/reset-pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mobileNumber: testMobileNumber
      })
    });
    
    const result = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n✅ PIN reset endpoint test successful!');
      console.log('📱 Check WhatsApp for the new PIN message');
    } else {
      console.log('\n❌ PIN reset endpoint test failed');
    }
    
  } catch (error) {
    console.error('\n💥 PIN reset test error:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting WhatsApp Integration Tests\n');
  console.log('=' .repeat(50));
  
  await testWhatsAppAPI();
  
  console.log('\n' + '=' .repeat(50));
  
  await testPinResetEndpoint();
  
  console.log('\n' + '=' .repeat(50));
  console.log('🏁 Tests completed!');
}

runAllTests();
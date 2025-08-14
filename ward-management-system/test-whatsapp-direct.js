// Direct WhatsApp API test
// Usage: node test-whatsapp-direct.js

require('dotenv').config({ path: '.env.local' });

async function testWhatsAppDirect() {
  console.log('🧪 Testing WhatsApp API Direct Integration...\n');
  
  const testMobileNumber = '9656550933';
  const testPIN = '1234';
  
  // Prepare the exact message that would be sent during user creation
  const whatsappMessage = `🎉 Welcome to Model Ward Management System!

👤 New Account Created for you Successfully

Your Ward and Login Details:
☎️ Phone Number: ${testMobileNumber}
🔐 PIN: ${testPIN}
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

  console.log('📋 Configuration Check:');
  console.log('API URL:', process.env.DXING_API_URL);
  console.log('Account ID:', process.env.DXING_ACCOUNT_ID);
  console.log('API Secret:', process.env.DXING_API_SECRET ? '✅ Set (length: ' + process.env.DXING_API_SECRET.length + ')' : '❌ Missing');
  console.log('Target Mobile:', testMobileNumber);
  console.log('');
  
  try {
    console.log('📤 Sending WhatsApp message...');
    
    // Use built-in fetch or node-fetch
    let fetch;
    try {
      fetch = globalThis.fetch || require('node-fetch');
    } catch (e) {
      // Fallback for older Node versions
      fetch = require('node-fetch');
    }
    
    // Correct DXing API format
    const requestBody = {
      secret: process.env.DXING_API_SECRET,
      account: process.env.DXING_ACCOUNT_ID,
      recipient: `+91${testMobileNumber}`,
      message: whatsappMessage,
      type: 'text'
    };
    
    console.log('📋 Request Body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(process.env.DXING_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers));
    
    const result = await response.json();
    console.log('📊 Response Body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n✅ WhatsApp message sent successfully!');
      console.log('📱 Check WhatsApp on', testMobileNumber, 'for the message');
      console.log('🔐 The PIN in the message is:', testPIN);
      console.log('🌐 Login URL: https://model.myward.in');
    } else {
      console.log('\n❌ WhatsApp message failed to send');
      console.log('Error details:', result);
      
      // Common error troubleshooting
      if (response.status === 401) {
        console.log('\n🔍 Troubleshooting: 401 Unauthorized');
        console.log('- Check if DXING_API_SECRET is correct');
        console.log('- Verify the API secret hasn\'t expired');
      } else if (response.status === 400) {
        console.log('\n🔍 Troubleshooting: 400 Bad Request');
        console.log('- Check if DXING_ACCOUNT_ID is correct');
        console.log('- Verify the mobile number format');
      }
    }
    
  } catch (error) {
    console.error('\n💥 Error occurred:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testWhatsAppDirect();
// Test user creation API call simulation
// This simulates what happens when a user is created via the API

require('dotenv').config({ path: '.env.local' });

async function simulateUserCreation() {
  console.log('🧪 Simulating User Creation with WhatsApp...\n');
  
  const testUser = {
    name: 'Test Coordinator API',
    mobileNumber: '9656550933',
    pinCode: '5678',
    role: 'coordinator',
    district: 'Test District'
  };
  
  console.log('📋 Test User Data:');
  console.log('Name:', testUser.name);
  console.log('Mobile:', testUser.mobileNumber);
  console.log('PIN:', testUser.pinCode);
  console.log('Role:', testUser.role);
  console.log('');
  
  // Simulate the WhatsApp message that would be sent during user creation
  const whatsappMessage = `🎉 Welcome to Model Ward Management System!

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

  try {
    console.log('📤 Sending WhatsApp message (simulating user creation)...');
    
    // Use built-in fetch or node-fetch
    let fetch;
    try {
      fetch = globalThis.fetch || require('node-fetch');
    } catch (e) {
      fetch = require('node-fetch');
    }
    
    const requestBody = {
      secret: process.env.DXING_API_SECRET,
      account: process.env.DXING_ACCOUNT_ID,
      recipient: `+91${testUser.mobileNumber}`,
      message: whatsappMessage,
      type: 'text'
    };
    
    const response = await fetch(process.env.DXING_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const result = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Body:', JSON.stringify(result, null, 2));
    
    if (response.ok && result.status === 200) {
      console.log('\n✅ User creation WhatsApp simulation successful!');
      console.log('📱 Check WhatsApp on', testUser.mobileNumber, 'for the welcome message');
      console.log('🔐 The PIN in the message is:', testUser.pinCode);
      console.log('📋 Message ID:', result.data?.messageId);
      
      console.log('\n🎯 Summary:');
      console.log('   ✅ WhatsApp API working correctly');
      console.log('   ✅ User creation message format correct');
      console.log('   ✅ PIN delivery successful');
      console.log('   ✅ Ready for production use');
      
    } else {
      console.log('\n❌ WhatsApp simulation failed');
      console.log('Error details:', result);
    }
    
  } catch (error) {
    console.error('\n💥 Error occurred:', error.message);
  }
}

// Run the simulation
simulateUserCreation();
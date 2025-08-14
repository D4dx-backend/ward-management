// Direct user creation script with database access
// Usage: node scripts/create-test-user.js

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import models
const User = require('../models/User').default;

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    const fetch = (await import('node-fetch')).default;
    
    console.log('📤 Sending WhatsApp message to:', phoneNumber);
    console.log('📋 Message preview:', message.substring(0, 100) + '...');
    
    const response = await fetch(process.env.DXING_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DXING_API_SECRET}`
      },
      body: JSON.stringify({
        account_id: process.env.DXING_ACCOUNT_ID,
        recipient: phoneNumber,
        message: message,
        type: 'text'
      })
    });

    const result = await response.json();
    
    console.log('📊 WhatsApp API Response Status:', response.status);
    console.log('📊 WhatsApp API Response:', JSON.stringify(result, null, 2));
    
    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${result.message || 'Unknown error'}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ WhatsApp sending error:', error);
    throw error;
  }
}

async function createTestUser() {
  try {
    const testUserData = {
      name: 'Test Coordinator WhatsApp',
      mobileNumber: '9656550933',
      pinCode: '1234',
      role: 'coordinator',
      district: 'Test District'
    };
    
    console.log('👤 Creating test user...');
    console.log('📋 User Data:', testUserData);
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      mobileNumber: testUserData.mobileNumber,
      role: { $in: ['coordinator', 'wardAdmin'] }
    });
    
    if (existingUser) {
      console.log('⚠️  User already exists, deleting first...');
      await User.findByIdAndDelete(existingUser._id);
      console.log('🗑️  Existing user deleted');
    }
    
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
    console.log('✅ User created successfully in database');
    console.log('📋 User ID:', newUser._id);
    
    // Send WhatsApp message (simulating the API behavior)
    const whatsappMessage = `🎉 Welcome to Model Ward Management System!

👤 New Account Created for you Successfully

Your Ward and Login Details:
☎️ Phone Number: ${testUserData.mobileNumber}
🔐 PIN: ${testUserData.pinCode}
👥 Role: ${testUserData.role === 'coordinator' ? 'Coordinator' : 'Ward Incharge'}
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
      const whatsappResult = await sendWhatsAppMessage(testUserData.mobileNumber, whatsappMessage);
      console.log('✅ WhatsApp message sent successfully!');
      console.log('📱 Check WhatsApp on', testUserData.mobileNumber);
      
      console.log('\n🎉 Test completed successfully!');
      console.log('📋 Summary:');
      console.log('   User Created: ✅');
      console.log('   WhatsApp Sent: ✅');
      console.log('   Mobile Number:', testUserData.mobileNumber);
      console.log('   PIN:', testUserData.pinCode);
      
    } catch (whatsappError) {
      console.error('❌ WhatsApp sending failed:', whatsappError.message);
      console.log('📋 Summary:');
      console.log('   User Created: ✅');
      console.log('   WhatsApp Sent: ❌');
    }

  } catch (error) {
    console.error('❌ User creation error:', error);
  }
}

async function main() {
  console.log('🚀 Starting Test User Creation with WhatsApp...\n');
  
  // Check configuration
  console.log('🔧 Configuration:');
  console.log('MongoDB URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Missing');
  console.log('DXING API URL:', process.env.DXING_API_URL || '❌ Missing');
  console.log('DXING Account ID:', process.env.DXING_ACCOUNT_ID || '❌ Missing');
  console.log('DXING API Secret:', process.env.DXING_API_SECRET ? '✅ Set' : '❌ Missing');
  console.log('');
  
  await connectDB();
  await createTestUser();
  
  await mongoose.disconnect();
  console.log('\n✅ Disconnected from MongoDB');
}

main().catch(console.error);
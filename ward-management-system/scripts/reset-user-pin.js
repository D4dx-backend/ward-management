// Manual PIN reset utility
// Usage: node scripts/reset-user-pin.js <mobileNumber>

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
    
    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${result.message || 'Unknown error'}`);
    }
    
    return result;
  } catch (error) {
    console.error('WhatsApp sending error:', error);
    throw error;
  }
}

function generatePIN() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function resetUserPin(mobileNumber) {
  try {
    console.log(`🔍 Looking for user with mobile number: ${mobileNumber}`);
    
    // Find user by mobile number
    const user = await User.findOne({ 
      mobileNumber: mobileNumber,
      role: { $in: ['coordinator', 'wardAdmin'] }
    });

    if (!user) {
      console.log('❌ No user found with this mobile number');
      return;
    }

    console.log(`👤 Found user: ${user.name} (${user.role})`);
    
    // Generate new PIN
    const newPIN = generatePIN();
    console.log(`🔐 Generated new PIN: ${newPIN}`);
    
    // Update user's PIN in database
    const oldPIN = user.pinCode;
    user.pinCode = newPIN;
    await user.save();
    
    console.log(`💾 Updated PIN in database (old: ${oldPIN} -> new: ${newPIN})`);

    // Prepare WhatsApp message
    const whatsappMessage = `🎉 Welcome to Model Ward Management System!

🔐 PIN Reset Successful

Your Updated Login Details:
☎️ Phone Number: ${mobileNumber}
🔐 New PIN: ${newPIN}
👥 Role: ${user.role === 'coordinator' ? 'Coordinator' : 'Ward Incharge'}
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

    // Send WhatsApp message
    console.log('📤 Sending WhatsApp message...');
    
    try {
      const result = await sendWhatsAppMessage(mobileNumber, whatsappMessage);
      console.log('✅ WhatsApp message sent successfully!');
      console.log('📱 Message details:', result);
      
      console.log('\n🎉 PIN reset completed successfully!');
      console.log(`📋 Summary:`);
      console.log(`   User: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Mobile: ${mobileNumber}`);
      console.log(`   New PIN: ${newPIN}`);
      console.log(`   WhatsApp: Sent ✅`);
      
    } catch (whatsappError) {
      // If WhatsApp fails, revert the PIN change
      user.pinCode = oldPIN;
      await user.save();
      
      console.error('❌ WhatsApp sending failed, PIN reverted');
      console.error('Error:', whatsappError.message);
    }

  } catch (error) {
    console.error('❌ PIN reset error:', error);
  }
}

async function main() {
  const mobileNumber = process.argv[2];
  
  if (!mobileNumber) {
    console.log('Usage: node scripts/reset-user-pin.js <mobileNumber>');
    console.log('Example: node scripts/reset-user-pin.js 9876543210');
    process.exit(1);
  }
  
  console.log('🚀 Starting PIN reset process...\n');
  
  await connectDB();
  await resetUserPin(mobileNumber);
  
  await mongoose.disconnect();
  console.log('\n✅ Disconnected from MongoDB');
}

main().catch(console.error);
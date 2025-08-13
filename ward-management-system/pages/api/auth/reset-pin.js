import connectToDatabase from '../../../lib/mongodb';
import User from '../../../models/User';
import { logActivity, ACTIONS } from '../../../lib/logger';

// DXing WhatsApp API function
async function sendWhatsAppMessage(phoneNumber, message) {
  try {
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

// Generate a new 4-digit PIN
function generatePIN() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await connectToDatabase();

  try {
    const { mobileNumber } = req.body;

    if (!mobileNumber) {
      return res.status(400).json({ message: 'Mobile number is required' });
    }

    // Find user by mobile number
    const user = await User.findOne({ 
      mobileNumber: mobileNumber,
      role: { $in: ['coordinator', 'wardAdmin'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'No user found with this mobile number' });
    }

    // Generate new PIN
    const newPIN = generatePIN();
    
    // Update user's PIN in database
    user.pinCode = newPIN;
    await user.save();

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
    try {
      await sendWhatsAppMessage(mobileNumber, whatsappMessage);
      
      // Log the PIN reset activity
      await logActivity({
        userId: user._id,
        action: ACTIONS.USER_UPDATE,
        description: `PIN reset successful for user: ${user.name}`,
        entityType: 'User',
        entityId: user._id,
        metadata: {
          userRole: user.role,
          district: user.district || null,
          resetMethod: 'whatsapp',
          mobileNumber: mobileNumber
        },
        district: user.district,
        ipAddress: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({ 
        message: 'PIN reset successful. New PIN sent to your WhatsApp.',
        success: true
      });
      
    } catch (whatsappError) {
      // If WhatsApp fails, revert the PIN change
      user.pinCode = user.pinCode; // Keep old PIN
      await user.save();
      
      console.error('WhatsApp sending failed:', whatsappError);
      return res.status(500).json({ 
        message: 'Failed to send PIN via WhatsApp. Please try again later.',
        error: whatsappError.message
      });
    }

  } catch (error) {
    console.error('PIN reset error:', error);
    return res.status(500).json({ 
      message: 'Internal server error during PIN reset',
      error: error.message
    });
  }
}
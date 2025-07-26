import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import bcrypt from 'bcryptjs';
import connectToDatabase from '../../../lib/mongodb';
import User from '../../../models/User';
import { generateSecurePassword, generate4DigitPIN, sendPasswordResetMessage } from '../../../lib/whatsapp';
import { logActivity, ACTIONS } from '../../../lib/logger';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  await connectToDatabase();

  try {
    // Find the current user
    const user = await User.findById(session.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate new password based on user role
    const isPIN = user.role !== 'stateAdmin';
    const newPassword = isPIN ? generate4DigitPIN() : generateSecurePassword();
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await User.findByIdAndUpdate(session.user.id, {
      password: hashedPassword,
      passwordResetAt: new Date()
    });

    // Send WhatsApp notification if mobile number exists
    let whatsappResult = null;
    if (user.mobileNumber) {
      console.log(`Self-reset: Attempting to send WhatsApp to: ${user.mobileNumber} for user: ${user.name}`);
      whatsappResult = await sendPasswordResetMessage({
        name: user.name,
        email: user.email,
        newPassword: newPassword,
        mobileNumber: user.mobileNumber,
        isPIN: isPIN
      });
      console.log('Self-reset WhatsApp result:', whatsappResult);
    } else {
      console.log(`Self-reset: No mobile number found for user: ${user.name} (${user.email})`);
      whatsappResult = { success: false, error: 'No mobile number found for user' };
    }

    // Log the self password reset activity
    try {
      await logActivity({
        userId: session.user.id,
        action: ACTIONS.PASSWORD_RESET,
        description: `Self-reset ${isPIN ? 'PIN' : 'password'}: ${user.name} (${user.email})`,
        entityType: 'User',
        entityId: user._id,
        metadata: { 
          selfReset: true,
          userRole: user.role,
          isPIN: isPIN,
          whatsappSent: whatsappResult?.success || false
        },
        district: user.district || 'Unknown',
        ward: user.ward || null,
        ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      });
    } catch (logError) {
      console.error('Failed to log self password reset activity:', logError);
    }

    return res.status(200).json({
      message: `${isPIN ? 'PIN' : 'Password'} reset successfully`,
      whatsappSent: whatsappResult?.success || false,
      whatsappError: whatsappResult?.error || null,
      whatsappDetails: whatsappResult?.details || null,
      userMobileNumber: user.mobileNumber || 'Not provided',
      isPIN: isPIN,
      newPassword: newPassword // Show actual password/PIN
    });

  } catch (error) {
    console.error('Self password reset error:', error);
    return res.status(500).json({ 
      message: 'Error resetting password', 
      error: error.message 
    });
  }
}
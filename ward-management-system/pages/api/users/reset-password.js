import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import bcrypt from 'bcryptjs';
import connectToDatabase from '../../../lib/mongodb';
import User from '../../../models/User';
import { generateSecurePassword, sendPasswordResetMessage } from '../../../lib/whatsapp';
import { logActivity, ACTIONS } from '../../../lib/logger';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only state admins can reset passwords
  if (session.user.role !== 'stateAdmin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  await connectToDatabase();

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate new password
    const newPassword = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await User.findByIdAndUpdate(userId, {
      password: hashedPassword,
      passwordResetAt: new Date()
    });

    // Send WhatsApp notification if mobile number exists
    let whatsappResult = null;
    if (user.mobileNumber) {
      console.log(`Attempting to send WhatsApp to: ${user.mobileNumber} for user: ${user.name}`);
      whatsappResult = await sendPasswordResetMessage({
        name: user.name,
        email: user.email,
        newPassword: newPassword,
        mobileNumber: user.mobileNumber
      });
      console.log('WhatsApp result:', whatsappResult);
    } else {
      console.log(`No mobile number found for user: ${user.name} (${user.email})`);
      whatsappResult = { success: false, error: 'No mobile number found for user' };
    }

    // Log the password reset activity
    try {
      await logActivity({
        userId: session.user.id,
        action: ACTIONS.PASSWORD_RESET,
        description: `Reset password for user: ${user.name} (${user.email})`,
        entityType: 'User',
        entityId: user._id,
        metadata: { 
          targetUserEmail: user.email,
          targetUserRole: user.role,
          whatsappSent: whatsappResult?.success || false
        },
        district: session.user.district || 'Unknown',
        ward: session.user.ward || null,
        ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      });
    } catch (logError) {
      console.error('Failed to log password reset activity:', logError);
    }

    return res.status(200).json({
      message: 'Password reset successfully',
      whatsappSent: whatsappResult?.success || false,
      whatsappError: whatsappResult?.error || null,
      whatsappDetails: whatsappResult?.details || null,
      userMobileNumber: user.mobileNumber || 'Not provided',
      newPassword: newPassword // Only for admin reference, remove in production
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ 
      message: 'Error resetting password', 
      error: error.message 
    });
  }
}
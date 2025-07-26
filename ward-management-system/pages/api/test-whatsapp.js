import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { sendWhatsAppMessage, sendWelcomeMessage, sendPasswordResetMessage, generateSecurePassword } from '../../lib/whatsapp';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only state admins can test WhatsApp
  if (session.user.role !== 'stateAdmin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const { type, recipient, name, email } = req.body;

    if (!recipient) {
      return res.status(400).json({ message: 'Recipient mobile number is required' });
    }

    let result;

    switch (type) {
      case 'welcome':
        const password = generateSecurePassword();
        result = await sendWelcomeMessage({
          name: name || 'Test User',
          email: email || 'test@example.com',
          password: password,
          role: 'coordinator',
          mobileNumber: recipient
        });
        break;

      case 'reset':
        const newPassword = generateSecurePassword();
        result = await sendPasswordResetMessage({
          name: name || 'Test User',
          email: email || 'test@example.com',
          newPassword: newPassword,
          mobileNumber: recipient
        });
        break;

      case 'simple':
        result = await sendWhatsAppMessage({
          recipient: recipient,
          message: `🧪 Test message from Ward Management System\n\nThis is a test message sent at ${new Date().toLocaleString()}\n\nIf you received this, WhatsApp integration is working correctly!`
        });
        break;

      default:
        return res.status(400).json({ message: 'Invalid test type. Use: welcome, reset, or simple' });
    }

    return res.status(200).json({
      success: result.success,
      message: result.success ? 'WhatsApp message sent successfully' : 'Failed to send WhatsApp message',
      data: result.data,
      error: result.error
    });

  } catch (error) {
    console.error('WhatsApp test error:', error);
    return res.status(500).json({
      message: 'Error testing WhatsApp',
      error: error.message
    });
  }
}
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { formatPhoneNumber } from '../../lib/whatsapp';
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only state admins can debug WhatsApp
  if (session.user.role !== 'stateAdmin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const { recipient, message = 'Test message from Ward Management System' } = req.body;

    if (!recipient) {
      return res.status(400).json({ message: 'Recipient mobile number is required' });
    }

    // Debug information
    const debugInfo = {
      originalRecipient: recipient,
      formattedRecipient: formatPhoneNumber(recipient),
      environment: {
        DXING_API_SECRET: process.env.DXING_API_SECRET ? '***SET***' : 'NOT SET',
        DXING_ACCOUNT_ID: process.env.DXING_ACCOUNT_ID ? '***SET***' : 'NOT SET',
        DXING_API_URL: process.env.DXING_API_URL || 'NOT SET'
      }
    };

    // Prepare payload exactly as shown in the documentation
    const payload = {
      secret: process.env.DXING_API_SECRET,
      account: process.env.DXING_ACCOUNT_ID,
      recipient: formatPhoneNumber(recipient),
      type: 'text',
      message: message
    };

    console.log('WhatsApp Debug - Payload:', JSON.stringify(payload, null, 2));

    // Make API call
    let apiResponse = null;
    let apiError = null;

    try {
      const response = await axios.post(process.env.DXING_API_URL, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000
      });

      apiResponse = response.data;
      console.log('WhatsApp Debug - Success Response:', JSON.stringify(apiResponse, null, 2));

    } catch (error) {
      apiError = {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      };
      console.error('WhatsApp Debug - Error:', JSON.stringify(apiError, null, 2));
    }

    return res.status(200).json({
      debugInfo,
      payload: {
        ...payload,
        secret: payload.secret ? '***HIDDEN***' : 'NOT SET'
      },
      apiResponse,
      apiError,
      success: !!apiResponse && !apiError
    });

  } catch (error) {
    console.error('WhatsApp debug error:', error);
    return res.status(500).json({ 
      message: 'Error debugging WhatsApp', 
      error: error.message 
    });
  }
}
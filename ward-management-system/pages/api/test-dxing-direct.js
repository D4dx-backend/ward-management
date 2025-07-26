import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only state admins can test
  if (session.user.role !== 'stateAdmin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const { recipient } = req.body;

    if (!recipient) {
      return res.status(400).json({ message: 'Recipient mobile number is required' });
    }

    // Format phone number to ensure it starts with 91 (no + sign as per your example)
    let formattedRecipient = recipient.replace(/\D/g, '');
    if (formattedRecipient.startsWith('0')) {
      formattedRecipient = '91' + formattedRecipient.substring(1);
    } else if (formattedRecipient.length === 10) {
      formattedRecipient = '91' + formattedRecipient;
    } else if (formattedRecipient.startsWith('+91')) {
      formattedRecipient = formattedRecipient.substring(1);
    } else if (formattedRecipient.startsWith('91')) {
      // Already in correct format
    }

    // Exact payload format as shown in your example
    const payload = {
      secret: "18ed3b36a814c961ecf50b5ab3079f9bcd1704e7",
      account: "1728045549a5771bce93e200c36f7cd9dfd0e5deaa66ffe1ed4ae7c",
      recipient: formattedRecipient,
      type: "text",
      message: "Hello! This is a test message from Ward Management System via DXing WhatsApp API"
    };

    console.log('Direct DXing API Test - Payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post('https://app.dxing.in/api/send/whatsapp', payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000
    });

    console.log('Direct DXing API Test - Success:', response.data);

    return res.status(200).json({
      success: true,
      message: 'Message sent successfully',
      payload: payload,
      response: response.data
    });

  } catch (error) {
    console.error('Direct DXing API Test - Error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.response?.data || error.message,
      payload: {
        secret: "***HIDDEN***",
        account: "1728045549a5771bce93e200c36f7cd9dfd0e5deaa66ffe1ed4ae7c",
        recipient: req.body.recipient,
        type: "text",
        message: "Test message"
      }
    });
  }
}
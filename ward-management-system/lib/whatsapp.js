import axios from 'axios';

// Password generation utility
export function generateSecurePassword() {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  
  // Ensure at least one character from each category
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill remaining length with random characters
  const allChars = uppercase + lowercase + numbers + symbols;
  for (let i = 4; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Generate 4-digit PIN for coordinators and ward admins
export function generate4DigitPIN() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Format phone number to E.164 format
export function formatPhoneNumber(phone) {
  if (!phone) return null;
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If it starts with 91, assume it's already formatted
  if (cleaned.startsWith('91')) {
    return '+' + cleaned;
  }
  
  // If it's 10 digits, assume it's Indian number
  if (cleaned.length === 10) {
    return '+91' + cleaned;
  }
  
  // If it starts with 0, remove it and add +91
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return '+91' + cleaned.substring(1);
  }
  
  return '+' + cleaned;
}

// Send WhatsApp message using DXing API
export async function sendWhatsAppMessage({ recipient, message, type = 'text' }) {
  try {
    const formattedRecipient = formatPhoneNumber(recipient);
    
    if (!formattedRecipient) {
      throw new Error('Invalid phone number format');
    }

    // Check if required environment variables are set
    if (!process.env.DXING_API_SECRET) {
      throw new Error('DXING_API_SECRET environment variable is not set');
    }
    
    if (!process.env.DXING_ACCOUNT_ID) {
      throw new Error('DXING_ACCOUNT_ID environment variable is not set');
    }
    
    if (!process.env.DXING_API_URL) {
      throw new Error('DXING_API_URL environment variable is not set');
    }

    const payload = {
      secret: process.env.DXING_API_SECRET,
      account: process.env.DXING_ACCOUNT_ID,
      recipient: formattedRecipient,
      type: type,
      message: message
    };

    console.log('WhatsApp API Call - Recipient:', formattedRecipient);
    console.log('WhatsApp API Call - Message length:', message.length);
    console.log('WhatsApp API Call - URL:', process.env.DXING_API_URL);

    const response = await axios.post(process.env.DXING_API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000 // 30 second timeout
    });

    console.log('WhatsApp API Success:', response.data);

    return {
      success: true,
      data: response.data,
      messageId: response.data?.id || null
    };

  } catch (error) {
    console.error('WhatsApp send error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url
    });
    
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      details: {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      }
    };
  }
}

// Send welcome message with login credentials
export async function sendWelcomeMessage({ name, email, password, role, mobileNumber }) {
  const isPIN = role !== 'stateAdmin';
  const credentialType = isPIN ? 'PIN' : 'Password';
  
  const message = `🎉 Welcome to Ward Management System!

👤 *Account Created Successfully*

*Your Login Details:*
📧 Email: ${email}
🔐 ${credentialType}: ${password}
👥 Role: ${role}

🌐 *Login URL:* ${process.env.NEXTAUTH_URL}/auth/signin

⚠️ *Important Security Notes:*
• Keep your ${credentialType.toLowerCase()} secure
• Do not share your ${credentialType.toLowerCase()} with anyone
${isPIN ? '• Use this 4-digit PIN to login' : '• Please change your password after first login'}

Need help? Contact your system administrator.

Best regards,
Ward Management Team`;

  return await sendWhatsAppMessage({
    recipient: mobileNumber,
    message: message
  });
}

// Send password reset message
export async function sendPasswordResetMessage({ name, email, newPassword, mobileNumber, isPIN = false }) {
  const credentialType = isPIN ? 'PIN' : 'Password';
  const message = `🔐 ${credentialType} Reset - Ward Management System

Hi ${name},

Your ${credentialType.toLowerCase()} has been reset successfully.

*New Login Details:*
📧 Email: ${email}
🔐 New ${credentialType}: ${newPassword}

🌐 *Login URL:* ${process.env.NEXTAUTH_URL}/auth/signin

⚠️ *Security Reminder:*
• Keep your ${credentialType.toLowerCase()} secure
• Do not share your ${credentialType.toLowerCase()} with anyone
${isPIN ? '• Use this 4-digit PIN to login' : '• Please change this password after login'}

If you didn't request this reset, contact your administrator immediately.

Best regards,
Ward Management Team`;

  return await sendWhatsAppMessage({
    recipient: mobileNumber,
    message: message
  });
}

// Send general notification
export async function sendNotification({ recipient, title, message }) {
  const formattedMessage = `📢 ${title}

${message}

Ward Management System`;

  return await sendWhatsAppMessage({
    recipient: recipient,
    message: formattedMessage
  });
}
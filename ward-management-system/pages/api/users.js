import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import dbConnect from '../../lib/mongodb';
import User from '../../models/User';
import Ward from '../../models/Ward';
import bcrypt from 'bcryptjs';
import { logActivity, ACTIONS } from '../../lib/logger';

export default async function handler(req, res) {
  let session;
  try {
    session = await getServerSession(req, res, authOptions);
  } catch (sessionError) {
    console.error('Session error:', sessionError);
    return res.status(401).json({ 
      message: 'Session authentication failed',
      error: process.env.NODE_ENV === 'development' ? sessionError.message : 'Authentication error'
    });
  }

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only allow stateAdmin to access this endpoint
  if (session.user.role !== 'stateAdmin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  await dbConnect();

  // Handle GET: list users (with minimal assigned wards info)
  if (req.method === 'GET') {
    try {
      const { role, page = 1 } = req.query;

      if (process.env.NODE_ENV === 'development') {
        console.log('Users API called with:', { role, page, userRole: session.user.role });
      }

      // Build query
      let query = {};
      if (role) {
        query.role = role;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('User query:', query);
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1);

      // Fetch users
      const users = await User.find(query)
        .select('name email role district mobileNumber createdAt')
        .sort({ createdAt: -1 })
        .skip(skip);

      // Add assigned wards for each user based on their role
      const usersWithWards = await Promise.all(users.map(async (user) => {
        const userObj = user.toObject();
        if (user.role === 'coordinator') {
          const assignedWards = await Ward.find({ coordinator: user._id })
            .select('name district')
            .lean();
          userObj.assignedWards = assignedWards;
        } else if (user.role === 'wardAdmin') {
          const assignedWard = await Ward.findOne({ wardAdmin: user._id })
            .select('name district')
            .lean();
          userObj.assignedWards = assignedWard ? [assignedWard] : [];
        } else {
          userObj.assignedWards = [];
        }
        return userObj;
      }));

      // For backward compatibility, return users directly
      return res.status(200).json(usersWithWards);
    } catch (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ 
        message: 'Failed to fetch users',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  // Handle POST: create user
  if (req.method === 'POST') {
    try {
      const { name, email, password, mobileNumber, pinCode, role, district, sendWhatsApp } = req.body || {};

      // Basic validations
      if (!name || !role) {
        return res.status(400).json({ message: 'Name and role are required' });
      }

      // Role-specific validations
      if (role === 'stateAdmin') {
        if (!email || !password) {
          return res.status(400).json({ message: 'Email and password are required for state admin' });
        }

        // Ensure email not already in use (sparse unique, but we validate gracefully)
        const existingByEmail = await User.findOne({ email });
        if (existingByEmail) {
          return res.status(400).json({ message: 'User with this email already exists' });
        }
      } else if (role === 'coordinator' || role === 'wardAdmin') {
        if (!mobileNumber || !pinCode) {
          return res.status(400).json({ message: 'Mobile number and PIN code are required for coordinators and Ward Incharges' });
        }
        if (String(pinCode).length !== 4 || !/^\d{4}$/.test(String(pinCode))) {
          return res.status(400).json({ message: 'PIN code must be exactly 4 digits' });
        }
        // Ensure mobile number uniqueness among these roles
        const existingByMobile = await User.findOne({
          mobileNumber,
          role: { $in: ['coordinator', 'wardAdmin'] }
        });
        if (existingByMobile) {
          return res.status(400).json({ message: 'User with this mobile number already exists' });
        }
      } else {
        return res.status(400).json({ message: 'Invalid role' });
      }

      // Build user payload
      const newUser = new User({
        name,
        role,
        district: district || undefined,
        createdBy: session.user.id,
      });

      if (role === 'stateAdmin') {
        newUser.email = email;
        newUser.password = await bcrypt.hash(password, 10);
        newUser.mobileNumber = undefined;
        newUser.pinCode = undefined;
      } else {
        newUser.mobileNumber = String(mobileNumber);
        newUser.pinCode = String(pinCode);
        // Email/password are optional/unused for these roles
        if (email) newUser.email = email;
      }

      await newUser.save();

      // Send WhatsApp message for coordinators and Ward Incharges (always enabled)
      if ((role === 'coordinator' || role === 'wardAdmin') && mobileNumber && pinCode) {
        try {
          const whatsappMessage = `🎉 Welcome to Model Ward Management System!

👤 New Account Created for you Successfully

Your Ward and Login Details:
☎️ Phone Number: ${mobileNumber}
🔐 PIN: ${pinCode}
👥 Role: ${role === 'coordinator' ? 'Coordinator' : 'Ward Incharge'}
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

          const response = await fetch(process.env.DXING_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              secret: process.env.DXING_API_SECRET,
              account: process.env.DXING_ACCOUNT_ID,
              recipient: `+91${mobileNumber}`,
              message: whatsappMessage,
              type: 'text'
            })
          });

          if (!response.ok) {
            console.warn('WhatsApp message failed to send:', await response.text());
          } else {
            console.log('WhatsApp message sent successfully to:', mobileNumber);
          }
        } catch (whatsappError) {
          console.warn('WhatsApp sending error:', whatsappError.message);
          // Don't fail user creation if WhatsApp fails
        }
      }

      // Log activity (best-effort)
      try {
        await logActivity({
          userId: session.user.id,
          action: ACTIONS.USER_CREATE,
          description: `Created user: ${newUser.name} (${newUser.role})`,
          entityType: 'User',
          entityId: newUser._id,
          metadata: {
            userRole: newUser.role,
            district: newUser.district || null,
            sendWhatsApp: (role === 'coordinator' || role === 'wardAdmin') ? true : false
          },
          district: session.user.district,
          ward: session.user.ward,
          ipAddress: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
          userAgent: req.headers['user-agent']
        });
      } catch (logErr) {
        // Do not block request on logging failure
        if (process.env.NODE_ENV === 'development') {
          console.warn('User creation logged with warning:', logErr?.message);
        }
      }

      const created = newUser.toObject();
      delete created.password;
      delete created.pinCode;

      return res.status(201).json(created);
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ message: 'Failed to create user', error: error.message });
    }
  }

  // Fallback
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
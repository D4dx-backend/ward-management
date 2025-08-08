import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import User from '../../../models/User';
import Ward from '../../../models/Ward';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only coordinators can create Ward Incharges
  if (session.user.role !== 'coordinator') {
    return res.status(403).json({ message: 'Access denied' });
  }

  await connectToDatabase();

  if (req.method === 'POST') {
    try {
      const { name, mobileNumber, pinCode, wardId, sendWhatsApp } = req.body;

      // Validate required fields
      if (!name || !mobileNumber || !pinCode) {
        return res.status(400).json({ message: 'Name, mobile number, and PIN code are required' });
      }

      if (pinCode.length !== 4 || !/^\d+$/.test(pinCode)) {
        return res.status(400).json({ message: 'PIN code must be exactly 4 digits' });
      }

      // Check if mobile number already exists
      const existingUser = await User.findOne({ mobileNumber });
      if (existingUser) {
        return res.status(400).json({ message: 'Mobile number already exists' });
      }

      // If wardId is provided, check if ward exists and is available
      if (wardId) {
        const ward = await Ward.findById(wardId);
        if (!ward) {
          return res.status(400).json({ message: 'Ward not found' });
        }

        // Check if ward belongs to this coordinator
        if (ward.coordinator.toString() !== session.user.id) {
          return res.status(403).json({ message: 'You can only assign admins to your own wards' });
        }

        // Check if ward already has an admin
        if (ward.wardAdmin) {
          return res.status(400).json({ message: 'Ward already has an admin assigned' });
        }
      }

      // Hash the PIN code
      const hashedPin = await bcrypt.hash(pinCode, 12);

      // Create the user
      const userData = {
        name,
        mobileNumber,
        pinCode: hashedPin,
        role: 'wardAdmin',
        district: session.user.district,
        isActive: true
      };

      const user = new User(userData);
      await user.save();

      // If wardId is provided, assign the user to the ward
      if (wardId) {
        await Ward.findByIdAndUpdate(wardId, { wardAdmin: user._id });
      }

      // Send WhatsApp notification if requested
      if (sendWhatsApp && mobileNumber) {
        try {
          // Import WhatsApp service
          const { sendWhatsAppMessage } = require('../../../lib/whatsapp');

          const message = `Welcome to Ward Management System!\n\nYour login credentials:\nMobile: ${mobileNumber}\nPIN: ${pinCode}\n\nLogin at: ${process.env.NEXTAUTH_URL}/auth/signin`;

          await sendWhatsAppMessage({ recipient: mobileNumber, message });
        } catch (whatsappError) {
          console.error('WhatsApp notification failed:', whatsappError);
          // Don't fail the user creation if WhatsApp fails
        }
      }

      // Return user without sensitive data
      const { pinCode: _, ...userResponse } = user.toObject();
      return res.status(201).json(userResponse);

    } catch (error) {
      console.error('Error creating Ward Incharge:', error);
      return res.status(500).json({ message: 'Error creating Ward Incharge' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
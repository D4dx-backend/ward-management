import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import bcrypt from 'bcryptjs';
import connectToDatabase from '../../../lib/mongodb';
import User from '../../../models/User';
import { logActivity, ACTIONS } from '../../../lib/logger';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  await connectToDatabase();

  const { id } = req.query;

  // Check if user is accessing their own profile or is a state admin
  const isOwnProfile = session.user.id === id;
  const isStateAdmin = session.user.role === 'stateAdmin';

  if (!isOwnProfile && !isStateAdmin) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  if (req.method === 'GET') {
    try {
      const user = await User.findById(id).select('-password');

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get district information from ward assignments if not in user profile
      if (!user.district && (user.role === 'coordinator' || user.role === 'wardAdmin')) {
        const Ward = require('../../../models/Ward').default;
        const ward = await Ward.findOne({
          $or: [
            { coordinator: user._id },
            { wardAdmin: user._id }
          ]
        }).select('district');
        
        if (ward) {
          const userObj = user.toObject();
          userObj.district = ward.district;
          return res.status(200).json(userObj);
        }
      }

      return res.status(200).json(user);
    } catch (error) {
      return res.status(500).json({ message: 'Error fetching user', error: error.message });
    }
  }

  if (req.method === 'PUT') {
    // Only state admin can update other users, users can update their own profile with restrictions
    if (!isOwnProfile && !isStateAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    try {
      const { name, email, role, district, password, mobileNumber, pinCode } = req.body;

      // Find user
      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update fields
      if (name) user.name = name;

      // Only state admin can change email and role
      if (isStateAdmin) {
        if (email) user.email = email;
        if (role) user.role = role;
      }

      // Update district if provided (optional)
      if (district !== undefined) {
        user.district = district || undefined;
      }

      // Update mobile number if provided or required
      if (mobileNumber !== undefined) {
        user.mobileNumber = mobileNumber || undefined;

        // Check if mobile number is unique for coordinators and ward admins
        if (mobileNumber && (user.role === 'coordinator' || user.role === 'wardAdmin')) {
          const existingUserMobile = await User.findOne({
            _id: { $ne: id },
            mobileNumber,
            role: { $in: ['coordinator', 'wardAdmin'] }
          });

          if (existingUserMobile) {
            return res.status(400).json({ message: 'User with this mobile number already exists' });
          }
        }
      } else if ((role === 'coordinator' || role === 'wardAdmin') && !user.mobileNumber) {
        return res.status(400).json({ message: 'Mobile number is required for coordinators and ward admins' });
      }

      // Update PIN code if provided
      if (pinCode) {
        // Validate PIN code
        if (pinCode.length !== 4 || !/^\d+$/.test(pinCode)) {
          return res.status(400).json({ message: 'PIN code must be exactly 4 digits' });
        }

        user.pinCode = pinCode;
      }

      // Update password if provided
      if (password) {
        user.password = await bcrypt.hash(password, 10);
      }

      await user.save();

      // Log the user update activity
      await logActivity({
        userId: session.user.id,
        action: ACTIONS.USER_UPDATE,
        description: `Updated user: ${user.name} (${user.role})`,
        entityType: 'User',
        entityId: user._id,
        metadata: {
          userRole: user.role,
          district: user.district || null
        },
        district: session.user.district,
        ward: session.user.ward,
        ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      });

      // Return user without password and PIN
      const updatedUser = user.toObject();
      delete updatedUser.password;
      delete updatedUser.pinCode;

      // Get district information from ward assignments if not in user profile
      if (!updatedUser.district && (user.role === 'coordinator' || user.role === 'wardAdmin')) {
        const Ward = require('../../../models/Ward').default;
        const ward = await Ward.findOne({
          $or: [
            { coordinator: user._id },
            { wardAdmin: user._id }
          ]
        }).select('district');
        
        if (ward) {
          updatedUser.district = ward.district;
        }
      }

      return res.status(200).json(updatedUser);
    } catch (error) {
      return res.status(500).json({ message: 'Error updating user', error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    // Only state admin can delete users
    if (!isStateAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    try {
      const deletedUser = await User.findByIdAndDelete(id);

      if (!deletedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Log the user deletion activity
      await logActivity({
        userId: session.user.id,
        action: ACTIONS.USER_DELETE,
        description: `Deleted user: ${deletedUser.name} (${deletedUser.role})`,
        entityType: 'User',
        entityId: deletedUser._id,
        metadata: {
          userRole: deletedUser.role,
          district: deletedUser.district || null
        },
        district: session.user.district,
        ward: session.user.ward,
        ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
      return res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
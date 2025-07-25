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
  
  // Only state admin and coordinators can access users
  if (session.user.role !== 'stateAdmin' && session.user.role !== 'coordinator') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  await connectToDatabase();
  
  if (req.method === 'GET') {
    try {
      const users = await User.find({}).select('-password -pinCode');
      
      // Get ward information to populate district data
      const Ward = require('../../../models/Ward').default;
      const wards = await Ward.find({}).select('coordinator wardAdmin district');
      
      // Create a map of user districts based on their ward assignments
      const userDistrictMap = new Map();
      
      wards.forEach(ward => {
        if (ward.coordinator) {
          userDistrictMap.set(ward.coordinator.toString(), ward.district);
        }
        if (ward.wardAdmin) {
          userDistrictMap.set(ward.wardAdmin.toString(), ward.district);
        }
      });
      
      // Populate district information for users
      const usersWithDistricts = users.map(user => {
        const userObj = user.toObject();
        
        // If user doesn't have district in their profile, get it from ward assignment
        if (!userObj.district && userDistrictMap.has(user._id.toString())) {
          userObj.district = userDistrictMap.get(user._id.toString());
        }
        
        return userObj;
      });
      
      return res.status(200).json(usersWithDistricts);
    } catch (error) {
      return res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
  }
  
  if (req.method === 'POST') {
    // Only state admin can create users, coordinators can only create ward admins in their district
    if (session.user.role === 'coordinator') {
      // Coordinators can only create ward admins in their own district
      if (req.body.role !== 'wardAdmin') {
        return res.status(403).json({ message: 'Coordinators can only create ward admin accounts' });
      }
      if (req.body.district && req.body.district !== session.user.district) {
        return res.status(403).json({ message: 'You can only create users in your own district' });
      }
    } else if (session.user.role !== 'stateAdmin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    try {
      const { name, email, password, role, district, mobileNumber, pinCode, wardId } = req.body;
      
      // Validate required fields based on role
      if (!name || !role) {
        return res.status(400).json({ message: 'Name and role are required' });
      }
      
      if (role === 'stateAdmin') {
        if (!email || !password) {
          return res.status(400).json({ message: 'Email and password are required for state admin' });
        }
      } else {
        if (!mobileNumber || !pinCode) {
          return res.status(400).json({ message: 'Mobile number and PIN code are required for coordinators and ward admins' });
        }
        
        if (pinCode.length !== 4 || !/^\d+$/.test(pinCode)) {
          return res.status(400).json({ message: 'PIN code must be exactly 4 digits' });
        }
        
        if (mobileNumber.length < 10 || !/^\d+$/.test(mobileNumber)) {
          return res.status(400).json({ message: 'Mobile number must be at least 10 digits and contain only numbers' });
        }
        
        // No additional validation needed for ward admin
      }
      
      // Check if user already exists with this email (for state admin)
      if (email) {
        const existingUserEmail = await User.findOne({ email });
        if (existingUserEmail) {
          return res.status(400).json({ message: 'User with this email already exists' });
        }
      }
      
      // Check if user already exists with this mobile number (for coordinators and ward admins)
      if (mobileNumber && (role === 'coordinator' || role === 'wardAdmin')) {
        const existingUserMobile = await User.findOne({ 
          mobileNumber: mobileNumber.trim(),
          role: { $in: ['coordinator', 'wardAdmin'] }
        });
        
        if (existingUserMobile) {
          return res.status(400).json({ message: 'User with this mobile number already exists' });
        }
      }
      
      // Hash password if provided
      let hashedPassword = null;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      }
      
      // Create new user
      const userData = {
        name,
        role,
        createdBy: session.user.id,
      };
      
      // Add authentication fields based on role
      if (role === 'stateAdmin') {
        userData.email = email;
        userData.password = hashedPassword;
      } else {
        userData.mobileNumber = mobileNumber.trim();
        userData.pinCode = pinCode.trim();
        
        // Add district if provided (optional)
        if (district) {
          userData.district = district.trim();
        }
      }
      
      const newUser = new User(userData);
      await newUser.save();
      
      // If ward admin and wardId provided, update the ward with the new admin
      if (role === 'wardAdmin' && wardId) {
        const Ward = require('../../../models/Ward').default;
        await Ward.findByIdAndUpdate(wardId, { wardAdmin: newUser._id });
      }
      
      // Log the user creation activity
      await logActivity({
        userId: session.user.id,
        action: ACTIONS.USER_CREATE,
        description: `Created user: ${newUser.name} (${newUser.role})`,
        entityType: 'User',
        entityId: newUser._id,
        metadata: { 
          userRole: newUser.role,
          district: newUser.district || null,
          wardId: wardId || null
        },
        district: session.user.district,
        ward: session.user.ward,
        ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      });
      
      // Return user without password and PIN
      const savedUser = newUser.toObject();
      delete savedUser.password;
      delete savedUser.pinCode;
      
      return res.status(201).json(savedUser);
    } catch (error) {
      return res.status(500).json({ message: 'Error creating user', error: error.message });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}
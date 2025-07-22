import { getSession } from 'next-auth/react';
import connectToDatabase from '../../../lib/mongodb';
import LoginHistory from '../../../models/LoginHistory';
import User from '../../../models/User';

export default async function handler(req, res) {
  const session = await getSession({ req });
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  await connectToDatabase();
  
  if (req.method === 'GET') {
    try {
      const { 
        userId, 
        district, 
        startDate, 
        endDate, 
        page = 1, 
        limit = 50,
        showAllUsers = false
      } = req.query;
      
      // Build query based on user role and permissions
      const query = {};
      
      if (session.user.role === 'stateAdmin') {
        // State admin can see all login history
        if (district) query.district = district;
        if (userId) query.user = userId;
      } else if (session.user.role === 'coordinator') {
        // Coordinators can only see login history from their district
        query.district = session.user.district;
        if (userId) query.user = userId;
      } else if (session.user.role === 'wardAdmin') {
        // Ward admins can only see their own login history
        query.user = session.user.id;
      } else {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      // Date range filter
      if (startDate || endDate) {
        query.loginTime = {};
        if (startDate) query.loginTime.$gte = new Date(startDate);
        if (endDate) query.loginTime.$lte = new Date(endDate);
      }
      
      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Get login history with pagination
      const loginHistory = await LoginHistory.find(query)
        .populate('user', 'name email role mobileNumber')
        .populate('ward', 'name district')
        .sort({ loginTime: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      // Get total count for pagination
      const total = await LoginHistory.countDocuments(query);
      
      return res.status(200).json({
        loginHistory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Login history fetch error:', error);
      return res.status(500).json({ message: 'Error fetching login history', error: error.message });
    }
  }
  
  if (req.method === 'POST') {
    try {
      // This endpoint can be used to manually create login history entries
      // or update existing ones (for logout time, etc.)
      const { action, sessionId, ipAddress, userAgent } = req.body;
      
      if (action === 'logout' && sessionId) {
        // Find and end the session
        const loginSession = await LoginHistory.findOne({
          user: session.user.id,
          sessionId: sessionId,
          isActive: true
        });
        
        if (loginSession) {
          await loginSession.endSession();
          return res.status(200).json({ message: 'Session ended successfully' });
        } else {
          return res.status(404).json({ message: 'Active session not found' });
        }
      }
      
      return res.status(400).json({ message: 'Invalid action' });
    } catch (error) {
      console.error('Login history update error:', error);
      return res.status(500).json({ message: 'Error updating login history', error: error.message });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}
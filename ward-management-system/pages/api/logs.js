import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import connectToDatabase from '../../lib/mongodb';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Only state admin can access logs
  if (session.user.role !== 'stateAdmin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  await connectToDatabase();
  
  if (req.method === 'GET') {
    try {
      const { days = '7', action, userRole } = req.query;
      
      // Calculate date range
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - parseInt(days));
      
      // For now, return mock data since we don't have a Log model yet
      // In a real implementation, you would query your Log collection
      const mockLogs = [
        {
          _id: '1',
          action: 'USER_LOGIN',
          details: 'User logged in successfully',
          user: { 
            _id: session.user.id,
            name: session.user.name, 
            email: session.user.email, 
            role: session.user.role 
          },
          timestamp: new Date().toISOString(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1'
        },
        {
          _id: '2',
          action: 'WARD_CREATED',
          details: 'Created new ward: Sample Ward',
          user: { 
            _id: session.user.id,
            name: session.user.name, 
            email: session.user.email, 
            role: session.user.role 
          },
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1'
        },
        {
          _id: '3',
          action: 'USER_CREATED',
          details: 'Created new coordinator: John Doe',
          user: { 
            _id: session.user.id,
            name: session.user.name, 
            email: session.user.email, 
            role: session.user.role 
          },
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1'
        },
        {
          _id: '4',
          action: 'FORM_CREATED',
          details: 'Created new form: Weekly Report Form',
          user: { 
            _id: session.user.id,
            name: session.user.name, 
            email: session.user.email, 
            role: session.user.role 
          },
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1'
        },
        {
          _id: '5',
          action: 'REPORT_SUBMITTED',
          details: 'Submitted weekly coordinator report',
          user: { 
            _id: 'coord123',
            name: 'John Coordinator', 
            email: 'coordinator@example.com', 
            role: 'coordinator' 
          },
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          ipAddress: '192.168.1.100'
        },
        {
          _id: '6',
          action: 'USER_UPDATED',
          details: 'Updated user profile: Jane Ward Admin',
          user: { 
            _id: session.user.id,
            name: session.user.name, 
            email: session.user.email, 
            role: session.user.role 
          },
          timestamp: new Date(Date.now() - 259200000).toISOString(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1'
        }
      ];
      
      // Filter logs based on query parameters
      let filteredLogs = mockLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= dateLimit;
      });
      
      if (action) {
        filteredLogs = filteredLogs.filter(log => log.action === action);
      }
      
      if (userRole) {
        filteredLogs = filteredLogs.filter(log => log.user.role === userRole);
      }
      
      // Sort by timestamp (newest first)
      filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      return res.status(200).json(filteredLogs);
    } catch (error) {
      return res.status(500).json({ message: 'Error fetching logs', error: error.message });
    }
  }
  
  if (req.method === 'POST') {
    // This endpoint can be used to create new log entries
    try {
      const { action, details, targetId, targetType } = req.body;
      
      if (!action || !details) {
        return res.status(400).json({ message: 'Action and details are required' });
      }
      
      // In a real implementation, you would save to your Log collection
      const logEntry = {
        _id: Date.now().toString(),
        action,
        details,
        user: {
          _id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role
        },
        targetId,
        targetType,
        timestamp: new Date().toISOString(),
        ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1'
      };
      
      // Here you would save to database:
      // const log = new Log(logEntry);
      // await log.save();
      
      return res.status(201).json(logEntry);
    } catch (error) {
      return res.status(500).json({ message: 'Error creating log entry', error: error.message });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}
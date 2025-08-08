import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import Ward from '../../../models/Ward';
import Cluster from '../../../models/Cluster';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Set CORS headers for production
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('=== WARD CLUSTER VISITS API ===');
    console.log('Environment:', process.env.NODE_ENV);

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
      console.log('No session found');
      return res.status(401).json({ message: 'Unauthorized - No session' });
    }

    if (!session.user) {
      console.log('No user in session');
      return res.status(401).json({ message: 'Unauthorized - No user in session' });
    }

    console.log('User role:', session.user.role);
    console.log('User ID:', session.user.id);

    if (session.user.role !== 'coordinator') {
      console.log('Access denied - not coordinator role');
      return res.status(403).json({ message: 'Access denied. Coordinator role required.' });
    }

    // Connect to database with error handling
    try {
      await dbConnect();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return res.status(503).json({ 
        message: 'Database connection failed',
        error: process.env.NODE_ENV === 'development' ? dbError.message : 'Service unavailable'
      });
    }

    const coordinatorId = session.user.id;

    // Validate coordinator ID
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(coordinatorId)) {
      console.error('Invalid coordinator ID format:', coordinatorId);
      return res.status(400).json({ message: 'Invalid coordinator ID format' });
    }

    console.log('Coordinator ID:', coordinatorId);

    // Get coordinator's wards with timeout handling
    let wards;
    try {
      console.log('Fetching coordinator wards...');
      
      const wardsQuery = Ward.find({
        coordinator: new mongoose.Types.ObjectId(coordinatorId),
        isActive: { $ne: false }
      }).sort({ name: 1 }).lean();

      const wardsPromise = wardsQuery.exec();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Wards query timeout')), 10000)
      );

      wards = await Promise.race([wardsPromise, timeoutPromise]);
      console.log(`Found ${wards.length} wards for coordinator`);
      
    } catch (wardsError) {
      console.error('Error fetching coordinator wards:', wardsError);
      return res.status(500).json({ 
        message: 'Failed to fetch coordinator wards',
        error: process.env.NODE_ENV === 'development' ? wardsError.message : 'Query error'
      });
    }

    // Get House Visit data for each ward
    const wardVisitData = await Promise.all(
      wards.map(async (ward) => {
        // Get all clusters for this ward
        const clusters = await Cluster.find({
          ward: ward._id,
          isActive: true
        });

        const totalClusters = clusters.length;
        
        // Calculate visited clusters (clusters with recent lastVisited date)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const visitedClusters = clusters.filter(cluster => 
          cluster.lastVisited && cluster.lastVisited >= thirtyDaysAgo
        ).length;
        
        const pendingClusters = totalClusters - visitedClusters;
        const visitPercentage = totalClusters > 0 ? Math.round((visitedClusters / totalClusters) * 100) : 0;
        
        // Get the most recent visit date
        const lastVisitDate = clusters
          .filter(cluster => cluster.lastVisited)
          .sort((a, b) => new Date(b.lastVisited) - new Date(a.lastVisited))[0]?.lastVisited;

        // Determine status based on visit percentage
        let status = 'poor';
        if (visitPercentage >= 80) status = 'excellent';
        else if (visitPercentage >= 60) status = 'good';
        else if (visitPercentage >= 40) status = 'average';

        return {
          _id: ward._id,
          name: ward.name,
          wardNumber: ward.wardNumber,
          totalClusters,
          visitedClusters,
          pendingClusters,
          visitPercentage,
          lastVisitDate,
          status
        };
      })
    );

    // Sort by visit percentage (highest first)
    wardVisitData.sort((a, b) => b.visitPercentage - a.visitPercentage);

    res.status(200).json({
      wards: wardVisitData,
      summary: {
        totalWards: wards.length,
        totalClusters: wardVisitData.reduce((sum, ward) => sum + ward.totalClusters, 0),
        totalVisited: wardVisitData.reduce((sum, ward) => sum + ward.visitedClusters, 0),
        totalPending: wardVisitData.reduce((sum, ward) => sum + ward.pendingClusters, 0),
        overallPercentage: wardVisitData.length > 0 
          ? Math.round(wardVisitData.reduce((sum, ward) => sum + ward.visitPercentage, 0) / wardVisitData.length)
          : 0
      }
    });

  } catch (error) {
    console.error('Error fetching ward House Visit data:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
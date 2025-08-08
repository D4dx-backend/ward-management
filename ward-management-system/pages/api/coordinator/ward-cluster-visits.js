import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import Ward from '../../../models/Ward';
import ClusterVisit from '../../../models/ClusterVisit';
import FormTemplate from '../../../models/FormTemplate';

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

    // Determine active form weeks (source of truth for weekly House Visits)
    let sortedFormWeeks = [];
    try {
      const forms = await FormTemplate.find({})
        .populate('createdBy', 'role')
        .sort({ createdAt: -1 });
      const weekSet = new Set();
      forms.forEach((form) => {
        if (form.createdBy?.role === 'stateAdmin' && form.weekNumber && form.year) {
          weekSet.add(`${form.year}-${form.weekNumber}`);
        }
      });
      sortedFormWeeks = Array.from(weekSet)
        .map((wk) => {
          const [year, weekNumber] = wk.split('-').map(Number);
          return { year, weekNumber };
        })
        .sort((a, b) => (a.year !== b.year ? b.year - a.year : b.weekNumber - a.weekNumber));
      // Only need the most recent week for status
      if (sortedFormWeeks.length === 0) {
        const now = new Date();
        const currentWeek = getWeekNumber(now);
        sortedFormWeeks = [{ year: now.getFullYear(), weekNumber: currentWeek }];
      }
    } catch (formErr) {
      console.error('Failed to load form weeks:', formErr);
      const fallbackDate = new Date();
      sortedFormWeeks = [{ year: fallbackDate.getFullYear(), weekNumber: getWeekNumber(fallbackDate) }];
    }

    const latestWeekKey = `${sortedFormWeeks[0].year}-${sortedFormWeeks[0].weekNumber}`;
    console.log('Using latest week for status:', latestWeekKey);

    // Get House Visit data for each ward based on ClusterVisit weeklyData
    const wardVisitData = await Promise.all(
      wards.map(async (ward) => {
        // Fetch cluster visit docs for this ward
        const clusterVisits = await ClusterVisit.find({ ward: ward._id }).lean();
        const totalClusters = clusterVisits.length;

        // Count visited where latest week has houses > 0 or days > 0
        const visitedClusters = clusterVisits.reduce((acc, cv) => {
          const weekly = cv.weeklyData?.get
            ? cv.weeklyData.get(latestWeekKey)
            : (cv.weeklyData ? cv.weeklyData[latestWeekKey] : undefined);
          const isVisited = weekly && ((weekly.houses ?? 0) > 0 || (weekly.days ?? 0) > 0);
          return acc + (isVisited ? 1 : 0);
        }, 0);

        const pendingClusters = Math.max(totalClusters - visitedClusters, 0);
        const visitPercentage = totalClusters > 0 ? Math.round((visitedClusters / totalClusters) * 100) : 0;

        // Approximate lastVisitDate from updatedAt of any clusterVisit with latest week activity
        let lastVisitDate = null;
        clusterVisits.forEach((cv) => {
          const weekly = cv.weeklyData?.get
            ? cv.weeklyData.get(latestWeekKey)
            : (cv.weeklyData ? cv.weeklyData[latestWeekKey] : undefined);
          const isVisited = weekly && ((weekly.houses ?? 0) > 0 || (weekly.days ?? 0) > 0);
          if (isVisited) {
            lastVisitDate = lastVisitDate ? new Date(Math.max(new Date(lastVisitDate), new Date(cv.updatedAt))) : cv.updatedAt;
          }
        });

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
          status,
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

// Helper: ISO week number
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
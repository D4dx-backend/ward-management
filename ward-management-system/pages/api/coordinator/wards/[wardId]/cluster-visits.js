import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import dbConnect from '../../../../../lib/mongodb';
import Ward from '../../../../../models/Ward';
import ClusterVisit from '../../../../../models/ClusterVisit';
import FormTemplate from '../../../../../models/FormTemplate';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('=== WARD CLUSTER VISITS DETAILS API ===');
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

    await dbConnect();

    const { wardId } = req.query;
    const coordinatorId = session.user.id;

    // Verify that the ward belongs to this coordinator
    const ward = await Ward.findOne({
      _id: wardId,
      coordinator: coordinatorId,
      isActive: true
    });

    if (!ward) {
      return res.status(403).json({ message: 'Access denied to this ward' });
    }

    // Determine active form weeks and latest week key
    const forms = await FormTemplate.find({})
      .populate('createdBy', 'role')
      .sort({ createdAt: -1 });
    const weekSet = new Set();
    forms.forEach((form) => {
      if (form.createdBy?.role === 'stateAdmin' && form.weekNumber && form.year) {
        weekSet.add(`${form.year}-${form.weekNumber}`);
      }
    });
    let sortedFormWeeks = Array.from(weekSet)
      .map((wk) => {
        const [year, weekNumber] = wk.split('-').map(Number);
        return { year, weekNumber };
      })
      .sort((a, b) => (a.year !== b.year ? b.year - a.year : b.weekNumber - a.weekNumber));
    if (sortedFormWeeks.length === 0) {
      const now = new Date();
      sortedFormWeeks = [{ year: now.getFullYear(), weekNumber: getWeekNumber(now) }];
    }
    const latestWeekKey = `${sortedFormWeeks[0].year}-${sortedFormWeeks[0].weekNumber}`;

    // Fetch cluster visit docs for this ward
    const clusterVisitDocs = await ClusterVisit.find({ ward: wardId }).sort({ clusterName: 1 });

    // Build response similar to /api/cluster-visits/my-ward for coordinator view
    const clusterVisits = clusterVisitDocs.map((cv) => {
      const weeklyObj = cv.weeklyData instanceof Map ? Object.fromEntries(cv.weeklyData) : (cv.weeklyData || {});
      const weekly = (weeklyObj && weeklyObj[latestWeekKey]) || null;
      const visited = weekly && ((weekly.houses ?? 0) > 0 || (weekly.days ?? 0) > 0);
      return {
        _id: cv._id,
        clusterId: cv.cluster,
        clusterName: cv.clusterName,
        weeklyData: weeklyObj,
        totalHouses: Object.values(weeklyObj).reduce((sum, w) => sum + ((w?.houses) || 0), 0),
        totalDays: Object.values(weeklyObj).reduce((sum, w) => sum + ((w?.days) || 0), 0),
        updatedAt: cv.updatedAt,
        status: visited ? 'visited' : 'pending',
        lastVisited: visited ? cv.updatedAt : null
      };
    });

    // Also provide a simplified array for legacy UIs
    const processedClusters = clusterVisits.map((cv) => ({
      _id: cv.clusterId,
      name: cv.clusterName,
      status: cv.status,
      lastVisited: cv.lastVisited
    }));

    // Calculate summary statistics
    const summary = {
      totalClusters: processedClusters.length,
      visitedClusters: processedClusters.filter(c => c.status === 'visited').length,
      pendingClusters: processedClusters.filter(c => c.status === 'pending').length,
      overdueClusters: 0,
      totalHouseholds: processedClusters.reduce((sum, c) => sum + (c.householdCount || 0), 0),
      totalPopulation: processedClusters.reduce((sum, c) => sum + (c.population || 0), 0)
    };

    res.status(200).json({
      ward: {
        _id: ward._id,
        name: ward.name,
        wardNumber: ward.wardNumber
      },
      formWeeks: sortedFormWeeks,
      clusterVisits, // Detailed weekly data for coordinator to view
      clusters: processedClusters, // Backwards compatibility
      summary
    });

  } catch (error) {
    console.error('Error fetching ward House Visits:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
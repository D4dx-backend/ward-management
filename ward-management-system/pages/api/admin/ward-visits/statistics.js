import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import dbConnect from '../../../../lib/mongodb';
import WardVisit from '../../../../models/WardVisit';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
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

    if (session.user.role !== 'stateAdmin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    await dbConnect();

    // Get current date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get basic statistics
    const [
      totalVisits,
      visitsThisMonth,
      visitsLastMonth,
      followUpStats
    ] = await Promise.all([
      WardVisit.countDocuments({}),
      WardVisit.countDocuments({ visitDate: { $gte: startOfMonth } }),
      WardVisit.countDocuments({ 
        visitDate: { $gte: startOfLastMonth, $lte: endOfLastMonth } 
      }),
      WardVisit.aggregate([
        {
          $group: {
            _id: null,
            followUpRequired: {
              $sum: { $cond: ['$followUpRequired', 1, 0] }
            },
            followUpCompleted: {
              $sum: { $cond: ['$followUpCompleted', 1, 0] }
            },
            followUpPending: {
              $sum: {
                $cond: [
                  { $and: ['$followUpRequired', { $not: '$followUpCompleted' }] },
                  1,
                  0
                ]
              }
            },
            followUpOverdue: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      '$followUpRequired',
                      { $not: '$followUpCompleted' },
                      { $lt: ['$followUpDate', now] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ])
    ]);

    // Get visits by month for the last 6 months
    const visitsByMonth = await WardVisit.aggregate([
      {
        $match: {
          visitDate: {
            $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1)
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$visitDate' },
            month: { $month: '$visitDate' }
          },
          visits: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Format monthly data
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedMonthlyData = visitsByMonth.map(item => ({
      month: monthNames[item._id.month - 1],
      visits: item.visits
    }));

    // Get coordinator statistics
    const coordinatorStats = await WardVisit.aggregate([
      {
        $group: {
          _id: '$coordinator',
          visitCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'coordinator'
        }
      },
      {
        $unwind: '$coordinator'
      },
      {
        $project: {
          coordinatorName: '$coordinator.name',
          visitCount: 1
        }
      },
      {
        $sort: { visitCount: -1 }
      }
    ]);

    const followUpData = followUpStats[0] || {
      followUpRequired: 0,
      followUpCompleted: 0,
      followUpPending: 0,
      followUpOverdue: 0
    };

    const statistics = {
      totalVisits,
      visitsThisMonth,
      visitsLastMonth,
      totalCoordinators: coordinatorStats.length,
      averageVisitsPerCoordinator: coordinatorStats.length > 0 
        ? (totalVisits / coordinatorStats.length).toFixed(1) 
        : 0,
      ...followUpData,
      visitsByMonth: formattedMonthlyData,
      coordinatorStats
    };

    res.status(200).json(statistics);
  } catch (error) {
    console.error('Error fetching ward visit statistics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import dbConnect from '../../../../lib/mongodb';
import Response from '../../../../models/Response';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    console.log('Session in coordinator report details API:', session ? 'Found' : 'Not found');
    console.log('User role:', session?.user?.role);
    
    if (!session) {
      console.log('No session found, returning 401');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (session.user.role !== 'coordinator') {
      return res.status(403).json({ message: 'Access denied. Coordinator role required.' });
    }

    await dbConnect();

    const { id } = req.query;
    const coordinatorId = session.user.id;

    // Get the specific report with full details
    const report = await Response.findOne({
      _id: id,
      respondent: coordinatorId,
      formType: 'coordinatorReport'
    })
    .populate('formTemplate', 'title description fields formType weekNumber year')
    .populate('respondent', 'name email');

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    const reportData = {
      _id: report._id,
      formTemplate: report.formTemplate,
      respondent: report.respondent,
      formType: report.formType,
      weekNumber: report.weekNumber,
      year: report.year,
      district: report.district,
      submittedAt: report.submittedAt,
      responses: report.responses,
      wardData: report.wardData
    };

    res.status(200).json(reportData);

  } catch (error) {
    console.error('Error fetching report details:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
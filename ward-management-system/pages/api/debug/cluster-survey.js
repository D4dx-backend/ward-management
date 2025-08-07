import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import Ward from '../../../models/Ward';
import FormTemplate from '../../../models/FormTemplate';

// Helper function to calculate week number from date (same as form creation logic)
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || session.user.role !== 'wardAdmin') {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  await connectToDatabase();
  
  try {
    // Get the Ward Incharge's ward
    const ward = await Ward.findOne({ wardAdmin: session.user.id });
    
    if (!ward) {
      return res.status(404).json({ message: 'Ward not found for this admin' });
    }

    // Get all clusters for this ward
    const Cluster = require('../../../models/Cluster').default;
    const clusters = await Cluster.find({ ward: ward._id, isActive: true }).sort({ clusterNumber: 1 });
    
    // Get all forms
    const forms = await FormTemplate.find({})
      .populate('createdBy', 'role name')
      .sort({ createdAt: -1 });

    // Filter forms created by state admins
    const stateAdminForms = forms.filter(form => 
      form.createdBy && form.createdBy.role === 'stateAdmin'
    );

    // Get forms with week numbers
    const formsWithWeeks = stateAdminForms.filter(form => form.weekNumber && form.year);

    // Get unique weeks
    const formWeeks = new Set();
    formsWithWeeks.forEach(form => {
      formWeeks.add(`${form.year}-${form.weekNumber}`);
    });

    const sortedFormWeeks = Array.from(formWeeks)
      .map(weekKey => {
        const [year, weekNumber] = weekKey.split('-').map(Number);
        return { year, weekNumber };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.weekNumber - a.weekNumber;
      });

    const debugInfo = {
      ward: {
        id: ward._id,
        name: ward.name,
        district: ward.district
      },
      clusters: {
        count: clusters.length,
        list: clusters.map(c => ({ id: c._id, name: c.name, number: c.clusterNumber }))
      },
      forms: {
        total: forms.length,
        stateAdminForms: stateAdminForms.length,
        formsWithWeeks: formsWithWeeks.length,
        formWeeks: sortedFormWeeks,
        recentForms: formsWithWeeks.slice(0, 5).map(f => ({
          title: f.title,
          weekNumber: f.weekNumber,
          year: f.year,
          createdBy: f.createdBy?.name,
          createdAt: f.createdAt
        }))
      },
      currentWeek: {
        weekNumber: getWeekNumber(new Date()),
        year: new Date().getFullYear()
      }
    };

    res.status(200).json(debugInfo);
  } catch (error) {
    console.error('Debug API error:', error);
    res.status(500).json({ message: 'Error fetching debug info', error: error.message });
  }
}
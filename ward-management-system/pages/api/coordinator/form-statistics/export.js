import { getSession } from 'next-auth/react';
import dbConnect from '../../../../lib/mongodb';
import Ward from '../../../../models/Ward';
import FormTemplate from '../../../../models/FormTemplate';
import Response from '../../../../models/Response';
import WardBasicData from '../../../../models/WardBasicData';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (session.user.role !== 'coordinator') {
      return res.status(403).json({ message: 'Access denied. Coordinator role required.' });
    }

    await dbConnect();

    const { timeframe = 'all', format = 'csv' } = req.query;
    const coordinatorId = session.user.id;

    // Get the same data as the main statistics endpoint
    const now = new Date();
    let startDate = null;

    switch (timeframe) {
      case 'current-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last-month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        startDate = lastMonth;
        now.setTime(lastMonthEnd.getTime());
        break;
      case 'last-3-months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      default:
        startDate = null;
    }

    // Get coordinator's wards
    const wards = await Ward.find({ 
      coordinator: coordinatorId, 
      isActive: true 
    })
    .populate('wardAdmin', 'name email')
    .sort({ name: 1 });

    const wardIds = wards.map(w => w._id);

    // Get all active form templates
    const formTemplates = await FormTemplate.find({ isActive: true });

    // Build date filter
    let dateFilter = {};
    if (startDate) {
      dateFilter.submittedAt = { $gte: startDate, $lte: now };
    }

    // Get all responses
    const responses = await Response.find({
      ward: { $in: wardIds },
      ...dateFilter
    })
    .populate('formTemplate', 'title')
    .populate('ward', 'name wardNumber');

    // Get ward basic data
    const wardBasicDataSubmissions = await WardBasicData.find({
      ward: { $in: wardIds },
      ...(startDate ? { submittedAt: { $gte: startDate, $lte: now } } : {})
    })
    .populate('form', 'title')
    .populate('ward', 'name wardNumber');

    if (format === 'csv') {
      // Generate CSV content
      let csvContent = '';
      
      // Ward-wise statistics CSV
      csvContent += 'Ward Statistics\n';
      csvContent += 'Ward Name,Ward Number,Ward Admin,Total Forms,Submitted Forms,Pending Forms,Completion Rate,Last Submission\n';
      
      for (const ward of wards) {
        const wardSubmissions = [
          ...responses.filter(r => r.ward._id.toString() === ward._id.toString()),
          ...wardBasicDataSubmissions.filter(w => w.ward._id.toString() === ward._id.toString())
        ];
        
        const submittedForms = wardSubmissions.length;
        const totalForms = formTemplates.length;
        const pendingForms = totalForms - submittedForms;
        const completionRate = totalForms > 0 ? Math.round((submittedForms / totalForms) * 100) : 0;
        const lastSubmission = wardSubmissions.length > 0 
          ? wardSubmissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0].submittedAt
          : '';

        csvContent += `"${ward.name}",${ward.wardNumber},"${ward.wardAdmin?.name || 'Not Assigned'}",${totalForms},${submittedForms},${pendingForms},${completionRate}%,"${lastSubmission ? new Date(lastSubmission).toLocaleDateString() : 'No submissions'}"\n`;
      }

      csvContent += '\n\nForm Statistics\n';
      csvContent += 'Form Title,Form Type,Total Wards,Submitted Count,Pending Count,Completion Rate\n';
      
      for (const form of formTemplates) {
        const formSubmissions = [
          ...responses.filter(r => r.formTemplate._id.toString() === form._id.toString()),
          ...wardBasicDataSubmissions.filter(w => w.form._id.toString() === form._id.toString())
        ];
        
        const submittedCount = formSubmissions.length;
        const totalWards = wards.length;
        const pendingCount = totalWards - submittedCount;
        const completionRate = totalWards > 0 ? Math.round((submittedCount / totalWards) * 100) : 0;

        csvContent += `"${form.title}","${form.type || 'one-time'}",${totalWards},${submittedCount},${pendingCount},${completionRate}%\n`;
      }

      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="form-statistics-${timeframe}-${new Date().toISOString().split('T')[0]}.csv"`);
      
      res.status(200).send(csvContent);
    } else {
      res.status(400).json({ message: 'Unsupported format. Only CSV is supported.' });
    }

  } catch (error) {
    console.error('Error exporting form statistics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
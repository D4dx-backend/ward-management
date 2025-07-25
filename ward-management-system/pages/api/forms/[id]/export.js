import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import connectToDatabase from '../../../../lib/mongodb';
import Response from '../../../../models/Response';
import FormTemplate from '../../../../models/FormTemplate';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Only state admins can export form responses
  if (session.user.role !== 'stateAdmin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  await connectToDatabase();
  
  if (req.method === 'GET') {
    try {
      const { id } = req.query;
      
      // Get form template
      const formTemplate = await FormTemplate.findById(id);
      
      if (!formTemplate) {
        return res.status(404).json({ message: 'Form template not found' });
      }
      
      // Get all responses for this form
      const responses = await Response.find({ formTemplate: id })
        .populate('respondent', 'name email district role')
        .populate('ward', 'name district')
        .sort({ submittedAt: -1 });
      
      // Create CSV content
      const headers = [
        'Submitted At',
        'Respondent Name',
        'Respondent Email',
        'District',
        'Ward',
        'Role',
        ...formTemplate.fields.map(field => field.label)
      ];
      
      const csvRows = [
        headers.join(','),
        ...responses.map(response => [
          new Date(response.submittedAt).toLocaleString(),
          response.respondent?.name || '',
          response.respondent?.email || '',
          response.district || '',
          response.ward?.name || '',
          response.respondent?.role || '',
          ...formTemplate.fields.map(field => {
            const value = response.responses[field.label];
            if (Array.isArray(value)) {
              return `"${value.join(', ')}"`;
            }
            return `"${value || ''}"`;
          })
        ].join(','))
      ];
      
      const csvContent = csvRows.join('\n');
      
      // Set headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${formTemplate.title}_responses.csv"`);
      
      return res.status(200).send(csvContent);
    } catch (error) {
      return res.status(500).json({ message: 'Error exporting form responses', error: error.message });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}
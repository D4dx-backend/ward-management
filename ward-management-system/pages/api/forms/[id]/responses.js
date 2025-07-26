import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import connectToDatabase from '../../../../lib/mongodb';
import Response from '../../../../models/Response';
import FormTemplate from '../../../../models/FormTemplate';
import Ward from '../../../../models/Ward';
import User from '../../../../models/User';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Only state admins can view form responses
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
      
      return res.status(200).json({
        formTemplate,
        responses
      });
    } catch (error) {
      return res.status(500).json({ message: 'Error fetching form responses', error: error.message });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}
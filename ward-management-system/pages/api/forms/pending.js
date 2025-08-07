import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import FormTemplate from '../../../models/FormTemplate';
import Response from '../../../models/Response';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  await connectToDatabase();
  
  try {
    const now = new Date();
    
    // Find all active forms that are currently open for submission
    const query = {
      isPublished: true,
      enableDateTime: { $lte: now },
      closeDateTime: { $gte: now }
    };

    // Filter by form type based on user role
    if (session.user.role === 'wardAdmin') {
      query.formType = 'wardReport';
    } else if (session.user.role === 'coordinator') {
      query.formType = 'coordinatorReport';
    }

    const forms = await FormTemplate.find(query).sort({ closeDateTime: 1 });
    
    // For each form, check if the user has already submitted a response
    const pendingForms = [];
    
    for (const form of forms) {
      const existingResponse = await Response.findOne({
        formTemplate: form._id,
        respondent: session.user.id
      });
      
      // If no response exists, this form is pending for the user
      if (!existingResponse) {
        pendingForms.push({
          ...form.toObject(),
          isPending: true
        });
      }
    }
    
    return res.status(200).json(pendingForms);
  } catch (error) {
    console.error('Error fetching pending forms:', error);
    return res.status(500).json({ 
      message: 'Error fetching pending forms', 
      error: error.message 
    });
  }
}
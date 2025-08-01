import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';

// Helper function to calculate week number from date
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await connectToDatabase();
  
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'stateAdmin') {
    return res.status(401).json({ message: 'Unauthorized - State admin only' });
  }

  try {
    const FormTemplate = require('../../../models/FormTemplate').default;
    
    // Create test forms for different weeks
    const testForms = [];
    const currentDate = new Date();
    
    // Create forms for the last 5 weeks
    for (let i = 0; i < 5; i++) {
      const formDate = new Date(currentDate);
      formDate.setDate(formDate.getDate() - (i * 7)); // Go back i weeks
      
      const weekNumber = getWeekNumber(formDate);
      const year = formDate.getFullYear();
      
      const closeDate = new Date(formDate);
      closeDate.setDate(closeDate.getDate() + 7);
      
      const formData = {
        title: `Test Form - Week ${weekNumber}, ${year}`,
        description: `Test form for week ${weekNumber} of ${year}`,
        formType: 'coordinatorReport',
        isActive: true,
        isPublished: true,
        allowMultipleSubmissions: true,
        allowEditAfterSubmission: false,
        enableDateTime: formDate,
        closeDateTime: closeDate,
        weekNumber: weekNumber,
        year: year,
        createdBy: session.user.id,
        fields: [
          {
            label: 'Test Question',
            type: 'text',
            required: true,
            options: [],
            subQuestions: [],
            showSubQuestionsWhen: '',
            applicableToClusters: false,
            order: 0
          }
        ]
      };
      
      const form = new FormTemplate(formData);
      await form.save();
      testForms.push({
        title: form.title,
        weekNumber: form.weekNumber,
        year: form.year,
        id: form._id
      });
    }

    res.status(200).json({
      message: 'Test forms created successfully',
      formsCreated: testForms.length,
      forms: testForms
    });
  } catch (error) {
    console.error('Error creating test forms:', error);
    res.status(500).json({ message: 'Error creating test forms', error: error.message });
  }
}
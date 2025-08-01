import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import FormTemplate from '../../../models/FormTemplate';

export default async function handler(req, res) {
  await connectToDatabase();
  
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Get all FormTemplate documents
    const allForms = await FormTemplate.find({})
      .populate('createdBy', 'role name email')
      .sort({ createdAt: -1 })
      .limit(20); // Limit to first 20 for debugging

    console.log(`Found ${allForms.length} FormTemplate documents`);

    // Analyze the forms
    const analysis = {
      totalForms: allForms.length,
      formsWithWeekNumbers: 0,
      stateAdminForms: 0,
      stateAdminFormsWithWeeks: 0,
      uniqueWeeks: new Set(),
      sampleForms: []
    };

    allForms.forEach(form => {
      // Check if form has week number and year
      if (form.weekNumber && form.year) {
        analysis.formsWithWeekNumbers++;
        analysis.uniqueWeeks.add(`${form.year}-${form.weekNumber}`);
      }

      // Check if created by state admin
      if (form.createdBy && form.createdBy.role === 'stateAdmin') {
        analysis.stateAdminForms++;
        
        if (form.weekNumber && form.year) {
          analysis.stateAdminFormsWithWeeks++;
        }
      }

      // Add to sample forms
      if (analysis.sampleForms.length < 5) {
        analysis.sampleForms.push({
          _id: form._id,
          title: form.title,
          weekNumber: form.weekNumber,
          year: form.year,
          createdBy: form.createdBy?.name || 'Unknown',
          createdByRole: form.createdBy?.role || 'Unknown',
          isPublished: form.isPublished,
          createdAt: form.createdAt
        });
      }
    });

    // Convert unique weeks to sorted array
    const sortedWeeks = Array.from(analysis.uniqueWeeks)
      .map(weekKey => {
        const [year, weekNumber] = weekKey.split('-').map(Number);
        return { year, weekNumber };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.weekNumber - a.weekNumber;
      });

    res.status(200).json({
      ...analysis,
      uniqueWeeks: undefined, // Remove Set object
      sortedWeeks,
      uniqueWeeksCount: sortedWeeks.length
    });

  } catch (error) {
    console.error('Error checking FormTemplate collection:', error);
    res.status(500).json({ 
      message: 'Error checking FormTemplate collection', 
      error: error.message 
    });
  }
}
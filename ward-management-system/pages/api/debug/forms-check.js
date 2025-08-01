import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';

export default async function handler(req, res) {
  await connectToDatabase();
  
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const FormTemplate = require('../../../models/FormTemplate').default;
    
    // Get all forms
    const allForms = await FormTemplate.find({})
      .populate('createdBy', 'role name')
      .sort({ createdAt: -1 });

    console.log(`Found ${allForms.length} total forms`);

    // Filter forms created by state admins
    const stateAdminForms = allForms.filter(form => 
      form.createdBy && form.createdBy.role === 'stateAdmin'
    );

    console.log(`Found ${stateAdminForms.length} state admin forms`);

    // Filter forms with week numbers
    const formsWithWeeks = stateAdminForms.filter(form => 
      form.weekNumber && form.year
    );

    console.log(`Found ${formsWithWeeks.length} state admin forms with week numbers`);

    // Get unique weeks
    const formWeeks = new Set();
    formsWithWeeks.forEach(form => {
      formWeeks.add(`${form.year}-${form.weekNumber}`);
    });

    const uniqueWeeks = Array.from(formWeeks).map(weekKey => {
      const [year, weekNumber] = weekKey.split('-').map(Number);
      return { year, weekNumber };
    }).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.weekNumber - a.weekNumber;
    });

    res.status(200).json({
      totalForms: allForms.length,
      stateAdminForms: stateAdminForms.length,
      formsWithWeeks: formsWithWeeks.length,
      uniqueWeeks,
      sampleForms: allForms.slice(0, 3).map(form => ({
        title: form.title,
        createdBy: form.createdBy?.name,
        role: form.createdBy?.role,
        weekNumber: form.weekNumber,
        year: form.year,
        createdAt: form.createdAt
      }))
    });
  } catch (error) {
    console.error('Error checking forms:', error);
    res.status(500).json({ message: 'Error checking forms', error: error.message });
  }
}
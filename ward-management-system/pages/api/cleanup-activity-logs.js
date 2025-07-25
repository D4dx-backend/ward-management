import { getSession } from 'next-auth/react';
import connectToDatabase from '../../lib/mongodb';
import ActivityLog from '../../models/ActivityLog';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Allow state admin and coordinators to clean up logs
  if (session.user.role !== 'stateAdmin' && session.user.role !== 'coordinator') {
    return res.status(403).json({ message: 'Forbidden - Only state admin or coordinator can clean up logs' });
  }

  await connectToDatabase();

  try {
    // Find all activity logs with the old format
    const oldLogs = await ActivityLog.find({
      description: { $regex: /^Viewed reports with filters:/ }
    });

    console.log(`Found ${oldLogs.length} old activity logs to update`);

    let updatedCount = 0;

    for (const log of oldLogs) {
      try {
        // Extract the filter data from the old description
        const filterMatch = log.description.match(/Viewed reports with filters: (.+)$/);
        if (filterMatch) {
          const filterData = JSON.parse(filterMatch[1]);
          
          // Create user-friendly description
          let newDescription = 'Viewed reports';
          const filterParts = [];
          
          if (filterData.formType) {
            const formTypeText = filterData.formType === 'coordinatorReport' ? 'coordinator reports' : 
                               filterData.formType === 'wardReport' ? 'ward reports' : 'reports';
            filterParts.push(formTypeText);
          }
          
          if (filterData.weekNumber && filterData.year) {
            filterParts.push(`for week ${filterData.weekNumber}, ${filterData.year}`);
          } else if (filterData.year) {
            filterParts.push(`for year ${filterData.year}`);
          }
          
          if (filterData.wardId) {
            filterParts.push('for specific ward');
          }
          
          if (filterData.coordinatorId) {
            filterParts.push('for specific coordinator');
          }
          
          if (filterParts.length > 0) {
            newDescription = `Viewed ${filterParts.join(' ')}`;
          }

          // Update the log
          await ActivityLog.findByIdAndUpdate(log._id, {
            description: newDescription
          });
          
          updatedCount++;
        }
      } catch (parseError) {
        console.error(`Error parsing log ${log._id}:`, parseError);
      }
    }

    return res.status(200).json({
      message: 'Activity logs cleaned up successfully',
      totalFound: oldLogs.length,
      updated: updatedCount
    });

  } catch (error) {
    console.error('Error cleaning up activity logs:', error);
    return res.status(500).json({ message: 'Error cleaning up activity logs' });
  }
}
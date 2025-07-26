import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/mongodb';
import Ward from '../../../models/Ward';
import User from '../../../models/User';
import LoginHistory from '../../../models/LoginHistory';
import Response from '../../../models/Response';
import FormTemplate from '../../../models/FormTemplate';
import Cluster from '../../../models/Cluster';

export default async function handler(req, res) {
  try {
    // For recurring exports, we might want to use API key authentication
    // For now, we'll use session authentication
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (session.user.role !== 'stateAdmin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    await dbConnect();

    if (req.method === 'GET') {
      // Get recurring export data
      const { type = 'all', format = 'json' } = req.query;
      
      const exportData = {
        timestamp: new Date().toISOString(),
        data: {}
      };

      if (type === 'all' || type === 'ward-status') {
        exportData.data.wardStatus = await getWardStatusData();
      }

      if (type === 'all' || type === 'relationships') {
        exportData.data.relationships = await getRelationshipData();
      }

      if (type === 'all' || type === 'forms') {
        exportData.data.forms = await getFormData();
      }

      if (format === 'csv') {
        // Convert to CSV format
        let csvContent = '';
        
        if (exportData.data.wardStatus) {
          csvContent += 'WARD STATUS DATA\n';
          csvContent += convertToCSV(exportData.data.wardStatus);
          csvContent += '\n\n';
        }

        if (exportData.data.relationships) {
          csvContent += 'RELATIONSHIP DATA\n';
          csvContent += convertToCSV(exportData.data.relationships);
          csvContent += '\n\n';
        }

        if (exportData.data.forms) {
          csvContent += 'FORM DATA\n';
          csvContent += convertToCSV(exportData.data.forms);
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=recurring-export-${new Date().toISOString().split('T')[0]}.csv`);
        res.status(200).send(csvContent);
      } else {
        res.status(200).json(exportData);
      }

    } else if (req.method === 'POST') {
      // Schedule recurring export (this would typically integrate with a job scheduler)
      const { schedule, type, format, email } = req.body;
      
      // For now, just return success - in production, you'd integrate with a job scheduler
      res.status(200).json({
        message: 'Recurring export scheduled successfully',
        schedule: {
          id: Date.now().toString(),
          schedule,
          type,
          format,
          email,
          createdAt: new Date().toISOString(),
          createdBy: session.user.id
        }
      });

    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Error in recurring export:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function getWardStatusData() {
  const wards = await Ward.find({ isActive: true })
    .populate('coordinator', 'name email mobileNumber lastLogin')
    .populate('wardAdmin', 'name email mobileNumber lastLogin')
    .sort({ district: 1, panchayath: 1, name: 1 });

  const now = new Date();
  const currentWeek = getWeekNumber(now);
  const currentYear = now.getFullYear();

  const formTemplates = await FormTemplate.find({ isActive: true });
  const totalExpectedReports = formTemplates.length;

  return await Promise.all(
    wards.map(async (ward) => {
      const lastLogin = await LoginHistory.findOne({
        user: ward.wardAdmin?._id,
        isActive: false
      }).sort({ loginTime: -1 });

      const submittedReports = await Response.countDocuments({
        ward: ward._id,
        weekNumber: currentWeek,
        year: currentYear
      });

      const lastLoginDate = lastLogin?.loginTime || ward.wardAdmin?.lastLogin;
      const daysSinceLogin = lastLoginDate 
        ? Math.floor((now - new Date(lastLoginDate)) / (1000 * 60 * 60 * 24))
        : null;

      return {
        wardId: ward._id.toString(),
        wardName: ward.name,
        wardNumber: ward.wardNumber,
        panchayath: ward.panchayath,
        district: ward.district,
        coordinatorId: ward.coordinator._id.toString(),
        coordinatorName: ward.coordinator.name,
        coordinatorMobile: ward.coordinator.mobileNumber || '',
        wardAdminId: ward.wardAdmin?._id.toString() || '',
        wardAdminName: ward.wardAdmin?.name || '',
        wardAdminMobile: ward.wardAdmin?.mobileNumber || '',
        lastLogin: lastLoginDate ? new Date(lastLoginDate).toISOString() : null,
        daysSinceLogin,
        submittedReports,
        totalExpectedReports,
        completionRate: totalExpectedReports > 0 
          ? Math.round((submittedReports / totalExpectedReports) * 100) 
          : 0,
        createdAt: ward.createdAt.toISOString()
      };
    })
  );
}

async function getRelationshipData() {
  const wards = await Ward.find({ isActive: true })
    .populate('coordinator', 'name email mobileNumber')
    .populate('wardAdmin', 'name email mobileNumber')
    .sort({ district: 1, panchayath: 1, name: 1 });

  const relationshipData = await Promise.all(
    wards.map(async (ward) => {
      const clusters = await Cluster.find({ ward: ward._id, isActive: true });
      
      if (clusters.length === 0) {
        return [{
          wardId: ward._id.toString(),
          wardName: ward.name,
          wardNumber: ward.wardNumber,
          panchayath: ward.panchayath,
          district: ward.district,
          coordinatorId: ward.coordinator._id.toString(),
          coordinatorName: ward.coordinator.name,
          coordinatorMobile: ward.coordinator.mobileNumber || '',
          wardAdminId: ward.wardAdmin?._id.toString() || '',
          wardAdminName: ward.wardAdmin?.name || '',
          wardAdminMobile: ward.wardAdmin?.mobileNumber || '',
          clusterId: '',
          clusterName: '',
          clusterNumber: '',
          clusterCoordinatorName: '',
          clusterCoordinatorMobile: ''
        }];
      }

      return clusters.map(cluster => ({
        wardId: ward._id.toString(),
        wardName: ward.name,
        wardNumber: ward.wardNumber,
        panchayath: ward.panchayath,
        district: ward.district,
        coordinatorId: ward.coordinator._id.toString(),
        coordinatorName: ward.coordinator.name,
        coordinatorMobile: ward.coordinator.mobileNumber || '',
        wardAdminId: ward.wardAdmin?._id.toString() || '',
        wardAdminName: ward.wardAdmin?.name || '',
        wardAdminMobile: ward.wardAdmin?.mobileNumber || '',
        clusterId: cluster._id.toString(),
        clusterName: cluster.name,
        clusterNumber: cluster.clusterNumber,
        clusterCoordinatorName: cluster.coordinator.name,
        clusterCoordinatorMobile: cluster.coordinator.mobileNumber || ''
      }));
    })
  );

  return relationshipData.flat();
}

async function getFormData() {
  const responses = await Response.find({})
    .populate('formTemplate', 'title description')
    .populate('respondent', 'name email mobileNumber role')
    .populate('ward', 'name wardNumber panchayath district')
    .sort({ submittedAt: -1 });

  return responses.map(response => ({
    responseId: response._id.toString(),
    formTemplateId: response.formTemplate._id.toString(),
    formTitle: response.formTemplate.title,
    formDescription: response.formTemplate.description || '',
    respondentId: response.respondent._id.toString(),
    respondentName: response.respondent.name,
    respondentEmail: response.respondent.email || '',
    respondentMobile: response.respondent.mobileNumber || '',
    respondentRole: response.respondent.role,
    wardId: response.ward?._id.toString() || '',
    wardName: response.ward?.name || '',
    wardNumber: response.ward?.wardNumber || '',
    panchayath: response.ward?.panchayath || '',
    district: response.district,
    formType: response.formType,
    weekNumber: response.weekNumber,
    year: response.year,
    submittedAt: response.submittedAt.toISOString(),
    responseData: JSON.stringify(response.responses)
  }));
}

function convertToCSV(data) {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header] || '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');
  
  return csvContent;
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
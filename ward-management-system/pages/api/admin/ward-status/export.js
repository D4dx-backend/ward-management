import { getSession } from 'next-auth/react';
import dbConnect from '../../../../lib/mongodb';
import Ward from '../../../../models/Ward';
import User from '../../../../models/User';
import LoginHistory from '../../../../models/LoginHistory';
import Response from '../../../../models/Response';
import FormTemplate from '../../../../models/FormTemplate';
import Cluster from '../../../../models/Cluster';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (session.user.role !== 'stateAdmin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    await dbConnect();

    const { type = 'ward-status' } = req.query;

    if (type === 'ward-status') {
      await exportWardStatus(res);
    } else if (type === 'relationships') {
      await exportRelationships(res);
    } else if (type === 'forms') {
      await exportForms(res);
    } else {
      return res.status(400).json({ message: 'Invalid export type' });
    }

  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function exportWardStatus(res) {
  // Get all wards with populated data
  const wards = await Ward.find({ isActive: true })
    .populate('coordinator', 'name email mobileNumber lastLogin')
    .populate('wardAdmin', 'name email mobileNumber lastLogin')
    .sort({ district: 1, panchayath: 1, name: 1 });

  // Get current week and year for report counting
  const now = new Date();
  const currentWeek = getWeekNumber(now);
  const currentYear = now.getFullYear();

  // Get all form templates to count total expected reports
  const formTemplates = await FormTemplate.find({ isActive: true });
  const totalExpectedReports = formTemplates.length;

  // Process each ward to get status information
  const wardStatusData = await Promise.all(
    wards.map(async (ward) => {
      // Get last login for Ward Incharge
      const lastLogin = await LoginHistory.findOne({
        user: ward.wardAdmin?._id,
        isActive: false
      }).sort({ loginTime: -1 });

      // Get submitted reports count for current week
      const submittedReports = await Response.countDocuments({
        ward: ward._id,
        weekNumber: currentWeek,
        year: currentYear
      });

      // Calculate status based on last login
      const lastLoginDate = lastLogin?.loginTime || ward.wardAdmin?.lastLogin;
      const daysSinceLogin = lastLoginDate 
        ? Math.floor((now - new Date(lastLoginDate)) / (1000 * 60 * 60 * 24))
        : null;

      let statusColor = 'No Login Data';
      if (daysSinceLogin !== null) {
        if (daysSinceLogin >= 7) {
          statusColor = 'Inactive (7+ days)';
        } else if (daysSinceLogin >= 4) {
          statusColor = 'Warning (4-6 days)';
        } else {
          statusColor = 'Active (0-3 days)';
        }
      }

      return {
        'Ward ID': ward._id.toString(),
        'Ward Name': ward.name,
        'Ward Number': ward.wardNumber,
        'Panchayath': ward.panchayath,
        'District': ward.district,
        'Coordinator ID': ward.coordinator._id.toString(),
        'Coordinator Name': ward.coordinator.name,
        'Coordinator Mobile': ward.coordinator.mobileNumber || '',
        'Ward Incharge ID': ward.wardAdmin?._id.toString() || '',
        'Ward Incharge Name': ward.wardAdmin?.name || '',
        'Ward Incharge Mobile': ward.wardAdmin?.mobileNumber || '',
        'Last Login': lastLoginDate ? new Date(lastLoginDate).toLocaleString() : 'Never',
        'Days Since Login': daysSinceLogin || 'N/A',
        'Status': statusColor,
        'Reports Submitted': submittedReports,
        'Total Expected Reports': totalExpectedReports,
        'Completion Rate (%)': totalExpectedReports > 0 
          ? Math.round((submittedReports / totalExpectedReports) * 100) 
          : 0,
        'Created At': ward.createdAt.toLocaleString()
      };
    })
  );

  // Convert to CSV
  const csv = convertToCSV(wardStatusData);
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=ward-status-${new Date().toISOString().split('T')[0]}.csv`);
  
  // Add UTF-8 BOM for better Excel compatibility
  const csvWithBOM = '\uFEFF' + csv;
  res.status(200).send(csvWithBOM);
}

async function exportRelationships(res) {
  // Get all wards with full relationship data
  const wards = await Ward.find({ isActive: true })
    .populate('coordinator', 'name email mobileNumber')
    .populate('wardAdmin', 'name email mobileNumber')
    .sort({ district: 1, panchayath: 1, name: 1 });

  // Get clusters for each ward
  const relationshipData = await Promise.all(
    wards.map(async (ward) => {
      const clusters = await Cluster.find({ ward: ward._id, isActive: true });
      
      if (clusters.length === 0) {
        return [{
          'Ward MongoDB ID': ward._id.toString(),
          'Ward Name': ward.name,
          'Ward Number': ward.wardNumber,
          'Panchayath': ward.panchayath,
          'District': ward.district,
          'Coordinator MongoDB ID': ward.coordinator._id.toString(),
          'Coordinator Name': ward.coordinator.name,
          'Coordinator Mobile': ward.coordinator.mobileNumber || '',
          'Ward Incharge MongoDB ID': ward.wardAdmin?._id.toString() || '',
          'Ward Incharge Name': ward.wardAdmin?.name || '',
          'Ward Incharge Mobile': ward.wardAdmin?.mobileNumber || '',
          'Cluster MongoDB ID': '',
          'Cluster Name': '',
          'Cluster Number': '',
          'Cluster Coordinator Name': '',
          'Cluster Coordinator Mobile': ''
        }];
      }

      return clusters.map(cluster => ({
        'Ward MongoDB ID': ward._id.toString(),
        'Ward Name': ward.name,
        'Ward Number': ward.wardNumber,
        'Panchayath': ward.panchayath,
        'District': ward.district,
        'Coordinator MongoDB ID': ward.coordinator._id.toString(),
        'Coordinator Name': ward.coordinator.name,
        'Coordinator Mobile': ward.coordinator.mobileNumber || '',
        'Ward Incharge MongoDB ID': ward.wardAdmin?._id.toString() || '',
        'Ward Incharge Name': ward.wardAdmin?.name || '',
        'Ward Incharge Mobile': ward.wardAdmin?.mobileNumber || '',
        'Cluster MongoDB ID': cluster._id.toString(),
        'Cluster Name': cluster.name,
        'Cluster Number': cluster.clusterNumber,
        'Cluster Coordinator Name': cluster.coordinator.name,
        'Cluster Coordinator Mobile': cluster.coordinator.mobileNumber || ''
      }));
    })
  );

  const flattenedData = relationshipData.flat();
  const csv = convertToCSV(flattenedData);
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=ward-relationships-${new Date().toISOString().split('T')[0]}.csv`);
  
  // Add UTF-8 BOM for better Excel compatibility
  const csvWithBOM = '\uFEFF' + csv;
  res.status(200).send(csvWithBOM);
}

async function exportForms(res) {
  // Get all form responses with populated data
  const responses = await Response.find({})
    .populate('formTemplate', 'title description')
    .populate('respondent', 'name email mobileNumber role')
    .populate('ward', 'name wardNumber panchayath district')
    .sort({ submittedAt: -1 });

  const formData = responses.map(response => ({
    'Response MongoDB ID': response._id.toString(),
    'Form Template ID': response.formTemplate._id.toString(),
    'Form Title': response.formTemplate.title,
    'Form Description': response.formTemplate.description || '',
    'Respondent ID': response.respondent._id.toString(),
    'Respondent Name': response.respondent.name,
    'Respondent Email': response.respondent.email || '',
    'Respondent Mobile': response.respondent.mobileNumber || '',
    'Respondent Role': response.respondent.role,
    'Ward MongoDB ID': response.ward?._id.toString() || '',
    'Ward Name': response.ward?.name || '',
    'Ward Number': response.ward?.wardNumber || '',
    'Panchayath': response.ward?.panchayath || '',
    'District': response.district,
    'Form Type': response.formType,
    'Week Number': response.weekNumber,
    'Year': response.year,
    'Submitted At': response.submittedAt.toLocaleString(),
    'Response Data': JSON.stringify(response.responses)
  }));

  const csv = convertToCSV(formData);
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=form-responses-${new Date().toISOString().split('T')[0]}.csv`);
  
  // Add UTF-8 BOM for better Excel compatibility
  const csvWithBOM = '\uFEFF' + csv;
  res.status(200).send(csvWithBOM);
}

function convertToCSV(data) {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header] || '';
        // Escape quotes and wrap in quotes if contains comma or quote
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');
  
  return csvContent;
}

// Helper function to get week number
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
import { getSession } from 'next-auth/react';
import * as XLSX from 'xlsx';
import connectToDatabase from '../../../lib/mongodb';
import Response from '../../../models/Response';
import FormTemplate from '../../../models/FormTemplate';
import { logActivity, ACTIONS } from '../../../lib/logger';
import { sendExcelResponse, prepareExcelData, generateExcelFilename } from '../../../utils/excelExport';

export default async function handler(req, res) {
  console.log('[Reports Export] Starting export request');
  const session = await getSession({ req });
  
  console.log('[Reports Export] Session data:', {
    hasSession: !!session,
    userRole: session?.user?.role,
    userId: session?.user?.id
  });
  
  // Only state admin and coordinators can export reports
  if (!session || (session.user.role !== 'stateAdmin' && session.user.role !== 'coordinator')) {
    console.log('[Reports Export] Unauthorized access attempt:', {
      hasSession: !!session,
      userRole: session?.user?.role
    });
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  await connectToDatabase();
  
  try {
    const { formType, weekNumber, year, coordinatorId, wardId } = req.query;
    
    console.log('[Reports Export] Query parameters:', {
      formType, weekNumber, year, coordinatorId, wardId
    });
    
    // Build query - make parameters optional
    const query = {};
    
    if (formType) {
      query.formType = formType;
    }
    if (weekNumber) {
      query.weekNumber = parseInt(weekNumber);
    }
    if (year) {
      query.year = parseInt(year);
    }
    
    // Filter by district if user is coordinator
    if (session.user.role === 'coordinator') {
      query.district = session.user.district;
    }
    
    // Filter by coordinator if provided
    if (coordinatorId) {
      query.respondent = coordinatorId;
    }
    
    // Filter by ward if provided
    if (wardId) {
      query.ward = wardId;
    }
    
    // Get responses first to determine what data we have
    const responses = await Response.find(query)
      .populate('respondent', 'name email')
      .populate('ward', 'name district')
      .populate('formTemplate', 'title fields formType')
      .sort({ district: 1, submittedAt: 1 });
    
    if (responses.length === 0) {
      return res.status(404).json({ message: 'No reports found matching the criteria' });
    }
    
    // Get all unique fields from all responses
    const allFields = new Set();
    responses.forEach(response => {
      if (response.formTemplate && response.formTemplate.fields) {
        response.formTemplate.fields.forEach(field => {
          allFields.add(field.label);
        });
      }
      // Also add any response keys that might not be in the template
      if (response.responses) {
        Object.keys(response.responses).forEach(key => {
          allFields.add(key);
        });
      }
    });
    
    const fields = Array.from(allFields);
    
    const data = responses.map(response => {
      const row = {
        'Submitted Date': response.submittedAt.toLocaleDateString(),
        'District': response.district,
        'Respondent': response.respondent.name,
        'Email': response.respondent.email,
      };
      
      // Add ward information if it's a ward report
      if (response.formType === 'wardReport' && response.ward) {
        row['Ward'] = response.ward.name;
      }
      
      // Add responses for each field
      fields.forEach(field => {
        // Try to get the value from responses Map or object
        let value = '';
        if (response.responses) {
          if (typeof response.responses.get === 'function') {
            // It's a Map
            value = response.responses.get(field) || '';
          } else {
            // It's a regular object
            value = response.responses[field] || '';
          }
        }
        row[field] = value;
      });
      
      return row;
    });
    
    // Prepare data for Excel export with UTF-8 encoding
    const excelData = prepareExcelData(data);
    
    // Log the export activity
    await logActivity({
      userId: session.user.id,
      action: ACTIONS.REPORT_EXPORT,
      description: `Exported reports (${responses.length} records)${formType ? ` - ${formType}` : ''}${weekNumber ? ` - Week ${weekNumber}` : ''}${year ? ` - ${year}` : ''}`,
      metadata: { 
        formType: formType || 'all', 
        weekNumber: weekNumber ? parseInt(weekNumber) : 'all', 
        year: year ? parseInt(year) : 'all',
        coordinatorId,
        wardId,
        recordCount: responses.length
      },
      district: session.user.district,
      ward: session.user.ward,
      ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });
    
    // Generate filename based on available filters
    let filename = 'reports';
    if (formType) filename += `-${formType}`;
    if (weekNumber) filename += `-week${weekNumber}`;
    if (year) filename += `-${year}`;
    
    // Send Excel file with UTF-8 encoding
    return sendExcelResponse(res, excelData, filename, 'Responses');
  } catch (error) {
    return res.status(500).json({ message: 'Error exporting report', error: error.message });
  }
}
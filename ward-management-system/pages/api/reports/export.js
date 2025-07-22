import { getSession } from 'next-auth/react';
import * as XLSX from 'xlsx';
import connectToDatabase from '../../../lib/mongodb';
import Response from '../../../models/Response';
import FormTemplate from '../../../models/FormTemplate';
import { logActivity, ACTIONS } from '../../../lib/logger';

export default async function handler(req, res) {
  const session = await getSession({ req });
  
  // Only state admin and coordinators can export reports
  if (!session || (session.user.role !== 'stateAdmin' && session.user.role !== 'coordinator')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  await connectToDatabase();
  
  try {
    const { formType, weekNumber, year, coordinatorId, wardId } = req.query;
    
    // Validate required parameters
    if (!formType || !weekNumber || !year) {
      return res.status(400).json({ message: 'formType, weekNumber, and year are required' });
    }
    
    // Build query
    const query = {
      formType,
      weekNumber: parseInt(weekNumber),
      year: parseInt(year),
    };
    
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
    
    // Get form template to get field information
    const formTemplate = await FormTemplate.findOne({
      formType,
      weekNumber: parseInt(weekNumber),
      year: parseInt(year),
    });
    
    if (!formTemplate) {
      return res.status(404).json({ message: 'Form template not found' });
    }
    
    // Get responses
    const responses = await Response.find(query)
      .populate('respondent', 'name email')
      .populate('ward', 'name district')
      .sort({ district: 1, submittedAt: 1 });
    
    // Prepare data for Excel
    const fields = formTemplate.fields.map(field => field.label);
    
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
        row[field] = response.responses.get(field) || '';
      });
      
      return row;
    });
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Responses');
    
    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // Log the export activity
    await logActivity({
      userId: session.user.id,
      action: ACTIONS.REPORT_EXPORT,
      description: `Exported ${formType} report for week ${weekNumber}, ${year} (${responses.length} records)`,
      metadata: { 
        formType, 
        weekNumber: parseInt(weekNumber), 
        year: parseInt(year),
        coordinatorId,
        wardId,
        recordCount: responses.length
      },
      district: session.user.district,
      ward: session.user.ward,
      ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });
    
    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="report-${formType}-week${weekNumber}-${year}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    // Send Excel file
    return res.status(200).send(excelBuffer);
  } catch (error) {
    return res.status(500).json({ message: 'Error exporting report', error: error.message });
  }
}
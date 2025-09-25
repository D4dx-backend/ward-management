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
    
    console.log('[Reports Export] Found responses:', responses.length);
    
    if (responses.length === 0) {
      return res.status(404).json({ message: 'No reports found matching the criteria' });
    }
    
    // Log any responses with missing data for debugging
    const problematicResponses = responses.filter(response => 
      !response.respondent || !response.respondent.name
    );
    
    if (problematicResponses.length > 0) {
      console.log('[Reports Export] Found responses with missing respondent data:', 
        problematicResponses.map(r => ({ 
          id: r._id, 
          hasRespondent: !!r.respondent,
          respondentId: r.respondent?._id,
          hasWard: !!r.ward,
          wardId: r.ward?._id
        }))
      );
    }
    
    // Log any responses with missing ward data for debugging
    const missingWardResponses = responses.filter(response => 
      response.formType === 'wardReport' && (!response.ward || !response.ward.name)
    );
    
    if (missingWardResponses.length > 0) {
      console.log('[Reports Export] Found ward reports with missing ward data:', 
        missingWardResponses.map(r => ({ 
          id: r._id, 
          formType: r.formType,
          hasWard: !!r.ward,
          wardId: r.ward?._id
        }))
      );
    }
    
    // Filter out any responses that might cause issues during export
    const validResponses = responses.filter(response => {
      // Keep responses even if respondent is missing - we'll handle it in the mapping
      return response && response.formTemplate;
    });
    
    console.log('[Reports Export] Valid responses for export:', validResponses.length);
    
    if (validResponses.length === 0) {
      return res.status(404).json({ message: 'No valid reports found for export' });
    }
    
    // Get all unique fields from all valid responses
    const allFields = new Set();
    validResponses.forEach(response => {
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
    
    const data = validResponses.map((response, index) => {
      try {
        console.log('[Reports Export] Processing response:', {
          id: response._id,
          hasRespondent: !!response.respondent,
          respondentName: response.respondent?.name,
          hasWard: !!response.ward,
          wardName: response.ward?.name,
          formType: response.formType
        });

        const row = {
          'Submitted Date': response.submittedAt ? response.submittedAt.toLocaleDateString() : 'Unknown',
          'District': response.district || 'Unknown',
          'Respondent': response.respondent?.name || 'Unknown User',
          'Email': response.respondent?.email || 'No email',
        };
        
        // Add ward information if it's a ward report
        if (response.formType === 'wardReport' && response.ward) {
          row['Ward'] = response.ward.name || 'Unknown Ward';
        }
        
        // Add responses for each field
        fields.forEach(field => {
          try {
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
          } catch (fieldError) {
            console.warn(`[Reports Export] Error processing field ${field} for response ${response._id}:`, fieldError.message);
            row[field] = 'Error loading field';
          }
        });
        
        return row;
      } catch (responseError) {
        console.error(`[Reports Export] Error processing response ${response._id} at index ${index}:`, responseError.message);
        // Return a minimal row with error information
        return {
          'Submitted Date': 'Error',
          'District': 'Error',
          'Respondent': 'Error processing response',
          'Email': 'Error',
          'Error': `Failed to process response: ${responseError.message}`
        };
      }
    });
    
    // Prepare data for Excel export with UTF-8 encoding
    const excelData = prepareExcelData(data);
    
    // Log the export activity
    await logActivity({
      userId: session.user.id,
      action: ACTIONS.REPORT_EXPORT,
      description: `Exported reports (${validResponses.length} records)${formType ? ` - ${formType}` : ''}${weekNumber ? ` - Week ${weekNumber}` : ''}${year ? ` - ${year}` : ''}`,
      metadata: { 
        formType: formType || 'all', 
        weekNumber: weekNumber ? parseInt(weekNumber) : 'all', 
        year: year ? parseInt(year) : 'all',
        coordinatorId,
        wardId,
        recordCount: validResponses.length,
        totalFound: responses.length,
        filteredOut: responses.length - validResponses.length
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
    console.error('[Reports Export] Error during export:', {
      message: error.message,
      stack: error.stack,
      query: req.query,
      userId: session?.user?.id
    });
    
    // Provide more specific error messages based on the error type
    let errorMessage = 'Error exporting report';
    if (error.message.includes('Cannot read properties of null')) {
      errorMessage = 'Data integrity issue: Some report data is missing. Please contact support.';
    } else if (error.message.includes('populate')) {
      errorMessage = 'Database relationship error: Unable to load related data. Please try again.';
    } else if (error.message.includes('XLSX') || error.message.includes('Excel')) {
      errorMessage = 'Excel generation error: Unable to create export file. Please try again.';
    }
    
    return res.status(500).json({ 
      message: errorMessage, 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
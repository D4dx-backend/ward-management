import * as XLSX from 'xlsx';
import connectToDatabase from '../../../lib/mongodb';
import Response from '../../../models/Response';
import FormTemplate from '../../../models/FormTemplate';
import Cluster from '../../../models/Cluster';
import { sendExcelResponse, prepareExcelData, generateExcelFilename } from '../../../utils/excelExport';

export default async function handler(req, res) {
  console.log('[Reports Export] Starting export request - No authentication required');
  console.log('[Reports Export] Request headers:', {
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin,
    referer: req.headers.referer
  });
  

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
    
    // No district filtering - allow all data
    
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
      .populate('formTemplate')
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
    
    // Get all unique ward IDs from responses to fetch clusters
    const wardIds = [...new Set(validResponses.map(r => r.ward?._id).filter(Boolean))];
    
    // Fetch clusters for all wards
    const clusters = await Cluster.find({ 
      ward: { $in: wardIds },
      isActive: true 
    });
    
    // Create a map of cluster ID to cluster info
    const clusterMap = {};
    clusters.forEach(cluster => {
      clusterMap[cluster._id.toString()] = {
        name: cluster.name,
        clusterNumber: cluster.clusterNumber
      };
    });
    
    console.log('[Reports Export] Found clusters for export:', clusters.length);
    
    // Get all unique fields from all valid responses including cluster and ward data
    const allFields = new Set();
    const hasClusterData = new Set();
    const hasWardData = new Set();
    
    validResponses.forEach(response => {
      if (response.formTemplate && response.formTemplate.fields) {
        response.formTemplate.fields.forEach(field => {
          allFields.add(field.label);
          // Track if this is a cluster or ward applicable field
          if (field.applicableToClusters) {
            hasClusterData.add(field.label);
          }
          if (field.applicableToWards) {
            hasWardData.add(field.label);
          }
        });
      }
      // Also add sitting ward fields
      if (response.formTemplate && response.formTemplate.sittingWardFields) {
        response.formTemplate.sittingWardFields.forEach(field => {
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
          formType: response.formType,
          hasWardData: response.wardData ? response.wardData.size : 0
        });

        const row = {
          'Submitted Date': response.submittedAt ? response.submittedAt.toLocaleDateString() : 'Unknown',
          'Week': response.weekNumber || '',
          'Year': response.year || '',
          'District': response.district || 'Unknown',
          'Respondent': response.respondent?.name || 'Unknown User',
          'Email': response.respondent?.email || 'No email',
          'Form Type': response.formType === 'coordinatorReport' ? 'Coordinator Report' : 'Ward Report',
        };
        
        // Add ward information if it's a ward report
        if (response.formType === 'wardReport' && response.ward) {
          row['Ward'] = response.ward.name || 'Unknown Ward';
        }
        
        // Separate cluster responses and regular responses
        const clusterResponses = {};
        const regularFieldResponses = {};
        
        Object.entries(response.responses || {}).forEach(([key, value]) => {
          if (key.includes('_cluster_')) {
            // Store cluster responses separately
            clusterResponses[key] = value;
          } else {
            // Store regular responses
            regularFieldResponses[key] = value;
          }
        });
        
        // Add responses for each regular field
        fields.forEach(field => {
          try {
            // Try to get the value from regularFieldResponses
            let value = regularFieldResponses[field] || '';
            
            // Handle complex values (arrays, objects)
            if (typeof value === 'object' && value !== null) {
              if (Array.isArray(value)) {
                value = value.join(', ');
              } else {
                value = JSON.stringify(value);
              }
            }
            
            row[field] = value;
          } catch (fieldError) {
            console.warn(`[Reports Export] Error processing field ${field} for response ${response._id}:`, fieldError.message);
            row[field] = 'Error loading field';
          }
        });
        
        // Add cluster-based responses with cluster names
        Object.entries(clusterResponses).forEach(([key, value]) => {
          try {
            // Parse cluster response key: ${field.label}_cluster_${clusterId} or ${field.label}_cluster_${clusterId}_${subQuestion}
            const match = key.match(/^(.+)_cluster_([a-f0-9]+)(?:_(.+))?$/);
            if (match) {
              const [, fieldLabel, clusterId, subQuestionLabel] = match;
              const clusterInfo = clusterMap[clusterId];
              const clusterName = clusterInfo ? clusterInfo.name : `Cluster ${clusterId.slice(-4)}`;
              
              // Create column name with cluster name
              let columnName;
              if (subQuestionLabel) {
                columnName = `${fieldLabel} [${clusterName}] - ${subQuestionLabel}`;
              } else {
                columnName = `${fieldLabel} [${clusterName}]`;
              }
              
              // Handle complex values
              let displayValue = value;
              if (typeof displayValue === 'object' && displayValue !== null) {
                if (Array.isArray(displayValue)) {
                  displayValue = displayValue.join(', ');
                } else {
                  displayValue = JSON.stringify(displayValue);
                }
              }
              
              row[columnName] = displayValue;
            }
          } catch (clusterError) {
            console.warn(`[Reports Export] Error processing cluster response ${key}:`, clusterError.message);
          }
        });
        
        // Add ward-wise data if available (for coordinator reports)
        if (response.wardData && response.wardData.size > 0) {
          const wardDataArray = [];
          for (const [wardId, wardResponses] of response.wardData.entries()) {
            const wardDataObj = { wardId };
            if (typeof wardResponses === 'object') {
              Object.assign(wardDataObj, wardResponses);
            }
            wardDataArray.push(wardDataObj);
          }
          row['Ward Data'] = JSON.stringify(wardDataArray);
        }
        
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
    
    // Log the export activity (no user context needed)
    console.log(`[Reports Export] Export completed: ${validResponses.length} records${formType ? ` - ${formType}` : ''}${weekNumber ? ` - Week ${weekNumber}` : ''}${year ? ` - ${year}` : ''}`);
    
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
      query: req.query
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
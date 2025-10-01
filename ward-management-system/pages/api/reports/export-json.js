import connectToDatabase from '../../../lib/mongodb';
import Response from '../../../models/Response';
import Cluster from '../../../models/Cluster';

export default async function handler(req, res) {
  console.log('[Reports JSON Export] Starting JSON export request');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  await connectToDatabase();
  
  try {
    const { formType, weekNumber, year, coordinatorId, wardId } = req.query;
    
    console.log('[Reports JSON Export] Query parameters:', {
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
    
    // Filter by coordinator if provided
    if (coordinatorId) {
      query.respondent = coordinatorId;
    }
    
    // Filter by ward if provided
    if (wardId) {
      query.ward = wardId;
    }
    
    // Get responses with full data
    const responses = await Response.find(query)
      .populate('respondent', 'name email mobileNumber role')
      .populate('ward', 'name district wardNumber panchayath')
      .populate('formTemplate')
      .sort({ district: 1, submittedAt: 1 })
      .lean();
    
    console.log('[Reports JSON Export] Found responses:', responses.length);
    
    if (responses.length === 0) {
      return res.status(404).json({ message: 'No reports found matching the criteria' });
    }
    
    // Get all unique ward IDs from responses to fetch clusters
    const wardIds = [...new Set(responses.map(r => r.ward?._id).filter(Boolean))];
    
    // Fetch clusters for all wards
    const clusters = await Cluster.find({ 
      ward: { $in: wardIds },
      isActive: true 
    }).lean();
    
    // Create a map of cluster ID to cluster info
    const clusterMap = {};
    clusters.forEach(cluster => {
      clusterMap[cluster._id.toString()] = {
        name: cluster.name,
        clusterNumber: cluster.clusterNumber,
        coordinator: cluster.coordinator,
        ward: cluster.ward.toString()
      };
    });
    
    console.log('[Reports JSON Export] Found clusters:', clusters.length);
    
    // Process responses to make them more readable
    const processedData = responses.map(response => {
      const processed = {
        _id: response._id,
        submittedDate: response.submittedAt,
        weekNumber: response.weekNumber,
        year: response.year,
        district: response.district,
        formType: response.formType,
        formTitle: response.formTemplate?.title,
        respondent: {
          name: response.respondent?.name,
          email: response.respondent?.email,
          mobileNumber: response.respondent?.mobileNumber,
          role: response.respondent?.role
        }
      };
      
      // Add ward information if available
      if (response.ward) {
        processed.ward = {
          name: response.ward.name,
          district: response.ward.district,
          wardNumber: response.ward.wardNumber,
          panchayath: response.ward.panchayath
        };
      }
      
      // Add form fields structure
      if (response.formTemplate) {
        processed.formFields = response.formTemplate.fields || [];
        processed.sittingWardFields = response.formTemplate.sittingWardFields || [];
      }
      
      // Add responses
      processed.responses = response.responses || {};
      
      // Add ward data if available (for coordinator reports)
      if (response.wardData) {
        // Convert Map to object if needed
        if (response.wardData instanceof Map) {
          processed.wardData = Object.fromEntries(response.wardData);
        } else {
          processed.wardData = response.wardData;
        }
      }
      
      // Extract cluster-based data by parsing response keys
      const clusterDataByCluster = {};
      const wardApplicableData = {};
      const regularResponses = {};
      
      Object.entries(processed.responses).forEach(([key, value]) => {
        if (key.includes('_cluster_')) {
          // This is a cluster-specific response
          // Format: ${field.label}_cluster_${clusterId} or ${field.label}_cluster_${clusterId}_${subQuestion.label}
          const match = key.match(/^(.+)_cluster_([a-f0-9]+)(?:_(.+))?$/);
          if (match) {
            const [, fieldLabel, clusterId, subQuestionLabel] = match;
            
            if (!clusterDataByCluster[clusterId]) {
              clusterDataByCluster[clusterId] = {};
            }
            
            if (subQuestionLabel) {
              // Sub-question response
              if (!clusterDataByCluster[clusterId][fieldLabel]) {
                clusterDataByCluster[clusterId][fieldLabel] = { subQuestions: {} };
              }
              clusterDataByCluster[clusterId][fieldLabel].subQuestions[subQuestionLabel] = value;
            } else {
              // Main question response
              if (!clusterDataByCluster[clusterId][fieldLabel]) {
                clusterDataByCluster[clusterId][fieldLabel] = {};
              }
              clusterDataByCluster[clusterId][fieldLabel].value = value;
            }
          }
        } else {
          // Regular response
          regularResponses[key] = value;
        }
      });
      
      // Extract field metadata for cluster and ward-applicable questions
      const clusterFields = [];
      const wardFields = [];
      
      if (response.formTemplate && response.formTemplate.fields) {
        response.formTemplate.fields.forEach(field => {
          if (field.applicableToClusters) {
            clusterFields.push({
              label: field.label,
              type: field.type,
              required: field.required,
              options: field.options,
              subQuestions: field.subQuestions
            });
          }
          
          if (field.applicableToWards) {
            const fieldValue = regularResponses[field.label];
            wardFields.push({
              label: field.label,
              type: field.type,
              required: field.required,
              options: field.options,
              value: fieldValue
            });
            
            if (fieldValue !== undefined) {
              wardApplicableData[field.label] = {
                type: field.type,
                value: fieldValue,
                required: field.required
              };
            }
          }
        });
      }
      
      // Add cluster data organized by cluster with names
      if (Object.keys(clusterDataByCluster).length > 0) {
        const clusterDataWithNames = {};
        
        Object.entries(clusterDataByCluster).forEach(([clusterId, data]) => {
          const clusterInfo = clusterMap[clusterId];
          clusterDataWithNames[clusterId] = {
            clusterInfo: clusterInfo || {
              name: 'Unknown Cluster',
              clusterNumber: clusterId.slice(-4)
            },
            responses: data
          };
        });
        
        processed.clusterData = clusterDataWithNames;
        processed.clusterFields = clusterFields; // Field definitions
      }
      
      // Add ward-applicable data
      if (Object.keys(wardApplicableData).length > 0) {
        processed.wardApplicableData = wardApplicableData;
        processed.wardFields = wardFields; // Field definitions
      }
      
      // Store only non-cluster, non-ward-specific responses
      processed.regularResponses = regularResponses;
      
      return processed;
    });
    
    // Return JSON data
    return res.status(200).json({
      success: true,
      count: processedData.length,
      filters: {
        formType,
        weekNumber: weekNumber ? parseInt(weekNumber) : null,
        year: year ? parseInt(year) : null,
        coordinatorId,
        wardId
      },
      data: processedData
    });
    
  } catch (error) {
    console.error('[Reports JSON Export] Error during export:', {
      message: error.message,
      stack: error.stack,
      query: req.query
    });
    
    return res.status(500).json({ 
      success: false,
      message: 'Error exporting report data',
      error: error.message
    });
  }
}


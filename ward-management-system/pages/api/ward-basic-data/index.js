import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import WardBasicData from '../../../models/WardBasicData';
import WardBasicForm from '../../../models/WardBasicForm';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  await connectToDatabase();

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, session);
    case 'POST':
      return handlePost(req, res, session);
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleGet(req, res, session) {
  try {
    const { wardId, formId } = req.query;
    
    let query = {};
    
    // Role-based filtering
    if (session.user.role === 'wardAdmin') {
      // Ward admins can only see their own ward's data
      const ward = await Ward.findOne({ wardAdmin: session.user.id });
      if (!ward) {
        return res.status(403).json({ message: 'No ward assigned' });
      }
      query.ward = ward._id;
    } else if (session.user.role === 'coordinator') {
      // Coordinators can see data from their assigned wards
      const wards = await Ward.find({ coordinator: session.user.id });
      query.ward = { $in: wards.map(w => w._id) };
    }
    // State admins can see all data (no additional filtering)

    if (wardId) query.ward = wardId;
    if (formId) query.form = formId;

    const data = await WardBasicData.find(query)
      .populate('ward', 'name wardNumber panchayath district')
      .populate('form', 'title version')
      .populate('submittedBy', 'name email')
      .populate('reviewedBy', 'name email')
      .sort({ submittedAt: -1 });

    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching ward basic data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function handlePost(req, res, session) {
  try {
    const { wardId, formId, data, clusterData } = req.body;

    if (!wardId || !formId || !data) {
      return res.status(400).json({ message: 'Ward ID, form ID, and data are required' });
    }

    // Verify ward access
    let ward;
    if (session.user.role === 'wardAdmin') {
      ward = await Ward.findOne({ _id: wardId, wardAdmin: session.user.id });
      if (!ward) {
        return res.status(403).json({ message: 'Access denied to this ward' });
      }
    } else if (session.user.role === 'coordinator') {
      ward = await Ward.findOne({ _id: wardId, coordinator: session.user.id });
      if (!ward) {
        return res.status(403).json({ message: 'Access denied to this ward' });
      }
    } else if (session.user.role === 'stateAdmin') {
      ward = await Ward.findById(wardId);
      if (!ward) {
        return res.status(404).json({ message: 'Ward not found' });
      }
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Verify form exists and is active
    const form = await WardBasicForm.findOne({ _id: formId, isActive: true });
    if (!form) {
      return res.status(404).json({ message: 'Form not found or inactive' });
    }

    // Validate data against form fields
    const validationErrors = validateFormData(data, form.fields);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: validationErrors 
      });
    }

    // Validate cluster data if there are cluster-applicable fields
    const clusterFields = form.fields.filter(field => field.applicableToClusters);
    if (clusterFields.length > 0) {
      const clusterValidationErrors = await validateClusterData(clusterData, clusterFields, wardId);
      if (clusterValidationErrors.length > 0) {
        return res.status(400).json({ 
          message: 'Cluster data validation errors', 
          errors: clusterValidationErrors 
        });
      }
    }

    // Check if data already exists for this ward and form
    const existingData = await WardBasicData.findOne({ ward: wardId, form: formId });
    
    if (existingData) {
      // Update existing data
      existingData.data = data;
      existingData.clusterData = clusterData || {};
      existingData.submittedBy = session.user.id;
      existingData.status = 'submitted';
      existingData.reviewedBy = undefined;
      existingData.reviewedAt = undefined;
      existingData.reviewComments = undefined;
      
      await existingData.save();
      
      const populatedData = await WardBasicData.findById(existingData._id)
        .populate('ward', 'name wardNumber panchayath district')
        .populate('form', 'title version')
        .populate('submittedBy', 'name email');
      
      return res.status(200).json(populatedData);
    } else {
      // Create new data
      const wardBasicData = new WardBasicData({
        ward: wardId,
        form: formId,
        data,
        clusterData: clusterData || {},
        submittedBy: session.user.id,
      });

      await wardBasicData.save();
      
      const populatedData = await WardBasicData.findById(wardBasicData._id)
        .populate('ward', 'name wardNumber panchayath district')
        .populate('form', 'title version')
        .populate('submittedBy', 'name email');

      return res.status(201).json(populatedData);
    }
  } catch (error) {
    console.error('Error saving ward basic data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

function validateFormData(data, fields) {
  const errors = [];
  
  // Only validate non-cluster fields here
  const nonClusterFields = fields.filter(field => !field.applicableToClusters);
  
  for (const field of nonClusterFields) {
    const value = data[field.id];
    
    // Check required fields
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field.label} is required`);
      continue;
    }
    
    // Skip validation if field is empty and not required
    if (value === undefined || value === null || value === '') {
      continue;
    }
    
    // Type-specific validation
    switch (field.type) {
      case 'number':
        if (isNaN(value)) {
          errors.push(`${field.label} must be a number`);
        } else {
          const num = Number(value);
          if (field.validation?.min !== undefined && num < field.validation.min) {
            errors.push(`${field.label} must be at least ${field.validation.min}`);
          }
          if (field.validation?.max !== undefined && num > field.validation.max) {
            errors.push(`${field.label} must be at most ${field.validation.max}`);
          }
        }
        break;
        
      case 'text':
      case 'textarea':
        if (typeof value !== 'string') {
          errors.push(`${field.label} must be text`);
        } else {
          if (field.validation?.minLength && value.length < field.validation.minLength) {
            errors.push(`${field.label} must be at least ${field.validation.minLength} characters`);
          }
          if (field.validation?.maxLength && value.length > field.validation.maxLength) {
            errors.push(`${field.label} must be at most ${field.validation.maxLength} characters`);
          }
          if (field.validation?.pattern && !new RegExp(field.validation.pattern).test(value)) {
            errors.push(`${field.label} format is invalid`);
          }
        }
        break;
        
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push(`${field.label} must be a valid email address`);
        }
        break;
        
      case 'phone':
        const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;
        if (!phoneRegex.test(value)) {
          errors.push(`${field.label} must be a valid phone number`);
        }
        break;
        
      case 'url':
        try {
          new URL(value);
        } catch {
          errors.push(`${field.label} must be a valid URL`);
        }
        break;
        
      case 'select':
        if (!field.options.includes(value)) {
          errors.push(`${field.label} must be one of: ${field.options.join(', ')}`);
        }
        break;
        
      case 'multiselect':
        if (!Array.isArray(value)) {
          errors.push(`${field.label} must be an array`);
        } else {
          const invalidOptions = value.filter(v => !field.options.includes(v));
          if (invalidOptions.length > 0) {
            errors.push(`${field.label} contains invalid options: ${invalidOptions.join(', ')}`);
          }
        }
        break;
        
      case 'date':
        if (isNaN(Date.parse(value))) {
          errors.push(`${field.label} must be a valid date`);
        }
        break;
        
      case 'yesno':
        if (!['yes', 'no'].includes(value)) {
          errors.push(`${field.label} must be 'yes' or 'no'`);
        }
        break;
    }
  }
  
  return errors;
}

async function validateClusterData(clusterData, clusterFields, wardId) {
  const errors = [];
  
  if (!clusterData || typeof clusterData !== 'object') {
    if (clusterFields.some(field => field.required)) {
      errors.push('Cluster data is required for cluster-applicable fields');
    }
    return errors;
  }

  // Get ward clusters to validate against
  let clusters = [];
  try {
    const Cluster = require('../../../models/Cluster');
    clusters = await Cluster.find({ ward: wardId });
  } catch (error) {
    console.error('Error fetching clusters for validation:', error);
    // Continue without cluster validation if we can't fetch clusters
    return errors;
  }

  // Validate each cluster's data
  for (const cluster of clusters) {
    const clusterId = cluster._id.toString();
    const clusterFieldData = clusterData[clusterId] || {};

    for (const field of clusterFields) {
      const value = clusterFieldData[field.id];
      
      // Check required fields
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field.label} is required for cluster: ${cluster.name}`);
        continue;
      }
      
      // Skip validation if field is empty and not required
      if (value === undefined || value === null || value === '') {
        continue;
      }
      
      // Type-specific validation (same as regular fields)
      switch (field.type) {
        case 'number':
          if (isNaN(value)) {
            errors.push(`${field.label} must be a number for cluster: ${cluster.name}`);
          } else {
            const num = Number(value);
            if (field.validation?.min !== undefined && num < field.validation.min) {
              errors.push(`${field.label} must be at least ${field.validation.min} for cluster: ${cluster.name}`);
            }
            if (field.validation?.max !== undefined && num > field.validation.max) {
              errors.push(`${field.label} must be at most ${field.validation.max} for cluster: ${cluster.name}`);
            }
          }
          break;
          
        case 'text':
        case 'textarea':
          if (typeof value !== 'string') {
            errors.push(`${field.label} must be text for cluster: ${cluster.name}`);
          } else {
            if (field.validation?.minLength && value.length < field.validation.minLength) {
              errors.push(`${field.label} must be at least ${field.validation.minLength} characters for cluster: ${cluster.name}`);
            }
            if (field.validation?.maxLength && value.length > field.validation.maxLength) {
              errors.push(`${field.label} must be at most ${field.validation.maxLength} characters for cluster: ${cluster.name}`);
            }
          }
          break;
          
        case 'select':
          if (!field.options.includes(value)) {
            errors.push(`${field.label} must be one of: ${field.options.join(', ')} for cluster: ${cluster.name}`);
          }
          break;
          
        case 'yesno':
          if (!['Yes', 'No'].includes(value)) {
            errors.push(`${field.label} must be 'Yes' or 'No' for cluster: ${cluster.name}`);
          }
          break;
      }
    }
  }
  
  return errors;
}
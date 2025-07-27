import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import WardBasicForm from '../../../models/WardBasicForm';

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
    const { includeInactive } = req.query;
    
    let query = {};
    if (!includeInactive || includeInactive !== 'true') {
      query.isActive = true;
    }

    const forms = await WardBasicForm.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json(forms);
  } catch (error) {
    console.error('Error fetching ward advance data forms:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

async function handlePost(req, res, session) {
  try {
    console.log('Creating ward advance data form - Start');
    console.log('Session user:', session.user);
    console.log('Request body:', req.body);

    // Only state admins can create forms
    if (session.user.role !== 'stateAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate session user ID
    if (!session.user.id) {
      console.error('Session user ID is missing');
      return res.status(400).json({ message: 'Invalid session - user ID missing' });
    }

    const { title, description, fields } = req.body;

    if (!title || !fields || !Array.isArray(fields)) {
      return res.status(400).json({ message: 'Title and fields are required' });
    }

    console.log('Validating fields...');
    // Validate fields
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      if (!field.id || !field.label || !field.type) {
        return res.status(400).json({ 
          message: `Field ${i + 1}: id, label, and type are required` 
        });
      }
      
      if (['select', 'multiselect'].includes(field.type) && (!field.options || field.options.length === 0)) {
        return res.status(400).json({ 
          message: `Field ${i + 1}: options are required for select/multiselect fields` 
        });
      }
    }

    console.log('Checking for existing forms...');
    // Test database connection
    try {
      const testCount = await WardBasicForm.countDocuments({});
      console.log('Database connection test - form count:', testCount);
    } catch (dbError) {
      console.error('Database connection test failed:', dbError);
      return res.status(500).json({ 
        message: 'Database connection failed',
        error: process.env.NODE_ENV === 'development' ? dbError.message : 'Database error'
      });
    }

    // Check if a form already exists
    const existingForm = await WardBasicForm.findOne({});
    if (existingForm) {
      console.log('Existing form found:', existingForm._id);
      return res.status(400).json({ 
        message: 'A ward advance data form already exists. Please edit the existing form instead of creating a new one.' 
      });
    }
    console.log('No existing form found, proceeding with creation...');

    console.log('Creating new form...');
    // Process fields
    const processedFields = fields.map((field, index) => {
      const processedField = {
        ...field,
        order: field.order || index + 1
      };
      console.log(`Processing field ${index + 1}:`, processedField);
      return processedField;
    });

    // Create new form
    const formData = {
      title,
      description: description || '',
      fields: processedFields,
      createdBy: session.user.id,
      isActive: true, // Always active since there's only one
    };

    console.log('Form data to save:', JSON.stringify(formData, null, 2));
    
    let form;
    try {
      form = new WardBasicForm(formData);
      console.log('Form instance created successfully');
    } catch (modelError) {
      console.error('Error creating form instance:', modelError);
      return res.status(400).json({ 
        message: 'Form validation failed',
        error: process.env.NODE_ENV === 'development' ? modelError.message : 'Validation error'
      });
    }

    console.log('Saving form to database...');
    try {
      await form.save();
      console.log('Form saved successfully with ID:', form._id);
    } catch (saveError) {
      console.error('Error saving form to database:', saveError);
      return res.status(500).json({ 
        message: 'Failed to save form',
        error: process.env.NODE_ENV === 'development' ? saveError.message : 'Save error'
      });
    }
    
    console.log('Form saved, populating...');
    const populatedForm = await WardBasicForm.findById(form._id)
      .populate('createdBy', 'name email');

    console.log('Form creation completed successfully');
    res.status(201).json(populatedForm);
  } catch (error) {
    console.error('Error creating ward advance data form:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
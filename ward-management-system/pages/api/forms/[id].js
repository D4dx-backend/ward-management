import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import FormTemplate from '../../../models/FormTemplate';
import { logActivity, ACTIONS } from '../../../lib/logger';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  await connectToDatabase();

  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const form = await FormTemplate.findById(id);

      if (!form) {
        return res.status(404).json({ message: 'Form not found' });
      }

      return res.status(200).json(form);
    } catch (error) {
      console.error('Error fetching form:', error);
      return res.status(500).json({ message: 'Error fetching form', error: error.message });
    }
  }

  // Only state admin can modify forms
  if (session.user.role !== 'stateAdmin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  if (req.method === 'PUT') {
    try {
      console.log('=== FORM UPDATE DEBUG ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('Form ID:', id);

      const { title, description, fields, isActive, formType } = req.body;

      // Check if this is a status-only update
      const isStatusOnlyUpdate = isActive !== undefined && !title && !fields;
      
      // Validate input data - allow status-only updates
      if (!isStatusOnlyUpdate && (!title || !fields)) {
        console.log('Missing required data - title:', !!title, 'fields:', !!fields);
        return res.status(400).json({ message: 'Title and fields are required for content updates' });
      }

      const form = await FormTemplate.findById(id);

      if (!form) {
        console.log('Form not found with ID:', id);
        return res.status(404).json({ message: 'Form not found' });
      }

      console.log('Found form:', form.title, 'Type:', form.formType);

      // Only validate fields if this is not a status-only update
      if (!isStatusOnlyUpdate) {
        // Validate fields structure
        if (!Array.isArray(fields) || fields.length === 0) {
          console.log('Invalid fields array:', fields);
          return res.status(400).json({ message: 'Fields must be a non-empty array' });
        }

        // Minimal field validation - just check basic structure
        console.log('Performing minimal validation...');

        for (let i = 0; i < fields.length; i++) {
          const field = fields[i];
          console.log(`Field ${i + 1}:`, JSON.stringify(field, null, 2));

          // Only check absolutely required fields
          if (!field.label || !field.type) {
            console.log(`Field ${i + 1} missing label or type`);
            return res.status(400).json({
              message: `Field ${i + 1} is missing label (${field.label}) or type (${field.type})`,
              field: field
            });
          }

          // Only validate select options if it's a select field with options
          if (field.type === 'select' && field.options && Array.isArray(field.options)) {
            const validOptions = field.options.filter(opt => opt && opt.trim());
            if (field.options.length > 0 && validOptions.length === 0) {
              console.log(`Select field "${field.label}" has empty options`);
              return res.status(400).json({
                message: `Select field "${field.label}" has empty options`,
                field: field
              });
            }
          }
        }

        console.log('All fields passed minimal validation');
      } else {
        console.log('Status-only update, skipping field validation');
      }

      console.log('All validations passed, updating form...');

      // Update form properties
      if (isStatusOnlyUpdate) {
        // Only update the status
        console.log('Updating form status only:', isActive);
        form.isActive = isActive;
      } else {
        // Update all form content
        form.title = title.trim();
        form.description = description ? description.trim() : '';
        if (formType) form.formType = formType; // Update form type if provided
        if (isActive !== undefined) form.isActive = isActive;
        form.fields = fields;
      }

      console.log('Saving form to database...');
      const savedForm = await form.save();
      console.log('Form saved successfully, ID:', savedForm._id);

      // Log the form update activity
      try {
        await logActivity({
          userId: session.user.id,
          action: ACTIONS.FORM_UPDATE,
          description: `Updated form: ${savedForm.title} (${savedForm.formType})`,
          entityType: 'FormTemplate',
          entityId: savedForm._id,
          metadata: {
            formType: savedForm.formType,
            weekNumber: savedForm.weekNumber,
            year: savedForm.year,
            fieldsCount: savedForm.fields.length
          },
          district: session.user.district || 'Unknown',
          ward: session.user.ward || null,
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        });
      } catch (logError) {
        console.error('Failed to log form update activity:', logError);
      }

      return res.status(200).json(savedForm);
    } catch (error) {
      console.error('Error updating form:', error);
      console.error('Error stack:', error.stack);

      // Check if it's a validation error
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          message: 'Validation error',
          errors: validationErrors,
          details: error.errors
        });
      }

      return res.status(500).json({
        message: 'Error updating form',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const deletedForm = await FormTemplate.findByIdAndDelete(id);

      if (!deletedForm) {
        return res.status(404).json({ message: 'Form not found' });
      }

      // Log the form deletion activity
      await logActivity({
        userId: session.user.id,
        action: ACTIONS.FORM_DELETE,
        description: `Deleted form: ${deletedForm.title} (${deletedForm.formType})`,
        entityType: 'FormTemplate',
        entityId: deletedForm._id,
        metadata: {
          formType: deletedForm.formType,
          weekNumber: deletedForm.weekNumber,
          year: deletedForm.year
        },
        district: session.user.district,
        ward: session.user.ward,
        ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({ message: 'Form deleted successfully' });
    } catch (error) {
      console.error('Error deleting form:', error);
      return res.status(500).json({ message: 'Error deleting form', error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
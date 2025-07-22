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
      return res.status(500).json({ message: 'Error fetching form', error: error.message });
    }
  }
  
  // Only state admin can modify forms
  if (session.user.role !== 'stateAdmin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  if (req.method === 'PUT') {
    try {
      const { title, description, fields, isActive } = req.body;
      
      const form = await FormTemplate.findById(id);
      
      if (!form) {
        return res.status(404).json({ message: 'Form not found' });
      }
      
      // Update fields
      if (title) form.title = title;
      if (description !== undefined) form.description = description;
      if (isActive !== undefined) form.isActive = isActive;
      
      // Update form fields if provided
      if (fields) {
        // Validate fields
        if (!Array.isArray(fields) || fields.length === 0) {
          return res.status(400).json({ message: 'Fields must be a non-empty array' });
        }
        
        for (const field of fields) {
          if (!field.label || !field.type) {
            return res.status(400).json({ message: 'Each field must have a label and type' });
          }
          
          if (field.type === 'select' && (!field.options || !Array.isArray(field.options) || field.options.length === 0)) {
            return res.status(400).json({ message: 'Select fields must have options' });
          }
        }
        
        form.fields = fields;
      }
      
      await form.save();
      
      // Log the form update activity
      await logActivity({
        userId: session.user.id,
        action: ACTIONS.FORM_UPDATE,
        description: `Updated form: ${form.title} (${form.formType})`,
        entityType: 'FormTemplate',
        entityId: form._id,
        metadata: { 
          formType: form.formType, 
          weekNumber: form.weekNumber, 
          year: form.year,
          fieldsCount: form.fields.length
        },
        district: session.user.district,
        ward: session.user.ward,
        ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(200).json(form);
    } catch (error) {
      return res.status(500).json({ message: 'Error updating form', error: error.message });
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
      return res.status(500).json({ message: 'Error deleting form', error: error.message });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}
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

  const { id } = req.query;

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, session, id);
    case 'PUT':
      return handlePut(req, res, session, id);
    case 'DELETE':
      return handleDelete(req, res, session, id);
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleGet(req, res, session, id) {
  try {
    const form = await WardBasicForm.findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    res.status(200).json(form);
  } catch (error) {
    console.error('Error fetching ward advance data form:', error);
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

async function handlePut(req, res, session, id) {
  try {
    // Only state admins can update forms
    if (session.user.role !== 'stateAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { title, description, fields } = req.body;

    const form = await WardBasicForm.findById(id);
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }



    // Update form
    const updateData = {
      updatedBy: session.user.id,
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (fields !== undefined) {
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
      
      updateData.fields = fields.map((field, index) => ({
        ...field,
        order: field.order || index + 1
      }));
      updateData.version = form.version + 1;
    }


    const updatedForm = await WardBasicForm.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('createdBy', 'name email')
     .populate('updatedBy', 'name email');

    res.status(200).json(updatedForm);
  } catch (error) {
    console.error('Error updating ward advance data form:', error);
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

async function handleDelete(req, res, session, id) {
  try {
    // Only state admins can delete forms
    if (session.user.role !== 'stateAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const form = await WardBasicForm.findById(id);
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    await WardBasicForm.findByIdAndDelete(id);

    res.status(200).json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Error deleting ward advance data form:', error);
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
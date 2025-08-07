import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import FormTemplate from '../../../models/FormTemplate';
import Response from '../../../models/Response';
import Ward from '../../../models/Ward';
import User from '../../../models/User';
import { logActivity, ACTIONS } from '../../../lib/logger';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  await connectToDatabase();
  
  if (req.method === 'GET') {
    try {
      const { formType, weekNumber, year, isActive } = req.query;
      
      // Build query
      const query = {};
      
      if (formType) query.formType = formType;
      if (weekNumber) query.weekNumber = parseInt(weekNumber);
      if (year) query.year = parseInt(year);
      
      // For form submission pages, only show forms that are currently available
      if (req.query.availableOnly === 'true') {
        const now = new Date();
        query.enableDateTime = { $lte: now };
        query.closeDateTime = { $gte: now };
        query.isPublished = true; // Only show published forms to users
      }
      
      // Get forms
      const forms = await FormTemplate.find(query).sort({ createdAt: -1 });
      
      // Get response counts and expected counts for each form
      const formsWithCounts = await Promise.all(forms.map(async (form) => {
        // Get response count for this form
        const responseCount = await Response.countDocuments({ formTemplate: form._id });
        
        // Calculate expected count based on form type
        let expectedCount = 0;
        if (form.formType === 'coordinatorReport') {
          // Count coordinators (users with role 'coordinator')
          expectedCount = await User.countDocuments({ role: 'coordinator' });
        } else if (form.formType === 'wardReport') {
          // Count wards
          expectedCount = await Ward.countDocuments({});
        }
        
        return {
          ...form.toObject(),
          responseCount,
          expectedCount
        };
      }));
      
      return res.status(200).json(formsWithCounts);
    } catch (error) {
      console.error('Forms API GET Error:', error);
      return res.status(500).json({ message: 'Error fetching forms', error: error.message });
    }
  }
  
  if (req.method === 'POST') {
    // Only state admin can create forms
    if (session.user.role !== 'stateAdmin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    try {
      const { 
        title, 
        description, 
        formType, 
        fields, 
        sittingWardFields,
        weekNumber, 
        year, 
        isActive, 
        isPublished,
        isSittingWardForm,
        allowMultipleSubmissions,
        allowEditAfterSubmission,
        enableDateTime, 
        closeDateTime 
      } = req.body;
      
      // Validate required fields
      if (!title || !formType || !fields || !enableDateTime || !closeDateTime) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Auto-calculate week number and year from enable date if not provided
      let calculatedWeekNumber = weekNumber;
      let calculatedYear = year;
      
      if (!weekNumber || !year) {
        const enableDate = new Date(enableDateTime);
        calculatedYear = enableDate.getFullYear();
        
        // Calculate week number
        const d = new Date(Date.UTC(enableDate.getFullYear(), enableDate.getMonth(), enableDate.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        calculatedWeekNumber = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
      }

      // Validate date/time logic
      const enableDate = new Date(enableDateTime);
      const closeDate = new Date(closeDateTime);
      
      if (closeDate <= enableDate) {
        return res.status(400).json({ message: 'Form close date must be after the enable date' });
      }
      
      // Validate fields
      if (!Array.isArray(fields) || fields.length === 0) {
        return res.status(400).json({ message: 'Fields must be a non-empty array' });
      }
      
      for (const field of fields) {
        if (!field.label || !field.type) {
          return res.status(400).json({ message: 'Each field must have a label and type' });
        }
        
        if ((field.type === 'select' || field.type === 'multiselect') && (!field.options || !Array.isArray(field.options) || field.options.length === 0)) {
          return res.status(400).json({ message: 'Select and multiselect fields must have options' });
        }

        // Validate sub-questions if they exist
        if (field.subQuestions && Array.isArray(field.subQuestions)) {
          for (const subQuestion of field.subQuestions) {
            if (!subQuestion.label || !subQuestion.type) {
              return res.status(400).json({ message: 'Each sub-question must have a label and type' });
            }
            
            if ((subQuestion.type === 'select' || subQuestion.type === 'multiselect') && (!subQuestion.options || !Array.isArray(subQuestion.options) || subQuestion.options.length === 0)) {
              return res.status(400).json({ message: 'Select and multiselect sub-questions must have options' });
            }
          }
        }
      }
      
      // Add order to fields if not present
      const orderedFields = fields.map((field, index) => ({
        ...field,
        order: field.order !== undefined ? field.order : index
      }));

      const orderedSittingWardFields = sittingWardFields ? sittingWardFields.map((field, index) => ({
        ...field,
        order: field.order !== undefined ? field.order : index
      })) : [];

      // Create new form template
      const newForm = new FormTemplate({
        title,
        description,
        formType,
        fields: orderedFields,
        sittingWardFields: orderedSittingWardFields,
        weekNumber: calculatedWeekNumber,
        year: calculatedYear,

        isPublished: isPublished !== undefined ? isPublished : false,
        isSittingWardForm: isSittingWardForm !== undefined ? isSittingWardForm : false,
        allowMultipleSubmissions: allowMultipleSubmissions !== undefined ? allowMultipleSubmissions : true,
        allowEditAfterSubmission: allowEditAfterSubmission !== undefined ? allowEditAfterSubmission : false,
        enableDateTime: new Date(enableDateTime),
        closeDateTime: new Date(closeDateTime),
        createdBy: session.user.id,
      });
      
      await newForm.save();
      
      // Log the form creation activity
      try {
        await logActivity({
          userId: session.user.id,
          action: ACTIONS.FORM_CREATE,
          description: `Created form: ${newForm.title} (${newForm.formType})`,
          entityType: 'FormTemplate',
          entityId: newForm._id,
          metadata: { 
            formType: newForm.formType, 
            weekNumber: newForm.weekNumber, 
            year: newForm.year,
            fieldsCount: newForm.fields.length
          },
          district: session.user.district || 'Unknown',
          ward: session.user.ward || null,
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        });
      } catch (logError) {
        console.error('Failed to log form creation activity:', logError);
      }
      
      return res.status(201).json(newForm);
    } catch (error) {

      return res.status(500).json({ message: 'Error creating form', error: error.message });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}
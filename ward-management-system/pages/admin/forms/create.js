import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import DragDropField from '../../../components/DragDropField';
import { useApiData } from '../../../hooks/useApiData';

export default function CreateForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [recurringQuestions, setRecurringQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [importType, setImportType] = useState('regular'); // 'regular' or 'sittingWard'
  
  // Helper function to calculate week number from date
  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    formType: 'coordinatorReport',
    isPublished: false,
    isSittingWardForm: false,
    allowMultipleSubmissions: false,
    allowEditAfterSubmission: false,
    enableDateTime: new Date().toISOString().slice(0, 16),
    closeDateTime: (() => {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      return date.toISOString().slice(0, 16);
    })(),
    fields: [
      { 
        label: '', 
        type: 'text', 
        required: false, 
        options: [],
        subQuestions: [],
        showSubQuestionsWhen: '',
        applicableToClusters: false,
        order: 0,
        section: ''
      }
    ],
    sittingWardFields: []
  });

  // Redirect if not authenticated or not state admin
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  if (status === 'authenticated' && session.user.role !== 'stateAdmin') {
    router.push('/');
    return null;
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    // Reset sitting ward form when form type changes
    if (name === 'formType' && value !== 'wardReport') {
      setFormData({
        ...formData,
        [name]: newValue,
        isSittingWardForm: false
      });
    } else {
      setFormData({
        ...formData,
        [name]: newValue
      });
    }
  };

  const handleFieldChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    const updatedFields = [...formData.fields];
    updatedFields[index] = {
      ...updatedFields[index],
      [name]: type === 'checkbox' ? checked : value
    };
    setFormData({ ...formData, fields: updatedFields });
  };

  const handleOptionChange = (fieldIndex, optionIndex, value) => {
    const updatedFields = [...formData.fields];
    const options = [...updatedFields[fieldIndex].options];
    options[optionIndex] = value;
    updatedFields[fieldIndex] = {
      ...updatedFields[fieldIndex],
      options
    };
    setFormData({ ...formData, fields: updatedFields });
  };

  const addOption = (fieldIndex) => {
    const updatedFields = [...formData.fields];
    updatedFields[fieldIndex] = {
      ...updatedFields[fieldIndex],
      options: [...updatedFields[fieldIndex].options, '']
    };
    setFormData({ ...formData, fields: updatedFields });
  };

  const removeOption = (fieldIndex, optionIndex) => {
    const updatedFields = [...formData.fields];
    const options = [...updatedFields[fieldIndex].options];
    options.splice(optionIndex, 1);
    updatedFields[fieldIndex] = {
      ...updatedFields[fieldIndex],
      options
    };
    setFormData({ ...formData, fields: updatedFields });
  };

  const addField = () => {
    setFormData({
      ...formData,
      fields: [...formData.fields, { 
        label: '', 
        type: 'text', 
        required: false, 
        options: [],
        subQuestions: [],
        showSubQuestionsWhen: '',
        applicableToClusters: false,
        order: formData.fields.length,
        section: ''
      }]
    });
  };

  const addFieldAfter = (index) => {
    const newField = {
      label: '',
      type: 'text',
      required: false,
      options: [],
      subQuestions: [],
      showSubQuestionsWhen: '',
      applicableToClusters: false,
      order: index + 1,
      section: ''
    };
    const updatedFields = [...formData.fields];
    updatedFields.splice(index + 1, 0, newField);
    const reorderedFields = updatedFields.map((field, idx) => ({
      ...field,
      order: idx
    }));
    setFormData({ ...formData, fields: reorderedFields });
  };

  // Sitting Ward Field Handlers
  const addSittingWardField = () => {
    setFormData({
      ...formData,
      sittingWardFields: [...formData.sittingWardFields, { 
        label: '', 
        type: 'text', 
        required: false, 
        options: [],
        subQuestions: [],
        showSubQuestionsWhen: '',
        applicableToClusters: false,
        order: formData.sittingWardFields.length,
        section: ''
      }]
    });
  };

  const addSittingWardFieldAfter = (index) => {
    const newField = {
      label: '',
      type: 'text',
      required: false,
      options: [],
      subQuestions: [],
      showSubQuestionsWhen: '',
      applicableToClusters: false,
      order: index + 1,
      section: ''
    };
    const updatedFields = [...formData.sittingWardFields];
    updatedFields.splice(index + 1, 0, newField);
    const reorderedFields = updatedFields.map((field, idx) => ({
      ...field,
      order: idx
    }));
    setFormData({ ...formData, sittingWardFields: reorderedFields });
  };

  const removeSittingWardField = (index) => {
    const updatedFields = [...formData.sittingWardFields];
    updatedFields.splice(index, 1);
    const reorderedFields = updatedFields.map((field, idx) => ({
      ...field,
      order: idx
    }));
    setFormData({ ...formData, sittingWardFields: reorderedFields });
  };

  const moveSittingWardField = (fromIndex, toIndex) => {
    const updatedFields = [...formData.sittingWardFields];
    const [movedField] = updatedFields.splice(fromIndex, 1);
    updatedFields.splice(toIndex, 0, movedField);
    
    const reorderedFields = updatedFields.map((field, index) => ({
      ...field,
      order: index
    }));
    
    setFormData({ ...formData, sittingWardFields: reorderedFields });
  };

  const handleSittingWardFieldChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    const updatedFields = [...formData.sittingWardFields];
    updatedFields[index] = {
      ...updatedFields[index],
      [name]: type === 'checkbox' ? checked : value
    };
    setFormData({ ...formData, sittingWardFields: updatedFields });
  };

  const handleSittingWardOptionChange = (fieldIndex, optionIndex, value) => {
    const updatedFields = [...formData.sittingWardFields];
    const options = [...updatedFields[fieldIndex].options];
    options[optionIndex] = value;
    updatedFields[fieldIndex] = {
      ...updatedFields[fieldIndex],
      options
    };
    setFormData({ ...formData, sittingWardFields: updatedFields });
  };

  const addSittingWardOption = (fieldIndex) => {
    const updatedFields = [...formData.sittingWardFields];
    updatedFields[fieldIndex] = {
      ...updatedFields[fieldIndex],
      options: [...updatedFields[fieldIndex].options, '']
    };
    setFormData({ ...formData, sittingWardFields: updatedFields });
  };

  const removeSittingWardOption = (fieldIndex, optionIndex) => {
    const updatedFields = [...formData.sittingWardFields];
    const options = [...updatedFields[fieldIndex].options];
    options.splice(optionIndex, 1);
    updatedFields[fieldIndex] = {
      ...updatedFields[fieldIndex],
      options
    };
    setFormData({ ...formData, sittingWardFields: updatedFields });
  };

  const addSittingWardSubQuestion = (fieldIndex) => {
    const updatedFields = [...formData.sittingWardFields];
    updatedFields[fieldIndex] = {
      ...updatedFields[fieldIndex],
      subQuestions: [...updatedFields[fieldIndex].subQuestions, {
        label: '',
        type: 'text',
        required: false,
        options: []
      }]
    };
    setFormData({ ...formData, sittingWardFields: updatedFields });
  };

  const removeSittingWardSubQuestion = (fieldIndex, subQuestionIndex) => {
    const updatedFields = [...formData.sittingWardFields];
    const subQuestions = [...updatedFields[fieldIndex].subQuestions];
    subQuestions.splice(subQuestionIndex, 1);
    updatedFields[fieldIndex] = {
      ...updatedFields[fieldIndex],
      subQuestions
    };
    setFormData({ ...formData, sittingWardFields: updatedFields });
  };

  const handleSittingWardSubQuestionChange = (fieldIndex, subQuestionIndex, e) => {
    const { name, value, type, checked } = e.target;
    const updatedFields = [...formData.sittingWardFields];
    const subQuestions = [...updatedFields[fieldIndex].subQuestions];
    subQuestions[subQuestionIndex] = {
      ...subQuestions[subQuestionIndex],
      [name]: type === 'checkbox' ? checked : value
    };
    updatedFields[fieldIndex] = {
      ...updatedFields[fieldIndex],
      subQuestions
    };
    setFormData({ ...formData, sittingWardFields: updatedFields });
  };

  const handleSittingWardSubQuestionOptionChange = (fieldIndex, subQuestionIndex, optionIndex, value) => {
    const updatedFields = [...formData.sittingWardFields];
    const subQuestions = [...updatedFields[fieldIndex].subQuestions];
    const options = [...subQuestions[subQuestionIndex].options];
    options[optionIndex] = value;
    subQuestions[subQuestionIndex] = {
      ...subQuestions[subQuestionIndex],
      options
    };
    updatedFields[fieldIndex] = {
      ...updatedFields[fieldIndex],
      subQuestions
    };
    setFormData({ ...formData, sittingWardFields: updatedFields });
  };

  const addSittingWardSubQuestionOption = (fieldIndex, subQuestionIndex) => {
    const updatedFields = [...formData.sittingWardFields];
    const subQuestions = [...updatedFields[fieldIndex].subQuestions];
    subQuestions[subQuestionIndex] = {
      ...subQuestions[subQuestionIndex],
      options: [...subQuestions[subQuestionIndex].options, '']
    };
    updatedFields[fieldIndex] = {
      ...updatedFields[fieldIndex],
      subQuestions
    };
    setFormData({ ...formData, sittingWardFields: updatedFields });
  };

  const removeSittingWardSubQuestionOption = (fieldIndex, subQuestionIndex, optionIndex) => {
    const updatedFields = [...formData.sittingWardFields];
    const subQuestions = [...updatedFields[fieldIndex].subQuestions];
    const options = [...subQuestions[subQuestionIndex].options];
    options.splice(optionIndex, 1);
    subQuestions[subQuestionIndex] = {
      ...subQuestions[subQuestionIndex],
      options
    };
    updatedFields[fieldIndex] = {
      ...updatedFields[fieldIndex],
      subQuestions
    };
    setFormData({ ...formData, sittingWardFields: updatedFields });
  };

  const removeField = (index) => {
    const updatedFields = [...formData.fields];
    updatedFields.splice(index, 1);
    // Update order values
    const reorderedFields = updatedFields.map((field, idx) => ({
      ...field,
      order: idx
    }));
    setFormData({ ...formData, fields: reorderedFields });
  };

  const moveField = (fromIndex, toIndex) => {
    const updatedFields = [...formData.fields];
    const [movedField] = updatedFields.splice(fromIndex, 1);
    updatedFields.splice(toIndex, 0, movedField);
    
    // Update order values
    const reorderedFields = updatedFields.map((field, index) => ({
      ...field,
      order: index
    }));
    
    setFormData({ ...formData, fields: reorderedFields });
  };

  const addSubQuestion = (fieldIndex) => {
    const updatedFields = [...formData.fields];
    updatedFields[fieldIndex] = {
      ...updatedFields[fieldIndex],
      subQuestions: [...updatedFields[fieldIndex].subQuestions, {
        label: '',
        type: 'text',
        required: false,
        options: []
      }]
    };
    setFormData({ ...formData, fields: updatedFields });
  };

  const removeSubQuestion = (fieldIndex, subQuestionIndex) => {
    const updatedFields = [...formData.fields];
    const subQuestions = [...updatedFields[fieldIndex].subQuestions];
    subQuestions.splice(subQuestionIndex, 1);
    updatedFields[fieldIndex] = {
      ...updatedFields[fieldIndex],
      subQuestions
    };
    setFormData({ ...formData, fields: updatedFields });
  };

  const handleSubQuestionChange = (fieldIndex, subQuestionIndex, e) => {
    const { name, value, type, checked } = e.target;
    const updatedFields = [...formData.fields];
    const subQuestions = [...updatedFields[fieldIndex].subQuestions];
    subQuestions[subQuestionIndex] = {
      ...subQuestions[subQuestionIndex],
      [name]: type === 'checkbox' ? checked : value
    };
    updatedFields[fieldIndex] = {
      ...updatedFields[fieldIndex],
      subQuestions
    };
    setFormData({ ...formData, fields: updatedFields });
  };

  const handleSubQuestionOptionChange = (fieldIndex, subQuestionIndex, optionIndex, value) => {
    const updatedFields = [...formData.fields];
    const subQuestions = [...updatedFields[fieldIndex].subQuestions];
    const options = [...subQuestions[subQuestionIndex].options];
    options[optionIndex] = value;
    subQuestions[subQuestionIndex] = {
      ...subQuestions[subQuestionIndex],
      options
    };
    updatedFields[fieldIndex] = {
      ...updatedFields[fieldIndex],
      subQuestions
    };
    setFormData({ ...formData, fields: updatedFields });
  };

  const addSubQuestionOption = (fieldIndex, subQuestionIndex) => {
    const updatedFields = [...formData.fields];
    const subQuestions = [...updatedFields[fieldIndex].subQuestions];
    subQuestions[subQuestionIndex] = {
      ...subQuestions[subQuestionIndex],
      options: [...subQuestions[subQuestionIndex].options, '']
    };
    updatedFields[fieldIndex] = {
      ...updatedFields[fieldIndex],
      subQuestions
    };
    setFormData({ ...formData, fields: updatedFields });
  };

  const removeSubQuestionOption = (fieldIndex, subQuestionIndex, optionIndex) => {
    const updatedFields = [...formData.fields];
    const subQuestions = [...updatedFields[fieldIndex].subQuestions];
    const options = [...subQuestions[subQuestionIndex].options];
    options.splice(optionIndex, 1);
    subQuestions[subQuestionIndex] = {
      ...subQuestions[subQuestionIndex],
      options
    };
    updatedFields[fieldIndex] = {
      ...updatedFields[fieldIndex],
      subQuestions
    };
    setFormData({ ...formData, fields: updatedFields });
  };

  const handleImportQuestions = (targetType = 'regular') => {
    let apiUrl = `/api/recurring-questions?formType=${formData.formType}`;
    if (targetType === 'sittingWard' || formData.isSittingWardForm) {
      apiUrl += '&isSittingWard=true';
    }
    
    axios.get(apiUrl)
      .then(response => {
        setRecurringQuestions(response.data);
        setSelectedQuestions([]);
        setImportType(targetType);
        setShowImportModal(true);
      })
      .catch(error => {
        console.error('Error fetching recurring questions:', error);
        setError('Failed to fetch recurring questions');
      });
  };

  const handleQuestionSelection = (questionId) => {
    setSelectedQuestions(prev => 
      prev.includes(questionId) 
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleImportSelectedQuestions = () => {
    const questionsToImport = recurringQuestions.filter(q => selectedQuestions.includes(q._id));
    const newFields = questionsToImport.map((question) => ({
      label: question.question,
      type: question.fieldType,
      required: question.validation?.required || false,
      options: question.options || [],
      subQuestions: [],
      showSubQuestionsWhen: '',
      applicableToClusters: question.applicableToClusters || false,
      isRecurring: question.isRecurring,
      recurringCondition: question.recurringCondition,
      expectedValue: question.expectedValue,
      maxAttempts: question.maxAttempts,
      recurringQuestionId: question._id,
      order: importType === 'sittingWard' ? formData.sittingWardFields.length : formData.fields.length
    }));

    if (importType === 'sittingWard') {
      setFormData({
        ...formData,
        sittingWardFields: [...formData.sittingWardFields, ...newFields]
      });
    } else {
      setFormData({
        ...formData,
        fields: [...formData.fields, ...newFields]
      });
    }
    
    setShowImportModal(false);
    setSelectedQuestions([]);
  };

  const handleSubmit = async (e, shouldPublish = false) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Validate form
      if (!formData.title || !formData.enableDateTime || !formData.closeDateTime) {
        throw new Error('Please fill in all required fields');
      }

      // Validate date/time logic
      const enableDate = new Date(formData.enableDateTime);
      const closeDate = new Date(formData.closeDateTime);
      
      if (closeDate <= enableDate) {
        throw new Error('Form close date must be after the enable date');
      }

      // Auto-calculate week number and year from enable date
      const weekNumber = getWeekNumber(enableDate);
      const year = enableDate.getFullYear();

      // Filter out empty fields
      const validFields = formData.fields.filter(field => field.label && field.label.trim());
      const validSittingWardFields = formData.isSittingWardForm 
        ? formData.sittingWardFields.filter(field => field.label && field.label.trim())
        : [];

      // Add calculated values to form data
      const formDataWithCalculated = {
        ...formData,
        weekNumber,
        year,
        isPublished: shouldPublish,
        fields: validFields,
        sittingWardFields: validSittingWardFields
      };

      // Validate fields
      if (validFields.length === 0) {
        throw new Error('At least one field with a label is required');
      }

      for (const field of validFields) {
        if (!field.label || !field.type) {
          throw new Error('All fields must have a label and type');
        }

        if ((field.type === 'select' || field.type === 'multiselect') && (!field.options || field.options.length === 0)) {
          throw new Error('Select and multiselect fields must have at least one option');
        }
      }

      // Validate sitting ward fields if enabled
      if (formData.isSittingWardForm && validSittingWardFields.length > 0) {
        for (const field of validSittingWardFields) {
          if (!field.label || !field.type) {
            throw new Error('All sitting ward fields must have a label and type');
          }

          if ((field.type === 'select' || field.type === 'multiselect') && (!field.options || field.options.length === 0)) {
            throw new Error('Sitting ward select and multiselect fields must have at least one option');
          }
        }
      }

      // Submit form
      await axios.post('/api/forms', formDataWithCalculated);
      router.push('/admin/forms');
    } catch (error) {
      setError(error.response?.data?.message || error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Create Form - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Form</h1>
          <p className="mt-1 text-sm text-gray-600">Design a new report form for data collection</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Form Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter form title"
                  required
                />
              </div>

              <div>
                <label htmlFor="formType" className="block text-sm font-medium text-gray-700 mb-1">
                  Form Type *
                </label>
                <select
                  id="formType"
                  name="formType"
                  value={formData.formType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="coordinatorReport">Coordinator Report</option>
                  <option value="wardReport">Ward Report</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                placeholder="Enter form description (optional)"
              />
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="allowMultipleSubmissions"
                      checked={formData.allowMultipleSubmissions}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Allow Multiple Submissions</span>
                  </label>
                  <p className="text-xs text-gray-500 ml-6 mt-1">
                    When disabled, users can only submit this form once
                  </p>
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="allowEditAfterSubmission"
                      checked={formData.allowEditAfterSubmission}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Allow Edit After Submission</span>
                  </label>
                  <p className="text-xs text-gray-500 ml-6 mt-1">
                    When enabled, users can edit their submitted forms
                  </p>
                </div>
              </div>
              
              {formData.formType === 'wardReport' && (
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="isSittingWardForm"
                      checked={formData.isSittingWardForm}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Enable Sitting Ward Form</span>
                  </label>
                  <p className="text-xs text-gray-500 ml-6 mt-1">
                    Enable this to add additional questions specifically for sitting wards
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="enableDateTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Form Enable Date & Time *
                </label>
                <input
                  type="datetime-local"
                  id="enableDateTime"
                  name="enableDateTime"
                  value={formData.enableDateTime}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">When users can start filling this form</p>
                {formData.enableDateTime && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-md">
                    <p className="text-xs text-blue-700">
                      <strong>Auto-calculated:</strong> Week {getWeekNumber(new Date(formData.enableDateTime))}, {new Date(formData.enableDateTime).getFullYear()}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="closeDateTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Form Close Date & Time *
                </label>
                <input
                  type="datetime-local"
                  id="closeDateTime"
                  name="closeDateTime"
                  value={formData.closeDateTime}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">When the form will no longer accept submissions</p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Form Questions</h2>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleImportQuestions}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    Import Questions
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addField}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Questions
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {formData.fields.map((field, index) => (
                  <div key={index} className="space-y-2">
                    <DragDropField
                      field={{ ...field }}
                      index={index}
                      onFieldChange={handleFieldChange}
                      onRemoveField={removeField}
                      onMoveField={moveField}
                      totalFields={formData.fields.length}
                      onAddOption={addOption}
                      onRemoveOption={removeOption}
                      onOptionChange={handleOptionChange}
                      onAddSubQuestion={addSubQuestion}
                      onRemoveSubQuestion={removeSubQuestion}
                      onSubQuestionChange={handleSubQuestionChange}
                      onAddSubQuestionOption={addSubQuestionOption}
                      onRemoveSubQuestionOption={removeSubQuestionOption}
                      onSubQuestionOptionChange={handleSubQuestionOptionChange}
                      questionNumber={index + 1}
                      showSections={false}
                    />
                    <div className="flex justify-end">
                      <Button type="button" variant="outline" onClick={() => addFieldAfter(index)}>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Question
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

                {formData.fields.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-2 text-sm">No fields added yet. Click "Add Questions" to get started.</p>
                  </div>
                )}
              </div>

            {/* Sitting Ward Fields Section */}
            {formData.isSittingWardForm && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Additional Questions for Sitting Wards</h2>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleImportQuestions('sittingWard')}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      Import Questions
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addSittingWardField}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Sitting Ward Question
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {formData.sittingWardFields.map((field, index) => (
                    <div key={`sitting-${index}`} className="space-y-2">
                      <DragDropField
                        field={{ ...field }}
                        index={index}
                        onFieldChange={handleSittingWardFieldChange}
                        onRemoveField={removeSittingWardField}
                        onMoveField={moveSittingWardField}
                        totalFields={formData.sittingWardFields.length}
                        onAddOption={addSittingWardOption}
                        onRemoveOption={removeSittingWardOption}
                        onOptionChange={handleSittingWardOptionChange}
                        onAddSubQuestion={addSittingWardSubQuestion}
                        onRemoveSubQuestion={removeSittingWardSubQuestion}
                        onSubQuestionChange={handleSittingWardSubQuestionChange}
                        onAddSubQuestionOption={addSittingWardSubQuestionOption}
                        onRemoveSubQuestionOption={removeSittingWardSubQuestionOption}
                        onSubQuestionOptionChange={handleSittingWardSubQuestionOptionChange}
                        fieldPrefix="Sitting Ward Question"
                        questionNumber={index + 1}
                        showSections={false}
                      />
                      <div className="flex justify-end">
                        <Button type="button" variant="outline" onClick={() => addSittingWardFieldAfter(index)}>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Sitting Ward Question
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                  {formData.sittingWardFields.length === 0 && (
                    <div className="text-center py-12 text-gray-500 bg-blue-50 rounded-lg border-2 border-dashed border-blue-200">
                      <svg className="mx-auto h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="mt-2 text-sm">No sitting ward questions added yet. Click "Add Sitting Ward Question" to get started.</p>
                    </div>
                  )}
                </div>
            )}

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/forms')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="outline"
                disabled={isSubmitting}
                onClick={(e) => handleSubmit(e, false)}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </div>
                ) : (
                  'Save as Draft'
                )}
              </Button>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={(e) => handleSubmit(e, true)}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Publishing...
                  </div>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Publish Form
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Import Questions Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Import Questions
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {importType === 'sittingWard' 
                      ? 'Importing questions for sitting ward section' 
                      : 'Importing questions for main form section'}
                  </p>
                </div>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {recurringQuestions.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No questions available to import</p>
                ) : (
                  <div className="space-y-3">
                    {recurringQuestions.map((question) => (
                      <div key={question._id} className="border border-gray-200 rounded-lg p-3">
                        <label className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedQuestions.includes(question._id)}
                            onChange={() => handleQuestionSelection(question._id)}
                            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{question.question}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Type: {question.fieldType}
                              {question.applicableToClusters && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  Clusters
                                </span>
                              )}
                              {question.applicableToSittingWards && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                  Sitting Ward
                                </span>
                              )}
                            </div>
                            {question.options && question.options.length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                Options: {question.options.join(', ')}
                              </div>
                            )}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowImportModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleImportSelectedQuestions}
                  disabled={selectedQuestions.length === 0}
                >
                  Import {selectedQuestions.length} Question{selectedQuestions.length !== 1 ? 's' : ''} 
                  {importType === 'sittingWard' ? ' to Sitting Ward Section' : ' to Main Form'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
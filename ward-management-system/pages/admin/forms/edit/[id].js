import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../../../components/Layout';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';
import DragDropField from '../../../../components/DragDropField';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../../../components/Shimmer';
import { useApiData } from '../../../../hooks/useApiData';

export default function EditForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const [form, setForm] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [recurringQuestions, setRecurringQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [importType, setImportType] = useState('regular');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    isPublished: false,
    isSittingWardForm: false,
    allowMultipleSubmissions: true,
    allowEditAfterSubmission: false,
    fields: [
      {
        label: '',
        type: 'text',
        required: false,
        options: [],
        subQuestions: [],
        showSubQuestionsWhen: '',
        applicableToClusters: false,
        order: 0
      }
    ],
    sittingWardFields: []
  });

  useEffect(() => {
    // Check if user is authenticated and is state admin
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'stateAdmin') {
      router.push('/');
    } else if (status === 'authenticated' && id) {
      fetchForm();
    }
  }, [status, session, router, id]);

  const fetchForm = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/forms/${id}`);
      const formData = response.data;

      setForm(formData);
      setFormData({
        title: formData.title,
        description: formData.description || '',
        isPublished: formData.isPublished || false,
        isSittingWardForm: formData.isSittingWardForm || false,
        allowMultipleSubmissions: formData.allowMultipleSubmissions !== undefined ? formData.allowMultipleSubmissions : true,
        allowEditAfterSubmission: formData.allowEditAfterSubmission || false,
        fields: formData.fields ? formData.fields.map((field, index) => ({
          ...field,
          subQuestions: field.subQuestions || [],
          showSubQuestionsWhen: field.showSubQuestionsWhen || '',
          options: field.options || [],
          applicableToClusters: field.applicableToClusters || false,
          order: field.order !== undefined ? field.order : index,
          section: field.section || ''
        })) : [{
          label: '',
          type: 'text',
          required: false,
          options: [],
          subQuestions: [],
          showSubQuestionsWhen: '',
          applicableToClusters: false,
          order: 0,
          section: ''
        }],
        sittingWardFields: formData.sittingWardFields ? formData.sittingWardFields.map((field, index) => ({
          ...field,
          subQuestions: field.subQuestions || [],
          showSubQuestionsWhen: field.showSubQuestionsWhen || '',
          options: field.options || [],
          applicableToClusters: field.applicableToClusters || false,
          order: field.order !== undefined ? field.order : index,
          section: field.section || ''
        })) : []
      });
      setError('');
    } catch (error) {
      setError('Failed to fetch form');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
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
    updatedFields[fieldIndex].options[optionIndex] = value;
    setFormData({ ...formData, fields: updatedFields });
  };

  const addOption = (fieldIndex) => {
    const updatedFields = [...formData.fields];
    updatedFields[fieldIndex].options.push('');
    setFormData({ ...formData, fields: updatedFields });
  };

  const removeOption = (fieldIndex, optionIndex) => {
    const updatedFields = [...formData.fields];
    updatedFields[fieldIndex].options.splice(optionIndex, 1);
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

  const removeField = (index) => {
    if (formData.fields.length > 1) {
      const updatedFields = [...formData.fields];
      updatedFields.splice(index, 1);
      // Update order values
      const reorderedFields = updatedFields.map((field, idx) => ({
        ...field,
        order: idx
      }));
      setFormData({ ...formData, fields: reorderedFields });
    }
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
    if (!updatedFields[fieldIndex].subQuestions) {
      updatedFields[fieldIndex].subQuestions = [];
    }
    updatedFields[fieldIndex].subQuestions.push({
      label: '',
      type: 'text',
      required: false,
      options: []
    });
    setFormData({ ...formData, fields: updatedFields });
  };

  const removeSubQuestion = (fieldIndex, subIndex) => {
    const updatedFields = [...formData.fields];
    updatedFields[fieldIndex].subQuestions.splice(subIndex, 1);
    setFormData({ ...formData, fields: updatedFields });
  };

  const handleSubQuestionChange = (fieldIndex, subIndex, e) => {
    const { name, value, type, checked } = e.target;
    const updatedFields = [...formData.fields];
    updatedFields[fieldIndex].subQuestions[subIndex][name] = type === 'checkbox' ? checked : value;
    setFormData({ ...formData, fields: updatedFields });
  };

  const addSubQuestionOption = (fieldIndex, subIndex) => {
    const updatedFields = [...formData.fields];
    if (!updatedFields[fieldIndex].subQuestions[subIndex].options) {
      updatedFields[fieldIndex].subQuestions[subIndex].options = [];
    }
    updatedFields[fieldIndex].subQuestions[subIndex].options.push('');
    setFormData({ ...formData, fields: updatedFields });
  };

  const removeSubQuestionOption = (fieldIndex, subIndex, optionIndex) => {
    const updatedFields = [...formData.fields];
    updatedFields[fieldIndex].subQuestions[subIndex].options.splice(optionIndex, 1);
    setFormData({ ...formData, fields: updatedFields });
  };

  const handleSubQuestionOptionChange = (fieldIndex, subIndex, optionIndex, value) => {
    const updatedFields = [...formData.fields];
    updatedFields[fieldIndex].subQuestions[subIndex].options[optionIndex] = value;
    setFormData({ ...formData, fields: updatedFields });
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

  const removeSittingWardField = (index) => {
    if (formData.sittingWardFields.length > 0) {
      const updatedFields = [...formData.sittingWardFields];
      updatedFields.splice(index, 1);
      // Update order values
      const reorderedFields = updatedFields.map((field, idx) => ({
        ...field,
        order: idx
      }));
      setFormData({ ...formData, sittingWardFields: reorderedFields });
    }
  };

  const moveSittingWardField = (fromIndex, toIndex) => {
    const updatedFields = [...formData.sittingWardFields];
    const [movedField] = updatedFields.splice(fromIndex, 1);
    updatedFields.splice(toIndex, 0, movedField);
    
    // Update order values
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
    updatedFields[fieldIndex].options[optionIndex] = value;
    setFormData({ ...formData, sittingWardFields: updatedFields });
  };

  const addSittingWardOption = (fieldIndex) => {
    const updatedFields = [...formData.sittingWardFields];
    updatedFields[fieldIndex].options.push('');
    setFormData({ ...formData, sittingWardFields: updatedFields });
  };

  const removeSittingWardOption = (fieldIndex, optionIndex) => {
    const updatedFields = [...formData.sittingWardFields];
    updatedFields[fieldIndex].options.splice(optionIndex, 1);
    setFormData({ ...formData, sittingWardFields: updatedFields });
  };

  const addSittingWardSubQuestion = (fieldIndex) => {
    const updatedFields = [...formData.sittingWardFields];
    if (!updatedFields[fieldIndex].subQuestions) {
      updatedFields[fieldIndex].subQuestions = [];
    }
    updatedFields[fieldIndex].subQuestions.push({
      label: '',
      type: 'text',
      required: false,
      options: []
    });
    setFormData({ ...formData, sittingWardFields: updatedFields });
  };

  const removeSittingWardSubQuestion = (fieldIndex, subIndex) => {
    const updatedFields = [...formData.sittingWardFields];
    updatedFields[fieldIndex].subQuestions.splice(subIndex, 1);
    setFormData({ ...formData, sittingWardFields: updatedFields });
  };

  const handleSittingWardSubQuestionChange = (fieldIndex, subIndex, e) => {
    const { name, value, type, checked } = e.target;
    const updatedFields = [...formData.sittingWardFields];
    updatedFields[fieldIndex].subQuestions[subIndex][name] = type === 'checkbox' ? checked : value;
    setFormData({ ...formData, sittingWardFields: updatedFields });
  };

  const addSittingWardSubQuestionOption = (fieldIndex, subIndex) => {
    const updatedFields = [...formData.sittingWardFields];
    if (!updatedFields[fieldIndex].subQuestions[subIndex].options) {
      updatedFields[fieldIndex].subQuestions[subIndex].options = [];
    }
    updatedFields[fieldIndex].subQuestions[subIndex].options.push('');
    setFormData({ ...formData, sittingWardFields: updatedFields });
  };

  const removeSittingWardSubQuestionOption = (fieldIndex, subIndex, optionIndex) => {
    const updatedFields = [...formData.sittingWardFields];
    updatedFields[fieldIndex].subQuestions[subIndex].options.splice(optionIndex, 1);
    setFormData({ ...formData, sittingWardFields: updatedFields });
  };

  const handleSittingWardSubQuestionOptionChange = (fieldIndex, subIndex, optionIndex, value) => {
    const updatedFields = [...formData.sittingWardFields];
    updatedFields[fieldIndex].subQuestions[subIndex].options[optionIndex] = value;
    setFormData({ ...formData, sittingWardFields: updatedFields });
  };

  const handleImportQuestions = () => {
    let apiUrl = `/api/recurring-questions?formType=${form.formType}&isActive=true`;
    if (formData.isSittingWardForm) {
      apiUrl += '&isSittingWard=true';
    }
    
    axios.get(apiUrl)
      .then(response => {
        setRecurringQuestions(response.data);
        setSelectedQuestions([]);
        setImportType('regular');
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
      order: formData.fields.length
    }));

    setFormData({
      ...formData,
      fields: [...formData.fields, ...newFields]
    });
    
    setShowImportModal(false);
    setSelectedQuestions([]);
  };

  const togglePublishStatus = async () => {
    try {
      setIsSaving(true);
      const newPublishStatus = !formData.isPublished;
      
      await axios.put(`/api/forms/${id}`, { 
        isPublished: newPublishStatus 
      });
      
      setFormData({ ...formData, isPublished: newPublishStatus });
      setSuccess(`Form ${newPublishStatus ? 'published' : 'unpublished'} successfully!`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to update publish status');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      // Validate form
      if (!formData.title.trim()) {
        throw new Error('Form title is required');
      }

      // Filter out empty fields
      const validFields = formData.fields.filter(field => field.label && field.label.trim());
      const validSittingWardFields = formData.isSittingWardForm 
        ? formData.sittingWardFields.filter(field => field.label && field.label.trim())
        : [];

      // Validate fields
      if (validFields.length === 0) {
        throw new Error('At least one field with a label is required');
      }

      for (const field of validFields) {
        if (!field.label.trim() || !field.type) {
          throw new Error('All fields must have a label and type');
        }

        if ((field.type === 'select' || field.type === 'multiselect') && (!field.options || field.options.length === 0 || field.options.some(opt => !opt || !opt.trim()))) {
          throw new Error('Select fields must have at least one non-empty option');
        }
      }

      // Validate sitting ward fields if enabled
      if (formData.isSittingWardForm && validSittingWardFields.length > 0) {
        for (const field of validSittingWardFields) {
          if (!field.label.trim() || !field.type) {
            throw new Error('All sitting ward fields must have a label and type');
          }

          if ((field.type === 'select' || field.type === 'multiselect') && (!field.options || field.options.length === 0 || field.options.some(opt => !opt || !opt.trim()))) {
            throw new Error('Sitting ward select fields must have at least one non-empty option');
          }
        }
      }

      // Submit form
      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        formType: form.formType,
        isPublished: formData.isPublished,
        isSittingWardForm: formData.isSittingWardForm,
        allowMultipleSubmissions: formData.allowMultipleSubmissions,
        allowEditAfterSubmission: formData.allowEditAfterSubmission,
        fields: validFields.map((field, index) => {
          const processedField = {
            label: field.label.trim(),
            type: field.type,
            required: Boolean(field.required),
            options: field.options ? field.options.filter(opt => opt && opt.trim()).map(opt => opt.trim()) : [],
            subQuestions: field.subQuestions ? field.subQuestions.filter(subQ => subQ.label && subQ.label.trim()).map(subQ => ({
              label: subQ.label.trim(),
              type: subQ.type || 'text',
              required: Boolean(subQ.required),
              options: subQ.options ? subQ.options.filter(opt => opt && opt.trim()).map(opt => opt.trim()) : []
            })) : [],
            showSubQuestionsWhen: field.showSubQuestionsWhen || '',
            applicableToClusters: Boolean(field.applicableToClusters),
            order: field.order !== undefined ? field.order : index
          };
          
          return processedField;
        }),
        sittingWardFields: validSittingWardFields.map((field, index) => ({
          label: field.label.trim(),
          type: field.type,
          required: Boolean(field.required),
          options: field.options ? field.options.filter(opt => opt && opt.trim()).map(opt => opt.trim()) : [],
          subQuestions: field.subQuestions ? field.subQuestions.filter(subQ => subQ.label && subQ.label.trim()).map(subQ => ({
            label: subQ.label.trim(),
            type: subQ.type || 'text',
            required: Boolean(subQ.required),
            options: subQ.options ? subQ.options.filter(opt => opt && opt.trim()).map(opt => opt.trim()) : []
          })) : [],
          showSubQuestionsWhen: field.showSubQuestionsWhen || '',
          applicableToClusters: Boolean(field.applicableToClusters),
          order: field.order !== undefined ? field.order : index
        }))
      };

      await axios.put(`/api/forms/${id}`, updateData);

      setSuccess('Form updated successfully!');

      // Redirect back to forms list after a short delay
      setTimeout(() => {
        router.push('/admin/forms');
      }, 2000);
    } catch (error) {
      console.error('Form update error:', error);
      
      let errorMessage = 'Failed to update form';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        if (errorData.errors && Array.isArray(errorData.errors)) {
          errorMessage = `Validation errors: ${errorData.errors.join(', ')}`;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  if (!form) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Form Not Found</h1>
          <Link href="/admin/forms">
            <Button>Back to Forms</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Edit Form - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Form</h1>
            <p className="mt-1 text-sm text-gray-600">
              {form.formType === 'coordinatorReport' ? 'Coordinator Report' : 'Ward Report'} -
              Week {form.weekNumber}, {form.year}
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              type="button"
              variant={formData.isPublished ? "success" : "outline"}
              onClick={togglePublishStatus}
              disabled={isSaving}
            >
              {isSaving ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {formData.isPublished ? 'Unpublishing...' : 'Publishing...'}
                </div>
              ) : (
                <>
                  {formData.isPublished ? (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                      </svg>
                      Unpublish
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Publish
                    </>
                  )}
                </>
              )}
            </Button>
            <Link href="/admin/forms">
              <Button variant="outline">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Forms
              </Button>
            </Link>
          </div>
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

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{success}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Card>
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Form Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Form Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      required
                      placeholder="Enter form title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Form Type
                    </label>
                    <select
                      name="formType"
                      value={form.formType}
                      onChange={(e) => {
                        setForm({ ...form, formType: e.target.value });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="coordinatorReport">Coordinator Report</option>
                      <option value="wardReport">Ward Report</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    placeholder="Enter form description"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="allowMultipleSubmissions"
                    checked={formData.allowMultipleSubmissions}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">Allow Multiple Submissions</span>
                </label>
                <p className="text-xs text-gray-500 ml-6">
                  When disabled, users can only submit this form once
                </p>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="allowEditAfterSubmission"
                    checked={formData.allowEditAfterSubmission}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">Allow Edit After Submission</span>
                </label>
                <p className="text-xs text-gray-500 ml-6">
                  When enabled, users can edit their submitted forms
                </p>
                
                {form.formType === 'wardReport' && (
                  <>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="isSittingWardForm"
                        checked={formData.isSittingWardForm}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">Sitting Ward Form</span>
                    </label>
                    <p className="text-xs text-gray-500 ml-6">
                      Enable this for forms specifically designed for sitting wards
                    </p>
                  </>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Form Fields</h2>
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
                    <Button type="button" onClick={addField} variant="outline">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Field
                    </Button>
                  </div>
                </div>

                <div className="space-y-6">
                  {(() => {
                    // Group fields by section
                    const sections = {};
                    let questionCounter = 1;
                    
                    formData.fields.forEach((field, index) => {
                      const sectionName = field.section || 'General Questions';
                      if (!sections[sectionName]) {
                        sections[sectionName] = [];
                      }
                      sections[sectionName].push({ ...field, originalIndex: index, questionNumber: questionCounter++ });
                    });

                    return Object.entries(sections).map(([sectionName, sectionFields]) => (
                      <div key={sectionName} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          {sectionName}
                        </h3>
                        <div className="space-y-4">
                          {sectionFields.map((field) => (
                            <DragDropField
                              key={field.originalIndex}
                              field={field}
                              index={field.originalIndex}
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
                              questionNumber={field.questionNumber}
                              showSections={true}
                            />
                          ))}
                        </div>
                      </div>
                    ));
                  })()}

                  {formData.fields.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="mt-2 text-sm">No fields added yet. Click "Add Field" to get started.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sitting Ward Fields Section */}
              {formData.isSittingWardForm && (
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium text-gray-900">Sitting Ward Questions</h2>
                    <Button type="button" onClick={addSittingWardField} variant="outline">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Sitting Ward Question
                    </Button>
                  </div>

                  <div className="space-y-6">
                    {(() => {
                      // Group sitting ward fields by section
                      const sections = {};
                      let questionCounter = 1;
                      
                      formData.sittingWardFields.forEach((field, index) => {
                        const sectionName = field.section || 'Sitting Ward Questions';
                        if (!sections[sectionName]) {
                          sections[sectionName] = [];
                        }
                        sections[sectionName].push({ ...field, originalIndex: index, questionNumber: questionCounter++ });
                      });

                      return Object.entries(sections).map(([sectionName, sectionFields]) => (
                        <div key={sectionName} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                          <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            {sectionName}
                          </h3>
                          <div className="space-y-4">
                            {sectionFields.map((field) => (
                              <DragDropField
                                key={`sitting-ward-${field.originalIndex}`}
                                field={field}
                                index={field.originalIndex}
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
                                questionNumber={field.questionNumber}
                                showSections={true}
                              />
                            ))}
                          </div>
                        </div>
                      ));
                    })()}

                    {formData.sittingWardFields.length === 0 && (
                      <div className="text-center py-8 text-gray-500 bg-blue-50 rounded-lg border-2 border-dashed border-blue-200">
                        <svg className="mx-auto h-8 w-8 text-blue-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm">No sitting ward questions added yet.</p>
                        <p className="text-xs text-gray-400 mt-1">Click "Add Sitting Ward Question" to get started.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <Link href="/admin/forms">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </div>
                  ) : (
                    'Update Form'
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </form>
      </div>

      {/* Import Questions Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Import Questions
                </h3>
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
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
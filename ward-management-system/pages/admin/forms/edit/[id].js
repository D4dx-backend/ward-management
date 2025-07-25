import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../../../components/Layout';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';

export default function EditForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const [form, setForm] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    fields: [
      {
        label: '',
        type: 'text',
        required: false,
        options: [],
        subQuestions: [],
        showSubQuestionsWhen: ''
      }
    ]
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
        fields: formData.fields ? formData.fields.map(field => ({
          ...field,
          subQuestions: field.subQuestions || [],
          showSubQuestionsWhen: field.showSubQuestionsWhen || '',
          options: field.options || []
        })) : [{
          label: '',
          type: 'text',
          required: false,
          options: [],
          subQuestions: [],
          showSubQuestionsWhen: ''
        }]
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
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
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

  const handleSubQuestionChange = (fieldIndex, subIndex, property, value) => {
    const updatedFields = [...formData.fields];
    updatedFields[fieldIndex].subQuestions[subIndex][property] = value;
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

  const addField = () => {
    setFormData({
      ...formData,
      fields: [...formData.fields, {
        label: '',
        type: 'text',
        required: false,
        options: [],
        subQuestions: [],
        showSubQuestionsWhen: ''
      }]
    });
  };

  const removeField = (index) => {
    if (formData.fields.length > 1) {
      const updatedFields = [...formData.fields];
      updatedFields.splice(index, 1);
      setFormData({ ...formData, fields: updatedFields });
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

      // Validate fields
      for (const field of formData.fields) {
        if (!field.label.trim() || !field.type) {
          throw new Error('All fields must have a label and type');
        }

        if (field.type === 'select' && (!field.options || field.options.length === 0 || field.options.some(opt => !opt || !opt.trim()))) {
          throw new Error('Select fields must have at least one non-empty option');
        }
      }

      // Submit form
      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        formType: form.formType, // Use the updated form type from state
        isActive: form.isActive, // Preserve the current active status
        fields: formData.fields.map((field, index) => {
          console.log(`Processing field ${index + 1}:`, field);
          
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
            showSubQuestionsWhen: field.showSubQuestionsWhen || ''
          };
          
          console.log(`Processed field ${index + 1}:`, processedField);
          return processedField;
        })
      };

      console.log('=== SENDING UPDATE DATA ===');
      console.log('Update data:', JSON.stringify(updateData, null, 2));

      await axios.put(`/api/forms/${id}`, updateData);

      setSuccess('Form updated successfully!');

      // Redirect back to forms list after a short delay
      setTimeout(() => {
        router.push('/admin/forms');
      }, 2000);
    } catch (error) {
      console.error('=== FORM UPDATE ERROR ===');
      console.error('Error object:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error message:', error.message);
      
      let errorMessage = 'Failed to update form';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Handle validation errors with details
        if (errorData.errors && Array.isArray(errorData.errors)) {
          errorMessage = `Validation errors: ${errorData.errors.join(', ')}`;
        } else if (errorData.message) {
          errorMessage = errorData.message;
          
          // Add field details if available
          if (errorData.field) {
            errorMessage += ` (Field: ${JSON.stringify(errorData.field)})`;
          }
          if (errorData.subQuestion) {
            errorMessage += ` (Sub-question: ${JSON.stringify(errorData.subQuestion)})`;
          }
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Add status for debugging
      if (error.response?.status) {
        errorMessage += ` (Status: ${error.response.status})`;
      }
      
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
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
          <Link href="/admin/forms">
            <Button variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Forms
            </Button>
          </Link>
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

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Form Fields</h2>
                  <Button type="button" onClick={addField} variant="outline">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Field
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.fields.map((field, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-sm font-medium text-gray-900">Field {index + 1}</h3>
                        {formData.fields.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeField(index)}
                            variant="danger"
                            size="sm"
                          >
                            Remove
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Field Label *
                          </label>
                          <input
                            type="text"
                            name="label"
                            value={field.label}
                            onChange={(e) => handleFieldChange(index, e)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Field Type *
                          </label>
                          <select
                            name="type"
                            value={field.type}
                            onChange={(e) => handleFieldChange(index, e)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="textarea">Text Area</option>
                            <option value="select">Select</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="yesno">Yes/No</option>
                            <option value="date">Date</option>
                          </select>
                        </div>
                        <div className="flex items-center">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              name="required"
                              checked={field.required}
                              onChange={(e) => handleFieldChange(index, e)}
                              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                            />
                            <span className="ml-2 text-sm text-gray-700">Required</span>
                          </label>
                        </div>
                      </div>

                      {field.type === 'select' && (
                        <div className="mt-4">
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Options *
                            </label>
                            <Button
                              type="button"
                              onClick={() => addOption(index)}
                              variant="outline"
                              size="sm"
                            >
                              Add Option
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {field.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => handleOptionChange(index, optionIndex, e.target.value)}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder={`Option ${optionIndex + 1}`}
                                  required
                                />
                                <Button
                                  type="button"
                                  onClick={() => removeOption(index, optionIndex)}
                                  variant="danger"
                                  size="sm"
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sub-questions section */}
                      {(field.type === 'yesno' || field.type === 'select') && (
                        <div className="mt-4 border-t border-gray-200 pt-4">
                          <div className="flex justify-between items-center mb-3">
                            <label className="block text-sm font-medium text-gray-700">
                              Sub-questions (Optional)
                            </label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addSubQuestion(index)}
                            >
                              Add Sub-question
                            </Button>
                          </div>

                          {field.type === 'yesno' && field.subQuestions && field.subQuestions.length > 0 && (
                            <div className="mb-3">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Show sub-questions when:
                              </label>
                              <select
                                name="showSubQuestionsWhen"
                                value={field.showSubQuestionsWhen || ''}
                                onChange={(e) => handleFieldChange(index, e)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Always show</option>
                                <option value="yes">When answer is Yes</option>
                                <option value="no">When answer is No</option>
                              </select>
                            </div>
                          )}

                          {field.type === 'select' && field.subQuestions && field.subQuestions.length > 0 && (
                            <div className="mb-3">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Show sub-questions when option selected:
                              </label>
                              <select
                                name="showSubQuestionsWhen"
                                value={field.showSubQuestionsWhen || ''}
                                onChange={(e) => handleFieldChange(index, e)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Always show</option>
                                {field.options && field.options.map((option, optionIndex) => (
                                  <option key={optionIndex} value={option}>
                                    When "{option}" is selected
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          
                          <div className="space-y-4">
                            {field.subQuestions && field.subQuestions.map((subQuestion, subIndex) => (
                              <div key={subIndex} className="bg-gray-50 p-4 rounded-lg border">
                                <div className="flex justify-between items-center mb-3">
                                  <h4 className="text-sm font-medium text-gray-900">Sub-question {subIndex + 1}</h4>
                                  <Button
                                    type="button"
                                    variant="danger"
                                    size="sm"
                                    onClick={() => removeSubQuestion(index, subIndex)}
                                  >
                                    Remove
                                  </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Sub-question Label *
                                    </label>
                                    <input
                                      type="text"
                                      value={subQuestion.label || ''}
                                      onChange={(e) => handleSubQuestionChange(index, subIndex, 'label', e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      placeholder="Enter sub-question label"
                                      required
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Sub-question Type *
                                    </label>
                                    <select
                                      value={subQuestion.type || 'text'}
                                      onChange={(e) => handleSubQuestionChange(index, subIndex, 'type', e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      required
                                    >
                                      <option value="text">Text</option>
                                      <option value="number">Number</option>
                                      <option value="textarea">Text Area</option>
                                      <option value="select">Select</option>
                                      <option value="checkbox">Checkbox</option>
                                      <option value="date">Date</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="mb-3">
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={subQuestion.required || false}
                                      onChange={(e) => handleSubQuestionChange(index, subIndex, 'required', e.target.checked)}
                                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm font-medium text-gray-700">Required Sub-question</span>
                                  </label>
                                </div>

                                {subQuestion.type === 'select' && (
                                  <div>
                                    <div className="flex justify-between items-center mb-2">
                                      <label className="block text-sm font-medium text-gray-700">
                                        Sub-question Options *
                                      </label>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addSubQuestionOption(index, subIndex)}
                                      >
                                        Add Option
                                      </Button>
                                    </div>
                                    <div className="space-y-2">
                                      {(subQuestion.options || []).map((option, optionIndex) => (
                                        <div key={optionIndex} className="flex items-center space-x-2">
                                          <input
                                            type="text"
                                            value={option}
                                            onChange={(e) => handleSubQuestionOptionChange(index, subIndex, optionIndex, e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder={`Option ${optionIndex + 1}`}
                                            required
                                          />
                                          <Button
                                            type="button"
                                            variant="danger"
                                            size="sm"
                                            onClick={() => removeSubQuestionOption(index, subIndex, optionIndex)}
                                          >
                                            Remove
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <Link href="/admin/forms">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </form>
      </div>
    </Layout>
  );
}
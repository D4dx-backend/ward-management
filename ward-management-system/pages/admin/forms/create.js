import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';

export default function CreateForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
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
    isActive: true,
    enableDateTime: new Date().toISOString().slice(0, 16), // Format for datetime-local input
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
        showSubQuestionsWhen: '' // For conditional sub-questions
      }
    ]
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
        showSubQuestionsWhen: ''
      }]
    });
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

  const removeField = (index) => {
    const updatedFields = [...formData.fields];
    updatedFields.splice(index, 1);
    setFormData({ ...formData, fields: updatedFields });
  };

  const handleSubmit = async (e) => {
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

      // Add calculated values to form data
      const formDataWithCalculated = {
        ...formData,
        weekNumber,
        year
      };

      // Validate fields
      for (const field of formData.fields) {
        if (!field.label || !field.type) {
          throw new Error('All fields must have a label and type');
        }

        if (field.type === 'select' && (!field.options || field.options.length === 0)) {
          throw new Error('Select fields must have at least one option');
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
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
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

            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Active Form</span>
              </label>
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
                <h2 className="text-lg font-semibold text-gray-900">Form Fields</h2>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addField}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Field
                </Button>
              </div>

              <div className="space-y-6">
                {formData.fields.map((field, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-md font-medium text-gray-900">Field {index + 1}</h3>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => removeField(index)}
                      >
                        Remove
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Field Label *
                        </label>
                        <input
                          type="text"
                          name="label"
                          value={field.label}
                          onChange={(e) => handleFieldChange(index, e)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter field label"
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
                    </div>

                    <div className="mb-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="required"
                          checked={field.required}
                          onChange={(e) => handleFieldChange(index, e)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700">Required Field</span>
                      </label>
                    </div>

                    {field.type === 'select' && (
                      <div className="mt-4">
                        <div className="flex justify-between items-center mb-3">
                          <label className="block text-sm font-medium text-gray-700">
                            Options *
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addOption(index)}
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
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder={`Option ${optionIndex + 1}`}
                                required
                              />
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                onClick={() => removeOption(index, optionIndex)}
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

                        {field.type === 'yesno' && field.subQuestions.length > 0 && (
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Show sub-questions when:
                            </label>
                            <select
                              name="showSubQuestionsWhen"
                              value={field.showSubQuestionsWhen}
                              onChange={(e) => handleFieldChange(index, e)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Always show</option>
                              <option value="yes">When answer is Yes</option>
                              <option value="no">When answer is No</option>
                            </select>
                          </div>
                        )}

                        {field.type === 'select' && field.subQuestions.length > 0 && (
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Show sub-questions when option selected:
                            </label>
                            <select
                              name="showSubQuestionsWhen"
                              value={field.showSubQuestionsWhen}
                              onChange={(e) => handleFieldChange(index, e)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Always show</option>
                              {field.options.map((option, optionIndex) => (
                                <option key={optionIndex} value={option}>
                                  When "{option}" is selected
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        
                        <div className="space-y-4">
                          {field.subQuestions.map((subQuestion, subIndex) => (
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
                                    name="label"
                                    value={subQuestion.label}
                                    onChange={(e) => handleSubQuestionChange(index, subIndex, e)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter sub-question label"
                                    required
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Sub-question Type *
                                  </label>
                                  <select
                                    name="type"
                                    value={subQuestion.type}
                                    onChange={(e) => handleSubQuestionChange(index, subIndex, e)}
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
                              </div>

                              <div className="mb-3">
                                <label className="flex items-center">
                                  <input
                                    type="checkbox"
                                    name="required"
                                    checked={subQuestion.required}
                                    onChange={(e) => handleSubQuestionChange(index, subIndex, e)}
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
                                    {subQuestion.options.map((option, optionIndex) => (
                                      <div key={optionIndex} className="flex items-center space-x-2">
                                        <input
                                          type="text"
                                          value={option}
                                          onChange={(e) => handleSubQuestionOptionChange(index, subIndex, optionIndex, e.target.value)}
                                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  </Card>
                ))}

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
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </div>
                ) : (
                  'Create Form'
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
}
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import FormRenderer from '../../../components/FormRenderer';

export default function SubmitWardReport() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeForms, setActiveForms] = useState([]);
  const [userWards, setUserWards] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [selectedWard, setSelectedWard] = useState('');
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    // Check if user is authenticated and is ward admin
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'wardAdmin') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchData();
    }
  }, [status, session, router]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Get active ward report forms
      const formsResponse = await axios.get('/api/forms', {
        params: {
          formType: 'wardReport',
          isActive: true,
          availableOnly: true,
        }
      });
      
      // Get user's wards
      const wardsResponse = await axios.get('/api/wards');
      
      setActiveForms(formsResponse.data);
      setUserWards(wardsResponse.data);
      setError('');
    } catch (error) {
      setError('Failed to fetch data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSelect = (formId) => {
    const form = activeForms.find(f => f._id === formId);
    setSelectedForm(form);
    setFormData({});
  };

  const handleWardSelect = (wardId) => {
    setSelectedWard(wardId);
  };

  const validateForm = () => {
    const errors = {};
    let isValid = true;

    // Validate ward selection
    if (!selectedWard) {
      errors.ward = 'Please select a ward';
      isValid = false;
    }

    // Validate required fields
    for (let fieldIndex = 0; fieldIndex < selectedForm.fields.length; fieldIndex++) {
      const field = selectedForm.fields[fieldIndex];
      if (field.required) {
        const fieldKey = `field_${fieldIndex}`;
        const fieldValue = formData[fieldKey];
        
        // For checkbox fields, check if the value exists (can be true or false)
        if (field.type === 'checkbox') {
          if (fieldValue === undefined || fieldValue === null) {
            errors[fieldKey] = `${field.label} is required`;
            isValid = false;
          }
        } else {
          // For other field types, check if the value is empty or just whitespace
          const trimmedValue = typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue;
          if (!trimmedValue && trimmedValue !== 0 && trimmedValue !== false) {
            errors[fieldKey] = `${field.label} is required`;
            isValid = false;
          }
        }
      }
      
      // Validate required sub-questions
      if (field.subQuestions && field.subQuestions.length > 0) {
        const fieldKey = `field_${fieldIndex}`;
        const fieldValue = formData[fieldKey];
        
        // Check if sub-questions should be visible
        const shouldShowSubQuestions = field.showSubQuestionsWhen ? 
          (fieldValue?.toLowerCase() === field.showSubQuestionsWhen.toLowerCase() || fieldValue === field.showSubQuestionsWhen) : true;
          
        if (shouldShowSubQuestions) {
          for (let subIndex = 0; subIndex < field.subQuestions.length; subIndex++) {
            const subQuestion = field.subQuestions[subIndex];
            if (subQuestion.required) {
              const subKey = `field_${fieldIndex}_sub_${subIndex}`;
              const subValue = formData[subKey];
              

              
              if (subQuestion.type === 'checkbox') {
                if (subValue === undefined || subValue === null) {
                  errors[subKey] = `${subQuestion.label} is required`;
                  isValid = false;
                }
              } else {
                const trimmedSubValue = typeof subValue === 'string' ? subValue.trim() : subValue;
                if (!trimmedSubValue && trimmedSubValue !== 0 && trimmedSubValue !== false) {
                  errors[subKey] = `${subQuestion.label} is required`;
                  isValid = false;
                }
              }
            }
          }
        }
      }
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handlePreview = () => {
    if (validateForm()) {
      setShowPreview(true);
      setError('');
    } else {
      setError('Please fill in all required fields before previewing');
    }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Convert form data from field_index format to field.label format for API
      const apiResponses = {};
      
      selectedForm.fields.forEach((field, fieldIndex) => {
        const fieldKey = `field_${fieldIndex}`;
        const fieldValue = formData[fieldKey];
        
        // Include all field values, even empty ones for proper validation
        if (fieldValue !== undefined) {
          apiResponses[field.label] = fieldValue;
        }
        
        // Handle sub-questions
        if (field.subQuestions && field.subQuestions.length > 0) {
          const parentValue = fieldValue;
          
          // Check if sub-questions should be included based on parent value
          const shouldIncludeSubQuestions = field.showSubQuestionsWhen ? 
            (parentValue?.toLowerCase() === field.showSubQuestionsWhen.toLowerCase() || parentValue === field.showSubQuestionsWhen) : true;
          
          if (shouldIncludeSubQuestions) {
            field.subQuestions.forEach((subQuestion, subIndex) => {
              const subKey = `field_${fieldIndex}_sub_${subIndex}`;
              const subValue = formData[subKey];
              
              if (subValue !== undefined) {
                // Use a combined key for sub-questions
                apiResponses[`${field.label}_${subQuestion.label}`] = subValue;
              }
            });
          }
        }
      });
      
      // Submit response
      await axios.post('/api/responses', {
        formTemplateId: selectedForm._id,
        responses: apiResponses,
        wardId: selectedWard,
      });
      
      setSuccess('Ward report submitted successfully');
      setFormData({});
      setSelectedForm(null);
      setSelectedWard('');
      setShowPreview(false);
      setValidationErrors({});
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred while submitting the report';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };



  if (status === 'loading' || isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <Head>
        <title>Submit Ward Report - Ward Management System</title>
      </Head>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Submit Ward Report</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {userWards.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-700 mb-4">You are not assigned to any wards. Please contact your coordinator.</p>
            <Link href="/" className="text-blue-600 hover:text-blue-800">
              Back to Dashboard
            </Link>
          </div>
        ) : activeForms.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-700 mb-4">No active ward report forms available for submission.</p>
            <Link href="/" className="text-blue-600 hover:text-blue-800">
              Back to Dashboard
            </Link>
          </div>
        ) : !selectedForm ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Select a Report Form</h2>
            <div className="space-y-4">
              {activeForms.map((form) => (
                <div
                  key={form._id}
                  className="border border-gray-200 rounded p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleFormSelect(form._id)}
                >
                  <h3 className="font-medium">{form.title}</h3>
                  <p className="text-sm text-gray-500">Week {form.weekNumber}, {form.year}</p>
                  {form.description && <p className="mt-2 text-gray-700">{form.description}</p>}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium">{selectedForm.title}</h2>
              <button
                onClick={() => setSelectedForm(null)}
                className="text-blue-600 hover:text-blue-800"
              >
                Change Form
              </button>
            </div>
            
            {selectedForm.description && (
              <p className="mb-6 text-gray-700">{selectedForm.description}</p>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Ward <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedWard}
                  onChange={(e) => handleWardSelect(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                >
                  <option value="">Select a ward</option>
                  {userWards.map((ward) => (
                    <option key={ward._id} value={ward._id}>
                      {ward.name} ({ward.district})
                    </option>
                  ))}
                </select>
              </div>
              
              {!showPreview ? (
                <>
                  <FormRenderer
                    form={selectedForm}
                    formData={formData}
                    setFormData={setFormData}
                    errors={validationErrors}
                  />
                  
                  <div className="flex justify-between mt-6">
                    <div className="flex space-x-3">
                      <Link href="/" className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600">
                        Cancel
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({});
                          setError('');
                          setSuccess('');
                          setValidationErrors({});
                        }}
                        className="bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600"
                      >
                        Clear Form
                      </button>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={handlePreview}
                        className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
                      >
                        Preview Report
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-blue-300"
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit Report'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-blue-900 mb-2">Report Preview</h3>
                    <p className="text-blue-700 text-sm">Please review your responses before submitting.</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Ward Information</h4>
                      <p className="text-sm text-gray-700">
                        {userWards.find(w => w._id === selectedWard)?.name} ({userWards.find(w => w._id === selectedWard)?.district})
                      </p>
                    </div>
                    
                    {selectedForm.fields.map((field, fieldIndex) => {
                      const fieldKey = `field_${fieldIndex}`;
                      const fieldValue = formData[fieldKey];
                      
                      // Skip empty fields in preview
                      if (!fieldValue && fieldValue !== 0 && fieldValue !== false) return null;
                      
                      return (
                        <div key={fieldIndex} className="bg-white border border-gray-200 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-2">{field.label}</h4>
                          <div className="text-sm text-gray-700">
                            {field.type === 'yesno' ? (
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                fieldValue === 'Yes' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {fieldValue}
                              </span>
                            ) : field.type === 'checkbox' ? (
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                fieldValue ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {fieldValue ? 'Checked' : 'Not checked'}
                              </span>
                            ) : field.type === 'textarea' ? (
                              <div className="whitespace-pre-wrap bg-gray-50 p-3 rounded border">
                                {fieldValue}
                              </div>
                            ) : (
                              <span>{fieldValue}</span>
                            )}
                          </div>
                          
                          {/* Show sub-questions in preview */}
                          {field.subQuestions && field.subQuestions.length > 0 && (
                            <div className="mt-3 ml-4 space-y-2 border-l-2 border-gray-200 pl-4">
                              {field.subQuestions.map((subQuestion, subIndex) => {
                                const subKey = `field_${fieldIndex}_sub_${subIndex}`;
                                const subValue = formData[subKey];
                                
                                // Check if sub-question should be visible
                                const shouldShow = field.showSubQuestionsWhen ? 
                                  (fieldValue?.toLowerCase() === field.showSubQuestionsWhen.toLowerCase() || fieldValue === field.showSubQuestionsWhen) : true;
                                
                                if (!shouldShow || (!subValue && subValue !== 0 && subValue !== false)) return null;
                                
                                return (
                                  <div key={subIndex}>
                                    <h5 className="text-sm font-medium text-gray-700">{subQuestion.label}</h5>
                                    <div className="text-sm text-gray-600">
                                      {subQuestion.type === 'yesno' ? (
                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                          subValue === 'Yes' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                          {subValue}
                                        </span>
                                      ) : subQuestion.type === 'checkbox' ? (
                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                          subValue ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                          {subValue ? 'Checked' : 'Not checked'}
                                        </span>
                                      ) : (
                                        <span>{subValue}</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="flex justify-between mt-6">
                    <button
                      type="button"
                      onClick={() => setShowPreview(false)}
                      className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
                    >
                      Back to Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmDialog(true)}
                      disabled={isSubmitting}
                      className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-blue-300"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Report'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}
        
        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Submission</h3>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to submit this report? Once submitted, you cannot modify the responses.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => {
                    setShowConfirmDialog(false);
                    handleSubmit(e);
                  }}
                  disabled={isSubmitting}
                  className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {isSubmitting ? 'Submitting...' : 'Yes, Submit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
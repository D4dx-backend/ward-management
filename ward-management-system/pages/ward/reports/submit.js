import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import FormRenderer from '../../../components/FormRenderer';

export default function SubmitWardReport() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeForms, setActiveForms] = useState([]);
  const [userWards, setUserWards] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [selectedWard, setSelectedWard] = useState('');
  const [formData, setFormData] = useState({});
  const [submittedResponse, setSubmittedResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [previewClicked, setPreviewClicked] = useState(false);

  const isFormEditable = (form) => {
    if (!form) return false;
    const now = new Date();
    const closeDate = new Date(form.closeDateTime);
    return now < closeDate && form.allowEditAfterSubmission;
  };

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
      
      // Get existing responses to check submission status
      const responsesResponse = await axios.get('/api/responses', {
        params: {
          formType: 'wardReport'
        }
      });
      
      // RESTRICTION: Only allow one form submission per ward admin
      // Check if ward admin has already submitted any form
      const hasSubmittedAnyForm = responsesResponse.data.some(response => 
        response.respondent === session.user.id
      );
      
      // If ward admin has already submitted a form, show only that form for viewing
      if (hasSubmittedAnyForm) {
        const submittedForm = responsesResponse.data.find(response => 
          response.respondent === session.user.id
        );
        
        const originalForm = formsResponse.data.find(form => 
          form._id === submittedForm.formTemplate
        );
        
        if (originalForm) {
          setActiveForms([{ ...originalForm, isSubmitted: true, submittedResponse: submittedForm }]);
        } else {
          setActiveForms([]);
        }
      } else {
        // If no form submitted yet, show only the first available form
        const availableForms = formsResponse.data.slice(0, 1); // Only first form
        setActiveForms(availableForms.map(form => ({ ...form, isSubmitted: false })));
      }
      setUserWards(wardsResponse.data);
      
      // Auto-select ward for ward admin
      if (wardsResponse.data.length > 0) {
        setSelectedWard(wardsResponse.data[0]._id);
      }
      
      setError('');
    } catch (error) {
      setError('Failed to fetch data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSelect = async (formId) => {
    const form = activeForms.find(f => f._id === formId);
    setSelectedForm(form);
    setFormData({});
    setSubmittedResponse(null);
    
    // Check if user has already submitted this form for any of their wards
    try {
      const response = await axios.get('/api/responses', {
        params: {
          formType: 'wardReport',
          weekNumber: form.weekNumber,
          year: form.year
        }
      });
      
      // Check if current user has already submitted this specific form
      const existingSubmission = response.data.find(r => 
        r.formTemplate === formId && 
        r.respondent === session.user.id
      );
      
      if (existingSubmission) {
        setSubmittedResponse(existingSubmission);
        setSelectedWard(existingSubmission.ward || '');
        
        // Pre-populate form with submitted data
        const submittedData = {};
        if (existingSubmission.responses) {
          // Convert submitted responses back to form field format
          form.fields.forEach((field, fieldIndex) => {
            const fieldKey = `field_${fieldIndex}`;
            if (existingSubmission.responses[field.label]) {
              submittedData[fieldKey] = existingSubmission.responses[field.label];
            }
            
            // Handle sub-questions
            if (field.subQuestions && field.subQuestions.length > 0) {
              field.subQuestions.forEach((subQuestion, subIndex) => {
                const subKey = `field_${fieldIndex}_sub_${subIndex}`;
                const submittedKey = `${field.label} - ${subQuestion.label}`;
                if (existingSubmission.responses[submittedKey]) {
                  submittedData[subKey] = existingSubmission.responses[submittedKey];
                }
              });
            }
          });
        }
        setFormData(submittedData);
      }
    } catch (error) {
      console.error('Error checking existing submissions:', error);
    }
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
          (field.type === 'multiselect' && Array.isArray(fieldValue) && fieldValue.includes(field.showSubQuestionsWhen)) ||
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
      setPreviewClicked(true);
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
          field.subQuestions.forEach((subQuestion, subIndex) => {
            const subKey = `field_${fieldIndex}_sub_${subIndex}`;
            const subValue = formData[subKey];
            
            if (subValue !== undefined) {
              // Use a combined key for sub-questions
              apiResponses[`${field.label}_${subQuestion.label}`] = subValue;
            }
          });
        }
      });
      
      // Submit response
      await axios.post('/api/responses', {
        formTemplateId: selectedForm._id,
        responses: apiResponses,
        wardId: selectedWard,
      });
      
      setSuccess('Ward report submitted successfully');
      
      // Update the current form's submission status immediately
      setActiveForms(prevForms => 
        prevForms.map(form => 
          form._id === selectedForm._id 
            ? { ...form, isSubmitted: true }
            : form
        )
      );
      
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
    <Layout>
      <Head>
        <title>Submit Ward Report - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Submit Ward Report</h1>
            <p className="mt-1 text-sm text-gray-600">Submit your weekly ward progress report</p>
          </div>
          <div className="flex space-x-3">
            <Link href="/">
              <Button variant="outline">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
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

        {userWards.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              <p className="mt-2 text-sm">You are not assigned to any wards. Please contact your coordinator.</p>
            </div>
          </Card>
        ) : activeForms.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-sm">No active ward report forms available for submission</p>
            </div>
          </Card>
        ) : !selectedForm ? (
          <Card>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Select a Report Form</h2>
              <p className="text-sm text-gray-600 mt-1">Choose the form you want to submit</p>
            </div>
            <div className="p-6 space-y-4">
              {activeForms.map((form) => (
                <div
                  key={form._id}
                  className={`border rounded-lg p-4 transition-colors ${
                    form.isSubmitted 
                      ? 'border-green-200 bg-green-50 cursor-default' 
                      : 'border-gray-200 hover:bg-gray-50 hover:border-blue-300 cursor-pointer'
                  }`}
                  onClick={() => !form.isSubmitted && handleFormSelect(form._id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className={`font-medium ${form.isSubmitted ? 'text-green-800' : 'text-gray-900'}`}>
                          {form.title}
                        </h3>
                        {form.isSubmitted && (
                          <div className="ml-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className={`text-sm ${form.isSubmitted ? 'text-green-600' : 'text-gray-500'}`}>
                        Week {form.weekNumber}, {form.year}
                        {form.isSubmitted && ' - Submitted'}
                      </p>
                      {form.description && (
                        <p className={`mt-2 text-sm ${form.isSubmitted ? 'text-green-700' : 'text-gray-700'}`}>
                          {form.description}
                        </p>
                      )}
                    </div>
                    {!form.isSubmitted && (
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                    {form.isSubmitted && (
                      <span className="text-sm text-green-600 font-medium">View Only</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card>
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedForm.title}</h2>
                  <p className="text-sm text-gray-600">Week {selectedForm.weekNumber}, {selectedForm.year}</p>
                  {submittedResponse && (
                    <div className="mt-2 flex items-center">
                      <svg className="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-green-600 font-medium">
                        Report submitted on {new Date(submittedResponse.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSelectedForm(null)}
                >
                  Change Form
                </Button>
              </div>
              
              {selectedForm.description && (
                <p className="mt-4 text-gray-700">{selectedForm.description}</p>
              )}
              
              {submittedResponse && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">Ward Report Already Submitted</h3>
                      <p className="text-sm text-green-700 mt-1">
                        You have already submitted this ward report. The form below shows your submitted responses and is read-only.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 space-y-6">
              {userWards.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-blue-800">Ward Information</h4>
                      <p className="text-sm text-blue-700">
                        Submitting report for: <strong>{userWards[0]?.name} ({userWards[0]?.district})</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {!showPreview ? (
                <>
                  <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900">{selectedForm.title}</h3>
                    <button
                      type="button"
                      onClick={() => router.push('/')}
                      className="text-gray-400 hover:text-gray-600"
                      title="Close Form"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <FormRenderer
                    form={selectedForm}
                    formData={formData}
                    setFormData={setFormData}
                    errors={validationErrors}
                  />
                  
                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/')}
                    >
                      {submittedResponse ? 'Back to Dashboard' : 'Cancel'}
                    </Button>
                    {!submittedResponse && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setFormData({});
                            setError('');
                            setSuccess('');
                            setValidationErrors({});
                          }}
                        >
                          Clear Form
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowPreview(true);
                            setPreviewClicked(true);
                          }}
                        >
                          Preview Report
                        </Button>
                        {previewClicked && (
                          <Button
                            type="submit"
                            disabled={isSubmitting}
                            onClick={handleSubmit}
                          >
                            {isSubmitting ? (
                              <div className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Submitting...
                              </div>
                            ) : (
                              'Submit Report'
                            )}
                          </Button>
                        )}
                      </>
                    )}
                    {submittedResponse && (
                      <Button
                        variant="outline"
                        disabled
                        className="opacity-50 cursor-not-allowed"
                      >
                        ✓ Already Submitted
                      </Button>
                    )}
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
                                  (field.type === 'multiselect' && Array.isArray(fieldValue) && fieldValue.includes(field.showSubQuestionsWhen)) ||
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
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPreview(false)}
                    >
                      Back to Edit
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowConfirmDialog(true)}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Report'}
                    </Button>
                  </div>
                </div>
              )}   
            </div>
          </Card>
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
    </Layout>
  );
}
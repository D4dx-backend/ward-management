import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import FormRenderer from '../../../components/FormRenderer';

export default function SubmitReport() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeForms, setActiveForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [formData, setFormData] = useState({});
  const [submittedResponse, setSubmittedResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Check if user is authenticated and is coordinator
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchActiveForms();
    }
  }, [status, session, router]);

  const fetchActiveForms = async () => {
    try {
      setIsLoading(true);
      
      // Get active coordinator report forms that are currently available
      const formsResponse = await axios.get('/api/forms', {
        params: {
          formType: 'coordinatorReport',
          isActive: true,
          availableOnly: true,
        }
      });
      
      // Get existing responses to check submission status
      const responsesResponse = await axios.get('/api/responses', {
        params: {
          formType: 'coordinatorReport'
        }
      });
      
      // Mark forms as submitted if user has already submitted them
      const formsWithStatus = formsResponse.data.map(form => {
        const hasSubmitted = responsesResponse.data.some(response => 
          response.formTemplate === form._id && 
          response.respondent === session.user.id
        );
        return { ...form, isSubmitted: hasSubmitted };
      });
      
      setActiveForms(formsWithStatus);
      setError('');
    } catch (error) {
      setError('Failed to fetch active forms');
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
    
    // Check if user has already submitted this form
    try {
      const response = await axios.get('/api/responses', {
        params: {
          formType: 'coordinatorReport',
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



  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Validate required fields including sub-questions
      const missingFields = [];
      
      selectedForm.fields.forEach((field, fieldIndex) => {
        const fieldKey = `field_${fieldIndex}`;
        const fieldValue = formData[fieldKey];
        
        if (field.required) {
          // For checkbox fields, check if the value exists (can be true or false)
          if (field.type === 'checkbox') {
            if (fieldValue === undefined || fieldValue === null) {
              throw new Error(`Field "${field.label}" is required`);
            }
          } else {
            // For other fields, check if value exists and is not empty
            if (!fieldValue && fieldValue !== 0 && fieldValue !== false) {
              throw new Error(`Field "${field.label}" is required`);
            }
          }
        }

        // Check sub-questions if they should be visible
        if (field.subQuestions && field.subQuestions.length > 0) {
          const shouldShowSubQuestions = !field.showSubQuestionsWhen || 
            (field.type === 'yesno' && formData[fieldKey] === field.showSubQuestionsWhen) ||
            (field.type === 'select' && formData[fieldKey] === field.showSubQuestionsWhen);

          if (shouldShowSubQuestions) {
            field.subQuestions.forEach((subQuestion, subIndex) => {
              const subKey = `field_${fieldIndex}_sub_${subIndex}`;
              const subValue = formData[subKey];
              
              if (subQuestion.required) {
                // For checkbox sub-questions, check if the value exists
                if (subQuestion.type === 'checkbox') {
                  if (subValue === undefined || subValue === null) {
                    throw new Error(`Sub-question "${subQuestion.label}" is required`);
                  }
                } else {
                  // For other sub-question types
                  if (!subValue && subValue !== 0 && subValue !== false) {
                    throw new Error(`Sub-question "${subQuestion.label}" is required`);
                  }
                }
              }
            });
          }
        }
      });

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Convert form data from field indexes to field labels for API
      const responseData = {};
      selectedForm.fields.forEach((field, fieldIndex) => {
        const fieldKey = `field_${fieldIndex}`;
        if (formData[fieldKey] !== undefined && formData[fieldKey] !== '') {
          responseData[field.label] = formData[fieldKey];
        }

        // Handle sub-questions
        if (field.subQuestions && field.subQuestions.length > 0) {
          field.subQuestions.forEach((subQuestion, subIndex) => {
            const subKey = `field_${fieldIndex}_sub_${subIndex}`;
            if (formData[subKey] !== undefined && formData[subKey] !== '') {
              responseData[`${field.label} - ${subQuestion.label}`] = formData[subKey];
            }
          });
        }
      });

      console.log('Submitting response data:', responseData);

      // Submit response
      await axios.post('/api/responses', {
        formTemplateId: selectedForm._id,
        responses: responseData,
      });

      setSuccess('Report submitted successfully');
      
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
      
      // Refresh the forms list to update submission status
      await fetchActiveForms();
    } catch (error) {
      console.error('Submit error:', error);
      setError(error.response?.data?.message || error.message);
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
        <title>Submit Weekly Report - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Submit Weekly Report</h1>
          <p className="mt-1 text-sm text-gray-600">Submit your coordinator weekly report</p>
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

        {activeForms.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-sm">No active report forms available for submission</p>
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
                      <h3 className="text-sm font-medium text-green-800">Report Already Submitted</h3>
                      <p className="text-sm text-green-700 mt-1">
                        You have already submitted this weekly report. The form below shows your submitted responses and is read-only.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 space-y-6">
              <FormRenderer 
                form={selectedForm}
                formData={formData}
                setFormData={submittedResponse ? () => {} : setFormData}
                readOnly={!!submittedResponse}
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
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
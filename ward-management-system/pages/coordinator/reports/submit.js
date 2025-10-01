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
import WardDataCollector from '../../../components/WardDataCollector';
import { useApiData } from '../../../hooks/useApiData';

export default function SubmitReport() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeForms, setActiveForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [formData, setFormData] = useState({});
  const [wardData, setWardData] = useState({});
  const [recurringData, setRecurringData] = useState({});
  const [recurringQuestions, setRecurringQuestions] = useState([]);
  const [submittedResponse, setSubmittedResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewClicked, setPreviewClicked] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);

  const isFormEditable = (form) => {
    if (!form) return false;
    const now = new Date();
    const closeDate = new Date(form.closeDateTime);
    return now < closeDate && form.allowEditAfterSubmission;
  };

  useEffect(() => {
    // Check if user is authenticated and is coordinator
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchActiveForms();
      fetchRecurringQuestions();
    }
  }, [status, session, router]);

  // Handle automatic form selection from query parameter
  useEffect(() => {
    if (router.query.formId && activeForms.length > 0 && !selectedForm) {
      const formToSelect = activeForms.find(f => f._id === router.query.formId);
      if (formToSelect) {
        handleFormSelect(router.query.formId);
      }
    }
  }, [router.query.formId, activeForms, selectedForm]);

  const fetchActiveForms = async () => {
    try {
      setIsLoading(true);
      
      // Get published coordinator report forms that are currently available
      const formsResponse = await axios.get('/api/forms', {
        params: {
          formType: 'coordinatorReport',
          availableOnly: true,
        }
      });
      
      // Get existing responses to check submission status
      const responsesResponse = await axios.get('/api/responses', {
        params: {
          formType: 'coordinatorReport'
        }
      });
      
      // Show all available forms with their submission status
      const formsWithStatus = formsResponse.data.map(form => {
        const submittedResponse = responsesResponse.data.find(response => 
          response.respondent === session.user.id && response.formTemplate === form._id
        );
        
        return {
          ...form,
          isSubmitted: !!submittedResponse,
          submittedResponse: submittedResponse || null
        };
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

  const fetchRecurringQuestions = async () => {
    try {
      const response = await axios.get('/api/recurring-questions', {
        params: {
          formType: 'coordinatorReport',
          isActive: true
        }
      });
      setRecurringQuestions(response.data);
      console.log('Fetched recurring questions:', response.data);
    } catch (error) {
      console.error('Error fetching recurring questions:', error);
      setRecurringQuestions([]);
    }
  };

  const handleFormSelect = async (formId) => {
    const form = activeForms.find(f => f._id === formId);

    setSelectedForm(form);
    setFormData({});
    setWardData({});
    setRecurringData({});
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
                const submittedKey = `${field.label}_${subQuestion.label}`;
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
    
    // Prevent double submission
    const now = Date.now();
    if (now - lastSubmitTime < 2000) { // 2 second debounce
      return;
    }
    setLastSubmitTime(now);
    
    // Prevent submission if form is not ready
    if (!selectedForm || !selectedForm.fields) {
      setError('Form is not ready. Please try again.');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // VALIDATION DISABLED - All frontend validation has been removed
      console.log('Frontend - Validation disabled, proceeding with submission');
      console.log('Frontend - Form data:', formData);

      // Convert form data from field indexes to field labels for API
      const responseData = {};
      selectedForm.fields.forEach((field, fieldIndex) => {
        const fieldKey = `field_${fieldIndex}`;
        let fieldValue = formData[fieldKey];
        
        // Ensure all fields are included, even if undefined
        if (fieldValue === undefined) {
          fieldValue = field.type === 'checkbox' ? false : '';
        }
        
        responseData[field.label] = fieldValue;
        
        console.log(`Converting field ${fieldIndex}: "${field.label}" = "${fieldValue}" (type: ${field.type})`);

        // Handle sub-questions
        if (field.subQuestions && field.subQuestions.length > 0) {
          field.subQuestions.forEach((subQuestion, subIndex) => {
            const subKey = `field_${fieldIndex}_sub_${subIndex}`;
            let subValue = formData[subKey];
            
            // Ensure all sub-questions are included, even if undefined
            if (subValue === undefined) {
              subValue = subQuestion.type === 'checkbox' ? false : '';
            }
            
            responseData[`${field.label}_${subQuestion.label}`] = subValue;
          });
        }
      });

      // Add ward-specific questions to the main responses object
      if (wardData && Object.keys(wardData).length > 0) {
        console.log('Adding ward-specific questions to responses:', wardData);
        
        // Process ward data and add to responses
        Object.keys(wardData).forEach(wardId => {
          const wardResponses = wardData[wardId];
          Object.keys(wardResponses).forEach(questionId => {
            const value = wardResponses[questionId];
            if (value !== undefined && value !== null && value !== '') {
              // Create a key that includes the ward ID for ward-specific questions
              const responseKey = `${questionId}_ward_${wardId}`;
              responseData[responseKey] = value;
              console.log(`Added ward-specific response: ${responseKey} = ${value}`);
            }
          });
        });
      }

      // Add recurring questions that are ward-specific
      if (recurringData && Object.keys(recurringData).length > 0) {
        console.log('Processing recurring questions for ward-specific data:', recurringData);
        
        Object.keys(recurringData).forEach(wardId => {
          const wardRecurringResponses = recurringData[wardId];
          Object.keys(wardRecurringResponses).forEach(questionId => {
            const value = wardRecurringResponses[questionId];
            if (value !== undefined && value !== null && value !== '') {
              const responseKey = `recurring_${questionId}_ward_${wardId}`;
              responseData[responseKey] = value;
              console.log(`Added recurring ward-specific response: ${responseKey} = ${value}`);
            }
          });
        });
      }

      console.log('DEBUG - Final response data being sent to API:', responseData);
      console.log('DEBUG - Ward data:', wardData);
      console.log('DEBUG - Form fields and their expected labels:', selectedForm.fields.map(f => f.label));

      // Submit response
      const submitResponse = await axios.post('/api/responses', {
        formTemplateId: selectedForm._id,
        responses: responseData,
        wardData: wardData, // Include ward data for coordinator reports
      });
      
      console.log('Submit response:', submitResponse.data);

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
      setWardData({});
      setRecurringData({});
      setSelectedForm(null);
      
      // Refresh the forms list to update submission status
      await fetchActiveForms();
    } catch (error) {
      console.error('Submit error:', error);
      
      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      // If it's a validation error, provide more context
      if (errorMessage.includes('is required')) {
        errorMessage += '\n\nPlease check that all required fields (marked with *) are filled out completely.';
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };



  if (isLoading) {
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
        <title>Submit Weekly Report - Ward Management System</title>
      </Head>

      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">Submit Weekly Report</h1>
            <p className="mt-1 text-sm text-gray-600 break-words">Submit your coordinator weekly report</p>
          </div>
          <div className="flex space-x-3">
            <Link href="/">
              <Button variant="outline" className="w-full sm:w-auto">
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
                <div className="mt-2">
                  <Link href="/coordinator/reports">
                    <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50">
                      View My Reports
                    </Button>
                  </Link>
                </div>
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
          <>
            {/* Summary Statistics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-6">
              <Card>
                <div className="p-3 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-2 sm:ml-4 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-600">Total Forms</p>
                      <p className="text-lg sm:text-2xl font-bold text-gray-900">{activeForms.length}</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="p-3 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 rounded-lg flex items-center justify-center">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-2 sm:ml-4 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-600">Submitted</p>
                      <p className="text-lg sm:text-2xl font-bold text-gray-900">
                        {activeForms.filter(f => f.isSubmitted).length}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="p-3 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-2 sm:ml-4 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-600">Pending</p>
                      <p className="text-lg sm:text-2xl font-bold text-gray-900">
                        {activeForms.filter(f => !f.isSubmitted).length}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="p-3 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-500 rounded-lg flex items-center justify-center">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-2 sm:ml-4 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-600">Overdue</p>
                      <p className="text-lg sm:text-2xl font-bold text-gray-900">
                        {activeForms.filter(f => !f.isSubmitted && new Date() > new Date(f.closeDateTime)).length}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          <Card>
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 break-words">Available Report Forms</h2>
              <p className="text-sm text-gray-600 mt-1 break-words">Select a form to submit or view your submitted reports</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Form Details
                    </th>
                    <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submission Date
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activeForms.map((form) => {
                    const dueDate = new Date(form.closeDateTime);
                    const isOverdue = !form.isSubmitted && new Date() > dueDate;
                    const daysUntilDue = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <tr key={form._id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4">
                          <div className="flex items-start sm:items-center">
                            <div className="flex-shrink-0">
                              {form.isSubmitted ? (
                                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-full flex items-center justify-center">
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              ) : (
                                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="ml-2 sm:ml-4 min-w-0">
                              <div className="text-sm font-medium text-gray-900 break-words">{form.title}</div>
                              {form.description && (
                                <div className="text-xs sm:text-sm text-gray-500 mt-1 break-words">{form.description}</div>
                              )}
                              <div className="sm:hidden text-xs text-gray-500 mt-1">
                                Week {form.weekNumber}, {form.year}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">Week {form.weekNumber}</div>
                          <div className="text-sm text-gray-500">{form.year}</div>
                        </td>
                        
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          {form.isSubmitted ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="hidden sm:inline">Submitted</span>
                              <span className="sm:hidden">Done</span>
                            </span>
                          ) : isOverdue ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              <span className="hidden sm:inline">Overdue</span>
                              <span className="sm:hidden">Late</span>
                            </span>
                          ) : daysUntilDue <= 2 ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="hidden sm:inline">Due Soon</span>
                              <span className="sm:hidden">Soon</span>
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="hidden sm:inline">Pending</span>
                              <span className="sm:hidden">Open</span>
                            </span>
                          )}
                        </td>
                        
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {dueDate.toLocaleDateString()}
                          </div>
                          <div className={`text-sm ${isOverdue ? 'text-red-600' : daysUntilDue <= 2 ? 'text-yellow-600' : 'text-gray-500'}`}>
                            {isOverdue 
                              ? `${Math.abs(daysUntilDue)} days overdue`
                              : daysUntilDue === 0 
                              ? 'Due today'
                              : daysUntilDue === 1
                              ? 'Due tomorrow'
                              : `${daysUntilDue} days left`
                            }
                          </div>
                        </td>
                        
                        <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                          {form.isSubmitted ? (
                            <div>
                              <div className="text-sm text-gray-900">
                                {form.submittedResponse?.submittedAt 
                                  ? new Date(form.submittedResponse.submittedAt).toLocaleDateString()
                                  : 'Submitted'
                                }
                              </div>
                              <div className="text-sm text-gray-500">
                                {form.submittedResponse?.submittedAt 
                                  ? new Date(form.submittedResponse.submittedAt).toLocaleTimeString()
                                  : ''
                                }
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Not submitted</span>
                          )}
                        </td>
                        
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {form.isSubmitted ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFormSelect(form._id)}
                              className="text-green-600 border-green-300 hover:bg-green-50 w-full sm:w-auto"
                            >
                              <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span className="hidden sm:inline">View</span>
                              <span className="sm:hidden">View</span>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleFormSelect(form._id)}
                              className={`w-full sm:w-auto ${isOverdue ? 'bg-red-600 hover:bg-red-700' : daysUntilDue <= 2 ? 'bg-yellow-600 hover:bg-yellow-700' : ''}`}
                            >
                              <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span className="hidden sm:inline">{isOverdue ? 'Submit Now' : 'Fill Form'}</span>
                              <span className="sm:hidden">{isOverdue ? 'Submit' : 'Fill'}</span>
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {activeForms.length === 0 && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">No report forms available</p>
                <div className="mt-4">
                  <Link href="/coordinator/reports">
                    <Button variant="outline" size="sm">
                      View My Submitted Reports
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </Card>
          </>
        ) : (
          <Card>
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 break-words">{selectedForm.title}</h2>
                  <p className="text-sm text-gray-600 break-words">Week {selectedForm.weekNumber}, {selectedForm.year}</p>
                  {submittedResponse && (
                    <div className="mt-2 flex items-center">
                      <svg className="w-4 h-4 text-green-500 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-green-600 font-medium break-words">
                        Report submitted on {new Date(submittedResponse.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSelectedForm(null)}
                  className="w-full sm:w-auto"
                >
                  Change Form
                </Button>
              </div>
              
              {selectedForm.description && (
                <p className="mt-4 text-gray-700 break-words">{selectedForm.description}</p>
              )}
              
              {submittedResponse && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3 min-w-0">
                      <h3 className="text-sm font-medium text-green-800 break-words">Report Already Submitted</h3>
                      <p className="text-sm text-green-700 mt-1 break-words">
                        You have already submitted this weekly report. The form below shows your submitted responses and is read-only.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 break-words">{selectedForm.title}</h3>
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                  title="Close Form"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <FormRenderer 
                form={selectedForm}
                formData={formData}
                setFormData={submittedResponse ? () => {} : setFormData}
                readOnly={!!submittedResponse}
              />
              
              {/* Ward Data Collector for ward-applicable questions */}
              {selectedForm && (
                (selectedForm.fields && selectedForm.fields.some(field => field.applicableToWards)) ||
                (recurringQuestions && recurringQuestions.some(q => q.applicableToWards))
              ) && (
                <div className="mt-8">
                  <WardDataCollector
                    coordinatorId={session?.user?.id}
                    questions={selectedForm.fields.filter(field => field.applicableToWards).map((field, index) => ({
                      id: `field_${selectedForm.fields.indexOf(field)}`,
                      ...field
                    }))}
                    recurringQuestions={recurringQuestions.filter(q => q.applicableToWards)}
                    formType="coordinatorReport"
                    weekNumber={selectedForm.weekNumber}
                    year={selectedForm.year}
                    onDataChange={setWardData}
                    onRecurringDataChange={setRecurringData}
                    disabled={!!submittedResponse}
                  />
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4 sm:pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/')}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  {submittedResponse ? 'Back to Dashboard' : 'Cancel'}
                </Button>
                {!submittedResponse && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowPreview(true);
                        setPreviewClicked(true);
                      }}
                      className="w-full sm:w-auto order-1 sm:order-2"
                    >
                      Preview Report
                    </Button>
                    {previewClicked && (
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        onClick={handleSubmit}
                        className="w-full sm:w-auto order-3"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="hidden sm:inline">Submitting...</span>
                            <span className="sm:hidden">Submitting...</span>
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
                    className="opacity-50 cursor-not-allowed w-full sm:w-auto order-3"
                  >
                    ✓ Already Submitted
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Information Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-sm text-blue-700 break-words">
                <strong>Note:</strong> After submitting your reports, you can view them in <strong>Reports → My Reports</strong>. 
                To view ward reports from your district, go to <strong>Reports → Ward Reports</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
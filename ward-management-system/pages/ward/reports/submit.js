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
  const [submittedResponse, setSubmittedResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      
      // Mark forms as submitted if user has already submitted them
      const formsWithStatus = formsResponse.data.map(form => {
        const hasSubmitted = responsesResponse.data.some(response => 
          response.formTemplate === form._id && 
          response.respondent === session.user.id
        );
        return { ...form, isSubmitted: hasSubmitted };
      });
      
      setActiveForms(formsWithStatus);
      setUserWards(wardsResponse.data);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Validate ward selection
      if (!selectedWard) {
        throw new Error('Please select a ward');
      }

      // Validate required fields (FormRenderer uses field_0, field_1, etc.)
      const missingFields = [];
      
      selectedForm.fields.forEach((field, fieldIndex) => {
        const fieldKey = `field_${fieldIndex}`;
        if (field.required && (!formData[fieldKey] && formData[fieldKey] !== 0 && formData[fieldKey] !== '0')) {
          missingFields.push(field.label);
        }

        // Check sub-questions if they exist
        if (field.subQuestions && field.subQuestions.length > 0) {
          const shouldShowSubQuestions = !field.showSubQuestionsWhen || 
            (field.type === 'yesno' && formData[fieldKey] === field.showSubQuestionsWhen) ||
            (field.type === 'select' && formData[fieldKey] === field.showSubQuestionsWhen);

          if (shouldShowSubQuestions) {
            field.subQuestions.forEach((subQuestion, subIndex) => {
              const subKey = `field_${fieldIndex}_sub_${subIndex}`;
              if (subQuestion.required && (!formData[subKey] && formData[subKey] !== 0 && formData[subKey] !== '0')) {
                missingFields.push(`${field.label} - ${subQuestion.label}`);
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

      console.log('Submitting ward report data:', responseData);

      // Submit response
      await axios.post('/api/responses', {
        formTemplateId: selectedForm._id,
        responses: responseData,
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
      
      // Refresh the forms list to update submission status
      await fetchData();
    } catch (error) {
      console.error('Ward submit error:', error);
      setError(error.response?.data?.message || error.message);
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
                  className={`border rounded-lg p-4 transition-colors ${
                    form.isSubmitted 
                      ? 'border-green-200 bg-green-50 cursor-default' 
                      : 'border-gray-200 hover:bg-gray-50 cursor-pointer'
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
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-medium">{selectedForm.title}</h2>
                <p className="text-sm text-gray-500">Week {selectedForm.weekNumber}, {selectedForm.year}</p>
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
            
            {submittedResponse && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
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
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Ward <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedWard}
                  onChange={submittedResponse ? () => {} : (e) => handleWardSelect(e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${submittedResponse ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  required
                  disabled={!!submittedResponse}
                >
                  <option value="">Select a ward</option>
                  {userWards.map((ward) => (
                    <option key={ward._id} value={ward._id}>
                      {ward.name} ({ward.district})
                    </option>
                  ))}
                </select>
              </div>
              
              <FormRenderer 
                form={selectedForm}
                formData={formData}
                setFormData={submittedResponse ? () => {} : setFormData}
                readOnly={!!submittedResponse}
              />
              
              <div className="flex justify-between pt-6 border-t border-gray-200">
                <Link href="/" className="bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors">
                  {submittedResponse ? 'Back to Dashboard' : 'Cancel'}
                </Link>
                {!submittedResponse && (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex items-center"
                    onClick={handleSubmit}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      'Submit Report'
                    )}
                  </button>
                )}
                {submittedResponse && (
                  <button
                    disabled
                    className="bg-gray-300 text-gray-500 py-2 px-4 rounded-lg cursor-not-allowed flex items-center"
                  >
                    ✓ Already Submitted
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
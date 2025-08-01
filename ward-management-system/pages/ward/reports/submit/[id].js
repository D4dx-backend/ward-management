import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../../../components/Layout';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';
import FormRenderer from '../../../../components/FormRenderer';
import { motion, AnimatePresence } from 'framer-motion';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../../../components/Shimmer';

export default function SubmitSpecificWardReport() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id: formId } = router.query;
  
  const [form, setForm] = useState(null);
  const [userWards, setUserWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState('');
  const [formData, setFormData] = useState({});
  const [submittedResponse, setSubmittedResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

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
    } else if (status === 'authenticated' && formId) {
      fetchData();
    }
  }, [status, session, router, formId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Get specific form
      const formResponse = await axios.get(`/api/forms/${formId}`);
      const formData = formResponse.data;

      // Check if form is active and available
      if (!formData.isActive) {
        setError('This form is no longer active');
        return;
      }

      // Check if form is still open for submissions
      const now = new Date();
      const closeDate = new Date(formData.closeDateTime);
      if (now > closeDate) {
        setError('This form has closed for submissions');
        return;
      }

      // Get user's wards
      const wardsResponse = await axios.get('/api/wards');

      // Get existing response to check submission status
      const responsesResponse = await axios.get('/api/responses', {
        params: {
          formType: 'wardReport',
          formTemplateId: formId
        }
      });

      // Check if user has already submitted this form
      const existingResponse = responsesResponse.data.find(response =>
        response.formTemplate === formId && response.respondent === session.user.id
      );

      if (existingResponse) {
        setSubmittedResponse(existingResponse);
        setSelectedWard(existingResponse.ward || '');

        // Pre-populate form with submitted data
        const submittedData = {};
        if (existingResponse.responses) {
          formData.fields.forEach((field, fieldIndex) => {
            const fieldKey = `field_${fieldIndex}`;
            if (existingResponse.responses[field.label]) {
              submittedData[fieldKey] = existingResponse.responses[field.label];
            }

            // Handle sub-questions
            if (field.subQuestions && field.subQuestions.length > 0) {
              field.subQuestions.forEach((subQuestion, subIndex) => {
                const subKey = `field_${fieldIndex}_sub_${subIndex}`;
                const submittedKey = `${field.label}_${subQuestion.label}`;
                if (existingResponse.responses[submittedKey]) {
                  submittedData[subKey] = existingResponse.responses[submittedKey];
                }
              });
            }
          });
        }
        setFormData(submittedData);
      }

      setForm(formData);
      setUserWards(wardsResponse.data);

      // Auto-select ward for ward admin
      if (wardsResponse.data.length > 0 && !existingResponse) {
        setSelectedWard(wardsResponse.data[0]._id);
      }

      setError('');
    } catch (error) {
      if (error.response?.status === 404) {
        setError('Form not found');
      } else {
        setError('Failed to fetch form data');
      }
      console.error(error);
    } finally {
      setIsLoading(false);
    }
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
    for (let fieldIndex = 0; fieldIndex < form.fields.length; fieldIndex++) {
      const field = form.fields[fieldIndex];
      if (field.required) {
        const fieldKey = `field_${fieldIndex}`;
        const fieldValue = formData[fieldKey];

        if (field.type === 'checkbox') {
          if (fieldValue === undefined || fieldValue === null) {
            errors[fieldKey] = `${field.label} is required`;
            isValid = false;
          }
        } else {
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

      form.fields.forEach((field, fieldIndex) => {
        const fieldKey = `field_${fieldIndex}`;
        const fieldValue = formData[fieldKey];

        if (fieldValue !== undefined) {
          apiResponses[field.label] = fieldValue;
        }

        // Handle sub-questions
        if (field.subQuestions && field.subQuestions.length > 0) {
          field.subQuestions.forEach((subQuestion, subIndex) => {
            const subKey = `field_${fieldIndex}_sub_${subIndex}`;
            const subValue = formData[subKey];

            if (subValue !== undefined) {
              apiResponses[`${field.label}_${subQuestion.label}`] = subValue;
            }
          });
        }
      });

      // Submit response
      await axios.post('/api/responses', {
        formTemplateId: form._id,
        responses: apiResponses,
        wardId: selectedWard,
      });

      setSuccess('Ward report submitted successfully');
      
      // Redirect to dashboard after successful submission
      setTimeout(() => {
        router.push('/');
      }, 2000);

    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred while submitting the report';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  if (error && !form) {
    return (
      <Layout>
        <Head>
          <title>Form Not Found - Ward Management System</title>
        </Head>
        <div className="space-y-6">
          <Card className="text-center py-12">
            <div className="text-red-500">
              <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="mt-2 text-sm font-medium">{error}</p>
              <div className="mt-4">
                <Link href="/ward/reports/submit">
                  <Button variant="outline">
                    Back to Forms
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>{form?.title || 'Submit Ward Report'} - Ward Management System</title>
      </Head>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Submit Ward Report</h1>
            <p className="text-sm text-gray-600">Submit your weekly ward progress report</p>
          </div>
          <div className="flex space-x-3">
            <Link href="/ward/reports/submit">
              <Button variant="outline">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Back to Forms
              </Button>
            </Link>
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
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-2">
                <p className="text-xs">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-2">
                <p className="text-xs">{success}</p>
              </div>
            </div>
          </div>
        )}

        {form && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1 bg-blue-100 rounded">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-base font-bold text-gray-900">{form.title}</h2>
                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium">
                        Week {form.weekNumber}, {form.year}
                      </span>
                      {submittedResponse && (
                        <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-0.5 rounded">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-xs font-medium">
                            Submitted {new Date(submittedResponse.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                  {form.description && (
                    <p className="text-gray-600 text-xs">{form.description}</p>
                  )}
                  {userWards.length > 0 && (
                    <div className="flex items-center space-x-1 text-xs">
                      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-blue-700">
                        Submitting report for: <span className="font-medium">{userWards[0]?.name}</span>, {userWards[0]?.district}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {submittedResponse && (
                <div className="px-3 py-2 border-b border-gray-200">
                  <div className="bg-green-50 border border-green-200 rounded p-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 bg-green-100 rounded">
                        <svg className="h-3 w-3 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-green-800">Report Successfully Submitted</span>
                        <span className="text-green-700 text-xs ml-2">- Read-only mode</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <Card className="mt-6">
              <div className="p-6 space-y-6">
                <FormRenderer
                  form={form}
                  formData={formData}
                  setFormData={setFormData}
                  errors={validationErrors}
                  readOnly={!!submittedResponse}
                />

                {!submittedResponse && (
                  <div className="flex flex-wrap justify-end gap-4 pt-6 border-t border-gray-200">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/ward/reports/submit')}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Back to Forms
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setFormData({});
                        setError('');
                        setSuccess('');
                        setValidationErrors({});
                      }}
                      className="text-orange-600 border-orange-200 hover:bg-orange-50"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Clear Form
                    </Button>

                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Submit Report
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
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
import { motion, AnimatePresence } from 'framer-motion';


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

      // Check submission status for each form
      const formsWithStatus = formsResponse.data.map(form => {
        const existingResponse = responsesResponse.data.find(response =>
          response.formTemplate === form._id && response.respondent === session.user.id
        );

        return {
          ...form,
          isSubmitted: !!existingResponse,
          submittedResponse: existingResponse || null
        };
      });

      // Filter forms based on submission status and form settings
      const availableForms = formsWithStatus.filter(form => {
        // If form is not submitted, show it
        if (!form.isSubmitted) return true;

        // If form is submitted but allows editing and is still within time limit, show it
        if (form.isSubmitted && form.allowEditAfterSubmission && isFormEditable(form)) {
          return true;
        }

        // Otherwise, don't show submitted forms
        return false;
      });

      setActiveForms(availableForms);
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="overflow-hidden shadow-xl border-0 bg-gradient-to-br from-white to-gray-50">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Select Report Form</h2>
                    <p className="text-blue-100 mt-1">Choose the form you want to submit</p>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="grid gap-6">
                  <AnimatePresence>
                    {activeForms.map((form, index) => (
                      <motion.div
                        key={form._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${form.isSubmitted
                          ? 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 cursor-default'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-lg cursor-pointer transform hover:-translate-y-1'
                          }`}
                        onClick={() => !form.isSubmitted && handleFormSelect(form._id)}
                        whileHover={!form.isSubmitted ? { scale: 1.02 } : {}}
                        whileTap={!form.isSubmitted ? { scale: 0.98 } : {}}
                      >
                        <div className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-3">
                                <div className={`p-2 rounded-xl ${form.isSubmitted
                                  ? 'bg-emerald-100 text-emerald-600'
                                  : 'bg-blue-100 text-blue-600 group-hover:bg-blue-200'
                                  }`}>
                                  {form.isSubmitted ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  )}
                                </div>
                                <div>
                                  <h3 className={`text-lg font-semibold ${form.isSubmitted ? 'text-emerald-800' : 'text-gray-900'
                                    }`}>
                                    {form.title}
                                  </h3>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${form.isSubmitted
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-gray-100 text-gray-600'
                                      }`}>
                                      Week {form.weekNumber}, {form.year}
                                    </span>
                                    {form.isSubmitted && (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Submitted
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {form.description && (
                                <p className={`text-sm leading-relaxed ${form.isSubmitted ? 'text-emerald-700' : 'text-gray-600'
                                  }`}>
                                  {form.description}
                                </p>
                              )}
                            </div>

                            <div className="ml-4">
                              {!form.isSubmitted ? (
                                <div className="p-2 rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              ) : (
                                <div className="text-right">
                                  <span className="text-xs text-emerald-600 font-medium">View Only</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {!form.isSubmitted && (
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="overflow-hidden shadow-xl border-0 bg-gradient-to-br from-white to-gray-50">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-8 text-white">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{selectedForm.title}</h2>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                          Week {selectedForm.weekNumber}, {selectedForm.year}
                        </span>
                        {submittedResponse && (
                          <div className="flex items-center space-x-2 bg-emerald-500/20 px-3 py-1 rounded-full backdrop-blur-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm font-medium">
                              Submitted {new Date(submittedResponse.submittedAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setSelectedForm(null)}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Change Form
                  </Button>
                </div>

                {selectedForm.description && (
                  <div className="mt-6 p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                    <p className="text-indigo-100 leading-relaxed">{selectedForm.description}</p>
                  </div>
                )}
              </div>

              {submittedResponse && (
                <div className="mx-8 -mt-4 mb-6">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-2xl p-6"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="p-2 bg-emerald-100 rounded-xl">
                        <svg className="h-6 w-6 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-emerald-800">Report Successfully Submitted</h3>
                        <p className="text-emerald-700 mt-1">
                          Your ward report has been submitted and is now read-only. You can review your responses below.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </Card>

            <Card className="mt-6">
              <div className="p-8 space-y-8">
                {userWards.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-blue-800">Ward Information</h4>
                        <p className="text-blue-700 mt-1">
                          Submitting report for: <span className="font-bold">{userWards[0]?.name}</span>
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                            {userWards[0]?.district}
                          </span>
                        </p>
                      </div>
                    </div>
                  </motion.div>
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

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                      className="flex flex-wrap justify-end gap-4 pt-8 border-t-2 border-gray-100"
                    >
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push('/')}
                        className="px-6 py-3 rounded-xl border-2 hover:shadow-lg transition-all duration-200"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
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
                            className="px-6 py-3 rounded-xl border-2 hover:shadow-lg transition-all duration-200 text-orange-600 border-orange-200 hover:bg-orange-50"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Clear Form
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowPreview(true);
                              setPreviewClicked(true);
                            }}
                            className="px-6 py-3 rounded-xl border-2 hover:shadow-lg transition-all duration-200 text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Preview Report
                          </Button>

                          {previewClicked && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Button
                                type="submit"
                                disabled={isSubmitting}
                                onClick={handleSubmit}
                                className="px-8 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                              >
                                {isSubmitting ? (
                                  <div className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Submitting Report...
                                  </div>
                                ) : (
                                  <div className="flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                    Submit Report
                                  </div>
                                )}
                              </Button>
                            </motion.div>
                          )}
                        </>
                      )}

                      {submittedResponse && (
                        <Button
                          variant="outline"
                          disabled
                          className="px-6 py-3 rounded-xl border-2 opacity-50 cursor-not-allowed bg-emerald-50 border-emerald-200 text-emerald-600"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Already Submitted
                        </Button>
                      )}
                    </motion.div>
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
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${fieldValue === 'Yes' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                  {fieldValue}
                                </span>
                              ) : field.type === 'checkbox' ? (
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${fieldValue ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
                                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${subValue === 'Yes' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {subValue}
                                          </span>
                                        ) : subQuestion.type === 'checkbox' ? (
                                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${subValue ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
          </motion.div>
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
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
export default function SubmitSpecificWardReport() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id: formId } = router.query;
  
  const [form, setForm] = useState(null);
  const [userWards, setUserWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState('');
  const [formData, setFormData] = useState({});
  const [submittedResponse, setSubmittedResponse] = useState(null);
  const [clusters, setClusters] = useState([]);
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
    // Check if user is authenticated and is Ward Incharge
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
      console.log('Fetching wards for ward admin...');
      const wardsResponse = await axios.get('/api/wards');
      console.log('Wards response:', wardsResponse.data);

      // Fetch clusters for cluster-applicable questions
      try {
        const clustersResponse = await axios.get('/api/clusters');
        setClusters(clustersResponse.data || []);
        console.log('Fetched clusters:', clustersResponse.data?.length || 0);
      } catch (error) {
        console.error('Error fetching clusters:', error);
        setClusters([]);
      }

      // Get existing response to check submission status
      const responsesResponse = await axios.get('/api/responses', {
        params: {
          formType: 'wardReport',
          formTemplate: formId
        }
      });

      // Check if user has already submitted this form (considering week and year)
      const existingResponse = responsesResponse.data.find(response =>
        response.formTemplate === formId && 
        response.respondent === session.user.id &&
        response.weekNumber === formData.weekNumber &&
        response.year === formData.year
      );

      if (existingResponse) {
        setSubmittedResponse(existingResponse);
        setSelectedWard(existingResponse.ward || '');

        // Pre-populate form with submitted data
        const submittedData = {};
        if (existingResponse.responses) {
          // Helper function to populate fields
          const populateFields = (fields, fieldPrefix = '') => {
            fields.forEach((field, fieldIndex) => {
              const fieldKey = fieldPrefix ? `field_${fieldPrefix}_${fieldIndex}` : `field_${fieldIndex}`;
              const responseKey = fieldPrefix ? `${fieldPrefix}_${field.label}` : field.label;
              
              if (existingResponse.responses[responseKey]) {
                submittedData[fieldKey] = existingResponse.responses[responseKey];
              }

              // Handle sub-questions
              if (field.subQuestions && field.subQuestions.length > 0) {
                field.subQuestions.forEach((subQuestion, subIndex) => {
                  const subKey = fieldPrefix ? `field_${fieldPrefix}_${fieldIndex}_sub_${subIndex}` : `field_${fieldIndex}_sub_${subIndex}`;
                  const submittedKey = fieldPrefix ? `${fieldPrefix}_${field.label}_${subQuestion.label}` : `${field.label}_${subQuestion.label}`;
                  if (existingResponse.responses[submittedKey]) {
                    submittedData[subKey] = existingResponse.responses[submittedKey];
                  }
                });
              }
            });
          };

          // Populate regular form fields
          if (formData.fields && formData.fields.length > 0) {
            populateFields(formData.fields);
          }

          // Populate sitting ward fields - only for sitting wards
          if (formData.sittingWardFields && formData.sittingWardFields.length > 0 && wardsResponse.data[0]?.isSittingWard) {
            populateFields(formData.sittingWardFields, 'sitting');
          }
        }
        setFormData(submittedData);
      }

      setForm(formData);
      setUserWards(wardsResponse.data);

      // Auto-select ward for Ward Incharge
      if (wardsResponse.data.length > 0 && !existingResponse) {
        setSelectedWard(wardsResponse.data[0]._id);
      }

      setError('');
    } catch (error) {
      console.error('=== FORM SUBMISSION PAGE ERROR ===');
      console.error('Error details:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      if (error.response?.status === 404) {
        setError('Form not found');
      } else if (error.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (error.response?.status === 403) {
        setError('Access denied. You may not have permission to access this form.');
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Failed to fetch form data');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    let isValid = true;

    console.log('Ward form - Validating form data:', formData);
    console.log('Ward form - Form structure:', form);
    console.log('Ward form - Clusters:', clusters);

    // Helper function to check if sub-questions should be visible
    const shouldShowSubQuestions = (field, fieldValue) => {
      if (!field.showSubQuestionsWhen) return true;
      
      if (field.type === 'yesno') {
        const showWhen = field.showSubQuestionsWhen.toLowerCase();
        const currentValue = fieldValue?.toLowerCase();
        return showWhen === currentValue || field.showSubQuestionsWhen === fieldValue;
      } else if (field.type === 'select') {
        return field.showSubQuestionsWhen === fieldValue;
      } else if (field.type === 'multiselect') {
        const selectedValues = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);
        return selectedValues.includes(field.showSubQuestionsWhen);
      }
      
      return true;
    };

    // Helper function to validate a field
    const validateField = (field, fieldKey, fieldValue, fieldLabel) => {
      if (field.required) {
        if (field.type === 'checkbox') {
          if (fieldValue === undefined || fieldValue === null) {
            errors[fieldKey] = `${fieldLabel} is required`;
            isValid = false;
          }
        } else if (field.type === 'multiselect') {
          const selectedValues = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : []);
          if (selectedValues.length === 0) {
            errors[fieldKey] = `${fieldLabel} is required - please select at least one option`;
            isValid = false;
          }
        } else {
          const trimmedValue = typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue;
          if (!trimmedValue && trimmedValue !== 0 && trimmedValue !== false) {
            errors[fieldKey] = `${fieldLabel} is required`;
            isValid = false;
          }
        }
      }
    };

    // Helper function to validate sub-questions
    const validateSubQuestions = (field, fieldIndex, fieldValue, fieldPrefix = '', clusterId = null) => {
      if (field.subQuestions && field.subQuestions.length > 0) {
        const shouldShow = shouldShowSubQuestions(field, fieldValue);
        
        if (shouldShow) {
          field.subQuestions.forEach((subQuestion, subIndex) => {
            if (subQuestion.required) {
              const subKey = clusterId 
                ? `field_${fieldPrefix}${fieldIndex}_cluster_${clusterId}_sub_${subIndex}`
                : fieldPrefix 
                  ? `field_${fieldPrefix}${fieldIndex}_sub_${subIndex}`
                  : `field_${fieldIndex}_sub_${subIndex}`;
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
          });
        }
      }
    };

    // Validate regular form fields
    if (form.fields && form.fields.length > 0) {
      form.fields.forEach((field, fieldIndex) => {
        if (field.applicableToClusters) {
          // Validate cluster-applicable fields
          clusters.forEach(cluster => {
            const fieldKey = `field_${fieldIndex}_cluster_${cluster._id}`;
            const fieldValue = formData[fieldKey];
            const fieldLabel = `${field.label} for ${cluster.name}`;
            
            validateField(field, fieldKey, fieldValue, fieldLabel);
            validateSubQuestions(field, fieldIndex, fieldValue, '', cluster._id);
          });
        } else if (!field.applicableToWards) {
          // Validate regular ward-level fields (exclude ward-applicable questions)
          const fieldKey = `field_${fieldIndex}`;
          const fieldValue = formData[fieldKey];
          
          validateField(field, fieldKey, fieldValue, field.label);
          validateSubQuestions(field, fieldIndex, fieldValue);
        }
      });
    }

    // Validate sitting ward fields - only for sitting wards
    if (form.sittingWardFields && form.sittingWardFields.length > 0 && userWards[0]?.isSittingWard) {
      form.sittingWardFields.forEach((field, fieldIndex) => {
        if (field.applicableToClusters) {
          // Validate cluster-applicable sitting ward fields
          clusters.forEach(cluster => {
            const fieldKey = `field_sitting_${fieldIndex}_cluster_${cluster._id}`;
            const fieldValue = formData[fieldKey];
            const fieldLabel = `${field.label} for ${cluster.name} (Sitting Ward)`;
            
            validateField(field, fieldKey, fieldValue, fieldLabel);
            validateSubQuestions(field, fieldIndex, fieldValue, 'sitting_', cluster._id);
          });
        } else {
          // Validate regular sitting ward fields
          const fieldKey = `field_sitting_${fieldIndex}`;
          const fieldValue = formData[fieldKey];
          
          validateField(field, fieldKey, fieldValue, `${field.label} (Sitting Ward)`);
          validateSubQuestions(field, fieldIndex, fieldValue, 'sitting_');
        }
      });
    }

    console.log('Ward form - Validation errors:', errors);
    console.log('Ward form - Validation result:', isValid);
    
    setValidationErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('DEBUG - Starting form submission');
    console.log('DEBUG - Form data:', formData);
    console.log('DEBUG - Selected ward:', selectedWard);

    // Validate form before submitting
    if (!validateForm()) {
      setError('Please fill in all required fields before submitting.');
      // Scroll to the first error
      setTimeout(() => {
        const firstError = document.querySelector('.border-red-300, .text-red-600');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');
    setValidationErrors({}); // Clear validation errors on successful validation

    try {
      // Convert form data from field_index format to field.label format for API
      const apiResponses = {};

      // Helper function to process fields
      const processFields = (fields, fieldPrefix = '') => {
        fields.forEach((field, fieldIndex) => {
          if (field.applicableToClusters) {
            // Handle cluster-applicable fields
            clusters.forEach(cluster => {
              const fieldKey = fieldPrefix ? `field_${fieldPrefix}_${fieldIndex}_cluster_${cluster._id}` : `field_${fieldIndex}_cluster_${cluster._id}`;
              let fieldValue = formData[fieldKey];

              // Ensure all cluster fields are included, even if undefined
              if (fieldValue === undefined) {
                fieldValue = field.type === 'checkbox' ? false : '';
              }

              const responseKey = fieldPrefix ? `${fieldPrefix}_${field.label}_cluster_${cluster._id}` : `${field.label}_cluster_${cluster._id}`;
              apiResponses[responseKey] = fieldValue;

              // Handle sub-questions for cluster fields
              if (field.subQuestions && field.subQuestions.length > 0) {
                field.subQuestions.forEach((subQuestion, subIndex) => {
                  const subKey = fieldPrefix ? `field_${fieldPrefix}_${fieldIndex}_cluster_${cluster._id}_sub_${subIndex}` : `field_${fieldIndex}_cluster_${cluster._id}_sub_${subIndex}`;
                  let subValue = formData[subKey];

                  // Ensure all cluster sub-questions are included, even if undefined
                  if (subValue === undefined) {
                    subValue = subQuestion.type === 'checkbox' ? false : '';
                  }

                  const responseKey = fieldPrefix ? `${fieldPrefix}_${field.label}_cluster_${cluster._id}_${subQuestion.label}` : `${field.label}_cluster_${cluster._id}_${subQuestion.label}`;
                  apiResponses[responseKey] = subValue;
                });
              }
            });
          } else {
            // Handle regular fields
            const fieldKey = fieldPrefix ? `field_${fieldPrefix}_${fieldIndex}` : `field_${fieldIndex}`;
            let fieldValue = formData[fieldKey];

            // Ensure all fields are included, even if undefined
            if (fieldValue === undefined) {
              fieldValue = field.type === 'checkbox' ? false : '';
            }

            const responseKey = fieldPrefix ? `${fieldPrefix}_${field.label}` : field.label;
            apiResponses[responseKey] = fieldValue;

            // Handle sub-questions
            if (field.subQuestions && field.subQuestions.length > 0) {
              field.subQuestions.forEach((subQuestion, subIndex) => {
                const subKey = fieldPrefix ? `field_${fieldPrefix}_${fieldIndex}_sub_${subIndex}` : `field_${fieldIndex}_sub_${subIndex}`;
                let subValue = formData[subKey];

                // Ensure all sub-questions are included, even if undefined
                if (subValue === undefined) {
                  subValue = subQuestion.type === 'checkbox' ? false : '';
                }

                const responseKey = fieldPrefix ? `${fieldPrefix}_${field.label}_${subQuestion.label}` : `${field.label}_${subQuestion.label}`;
                apiResponses[responseKey] = subValue;
              });
            }
          }
        });
      };

      // Process regular form fields
      if (form.fields && form.fields.length > 0) {
        processFields(form.fields);
      }

      // Process sitting ward fields - only for sitting wards
      if (form.sittingWardFields && form.sittingWardFields.length > 0 && userWards[0]?.isSittingWard) {
        processFields(form.sittingWardFields, 'sitting');
      }

      // Submit response
      const response = await axios.post('/api/responses', {
        formTemplateId: form._id,
        responses: apiResponses,
        wardId: selectedWard,
      });

      setSuccess('Ward report submitted successfully');
      
      // Clear all relevant cache to ensure updated data is shown immediately
      try {
        const { clearCache, invalidateCache } = await import('../../../../lib/simpleCache');
        
        // Clear all dashboard-related cache
        clearCache(); // Clear all cache for immediate refresh
        
        // Set flag for dashboard to know form was submitted
        localStorage.setItem('formSubmitted', 'true');
        localStorage.setItem('lastSubmissionTime', Date.now().toString());
        
        console.log('Cache cleared after form submission');
      } catch (cacheError) {
        console.warn('Failed to clear cache:', cacheError);
      }
      
      // Redirect to dashboard with submission flag
      setTimeout(() => {
        router.push('/?submitted=true');
      }, 1500);

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
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
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
                <Link href="/ward/reports/submit" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Back to Forms
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
            <Link href="/ward/reports/submit" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Back to Forms
              </Link>
            <Link href="/" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
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
                {Object.keys(validationErrors).length > 0 && (
                  <p className="text-xs mt-1 font-medium">
                    {Object.keys(validationErrors).length} field{Object.keys(validationErrors).length > 1 ? 's' : ''} require{Object.keys(validationErrors).length === 1 ? 's' : ''} your attention
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {!error && Object.keys(validationErrors).length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-2">
                <p className="text-xs font-medium">
                  Please complete all required fields - {Object.keys(validationErrors).length} field{Object.keys(validationErrors).length > 1 ? 's' : ''} require{Object.keys(validationErrors).length === 1 ? 's' : ''} your attention
                </p>
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
                  ward={userWards[0]}
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
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
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../../../components/Shimmer';
import { useApiData } from '../../../../hooks/useApiData';

export default function EditWardReport() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const [report, setReport] = useState(null);
  const [formData, setFormData] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'wardAdmin') {
      router.push('/');
    } else if (status === 'authenticated' && id) {
      fetchReport();
    }
  }, [status, session, router, id]);

  const fetchReport = async () => {
    setIsLoading(true);
    
    try {
      const response = await axios.get(`/api/responses/${id}`);
      
      // Verify this is the user's report
      if (response.data.respondent._id !== session.user.id) {
        setError('You can only edit your own reports');
        return;
      }

      // Check if form is still editable
      if (!isFormEditable(response.data.formTemplate)) {
        setError('This report is no longer editable. The form has expired or editing has been disabled.');
        return;
      }
      
      setReport(response.data);
      
      // Convert responses back to form field format
      const convertedData = {};
      if (response.data.formTemplate?.fields && response.data.responses) {
        response.data.formTemplate.fields.forEach((field, fieldIndex) => {
          const fieldKey = `field_${fieldIndex}`;
          if (response.data.responses[field.label] !== undefined) {
            convertedData[fieldKey] = response.data.responses[field.label];
          }
          
          // Handle sub-questions
          if (field.subQuestions && field.subQuestions.length > 0) {
            field.subQuestions.forEach((subQuestion, subIndex) => {
              const subKey = `field_${fieldIndex}_sub_${subIndex}`;
              const submittedKey = `${field.label}_${subQuestion.label}`;
              if (response.data.responses[submittedKey] !== undefined) {
                convertedData[subKey] = response.data.responses[submittedKey];
              }
            });
          }
        });
      }
      
      setFormData(convertedData);
      setError('');
    } catch (error) {
      console.error('Error fetching report:', error);
      setError('Failed to fetch report');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormEditable = (form) => {
    if (!form) return false;
    const now = new Date();
    const closeDate = new Date(form.closeDateTime);
    return now < closeDate && form.allowEditAfterSubmission;
  };

  const validateForm = () => {
    const errors = {};
    let isValid = true;

    // Validate required fields
    for (let fieldIndex = 0; fieldIndex < report.formTemplate.fields.length; fieldIndex++) {
      const field = report.formTemplate.fields[fieldIndex];
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
      
      report.formTemplate.fields.forEach((field, fieldIndex) => {
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
      
      // Update response
      await axios.put(`/api/responses/${id}`, {
        responses: apiResponses,
      });
      
      setSuccess('Report updated successfully');
      setShowPreview(false);
      setValidationErrors({});
      
      // Refresh the report data
      await fetchReport();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred while updating the report';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  if (error && !report) {
    return (
      <Layout>
        <Head>
          <title>Edit Report - Ward Management System</title>
        </Head>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Report</h1>
          </div>
          <Card>
            <div className="p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
              <Link href="/ward/reports">
                <Button className="mt-4">Back to Reports</Button>
              </Link>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!report) {
    return (
      <Layout>
        <Head>
          <title>Edit Report - Ward Management System</title>
        </Head>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Report Not Found</h1>
          </div>
          <Card>
            <div className="p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Report Not Found</h3>
              <p className="mt-1 text-sm text-gray-500">The report you're looking for doesn't exist or has been removed.</p>
              <Link href="/ward/reports">
                <Button className="mt-4">Back to Reports</Button>
              </Link>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Edit Report - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Report</h1>
            <p className="mt-1 text-sm text-gray-600">
              {report.formTemplate?.title || 'Ward Report'} - Week {report.weekNumber}, {report.year}
            </p>
          </div>
          <div className="flex space-x-3">
            <Link href="/ward/reports">
              <Button variant="outline">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Reports
              </Button>
            </Link>
          </div>
        </div>

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
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Report Details</h3>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-900">Form: {report.formTemplate?.title}</p>
                  <p className="text-sm text-gray-900">Week: {report.weekNumber}</p>
                  <p className="text-sm text-gray-900">Year: {report.year}</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Ward Information</h3>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-900">Ward: {report.ward?.name}</p>
                  <p className="text-sm text-gray-900">District: {report.ward?.district}</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Form Status</h3>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-900">
                    Expires: {new Date(report.formTemplate?.closeDateTime).toLocaleDateString()}
                  </p>
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Editable
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {!showPreview ? (
              <>
                <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900">{report.formTemplate?.title}</h3>
                  <Link href={`/ward/reports/view/${report._id}`}>
                    <Button variant="outline" size="sm">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Only
                    </Button>
                  </Link>
                </div>

                <FormRenderer
                  form={report.formTemplate}
                  formData={formData}
                  setFormData={setFormData}
                  errors={validationErrors}
                />
                
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/ward/reports')}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePreview}
                  >
                    Preview Changes
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    onClick={() => setShowConfirmDialog(true)}
                  >
                    {isSubmitting ? 'Updating...' : 'Update Report'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-blue-900 mb-2">Preview Changes</h3>
                  <p className="text-blue-700 text-sm">Please review your changes before updating.</p>
                </div>
                
                <div className="space-y-4">
                  {report.formTemplate.fields.map((field, fieldIndex) => {
                    const fieldKey = `field_${fieldIndex}`;
                    const fieldValue = formData[fieldKey];
                    
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
                    {isSubmitting ? 'Updating...' : 'Update Report'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Update</h3>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to update this report? Your changes will be saved and the last updated timestamp will be modified.
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => setShowConfirmDialog(false)}
                  variant="outline"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={(e) => {
                    setShowConfirmDialog(false);
                    handleSubmit(e);
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Updating...' : 'Yes, Update'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
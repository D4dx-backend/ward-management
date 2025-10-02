import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../../../components/Layout';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';
import Modal from '../../../../components/Modal';
import FormRenderer from '../../../../components/FormRenderer';

export default function EditWardReport() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;

  const [report, setReport] = useState(null);
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const [clusters, setClusters] = useState([]);
  const [isLoadingClusters, setIsLoadingClusters] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    } else if (status === 'authenticated' && id) {
      fetchReport();
    }
  }, [status, session, router, id]);

  const fetchReport = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const reportResponse = await axios.get(`/api/responses/${id}`);
      setReport(reportResponse.data);
      
      const hasClusterQuestions = reportResponse.data.formTemplate?.fields?.some(field => field.applicableToClusters);
      
      if (hasClusterQuestions) {
        try {
          setIsLoadingClusters(true);
          const clustersResponse = await axios.get('/api/clusters', {
            params: {
              wardId: reportResponse.data.ward?._id
            }
          });
          setClusters(clustersResponse.data || []);
        } catch (error) {
          console.error('Error fetching clusters:', error);
          setClusters([]);
        } finally {
          setIsLoadingClusters(false);
        }
      }
      
      if (reportResponse.data.responses && reportResponse.data.formTemplate) {
        const transformedData = transformResponsesToFormData(reportResponse.data.responses, reportResponse.data.formTemplate);
        setFormData(transformedData);
      }
      
    } catch (error) {
      console.error('Error fetching report:', error);
      setError(error.response?.data?.message || error.message || 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  const transformResponsesToFormData = (responses, formTemplate) => {
    if (!responses || !formTemplate || !formTemplate.fields) {
      return {};
    }

    const formData = {};
    const fields = formTemplate.fields;

    for (const responseKey in responses) {
      const responseValue = responses[responseKey];
      
      if (responseKey.includes('_sub_')) {
        const [fieldLabel, subPart] = responseKey.split('_sub_');
        const subIndex = parseInt(subPart);
        const fieldIndex = fields.findIndex(f => f.label === fieldLabel);
        
        if (fieldIndex !== -1) {
          formData[`field_${fieldIndex}_sub_${subIndex}`] = responseValue;
        }
      } else if (responseKey.includes('_')) {
        // Fallback for old format, can be removed later
        const [fieldLabel, subQuestionLabel] = responseKey.split('_');
        const fieldIndex = fields.findIndex(f => f.label === fieldLabel);
        if (fieldIndex !== -1) {
          const field = fields[fieldIndex];
          if (field.subQuestions) {
            const subIndex = field.subQuestions.findIndex(sq => sq.label === subQuestionLabel);
            if (subIndex !== -1) {
              formData[`field_${fieldIndex}_sub_${subIndex}`] = responseValue;
            }
          }
        }
      } else {
        const fieldIndex = fields.findIndex(f => f.label === responseKey);
        if (fieldIndex !== -1) {
          formData[`field_${fieldIndex}`] = responseValue;
        }
      }
    }
    return formData;
  };


  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    console.log('Ward report edit - Input changed:', { name, value, type, checked });
    
    // Special handling for cluster fields
    if (name.includes('_cluster_')) {
      console.log('Ward report edit - Cluster field changed:', { 
        fieldName: name, 
        value: type === 'checkbox' ? checked : value,
        isClusterField: true 
      });
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    let isValid = true;

    if (!report?.formTemplate?.fields) {
      return true; // No validation needed if no fields
    }

    // Validate regular fields
    report.formTemplate.fields.forEach((field, fieldIndex) => {
      const fieldKey = `field_${fieldIndex}`;
      const value = formData[fieldKey];
      
      if (field.required && (!value || value === '')) {
        errors[fieldKey] = `${field.label} is required`;
        isValid = false;
      }
      
      // Validate sub-questions
      if (field.subQuestions && field.subQuestions.length > 0) {
        field.subQuestions.forEach((subQuestion, subIndex) => {
          const subKey = `field_${fieldIndex}_sub_${subIndex}`;
          const subValue = formData[subKey];
          
          if (subQuestion.required && (!subValue || subValue === '')) {
            errors[subKey] = `${subQuestion.label} is required`;
            isValid = false;
          }
        });
      }
    });

    // Validate sitting ward fields if applicable
    if (report.formTemplate.sittingWardFields && report.ward?.isSittingWard) {
      report.formTemplate.sittingWardFields.forEach((field, fieldIndex) => {
        const fieldKey = `field_sitting_${fieldIndex}`;
        const value = formData[fieldKey];
        
        if (field.required && (!value || value === '')) {
          errors[fieldKey] = `${field.label} is required`;
          isValid = false;
        }
        
        // Validate sub-questions for sitting ward fields
        if (field.subQuestions && field.subQuestions.length > 0) {
          field.subQuestions.forEach((subQuestion, subIndex) => {
            const subKey = `field_sitting_${fieldIndex}_sub_${subIndex}`;
            const subValue = formData[subKey];
            
            if (subQuestion.required && (!subValue || subValue === '')) {
              errors[subKey] = `${subQuestion.label} is required`;
              isValid = false;
            }
          });
        }
      });
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handlePreview = () => {
    if (validateForm()) {
      setShowPreview(true);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await axios.put(`/api/responses/${id}`, { status: newStatus });
      fetchReport();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // VALIDATION DISABLED - All validation has been removed
    console.log('Coordinator edit form - Validation disabled, proceeding with submission');
    console.log('Coordinator edit form - Form data:', formData);

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      console.log('Submitting ward report edit:', { id, formData });
      console.log('Report data for submission:', { 
        reportId: report?._id, 
        formTemplate: report?.formTemplate?._id,
        wardId: report?.ward?._id 
      });
      
      // Convert form data from field_index format to field.label format for API
      const apiResponses = {};
      
      // Process all form data and convert to API response format
      Object.entries(formData).forEach(([formKey, formValue]) => {
        if (formValue === undefined || formValue === '') return;
        
        if (formKey.includes('_cluster_')) {
          // Cluster-based field: field_0_cluster_clusterId or field_0_cluster_clusterId_sub_subIndex
          const parts = formKey.split('_cluster_');
          if (parts.length === 2) {
            const fieldPart = parts[0]; // field_0
            const clusterPart = parts[1]; // clusterId or clusterId_sub_subIndex
            
            const fieldIndex = parseInt(fieldPart.replace('field_', ''));
            const field = report.formTemplate.fields[fieldIndex];
            
            if (field) {
              if (clusterPart.includes('_sub_')) {
                // Sub-question for cluster
                const [clusterId, subPart] = clusterPart.split('_sub_');
                const subIndex = parseInt(subPart);
                const subQuestion = field.subQuestions[subIndex];
                
                if (subQuestion) {
                  const responseKey = `${field.label}_cluster_${clusterId}_sub_${subIndex}`;
                  apiResponses[responseKey] = formValue;
                }
              } else {
                // Regular cluster field
                const clusterId = clusterPart;
                const responseKey = `${field.label}_cluster_${clusterId}`;
                apiResponses[responseKey] = formValue;
              }
            }
          }
        } else if (formKey.startsWith('field_sitting_')) {
          // Sitting ward field: field_sitting_0 or field_sitting_0_sub_subIndex
          const fieldPart = formKey.replace('field_sitting_', '');
          
          if (fieldPart.includes('_sub_')) {
            // Sub-question for sitting ward
            const [fieldIndexStr, subPart] = fieldPart.split('_sub_');
            const fieldIndex = parseInt(fieldIndexStr);
            const subIndex = parseInt(subPart);
            
            const field = report.formTemplate.sittingWardFields[fieldIndex];
            const subQuestion = field?.subQuestions[subIndex];
            
            if (field && subQuestion) {
              const responseKey = `sitting_${field.label}_sub_${subIndex}`;
              apiResponses[responseKey] = formValue;
            }
          } else {
            // Regular sitting ward field
            const fieldIndex = parseInt(fieldPart);
            const field = report.formTemplate.sittingWardFields[fieldIndex];
            
            if (field) {
              const responseKey = `sitting_${field.label}`;
              apiResponses[responseKey] = formValue;
            }
          }
        } else if (formKey.startsWith('field_') && formKey.includes('_sub_')) {
          // Regular sub-question: field_0_sub_subIndex
          const [fieldPart, subPart] = formKey.split('_sub_');
          const fieldIndex = parseInt(fieldPart.replace('field_', ''));
          const subIndex = parseInt(subPart);
          
          const field = report.formTemplate.fields[fieldIndex];
          const subQuestion = field?.subQuestions[subIndex];
          
          if (field && subQuestion) {
            const responseKey = `${field.label}_sub_${subIndex}`;
            apiResponses[responseKey] = formValue;
          }
        } else if (formKey.startsWith('field_')) {
          // Regular field: field_0
          const fieldIndex = parseInt(formKey.replace('field_', ''));
          const field = report.formTemplate.fields[fieldIndex];
          
          if (field) {
            apiResponses[field.label] = formValue;
          }
        }
      });
      
      console.log('API responses prepared:', apiResponses);
      console.log('API responses count:', Object.keys(apiResponses).length);
      console.log('Sample API responses:', Object.entries(apiResponses).slice(0, 5));
      
      // Debug cluster responses specifically
      const clusterResponses = Object.entries(apiResponses).filter(([key]) => key.includes('_cluster_'));
      console.log('Cluster responses count:', clusterResponses.length);
      console.log('Cluster responses sample:', clusterResponses.slice(0, 3));
      
      // Update response
      console.log('Sending PUT request to:', `/api/responses/${id}`);
      const updateResponse = await axios.put(`/api/responses/${id}`, {
        responses: apiResponses,
      });
      
      console.log('Update response received:', updateResponse.data);
      
      setSuccess('Report updated successfully');
      setShowPreview(false);
      setValidationErrors({});
      
      // Refresh the report data
      await fetchReport();
      
      console.log('Ward report updated successfully');
    } catch (error) {
      console.error('Error updating ward report:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        stack: error.stack
      });
      
      let errorMessage = 'An error occurred while updating the report';
      
      if (error.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again or contact support.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to edit this report.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Report not found.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };


  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (error && !report) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
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
          <div className="mt-4">
            <Link href="/coordinator/ward-reports">
              <Button variant="outline">Back to Ward Reports</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (!report) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Report not found</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Edit Ward Report - Ward Management System</title>
      </Head>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Ward Report</h1>
            <p className="mt-1 text-sm text-gray-600">
              {report.ward?.name} - Week {report.weekNumber}, {report.year}
            </p>
          </div>
          <div className="flex space-x-3">
            <Link href={`/coordinator/ward-reports/detail/${id}?ward=${encodeURIComponent(report.ward?.name || '')}&week=${report.weekNumber}&year=${report.year}`}>
              <Button variant="outline">
                <svg className="w-4 h-4 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Report
              </Button>
            </Link>
            <Link href="/coordinator/ward-reports">
              <Button variant="outline">All Reports</Button>
            </Link>
          </div>
        </div>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Report Status</h2>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  report.status === 'approved' ? 'bg-green-100 text-green-800' :
                  report.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {report.status}
                </span>
                <Button onClick={() => handleStatusChange('approved')} variant="primary" size="sm">Approve</Button>
                <Button onClick={() => handleStatusChange('rejected')} variant="danger" size="sm">Reject</Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Error Message */}
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

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{success}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Link href={`/coordinator/ward-reports/detail/${id}?ward=${encodeURIComponent(report.ward?.name || '')}&week=${report.weekNumber}&year=${report.year}`}>
                  <Button variant="primary" size="sm">View Updated Report</Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {report.formTemplate?.title || 'Ward Report Form'}
              </h2>
              
              {/* Use FormRenderer for complete functionality */}
              <FormRenderer
                form={report.formTemplate}
                formData={formData}
                setFormData={setFormData}
                errors={validationErrors}
                readOnly={false}
                ward={report.ward}
                clusters={clusters}
                isLoadingClusters={isLoadingClusters}
              />

              {/* Form Actions */}
              <div className="flex justify-between pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreview}
                  disabled={isSubmitting}
                >
                  Preview
                </Button>
                <div className="space-x-3">
                  <Link href="/coordinator/ward-reports">
                    <Button type="button" variant="outline" disabled={isSubmitting}>
                      Cancel
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Updating...' : 'Update Report'}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </Card>

        {/* Preview Modal */}
        <Modal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          title="Report Preview"
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Ward Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Ward:</span>
                  <span className="ml-2 font-medium">{report.ward?.name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Week:</span>
                  <span className="ml-2 font-medium">Week {report.weekNumber}</span>
                </div>
                <div>
                  <span className="text-gray-600">Year:</span>
                  <span className="ml-2 font-medium">{report.year}</span>
                </div>
                <div>
                  <span className="text-gray-600">Submitted by:</span>
                  <span className="ml-2 font-medium">{report.respondent?.name}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-4">Form Responses</h4>
              <div className="space-y-4">
                {Object.entries(formData).map(([key, value]) => {
                  const fieldLabel = key.replace(/^field_(sitting_)?\d+(_sub_\d+)?$/, 'Field');
                  return (
                    <div key={key} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex flex-col space-y-1">
                        <h5 className="text-sm font-medium text-gray-900">{fieldLabel}</h5>
                        <div className="text-sm text-gray-700">
                          {typeof value === 'boolean' ? (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {value ? 'Yes' : 'No'}
                            </span>
                          ) : (
                            <span>{String(value)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Close Preview
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}

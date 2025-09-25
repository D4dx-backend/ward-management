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
      console.log('Fetching ward report for editing:', id);
      setIsLoading(true);
      setError('');
      
      const response = await axios.get(`/api/responses/${id}`);
      console.log('Report data received:', response.data);
      
      setReport(response.data);
      
      // Initialize form data from existing responses
      const initialFormData = {};
      
      // Process all responses and convert them to form data format
      Object.entries(response.data.responses || {}).forEach(([responseKey, responseValue]) => {
        // Handle regular field responses
        if (responseKey.includes('_cluster_')) {
          // Cluster-based response: fieldName_cluster_clusterId or fieldName_cluster_clusterId_sub_subIndex
          const parts = responseKey.split('_cluster_');
          if (parts.length === 2) {
            const fieldName = parts[0];
            const clusterPart = parts[1];
            
            if (clusterPart.includes('_sub_')) {
              // Sub-question for cluster: fieldName_cluster_clusterId_sub_subIndex
              const [clusterId, subPart] = clusterPart.split('_sub_');
              const subIndex = parseInt(subPart);
              
              // Find the field index for this field name
              const fieldIndex = response.data.formTemplate.fields.findIndex(f => f.label === fieldName);
              if (fieldIndex !== -1) {
                const fieldKey = `field_${fieldIndex}_cluster_${clusterId}_sub_${subIndex}`;
                initialFormData[fieldKey] = responseValue;
              }
            } else {
              // Regular cluster field: fieldName_cluster_clusterId
              const clusterId = clusterPart;
              
              // Find the field index for this field name
              const fieldIndex = response.data.formTemplate.fields.findIndex(f => f.label === fieldName);
              if (fieldIndex !== -1) {
                const fieldKey = `field_${fieldIndex}_cluster_${clusterId}`;
                initialFormData[fieldKey] = responseValue;
              }
            }
          }
        } else if (responseKey.startsWith('sitting_')) {
          // Sitting ward field: sitting_fieldName or sitting_fieldName_sub_subIndex
          const fieldName = responseKey.replace('sitting_', '');
          
          if (fieldName.includes('_sub_')) {
            // Sub-question for sitting ward
            const [actualFieldName, subPart] = fieldName.split('_sub_');
            const subIndex = parseInt(subPart);
            
            const fieldIndex = response.data.formTemplate.sittingWardFields.findIndex(f => f.label === actualFieldName);
            if (fieldIndex !== -1) {
              const fieldKey = `field_sitting_${fieldIndex}_sub_${subIndex}`;
              initialFormData[fieldKey] = responseValue;
            }
          } else {
            // Regular sitting ward field
            const fieldIndex = response.data.formTemplate.sittingWardFields.findIndex(f => f.label === fieldName);
            if (fieldIndex !== -1) {
              const fieldKey = `field_sitting_${fieldIndex}`;
              initialFormData[fieldKey] = responseValue;
            }
          }
        } else if (responseKey.includes('_sub_')) {
          // Regular sub-question: fieldName_sub_subIndex
          const [fieldName, subPart] = responseKey.split('_sub_');
          const subIndex = parseInt(subPart);
          
          const fieldIndex = response.data.formTemplate.fields.findIndex(f => f.label === fieldName);
          if (fieldIndex !== -1) {
            const fieldKey = `field_${fieldIndex}_sub_${subIndex}`;
            initialFormData[fieldKey] = responseValue;
          }
        } else {
          // Regular field
          const fieldIndex = response.data.formTemplate.fields.findIndex(f => f.label === responseKey);
          if (fieldIndex !== -1) {
            const fieldKey = `field_${fieldIndex}`;
            initialFormData[fieldKey] = responseValue;
          }
        }
      });
      
      setFormData(initialFormData);
      console.log('Initialized form data:', initialFormData);
      
      // Fetch clusters if there are cluster-based questions
      const hasClusterQuestions = response.data.formTemplate?.fields?.some(field => field.applicableToClusters);
      if (hasClusterQuestions) {
        await fetchClusters();
      }
      
    } catch (error) {
      console.error('Error fetching report:', error);
      setError(error.response?.data?.message || error.message || 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClusters = async () => {
    try {
      setIsLoadingClusters(true);
      console.log('Fetching clusters for ward report edit...', report.ward?._id);
      
      // Fetch clusters for the specific ward
      const response = await axios.get('/api/clusters', {
        params: {
          wardId: report.ward?._id
        }
      });
      
      setClusters(response.data || []);
      console.log('Clusters loaded for ward:', report.ward?.name, response.data?.length || 0);
      console.log('Clusters data:', response.data);
    } catch (error) {
      console.error('Error fetching clusters:', error);
      setClusters([]);
    } finally {
      setIsLoadingClusters(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    console.log('Input changed:', { name, value, type, checked });
    
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
      console.log('Submitting ward report edit:', { id, formData });
      
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
      
      // Update response
      await axios.put(`/api/responses/${id}`, {
        responses: apiResponses,
      });
      
      setSuccess('Report updated successfully');
      setShowPreview(false);
      setValidationErrors({});
      
      // Refresh the report data
      await fetchReport();
      
      console.log('Ward report updated successfully');
    } catch (error) {
      console.error('Error updating ward report:', error);
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred while updating the report';
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
          <Link href="/coordinator/ward-reports">
            <Button variant="outline">Back to Reports</Button>
          </Link>
        </div>

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
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{success}</p>
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

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import DynamicFormRenderer from '../../components/DynamicFormRenderer';
import ClusterDataCollector from '../../components/ClusterDataCollector';

export default function WardBasicData() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeForm, setActiveForm] = useState(null);
  const [existingData, setExistingData] = useState(null);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ward, setWard] = useState(null);
  const [dynamicData, setDynamicData] = useState([]);
  const [showDynamicForm, setShowDynamicForm] = useState(false);
  const [dynamicFormData, setDynamicFormData] = useState({
    category: 'infrastructure',
    title: '',
    description: '',
    data: '',
    dataType: 'text',
  });
  const [clusterData, setClusterData] = useState({});

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && !['wardAdmin', 'coordinator'].includes(session.user.role)) {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchData();
    }
  }, [status, session, router]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Get active form
      try {
        console.log('Fetching ward basic forms...');
        const formsResponse = await axios.get('/api/ward-basic-forms');
        console.log('Forms response:', formsResponse.data);
        
        if (!formsResponse.data || formsResponse.data.length === 0) {
          setError('No ward basic data forms found. Please contact your administrator to create a form.');
          return;
        }
        
        const activeForms = formsResponse.data.filter(form => form.isActive);
        
        if (activeForms.length === 0) {
          setError('No active ward basic data form available. Please contact your administrator to activate a form.');
          return;
        }
        
        const form = activeForms[0]; // Get the first active form
        setActiveForm(form);
        console.log('Active form set:', form);
      } catch (formError) {
        console.error('Error fetching form:', formError);
        console.error('Error details:', {
          status: formError.response?.status,
          statusText: formError.response?.statusText,
          data: formError.response?.data,
          message: formError.message
        });
        
        let errorMessage = 'Failed to load form data';
        if (formError.response?.status === 401) {
          errorMessage = 'Authentication required. Please sign in again.';
        } else if (formError.response?.status === 403) {
          errorMessage = 'Access denied. You do not have permission to access this form.';
        } else if (formError.response?.status === 500) {
          errorMessage = 'Server error. Please try again later or contact support.';
        } else if (formError.code === 'ECONNREFUSED') {
          errorMessage = 'Cannot connect to server. Please ensure the application is running.';
        } else {
          errorMessage = `Failed to load form data: ${formError.response?.data?.message || formError.message}`;
        }
        
        setError(errorMessage);
        return;
      }

      // Get user's ward
      let userWard = null;
      if (session.user.role === 'wardAdmin') {
        const wardsResponse = await axios.get('/api/wards');
        userWard = wardsResponse.data.find(w => w.wardAdmin?._id === session.user.id);
      } else if (session.user.role === 'coordinator') {
        // For coordinators, we'll need to show a ward selector or get from query params
        const { wardId } = router.query;
        if (wardId) {
          const wardResponse = await axios.get(`/api/wards/${wardId}`);
          userWard = wardResponse.data;
        } else {
          // Redirect to ward selection or show ward selector
          const wardsResponse = await axios.get('/api/wards');
          const coordinatorWards = wardsResponse.data.filter(w => w.coordinator?._id === session.user.id);
          if (coordinatorWards.length === 1) {
            userWard = coordinatorWards[0];
          } else {
            // Multiple wards - need to show selector
            setError('Please select a ward to manage basic data');
            return;
          }
        }
      }

      if (!userWard) {
        setError('No ward assigned or accessible');
        return;
      }

      setWard(userWard);

      // Get existing data for this ward and form
      try {
        console.log(`Fetching existing data for ward ${userWard._id} and form ${form._id}...`);
        const dataResponse = await axios.get(`/api/ward-basic-data?wardId=${userWard._id}&formId=${form._id}`);
        console.log('Ward basic data response:', dataResponse.data);
        
        if (dataResponse.data && dataResponse.data.length > 0) {
          const existing = dataResponse.data[0];
          setExistingData(existing);
          setFormData(existing.data || {});
          setClusterData(existing.clusterData || {});
          console.log('Loaded existing data successfully');
        } else {
          console.log('No existing data found, initializing with defaults');
          // Initialize with default values
          const defaultData = {};
          form.fields.forEach(field => {
            if (field.defaultValue !== undefined && field.defaultValue !== '' && !field.applicableToClusters) {
              defaultData[field.id] = field.defaultValue;
            }
          });
          setFormData(defaultData);
          setClusterData({});
        }
      } catch (dataError) {
        console.error('Error fetching existing data:', dataError);
        console.error('Data error details:', {
          status: dataError.response?.status,
          statusText: dataError.response?.statusText,
          data: dataError.response?.data,
          message: dataError.message
        });
        
        // This is not a critical error - user can still fill the form
        console.log('Continuing with empty form due to data fetch error');
        
        // Initialize with default values
        const defaultData = {};
        form.fields.forEach(field => {
          if (field.defaultValue !== undefined && field.defaultValue !== '' && !field.applicableToClusters) {
            defaultData[field.id] = field.defaultValue;
          }
        });
        setFormData(defaultData);
        setClusterData({});
      }

      // Get dynamic data for this ward
      try {
        console.log(`Fetching dynamic data for ward ${userWard._id}...`);
        const dynamicResponse = await axios.get(`/api/ward-dynamic-data?wardId=${userWard._id}`);
        setDynamicData(dynamicResponse.data);
        console.log('Dynamic data loaded successfully');
      } catch (dynamicError) {
        console.error('Error fetching dynamic data:', dynamicError);
        // This is not critical - set empty array
        setDynamicData([]);
      }

      setError('');
    } catch (error) {
      setError('Failed to load form data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormDataChange = (data) => {
    setFormData(data);
    setErrors({}); // Clear errors when user makes changes
  };

  const handleClusterDataChange = (data) => {
    setClusterData(data);
    setErrors({}); // Clear errors when user makes changes
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    setErrors({});

    try {
      if (!ward || !activeForm) {
        throw new Error('Missing ward or form information');
      }

      const response = await axios.post('/api/ward-basic-data', {
        wardId: ward._id,
        formId: activeForm._id,
        data: formData,
        clusterData: clusterData,
      });

      setExistingData(response.data);
      setSuccess(existingData ? 'Ward basic data updated successfully!' : 'Ward basic data submitted successfully!');
      
      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      if (error.response?.data?.errors) {
        // Handle validation errors
        const fieldErrors = {};
        error.response.data.errors.forEach(err => {
          // Try to match error message to field
          const field = activeForm.fields.find(f => err.includes(f.label));
          if (field) {
            fieldErrors[field.id] = err;
          }
        });
        setErrors(fieldErrors);
        setError('Please fix the validation errors below');
      } else {
        setError(error.response?.data?.message || 'Failed to submit data');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDynamicDataSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (!ward || !dynamicFormData.title || !dynamicFormData.data) {
        throw new Error('Title and data are required');
      }

      const response = await axios.post('/api/ward-dynamic-data', {
        wardId: ward._id,
        ...dynamicFormData,
      });

      setDynamicData([response.data, ...dynamicData]);
      setDynamicFormData({
        category: 'infrastructure',
        title: '',
        description: '',
        data: '',
        dataType: 'text',
      });
      setShowDynamicForm(false);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save dynamic data');
    }
  };

  const handleDynamicFormChange = (e) => {
    const { name, value } = e.target;
    setDynamicFormData({ ...dynamicFormData, [name]: value });
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error && !activeForm) {
    return (
      <Layout>
        <Head>
          <title>Ward Basic Data - Ward Management System</title>
        </Head>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ward Basic Data</h1>
            <p className="mt-1 text-sm text-gray-600">
              Fill out basic information about your ward
            </p>
          </div>
          <Card>
            <div className="p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Form Not Available</h3>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
              <div className="mt-4">
                <Button 
                  onClick={fetchData}
                  disabled={isLoading}
                  className="inline-flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {isLoading ? 'Retrying...' : 'Retry'}
                </Button>
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
        <title>Ward Advance Data - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ward Advance Data</h1>
          <p className="mt-1 text-sm text-gray-600">
            {ward ? `Fill out advance information for ${ward.name} (Ward #${ward.wardNumber})` : 'Fill out advance information about your ward'}
          </p>
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

        {activeForm && (
          <Card>
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900">{activeForm.title}</h2>
                {activeForm.description && (
                  <p className="mt-1 text-sm text-gray-600">{activeForm.description}</p>
                )}
                {existingData && (
                  <div className="mt-2 text-sm text-blue-600">
                    Last updated: {new Date(existingData.updatedAt).toLocaleString()}
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit}>
                {/* Regular Questions */}
                {activeForm.fields.filter(field => !field.applicableToClusters).length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Ward Information</h3>
                    <DynamicFormRenderer
                      fields={activeForm.fields.filter(field => !field.applicableToClusters)}
                      data={formData}
                      onChange={handleFormDataChange}
                      errors={errors}
                      disabled={isSubmitting}
                    />
                  </div>
                )}

                {/* Cluster Questions */}
                {activeForm.fields.filter(field => field.applicableToClusters).length > 0 && ward && (
                  <div className="mb-8">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Cluster-wise Information</h3>

                    <ClusterDataCollector
                      wardId={ward._id}
                      questions={activeForm.fields.filter(field => field.applicableToClusters)}
                      formType="wardReport"
                      onDataChange={handleClusterDataChange}
                      disabled={isSubmitting}
                    />
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="min-w-[120px]"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Submitting...
                        </div>
                      ) : (
                        existingData ? 'Update Data' : 'Submit Data'
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </Card>
        )}

        {/* Dynamic Data Section */}
        {ward && existingData && (
          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Additional Ward Information</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Add any additional information about your ward
                  </p>
                </div>
                <Button
                  onClick={() => setShowDynamicForm(!showDynamicForm)}
                  variant="outline"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Information
                </Button>
              </div>

              {showDynamicForm && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <form onSubmit={handleDynamicDataSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category *
                        </label>
                        <select
                          name="category"
                          value={dynamicFormData.category}
                          onChange={handleDynamicFormChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="infrastructure">Infrastructure</option>
                          <option value="demographics">Demographics</option>
                          <option value="services">Services</option>
                          <option value="facilities">Facilities</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Data Type
                        </label>
                        <select
                          name="dataType"
                          value={dynamicFormData.dataType}
                          onChange={handleDynamicFormChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="list">List</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={dynamicFormData.title}
                        onChange={handleDynamicFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Number of Schools, Road Conditions, etc."
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        name="description"
                        value={dynamicFormData.description}
                        onChange={handleDynamicFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Optional description"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data *
                      </label>
                      <textarea
                        name="data"
                        value={dynamicFormData.data}
                        onChange={handleDynamicFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows="3"
                        placeholder="Enter the information..."
                        required
                      />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowDynamicForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">
                        Add Information
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {dynamicData.length > 0 ? (
                <div className="space-y-4">
                  {dynamicData.map((item) => (
                    <div key={item._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-sm font-medium text-gray-900">{item.title}</h3>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              item.category === 'infrastructure' ? 'bg-blue-100 text-blue-800' :
                              item.category === 'demographics' ? 'bg-green-100 text-green-800' :
                              item.category === 'services' ? 'bg-purple-100 text-purple-800' :
                              item.category === 'facilities' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {item.category}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                          )}
                          <div className="text-sm text-gray-900">
                            {item.dataType === 'list' ? (
                              <ul className="list-disc list-inside">
                                {item.data.split('\n').map((line, index) => (
                                  <li key={index}>{line.trim()}</li>
                                ))}
                              </ul>
                            ) : (
                              <p>{item.data}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(item.submittedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-2 text-sm">No additional information added yet.</p>
                  <p className="text-xs text-gray-400">Click "Add Information" to get started.</p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
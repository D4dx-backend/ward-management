
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import Modal from '../../../components/Modal';
import FormRenderer from '../../../components/FormRenderer';
import SearchableSelect from '../../../components/SearchableSelect';

export default function CreateWardReport() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [wards, setWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState(router.query.wardId || null);
  const [formTemplates, setFormTemplates] = useState([]);
  const [selectedForm, setSelectedForm] = useState(router.query.formId || null);
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const [clusters, setClusters] = useState([]);
  const [isLoadingClusters, setIsLoadingClusters] = useState(false);
  const [existingResponse, setExistingResponse] = useState(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchInitialData();
    }
  }, [status, session, router]);

  // Handle URL parameter changes
  useEffect(() => {
    if (router.query.wardId) {
      setSelectedWard(router.query.wardId);
    }
    if (router.query.formId) {
      setSelectedForm(router.query.formId);
    }
  }, [router.query]);
  
  useEffect(() => {
    if (selectedWard) {
      fetchFormsForWard();
    } else {
      setFormTemplates([]);
      setSelectedForm(null);
      setExistingResponse(null);
      setFormData({});
    }
  }, [selectedWard]);

  useEffect(() => {
    if (selectedWard && selectedForm) {
      checkExistingResponse(selectedWard, selectedForm);
      fetchClustersForWard(selectedWard);
    } else {
      setExistingResponse(null);
      setFormData({});
      setClusters([]);
    }
  }, [selectedWard, selectedForm]);

  const selectedFormTemplate = formTemplates.find(form => form._id === selectedForm);

  useEffect(() => {
    if (existingResponse && selectedFormTemplate) {
      const transformedData = transformResponsesToFormData(existingResponse.responses, selectedFormTemplate);
      setFormData(transformedData);
    } else {
      setFormData({});
    }
  }, [existingResponse, selectedFormTemplate]);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching initial data for coordinator report creation...');
      const wardsResponse = await axios.get('/api/coordinator/wards');
      console.log('Fetched wards:', wardsResponse.data);
      console.log('Wards with isSittingWard property:', wardsResponse.data.map(w => ({ name: w.name, isSittingWard: w.isSittingWard })));
      setWards(wardsResponse.data);
    } catch (error) {
      setError('Failed to load initial data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFormsForWard = async () => {
    try {
      const formsResponse = await axios.get('/api/forms', { params: { userType: 'wardAdmin' } });
      console.log('Fetched forms:', formsResponse.data);
      console.log('Forms with sittingWardFields:', formsResponse.data.map(f => ({ 
        title: f.title, 
        hasSittingWardFields: f.sittingWardFields && f.sittingWardFields.length > 0,
        sittingWardFieldsCount: f.sittingWardFields?.length || 0
      })));
      setFormTemplates(formsResponse.data || []);
    } catch (error) {
      setError('Failed to load forms for the ward.');
      console.error('Error fetching forms:', error);
    }
  };

  const fetchClustersForWard = async (wardId) => {
    if (!wardId) {
      setClusters([]);
      return;
    }

    try {
      setIsLoadingClusters(true);
      console.log('Fetching clusters for ward:', wardId);
      const clustersResponse = await axios.get(`/api/clusters?wardId=${wardId}`);
      console.log('Clusters response:', clustersResponse.data);
      setClusters(clustersResponse.data || []);
    } catch (error) {
      console.error('Error fetching clusters:', error);
      setClusters([]);
    } finally {
      setIsLoadingClusters(false);
    }
  };

  const checkExistingResponse = async (wardId, formId) => {
    if (!formId) {
      setExistingResponse(null);
      setFormData({});
      return;
    }
    try {
      // Get the form template to get its week and year
      const formTemplate = formTemplates.find(form => form._id === formId);
      if (!formTemplate) {
        setExistingResponse(null);
        setFormData({});
        return;
      }

      const responsesResponse = await axios.get('/api/responses', { 
        params: { 
          wardId: wardId, 
          formTemplate: formId,
          weekNumber: formTemplate.weekNumber,
          year: formTemplate.year
        } 
      });
      const existingResponses = responsesResponse.data;

      if (existingResponses.length > 0) {
        setExistingResponse(existingResponses[0]);
      } else {
        setExistingResponse(null);
        setFormData({});
      }
    } catch (error) {
      setError('Failed to check for existing responses.');
      console.error('Error fetching responses:', error);
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
        // Fallback for old format
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

  const handleWardChange = (e) => {
    const newWardId = e.target.value;
    setSelectedWard(newWardId);
    // Reset form selection and data when ward changes
    setSelectedForm(null);
    setExistingResponse(null);
    setFormData({});
  };

  const handleFormChange = (e) => {
    setSelectedForm(e.target.value);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedWard || !selectedForm) {
      setError('Please select a ward and a form.');
      return;
    }

    if (Object.keys(formData).length === 0) {
      setError('Please fill out the form before submitting.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    // Transform responses to match API expectations where keys are field labels
    const transformedResponses = {};
    if (selectedFormTemplate && selectedFormTemplate.fields) {
      const fields = selectedFormTemplate.fields;
      for (const key in formData) {
        if (key.startsWith('field_')) {
          const parts = key.split('_');
          const fieldIndex = parseInt(parts[1]);
          if (fields[fieldIndex]) {
            const field = fields[fieldIndex];
            if (key.includes('_sub_')) {
              const subIndex = parseInt(parts[3]);
              if (field.subQuestions && field.subQuestions[subIndex]) {
                const subQuestion = field.subQuestions[subIndex];
                const newKey = `${field.label}_sub_${subIndex}`;
                transformedResponses[newKey] = formData[key];
              }
            } else {
              transformedResponses[field.label] = formData[key];
            }
          }
        }
      }
    }

    const payload = {
      formTemplateId: selectedForm,
      wardId: selectedWard,
      responses: Object.keys(transformedResponses).length > 0 ? transformedResponses : formData,
      formType: 'wardReport',
    };

    console.log('Submitting transformed payload:', payload);

    try {
      let response;
      if (existingResponse) {
        // Update existing response
        response = await axios.put(`/api/responses/${existingResponse._id}`, payload);
        setSuccess('Report updated successfully!');
      } else {
        // Create new response
        response = await axios.post('/api/responses', payload);
        setSuccess('Report created successfully!');
      }

      if (response.status === 200 || response.status === 201) {
        setSelectedWard(null);
        setSelectedForm(null);
        setFormData({});
        router.push('/coordinator/ward-reports');
      } else {
        setError('Failed to save report. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setError(error.response?.data?.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>{existingResponse ? 'Update' : 'Create'} Ward Report - Ward Management System</title>
      </Head>

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{existingResponse ? 'Update' : 'Create'} Ward Report</h1>
            <p className="mt-1 text-sm text-gray-600">
              {existingResponse ? 'Update an existing report for a ward.' : 'Fill out a new report for a ward.'}
            </p>
          </div>
          <Link href="/coordinator/ward-reports">
            <Button variant="outline">Back to Reports</Button>
          </Link>
        </div>

        <Card>
          
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="ward-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Ward
                </label>
                <SearchableSelect
                  options={wards.map(ward => ({ value: ward._id, label: ward.name }))}
                  value={selectedWard}
                  onChange={handleWardChange}
                  placeholder="Search for a ward..."
                />
              </div>
              <div>
                <label htmlFor="form-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Form
                </label>
                <SearchableSelect
                  options={formTemplates.map(form => ({ value: form._id, label: form.title }))}
                  value={selectedForm}
                  onChange={handleFormChange}
                  placeholder="Search for a form..."
                />
              </div>
            </div>

            {existingResponse && (
              <div className="mb-4 p-4 bg-blue-100 border border-blue-200 rounded-lg text-sm text-blue-800">
                You are updating a report that was previously submitted. Any changes will overwrite the existing data.
              </div>
            )}

            {selectedFormTemplate && (
              <>
                {/* Debug info for sitting ward */}
                {(() => {
                  const selectedWardData = wards.find(w => w._id === selectedWard);
                  console.log('Selected ward for FormRenderer:', selectedWardData);
                  console.log('Selected form template:', {
                    title: selectedFormTemplate.title,
                    hasSittingWardFields: selectedFormTemplate.sittingWardFields && selectedFormTemplate.sittingWardFields.length > 0,
                    sittingWardFieldsCount: selectedFormTemplate.sittingWardFields?.length || 0
                  });
                  return null;
                })()}
                <form onSubmit={handleSubmit}>
                  <FormRenderer
                    form={selectedFormTemplate}
                    formData={formData}
                    setFormData={setFormData}
                    errors={validationErrors}
                    readOnly={false}
                    ward={wards.find(w => w._id === selectedWard)}
                    clusters={clusters}
                    isLoadingClusters={isLoadingClusters}
                  />
                  <div className="flex justify-end pt-6 border-t border-gray-200">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? existingResponse ? 'Updating...' : 'Creating...'
                        : existingResponse ? 'Update Report' : 'Create Report'}
                    </Button>
                  </div>
                </form>
              </>
            )}
          
        </Card>
      </div>
    </Layout>
  );
}

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import FormRenderer from '../../../components/FormRenderer';

export default function SubmitReport() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeForms, setActiveForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Check if user is authenticated and is coordinator
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchActiveForms();
    }
  }, [status, session, router]);

  const fetchActiveForms = async () => {
    try {
      setIsLoading(true);
      
      // Get active coordinator report forms that are currently available
      const response = await axios.get('/api/forms', {
        params: {
          formType: 'coordinatorReport',
          isActive: true,
          availableOnly: true,
        }
      });
      
      setActiveForms(response.data);
      setError('');
    } catch (error) {
      setError('Failed to fetch active forms');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSelect = (formId) => {
    const form = activeForms.find(f => f._id === formId);
    setSelectedForm(form);
    setFormData({});
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Validate required fields including sub-questions
      const validateField = (field, fieldIndex) => {
        const fieldKey = `field_${fieldIndex}`;
        if (field.required && (!formData[fieldKey] && formData[fieldKey] !== 0)) {
          throw new Error(`Field "${field.label}" is required`);
        }

        // Validate sub-questions if they should be visible
        if (field.subQuestions && field.subQuestions.length > 0) {
          const shouldShowSubQuestions = !field.showSubQuestionsWhen || 
            (field.type === 'yesno' && formData[fieldKey] === field.showSubQuestionsWhen) ||
            (field.type === 'select' && formData[fieldKey] === field.showSubQuestionsWhen);

          if (shouldShowSubQuestions) {
            field.subQuestions.forEach((subQuestion, subIndex) => {
              const subKey = `field_${fieldIndex}_sub_${subIndex}`;
              if (subQuestion.required && (!formData[subKey] && formData[subKey] !== 0)) {
                throw new Error(`Sub-question "${subQuestion.label}" is required`);
              }
            });
          }
        }
      };

      selectedForm.fields.forEach(validateField);

      // Submit response
      await axios.post('/api/responses', {
        formTemplateId: selectedForm._id,
        responses: formData,
      });

      setSuccess('Report submitted successfully');
      setFormData({});
      setSelectedForm(null);
    } catch (error) {
      setError(error.response?.data?.message || error.message);
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
        <title>Submit Weekly Report - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Submit Weekly Report</h1>
          <p className="mt-1 text-sm text-gray-600">Submit your coordinator weekly report</p>
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
          <Card>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Select a Report Form</h2>
              <p className="text-sm text-gray-600 mt-1">Choose the form you want to submit</p>
            </div>
            <div className="p-6 space-y-4">
              {activeForms.map((form) => (
                <div
                  key={form._id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-blue-300 cursor-pointer transition-colors"
                  onClick={() => handleFormSelect(form._id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{form.title}</h3>
                      <p className="text-sm text-gray-500">Week {form.weekNumber}, {form.year}</p>
                      {form.description && <p className="mt-2 text-gray-700 text-sm">{form.description}</p>}
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card>
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedForm.title}</h2>
                  <p className="text-sm text-gray-600">Week {selectedForm.weekNumber}, {selectedForm.year}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSelectedForm(null)}
                >
                  Change Form
                </Button>
              </div>
              
              {selectedForm.description && (
                <p className="mt-4 text-gray-700">{selectedForm.description}</p>
              )}
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <FormRenderer 
                form={selectedForm}
                formData={formData}
                setFormData={setFormData}
              />
              
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </div>
                  ) : (
                    'Submit Report'
                  )}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </Layout>
  );
}
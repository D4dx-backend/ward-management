import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../../../components/Layout';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../../../components/Shimmer';
import { useApiData } from '../../../../hooks/useApiData';

export default function FormResponses() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id, responseId, direct } = router.query;
  
  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState([]);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'stateAdmin') {
      router.push('/');
    } else if (status === 'authenticated' && id) {
      fetchFormAndResponses();
    }
  }, [status, session, router, id]);

  useEffect(() => {
    // If direct navigation with responseId, scroll to that response
    if (direct === 'true' && responseId && responses.length > 0) {
      const targetResponse = responses.find(r => r._id === responseId);
      if (targetResponse) {
        setSelectedResponse(targetResponse);
        // Scroll to the response after a short delay
        setTimeout(() => {
          const element = document.getElementById(`response-${responseId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
            }, 3000);
          }
        }, 100);
      }
    }
  }, [direct, responseId, responses]);

  const fetchFormAndResponses = async () => {
    try {
      setIsLoading(true);
      
      // Fetch form details and responses
      const [formResponse, responsesResponse] = await Promise.all([
        axios.get(`/api/forms/${id}`),
        axios.get(`/api/responses?formTemplate=${id}`)
      ]);
      
      setForm(formResponse.data);
      setResponses(responsesResponse.data || []);
      setError('');
    } catch (error) {
      console.error('Error fetching form data:', error);
      setError('Failed to load form data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderFieldValue = (field, value) => {
    if (!value) return 'N/A';
    
    switch (field.type) {
      case 'checkbox':
        return Array.isArray(value) ? value.join(', ') : value;
      case 'radio':
      case 'select':
        return value;
      case 'file':
        return value ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            View File
          </a>
        ) : 'No file';
      default:
        return value;
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>{form?.title ? `${form.title} - Responses` : 'Form Responses'} - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push('/admin/forms')}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Forms
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {form?.title || 'Form'} - Responses
              </h1>
              <p className="text-sm text-gray-600">
                {responses.length} response{responses.length !== 1 ? 's' : ''} received
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {direct === 'true' && responseId && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
            <p className="text-sm">
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Navigated directly to a specific response. It's highlighted below.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {responses.length > 0 ? (
            responses.map((response) => (
              <Card 
                key={response._id} 
                id={`response-${response._id}`}
                className="transition-all duration-300"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Response from {response.respondent?.name || 'Unknown User'}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <span>Submitted: {formatDate(response.submittedAt)}</span>
                        {response.respondent?.role && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {response.respondent.role.replace('Admin', ' Admin')}
                          </span>
                        )}
                        {response.ward && (
                          <span className="text-gray-600">
                            {response.ward.name}, {response.ward.district}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Submitted
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {form?.fields && form.fields.length > 0 ? (
                      form.fields.map((field) => (
                        <div key={field._id || field.id} className="border-b border-gray-100 pb-3 last:border-b-0">
                          <div className="flex items-start space-x-4">
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {field.label}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              <div className="text-sm text-gray-900">
                                {renderFieldValue(field, response.responses?.[field._id || field.id])}
                              </div>
                            </div>
                            <div className="text-xs text-gray-400">
                              {field.type}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <p className="text-sm">No form fields available</p>
                      </div>
                    )}
                  </div>

                  {response.notes && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="text-sm font-medium text-yellow-800 mb-1">Notes</h4>
                      <p className="text-sm text-yellow-700">{response.notes}</p>
                    </div>
                  )}
                </div>
              </Card>
            ))
          ) : (
            <Card>
              <div className="p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No responses yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  This form hasn't received any responses yet.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
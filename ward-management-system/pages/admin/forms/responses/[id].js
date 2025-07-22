import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../../../components/Layout';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';

export default function FormResponses() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const [formTemplate, setFormTemplate] = useState(null);
  const [responses, setResponses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is authenticated and is state admin
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'stateAdmin') {
      router.push('/');
    } else if (status === 'authenticated' && id) {
      fetchFormResponses();
    }
  }, [status, session, router, id]);

  const fetchFormResponses = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/forms/${id}/responses`);
      setFormTemplate(response.data.formTemplate);
      setResponses(response.data.responses);
      setError('');
    } catch (error) {
      setError('Failed to fetch form responses');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportResponses = () => {
    window.open(`/api/forms/${id}/export`, '_blank');
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!formTemplate) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Form not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Form Responses - {formTemplate.title} - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
              <Link href="/admin/forms" className="hover:text-gray-700">Forms</Link>
              <span>›</span>
              <span>Responses</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{formTemplate.title}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {responses.length} response{responses.length !== 1 ? 's' : ''} • 
              Week {formTemplate.weekNumber}, {formTemplate.year} • 
              {formTemplate.formType === 'coordinatorReport' ? 'Coordinator Report' : 'Ward Report'}
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={exportResponses}
              variant="success"
              disabled={responses.length === 0}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </Button>
            <Link href="/admin/forms">
              <Button variant="outline">
                Back to Forms
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

        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Respondent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Responses
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {responses.map((response) => (
                  <tr key={response._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              {response.respondent?.name?.charAt(0) || 'U'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {response.respondent?.name || 'Unknown User'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {response.respondent?.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {response.district}
                        {response.ward?.name && (
                          <div className="text-sm text-gray-500">{response.ward.name}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(response.submittedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        {formTemplate.fields.map((field) => (
                          <div key={field.label} className="text-sm">
                            <span className="font-medium text-gray-700">{field.label}:</span>
                            <span className="ml-2 text-gray-900">
                              {Array.isArray(response.responses[field.label])
                                ? response.responses[field.label].join(', ')
                                : response.responses[field.label] || 'N/A'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {responses.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a4 4 0 01-4-4V5a4 4 0 014-4h10a4 4 0 014 4v14a4 4 0 01-4 4z" />
                        </svg>
                        <p className="mt-2 text-sm">No responses yet</p>
                        <p className="text-xs text-gray-400">Responses will appear here once submitted</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
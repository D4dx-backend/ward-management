import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../../../components/Layout';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';
import { formatWeekPeriod } from '../../../../lib/weekUtils';

export default function ViewReport() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is authenticated and is state admin
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'stateAdmin') {
      router.push('/');
    } else if (status === 'authenticated' && id) {
      fetchResponse();
    }
  }, [status, session, router, id]);

  const fetchResponse = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`/api/responses/${id}`);
      setResponse(res.data);
      setError('');
    } catch (error) {
      setError('Failed to fetch report details');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFieldValue = (field, value) => {
    // Handle null, undefined, or empty values
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400 italic">Not provided</span>;
    }
    
    switch (field.type) {
      case 'number':
        return <span className="font-semibold text-gray-900">{typeof value === 'number' ? value.toLocaleString() : value}</span>;
      case 'select':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">{value}</span>;
      case 'textarea':
        return (
          <div className="whitespace-pre-wrap break-words bg-gray-50 p-3 rounded-md border text-sm">
            {value}
          </div>
        );
      case 'checkbox':
        return (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {value ? (
              <>
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Yes
              </>
            ) : (
              <>
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                No
              </>
            )}
          </span>
        );
      case 'text':
      case 'email':
      case 'phone':
        return <span className="text-gray-900">{value}</span>;
      default:
        return <span className="text-gray-900">{value}</span>;
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link href="/admin/reports">
              <Button>Back to Reports</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (!response) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Report Not Found</h1>
            <p className="text-gray-600 mb-4">The requested report could not be found.</p>
            <Link href="/admin/reports">
              <Button>Back to Reports</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>View Report - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Link href="/admin/reports">
              <Button variant="outline" className="mb-4">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Reports
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Report Details</h1>
            <p className="mt-1 text-sm text-gray-600">
              {response.formTemplate?.title || 'Report'} - Week {response.weekNumber}, {response.year}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Information */}
          <Card className="lg:col-span-1">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Information</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Report Type</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      response.formType === 'coordinatorReport' 
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {response.formType === 'coordinatorReport' ? 'Coordinator Report' : 'Ward Report'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Period</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    Week {response.weekNumber}, {response.year}
                    <div className="text-xs text-gray-500">
                      {(() => {
                        try {
                          return formatWeekPeriod(response.weekNumber, response.year);
                        } catch (error) {
                          return `Week ${response.weekNumber} of ${response.year}`;
                        }
                      })()}
                    </div>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">District</dt>
                  <dd className="mt-1 text-sm text-gray-900">{response.district}</dd>
                </div>
                {response.ward && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Ward</dt>
                    <dd className="mt-1 text-sm text-gray-900">{response.ward.name}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Submitted By</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {response.respondent?.name || 'Unknown User'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Submitted At</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(response.submittedAt).toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>
          </Card>

          {/* Report Data */}
          <Card className="lg:col-span-2">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Data</h2>
              {response.formTemplate?.fields && response.formTemplate.fields.length > 0 ? (
                <div className="space-y-4">
                  {response.formTemplate.fields.map((field, index) => {
                    // Try different ways to get the field value
                    let fieldValue = null;
                    if (response.responses) {
                      // Try field.label first (most common)
                      fieldValue = response.responses[field.label];
                      // If not found, try field.name
                      if (fieldValue === undefined && field.name) {
                        fieldValue = response.responses[field.name];
                      }
                      // If still not found, try field._id
                      if (fieldValue === undefined && field._id) {
                        fieldValue = response.responses[field._id];
                      }
                    }
                    
                    return (
                      <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <dt className="text-sm font-semibold text-gray-700 mb-2">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </dt>
                        <dd className="text-sm">
                          {renderFieldValue(field, fieldValue)}
                        </dd>
                        {field.description && (
                          <p className="text-xs text-gray-500 mt-2 italic">{field.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No Data Available</h3>
                  <p className="mt-1 text-sm text-gray-500">This report doesn't contain any data fields.</p>
                </div>
              )}
            </div>
          </Card>
        </div>


      </div>
    </Layout>
  );
}
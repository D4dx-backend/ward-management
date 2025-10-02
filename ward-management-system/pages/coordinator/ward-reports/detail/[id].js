import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../../../components/Layout';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';
export default function WardReportDetail() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id, ward, week, year } = router.query;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    } else if (status === 'authenticated' && id) {
      fetchReportDetail();
    }
  }, [status, session, router, id]);

  const fetchReportDetail = async () => {
    setLoading(true);
    try {
      console.log('Fetching report detail for ID:', id);
      const response = await axios.get(`/api/responses/${id}`);
      console.log('Report detail response:', response.data);
      setReport(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching report detail:', error);
      let errorMessage = 'Failed to fetch report details';
      if (error.response?.status === 403) {
        errorMessage = 'Access denied. You do not have permission to view this report.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Report not found. The report may have been deleted or the ID is invalid.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
  };

  const renderResponseValue = (value) => {
    if (typeof value === 'boolean') {
      return (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'Yes' : 'No'}
        </span>
      );
    }
    
    if (typeof value === 'object' && value !== null) {
      return (
        <div className="bg-gray-50 p-3 rounded border">
          <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(value, null, 2)}</pre>
        </div>
      );
    }

    if (typeof value === 'string' && value.length > 100) {
      return (
        <div className="bg-gray-50 p-3 rounded border">
          <p className="whitespace-pre-wrap text-sm">{value}</p>
        </div>
      );
    }
    
    return <span className="text-sm text-gray-900">{String(value)}</span>;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Head>
          <title>Report Detail - Ward Management System</title>
        </Head>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Report Detail</h1>
              <p className="mt-1 text-sm text-gray-600">Unable to load report details</p>
            </div>
            <Link href="/coordinator">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
          
          <Card>
            <div className="p-6 text-center">
              <div className="text-red-500 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchReportDetail}>Try Again</Button>
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
          <title>Report Not Found - Ward Management System</title>
        </Head>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Report Not Found</h1>
              <p className="mt-1 text-sm text-gray-600">The requested report could not be found</p>
            </div>
            <Link href="/coordinator">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>{`${ward} - Week ${week} Report - Ward Management System`}</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {ward} - Week {week} Report
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Detailed view of ward report for week {week}, {year}
            </p>
          </div>
          <div className="flex space-x-3">
            <Link href={`/coordinator/ward-reports/edit/${id}`}>
              <Button variant="primary">
                <svg className="w-4 h-4 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Report
              </Button>
            </Link>
            <Link href="/coordinator/ward-reports">
              <Button variant="outline">All Reports</Button>
            </Link>
            <Link href="/coordinator">
              <Button variant="outline">Dashboard</Button>
            </Link>
          </div>
        </div>

        {/* Report Summary */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Report Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Ward</div>
                <div className="text-lg font-semibold text-gray-900">{report.ward?.name}</div>
                <div className="text-sm text-gray-500">{report.ward?.district}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Week/Year</div>
                <div className="text-lg font-semibold text-gray-900">Week {report.weekNumber}</div>
                <div className="text-sm text-gray-500">{report.year}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Submitted By</div>
                <div className="text-lg font-semibold text-gray-900">{report.respondent?.name}</div>
                <div className="text-sm text-gray-500">{report.respondent?.role}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Submitted At</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatDate(report.submittedAt)}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Report Responses */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Report Responses</h3>
            
            {report.responses && Object.keys(report.responses).length > 0 ? (
              <div className="space-y-6">
                {Object.entries(report.responses).map(([question, answer], index) => {
                  const displayQuestion = question.replace(/_sub_\d+$/, '').replace(/_/g, ' ');
                  return (
                    <div key={index} className="border-l-4 border-blue-500 pl-6 py-3">
                      <div className="flex flex-col space-y-2">
                        <h4 className="text-sm font-medium text-gray-900 leading-relaxed">
                          {displayQuestion}
                        </h4>
                        <div className="text-sm text-gray-700">
                          {renderResponseValue(answer)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500">No response data available for this report</p>
              </div>
            )}
          </div>
        </Card>

        {/* Form Template Info */}
        {report.formTemplate && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Form Information</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Form Title:</span>
                    <span className="ml-2 font-medium">{report.formTemplate.title}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Form Type:</span>
                    <span className="ml-2 font-medium capitalize">{report.formTemplate.formType}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Report ID:</span>
                    <span className="ml-2 font-mono text-xs">{report._id}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 pt-6">
          <Link href={`/coordinator/ward-reports/edit/${id}`}>
            <Button variant="primary">
              <svg className="w-4 h-4 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Report
            </Button>
          </Link>
          <Link href={`/coordinator/ward-analytics/${report.ward?._id}?name=${encodeURIComponent(report.ward?.name || '')}`}>
            <Button>View Ward Analytics</Button>
          </Link>
          <Link href="/coordinator/ward-reports">
            <Button variant="outline">View All Reports</Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { ShimmerDashboard } from '../../../components/Shimmer';

export default function WardAnalytics() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id, name } = router.query;
  const [wardData, setWardData] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    } else if (status === 'authenticated' && id) {
      fetchWardAnalytics();
    }
  }, [status, session, router, id]);

  const fetchWardAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch ward details and reports
      const [wardResponse, reportsResponse] = await Promise.all([
        axios.get(`/api/wards/${id}`),
        axios.get('/api/responses', {
          params: {
            formType: 'wardReport',
            wardId: id
          }
        })
      ]);

      setWardData(wardResponse.data);
      setReports(reportsResponse.data);
      setError('');
    } catch (error) {
      console.error('Error fetching ward analytics:', error);
      setError('Failed to fetch ward analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getReportStats = () => {
    const currentYear = new Date().getFullYear();
    const currentYearReports = reports.filter(report => report.year === currentYear);
    const totalReports = reports.length;
    const thisYearReports = currentYearReports.length;
    
    // Get recent reports (last 4 weeks)
    const recentReports = reports
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, 4);

    return {
      totalReports,
      thisYearReports,
      recentReports
    };
  };

  if (loading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Head>
          <title>Ward Analytics - Ward Management System</title>
        </Head>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ward Analytics</h1>
              <p className="mt-1 text-sm text-gray-600">Unable to load ward analytics</p>
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
              <Button onClick={fetchWardAnalytics}>Try Again</Button>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  const stats = getReportStats();

  return (
    <Layout>
      <Head>
        <title>{`${name || 'Ward'} Analytics - Ward Management System`}</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {name || wardData?.name || 'Ward'} Analytics
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Comprehensive analytics and reporting data for this ward
            </p>
          </div>
          <div className="flex space-x-3">
            <Link href="/coordinator/ward-reports">
              <Button variant="outline">All Reports</Button>
            </Link>
            <Link href="/coordinator">
              <Button variant="outline">Dashboard</Button>
            </Link>
          </div>
        </div>

        {/* Ward Information */}
        {wardData && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Ward Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Ward Name</div>
                  <div className="text-lg font-semibold text-gray-900">{wardData.name}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">District</div>
                  <div className="text-lg font-semibold text-gray-900">{wardData.district}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Ward Admin</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {wardData.wardAdmin?.name || 'Not assigned'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Status</div>
                  <div className="text-lg font-semibold text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      wardData.wardAdmin ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {wardData.wardAdmin ? 'Active' : 'Pending Assignment'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Report Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">{stats.totalReports}</div>
                  <div className="text-sm text-gray-600">Total Reports</div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a2 2 0 100-4 2 2 0 000 4zm0 0v4a2 2 0 002 2h6a2 2 0 002-2v-4a2 2 0 00-2-2H10a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">{stats.thisYearReports}</div>
                  <div className="text-sm text-gray-600">This Year</div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">{stats.recentReports.length}</div>
                  <div className="text-sm text-gray-600">Recent Reports</div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Reports */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Reports</h3>
            
            {stats.recentReports.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Week/Year
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted At
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.recentReports.map((report) => (
                      <tr key={report._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">Week {report.weekNumber}</div>
                          <div className="text-sm text-gray-500">{report.year}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{report.respondent?.name}</div>
                          <div className="text-sm text-gray-500">{report.respondent?.role}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(report.submittedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link href={`/coordinator/ward-reports/detail/${report._id}?ward=${encodeURIComponent(name || wardData?.name || '')}&week=${report.weekNumber}&year=${report.year}`}>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500">No reports have been submitted for this ward yet</p>
              </div>
            )}
          </div>
        </Card>

        {/* Additional Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Ward Analytics:</strong> This page provides comprehensive analytics for the selected ward, 
                including report submission history, statistics, and detailed information about ward activities.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';
import { useApiData } from '../../hooks/useApiData';

export default function CoordinatorActivityLogs() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({
    action: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    limit: 50
  });
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    // Check if user is authenticated and is coordinator
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchLogs();
    }
  }, [status, session, router, filter]);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);

      // Build query string
      const queryParams = new URLSearchParams();
      Object.keys(filter).forEach(key => {
        if (filter[key]) {
          queryParams.append(key, filter[key]);
        }
      });

      const response = await axios.get(`/api/activity-logs?${queryParams.toString()}`);
      const responseData = response.data;

      setLogs(responseData.logs || []);
      setTotalPages(responseData.totalPages || 1);
      setError('');
    } catch (error) {
      setError('Failed to fetch activity logs');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionBadgeColor = (action) => {
    const colors = {
      LOGIN: 'bg-green-100 text-green-800',
      LOGOUT: 'bg-gray-100 text-gray-800',
      FORM_SUBMIT: 'bg-blue-100 text-blue-800',
      FORM_CREATE: 'bg-purple-100 text-purple-800',
      FORM_UPDATE: 'bg-yellow-100 text-yellow-800',
      FORM_DELETE: 'bg-red-100 text-red-800',
      USER_CREATE: 'bg-indigo-100 text-indigo-800',
      USER_UPDATE: 'bg-orange-100 text-orange-800',
      USER_DELETE: 'bg-red-100 text-red-800',
      REPORT_VIEW: 'bg-cyan-100 text-cyan-800',
      REPORT_EXPORT: 'bg-teal-100 text-teal-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const formatActionText = (action) => {
    const actionTexts = {
      LOGIN: 'Login',
      LOGOUT: 'Logout',
      FORM_SUBMIT: 'Form Submit',
      FORM_CREATE: 'Form Create',
      FORM_UPDATE: 'Form Update',
      FORM_DELETE: 'Form Delete',
      USER_CREATE: 'User Create',
      USER_UPDATE: 'User Update',
      USER_DELETE: 'User Delete',
      REPORT_VIEW: 'Report View',
      REPORT_EXPORT: 'Report Export',
    };
    return actionTexts[action] || action.replace('_', ' ');
  };

  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleFilterChange = (key, value) => {
    setFilter(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handlePageChange = (newPage) => {
    setFilter(prev => ({
      ...prev,
      page: newPage
    }));
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
        <title>Activity Logs - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
          <p className="mt-1 text-sm text-gray-600">View district activity logs</p>
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
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Filter Logs</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                <select
                  value={filter.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Actions</option>
                  <option value="LOGIN">Login</option>
                  <option value="LOGOUT">Logout</option>
                  <option value="FORM_SUBMIT">Form Submit</option>
                  <option value="REPORT_VIEW">Report View</option>
                  <option value="REPORT_EXPORT">Report Export</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={filter.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={filter.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => setFilter({
                    action: '',
                    dateFrom: '',
                    dateTo: '',
                    page: 1,
                    limit: 50
                  })}
                  variant="outline"
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {logs.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-2 text-sm">No activity logs found</p>
                </div>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log._id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {log.user?.name?.charAt(0) || 'U'}
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <p className="text-sm font-medium text-gray-900">
                            {log.user?.name || 'Unknown User'}
                          </p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionBadgeColor(log.action)}`}>
                            {formatActionText(log.action)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {log.description || 'No description available'}
                        </p>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                          {log.district && (
                            <span>District: {log.district}</span>
                          )}
                          {log.ward?.name && (
                            <span>Ward: {log.ward.name}</span>
                          )}
                          {log.ipAddress && (
                            <span>IP: {log.ipAddress}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-sm text-gray-500">
                      {formatDateTime(log.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {filter.page} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handlePageChange(filter.page - 1)}
                    disabled={filter.page <= 1}
                    variant="outline"
                    size="sm"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => handlePageChange(filter.page + 1)}
                    disabled={filter.page >= totalPages}
                    variant="outline"
                    size="sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> This shows system logs for activities in your district, including your own actions and those of Ward Incharges under your supervision.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
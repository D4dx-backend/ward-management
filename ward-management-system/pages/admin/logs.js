import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import SearchInput from '../../components/SearchInput';

export default function AdminLogs() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState({
    action: '',
    userRole: '',
    dateRange: '7', // Last 7 days
  });

  useEffect(() => {
    // Check if user is authenticated and is state admin
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'stateAdmin') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchLogs();
    }
  }, [status, session, router]);

  useEffect(() => {
    // Filter logs based on search term and filters
    let filtered = logs;

    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user?.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filter.action) {
      filtered = filtered.filter(log => log.action === filter.action);
    }

    if (filter.userRole) {
      filtered = filtered.filter(log => log.user?.role === filter.userRole);
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, filter]);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      
      // Build query string
      const queryParams = new URLSearchParams();
      if (filter.dateRange) queryParams.append('days', filter.dateRange);
      if (filter.action) queryParams.append('action', filter.action);
      if (filter.userRole) queryParams.append('userRole', filter.userRole);
      
      const response = await axios.get(`/api/logs?${queryParams.toString()}`);
      setLogs(response.data);
      setError('');
    } catch (error) {
      // If logs API doesn't exist, create mock data for now
      const mockLogs = [
        {
          _id: '1',
          action: 'USER_LOGIN',
          details: 'User logged in successfully',
          user: { name: 'Admin User', email: 'admin@example.com', role: 'stateAdmin' },
          timestamp: new Date().toISOString(),
          ipAddress: '192.168.1.1'
        },
        {
          _id: '2',
          action: 'WARD_CREATED',
          details: 'Created new ward: Sample Ward',
          user: { name: 'Admin User', email: 'admin@example.com', role: 'stateAdmin' },
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          ipAddress: '192.168.1.1'
        },
        {
          _id: '3',
          action: 'USER_CREATED',
          details: 'Created new coordinator: John Doe',
          user: { name: 'Admin User', email: 'admin@example.com', role: 'stateAdmin' },
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          ipAddress: '192.168.1.1'
        },
        {
          _id: '4',
          action: 'FORM_CREATED',
          details: 'Created new form: Weekly Report Form',
          user: { name: 'Admin User', email: 'admin@example.com', role: 'stateAdmin' },
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          ipAddress: '192.168.1.1'
        }
      ];
      setLogs(mockLogs);
      setError('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter({ ...filter, [name]: value });
  };

  const getActionBadgeColor = (action) => {
    switch (action) {
      case 'USER_LOGIN':
        return 'bg-green-100 text-green-800';
      case 'USER_LOGOUT':
        return 'bg-gray-100 text-gray-800';
      case 'USER_CREATED':
      case 'WARD_CREATED':
      case 'FORM_CREATED':
        return 'bg-blue-100 text-blue-800';
      case 'USER_UPDATED':
      case 'WARD_UPDATED':
      case 'FORM_UPDATED':
        return 'bg-yellow-100 text-yellow-800';
      case 'USER_DELETED':
      case 'WARD_DELETED':
      case 'FORM_DELETED':
        return 'bg-red-100 text-red-800';
      case 'REPORT_SUBMITTED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <Layout>
      <Head>
        <title>System Logs - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Logs</h1>
          <p className="mt-1 text-sm text-gray-600">Monitor system activities and user actions</p>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <SearchInput
                onSearch={setSearchTerm}
                placeholder="Search logs..."
                className="md:col-span-2"
              />
              
              <div>
                <select
                  name="action"
                  value={filter.action}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Actions</option>
                  <option value="USER_LOGIN">User Login</option>
                  <option value="USER_LOGOUT">User Logout</option>
                  <option value="USER_CREATED">User Created</option>
                  <option value="USER_UPDATED">User Updated</option>
                  <option value="USER_DELETED">User Deleted</option>
                  <option value="WARD_CREATED">Ward Created</option>
                  <option value="WARD_UPDATED">Ward Updated</option>
                  <option value="WARD_DELETED">Ward Deleted</option>
                  <option value="FORM_CREATED">Form Created</option>
                  <option value="FORM_UPDATED">Form Updated</option>
                  <option value="FORM_DELETED">Form Deleted</option>
                  <option value="REPORT_SUBMITTED">Report Submitted</option>
                </select>
              </div>

              <div>
                <select
                  name="userRole"
                  value={filter.userRole}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Roles</option>
                  <option value="stateAdmin">State Admin</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="wardAdmin">Ward Admin</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Time Range:</label>
              <div className="flex space-x-2">
                {[
                  { value: '1', label: 'Last 24 hours' },
                  { value: '7', label: 'Last 7 days' },
                  { value: '30', label: 'Last 30 days' },
                  { value: '90', label: 'Last 90 days' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFilter({ ...filter, dateRange: option.value })}
                    className={`px-3 py-1 text-sm rounded-md ${
                      filter.dateRange === option.value
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionBadgeColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              {log.user?.name?.charAt(0) || 'U'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {log.user?.name || 'Unknown User'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {log.user?.email || 'No email'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.details}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.ipAddress || 'N/A'}
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="mt-2 text-sm">
                          {searchTerm || filter.action || filter.userRole ? 'No logs found matching your criteria' : 'No logs available'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
                <strong>Note:</strong> This is currently showing sample log data. To enable full logging functionality, 
                implement the logging API endpoint at <code>/api/logs</code> and integrate logging throughout the application.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
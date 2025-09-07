import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import SearchInput from '../../components/SearchInput';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';
import { useApiData } from '../../hooks/useApiData';

export default function CoordinatorActivity() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState({
    action: '',
    dateRange: '7', // Last 7 days
  });

  useEffect(() => {
    // Check if user is authenticated and is coordinator
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchActivities();
    }
  }, [status, session, router]);

  useEffect(() => {
    // Filter activities based on search term and filters
    let filtered = activities || [];

    if (searchTerm) {
      filtered = filtered.filter(activity =>
        activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.user?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filter.action) {
      filtered = filtered.filter(activity => activity.action === filter.action);
    }

    setFilteredActivities(filtered);
  }, [activities, searchTerm, filter]);

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      
      // Mock data for coordinator activities
      const mockActivities = [
        {
          _id: '1',
          action: 'REPORT_SUBMITTED',
          details: 'Submitted weekly coordinator report for Week 29',
          user: { name: session?.user?.name || 'Current User', role: 'coordinator' },
          timestamp: new Date().toISOString(),
          ipAddress: '192.168.1.100'
        },
        {
          _id: '2',
          action: 'WARD_UPDATED',
          details: 'Updated ward information for Panchayath Ward 1',
          user: { name: session?.user?.name || 'Current User', role: 'coordinator' },
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          ipAddress: '192.168.1.100'
        },
        {
          _id: '3',
          action: 'USER_CREATED',
          details: 'Created new Ward Incharge: Jane Smith',
          user: { name: session?.user?.name || 'Current User', role: 'coordinator' },
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          ipAddress: '192.168.1.100'
        },
        {
          _id: '4',
          action: 'WARD_ADMIN_ASSIGNED',
          details: 'Assigned Ward Incharge to Panchayath Ward 2',
          user: { name: session?.user?.name || 'Current User', role: 'coordinator' },
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          ipAddress: '192.168.1.100'
        },
        {
          _id: '5',
          action: 'REPORT_REVIEWED',
          details: 'Reviewed ward report from Panchayath Ward 1',
          user: { name: session?.user?.name || 'Current User', role: 'coordinator' },
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          ipAddress: '192.168.1.100'
        },
        {
          _id: '6',
          action: 'USER_LOGIN',
          details: 'Logged into the system',
          user: { name: session?.user?.name || 'Current User', role: 'coordinator' },
          timestamp: new Date(Date.now() - 259200000).toISOString(),
          ipAddress: '192.168.1.100'
        }
      ];
      
      setActivities(mockActivities);
      setError('');
    } catch (error) {
      setError('Failed to fetch activities');
      console.error(error);
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
      case 'WARD_ADMIN_ASSIGNED':
        return 'bg-blue-100 text-blue-800';
      case 'WARD_UPDATED':
      case 'USER_UPDATED':
        return 'bg-yellow-100 text-yellow-800';
      case 'REPORT_SUBMITTED':
      case 'REPORT_REVIEWED':
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
          <p className="mt-1 text-sm text-gray-600">Monitor your recent activities and actions</p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <SearchInput
                onSearch={setSearchTerm}
                placeholder="Search activities..."
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
                  <option value="USER_CREATED">User Created</option>
                  <option value="USER_UPDATED">User Updated</option>
                  <option value="WARD_CREATED">Ward Created</option>
                  <option value="WARD_UPDATED">Ward Updated</option>
                  <option value="WARD_ADMIN_ASSIGNED">Ward Incharge Assigned</option>
                  <option value="REPORT_SUBMITTED">Report Submitted</option>
                  <option value="REPORT_REVIEWED">Report Reviewed</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Time Range:</label>
              <div className="flex space-x-2">
                {[
                  { value: '1', label: 'Last 24 hours' },
                  { value: '7', label: 'Last 7 days' },
                  { value: '30', label: 'Last 30 days' }
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
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredActivities.map((activity) => (
                  <tr key={activity._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTimestamp(activity.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionBadgeColor(activity.action)}`}>
                        {activity.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {activity.details}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {activity.ipAddress || 'N/A'}
                    </td>
                  </tr>
                ))}
                {filteredActivities.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="mt-2 text-sm">
                          {searchTerm || filter.action ? 'No activities found matching your criteria' : 'No activities available'}
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
                <strong>Note:</strong> This shows your recent activities and actions within the system. 
                Activities are automatically logged when you perform actions like submitting reports, managing wards, or updating user information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
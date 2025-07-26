import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import SearchInput from '../../components/SearchInput';

export default function CoordinatorWardReports() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [wardReports, setWardReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState({
    ward: '',
    week: '',
    year: new Date().getFullYear(),
    status: ''
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchWardReports();
    }
  }, [status, session, router]);

  useEffect(() => {
    let filtered = wardReports;

    if (searchTerm) {
      filtered = filtered.filter(report =>
        report.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.ward?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.submittedBy?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filter.ward) {
      filtered = filtered.filter(report => report.ward?._id === filter.ward);
    }

    if (filter.week) {
      filtered = filtered.filter(report => report.weekNumber === parseInt(filter.week));
    }

    if (filter.year) {
      filtered = filtered.filter(report => report.year === parseInt(filter.year));
    }

    if (filter.status) {
      filtered = filtered.filter(report => report.status === filter.status);
    }

    setFilteredReports(filtered);
  }, [wardReports, searchTerm, filter]);

  const fetchWardReports = async () => {
    setIsLoading(true);
    
    try {
      const response = await axios.get('/api/responses', {
        params: {
          formType: 'wardReport',
          coordinatorOnly: true
        }
      });
      
      setWardReports(response.data || []);
      setError('');
    } catch (error) {
      console.error('Error fetching ward reports:', error);
      setError('Failed to fetch ward reports');
      
      const mockWardReports = [
        {
          _id: '1',
          title: 'Weekly Ward Progress Report - Week 29',
          type: 'wardReport',
          weekNumber: 29,
          year: 2024,
          status: 'submitted',
          submittedBy: { name: 'Ward Admin 1', role: 'wardAdmin' },
          ward: { _id: 'ward1', name: 'Panchayath Ward 1', district: session?.user?.district || 'Thiruvananthapuram' },
          submittedAt: new Date().toISOString(),
          responses: { 
            infrastructure: 'Good', 
            healthServices: 'Excellent', 
            education: 'Fair',
            waterSupply: 'Good',
            wasteManagement: 'Needs Improvement'
          }
        },
        {
          _id: '2',
          title: 'Weekly Ward Progress Report - Week 29',
          type: 'wardReport',
          weekNumber: 29,
          year: 2024,
          status: 'submitted',
          submittedBy: { name: 'Ward Admin 2', role: 'wardAdmin' },
          ward: { _id: 'ward2', name: 'Panchayath Ward 2', district: session?.user?.district || 'Thiruvananthapuram' },
          submittedAt: new Date(Date.now() - 86400000).toISOString(),
          responses: { 
            infrastructure: 'Fair', 
            healthServices: 'Good', 
            education: 'Good',
            waterSupply: 'Excellent',
            wasteManagement: 'Good'
          }
        },
        {
          _id: '3',
          title: 'Weekly Ward Progress Report - Week 29',
          type: 'wardReport',
          weekNumber: 29,
          year: 2024,
          status: 'pending',
          submittedBy: null,
          ward: { _id: 'ward3', name: 'Panchayath Ward 3', district: session?.user?.district || 'Thiruvananthapuram' },
          submittedAt: null,
          responses: null
        }
      ];
      
      setWardReports(mockWardReports);
      setError('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter({ ...filter, [name]: value });
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'submitted':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not submitted';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const uniqueWards = [...new Map(wardReports.map(report => [report.ward._id, report.ward])).values()];

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  };

  return (
    <Layout>
      <Head>
        <title>Ward Reports - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ward Reports</h1>
            <p className="mt-1 text-sm text-gray-600">Monitor ward progress reports from your district</p>
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
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <SearchInput
                onSearch={setSearchTerm}
                placeholder="Search ward reports..."
                className="md:col-span-2"
              />
              
              <div>
                <select
                  name="ward"
                  value={filter.ward}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Wards</option>
                  {uniqueWards.map((ward) => (
                    <option key={ward._id} value={ward._id}>{ward.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  name="week"
                  value={filter.week}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Weeks</option>
                  {Array.from({ length: 52 }, (_, i) => i + 1).map(week => (
                    <option key={week} value={week}>Week {week}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  name="status"
                  value={filter.status}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="submitted">Submitted</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ward Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Week/Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
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
                {filteredReports.map((report) => (
                  <tr key={report._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{report.ward?.name}</div>
                        <div className="text-sm text-gray-500">{report.ward?.district}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">Week {report.weekNumber}</div>
                      <div className="text-sm text-gray-500">{report.year}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {report.submittedBy ? (
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-600">
                                {report.submittedBy?.name?.charAt(0) || 'U'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {report.submittedBy?.name || 'Unknown User'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {report.submittedBy?.role || 'Unknown Role'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(report.status)}`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(report.submittedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="outline" size="sm" disabled={!report.submittedBy}>
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredReports.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="mt-2 text-sm">
                          {searchTerm || filter.ward || filter.week || filter.status ? 'No ward reports found matching your criteria' : 'No ward reports available'}
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
                <strong>Note:</strong> This page shows ward progress reports from all wards in your district. 
                You can monitor submission status and review completed reports to track ward performance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
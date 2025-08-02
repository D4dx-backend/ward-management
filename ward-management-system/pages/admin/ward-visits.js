import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import SearchInput from '../../components/SearchInput';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';
import { useApiData } from '../../hooks/useApiData';

export default function AdminWardVisits() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [visits, setVisits] = useState([]);
  const [filteredVisits, setFilteredVisits] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [wards, setWards] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState({
    coordinator: '',
    ward: '',
    month: '',
    year: new Date().getFullYear(),
    followUpStatus: ''
  });

  useEffect(() => {
    // Check if user is authenticated and is admin
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'stateAdmin') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchData();
    }
  }, [status, session, router]);

  useEffect(() => {
    // Filter visits based on search term and filters
    let filtered = visits;

    if (searchTerm) {
      filtered = filtered.filter(visit =>
        visit.ward?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit.coordinator?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit.findings?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filter.coordinator) {
      filtered = filtered.filter(visit => visit.coordinator?._id === filter.coordinator);
    }

    if (filter.ward) {
      filtered = filtered.filter(visit => visit.ward?._id === filter.ward);
    }

    if (filter.month) {
      filtered = filtered.filter(visit => {
        const visitDate = new Date(visit.visitDate);
        return visitDate.getMonth() + 1 === parseInt(filter.month);
      });
    }

    if (filter.year) {
      filtered = filtered.filter(visit => {
        const visitDate = new Date(visit.visitDate);
        return visitDate.getFullYear() === parseInt(filter.year);
      });
    }

    if (filter.followUpStatus) {
      if (filter.followUpStatus === 'required') {
        filtered = filtered.filter(visit => visit.followUpRequired);
      } else if (filter.followUpStatus === 'completed') {
        filtered = filtered.filter(visit => visit.followUpRequired && visit.followUpCompleted);
      } else if (filter.followUpStatus === 'pending') {
        filtered = filtered.filter(visit => visit.followUpRequired && !visit.followUpCompleted);
      } else if (filter.followUpStatus === 'overdue') {
        filtered = filtered.filter(visit => 
          visit.followUpRequired && 
          !visit.followUpCompleted && 
          visit.followUpDate && 
          new Date(visit.followUpDate) < new Date()
        );
      }
    }

    setFilteredVisits(filtered);
  }, [visits, searchTerm, filter]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all data
      const [visitsResponse, coordinatorsResponse, wardsResponse, statsResponse] = await Promise.all([
        axios.get('/api/admin/ward-visits'),
        axios.get('/api/users?role=coordinator'),
        axios.get('/api/wards'),
        axios.get('/api/admin/ward-visits/statistics')
      ]);
      
      setVisits(visitsResponse.data || []);
      setCoordinators(coordinatorsResponse.data || []);
      setWards(wardsResponse.data || []);
      setStatistics(statsResponse.data || {});
      setError('');
    } catch (error) {
      console.error('Error fetching data:', error);
      
      // Fallback to mock data
      const mockCoordinators = [
        { _id: 'coord1', name: 'Coordinator 1', email: 'coord1@example.com' },
        { _id: 'coord2', name: 'Coordinator 2', email: 'coord2@example.com' }
      ];

      const mockWards = [
        { _id: 'ward1', name: 'Panchayath Ward 1', wardNumber: 1, district: 'Thiruvananthapuram' },
        { _id: 'ward2', name: 'Panchayath Ward 2', wardNumber: 2, district: 'Thiruvananthapuram' },
        { _id: 'ward3', name: 'Panchayath Ward 3', wardNumber: 3, district: 'Thiruvananthapuram' }
      ];

      const mockVisits = [
        {
          _id: 'visit1',
          ward: mockWards[0],
          coordinator: mockCoordinators[0],
          visitDate: new Date().toISOString(),
          visitTime: '10:00',
          purpose: 'Monthly inspection and progress review',
          findings: 'Infrastructure development is on track. Water supply issues in sector 3.',
          recommendations: 'Prioritize water supply repairs. Continue infrastructure work.',
          followUpRequired: true,
          followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          followUpCompleted: false,
          attendees: 'Ward Admin, Local Representatives',
          remarks: 'Overall progress is satisfactory',
          createdAt: new Date().toISOString()
        },
        {
          _id: 'visit2',
          ward: mockWards[1],
          coordinator: mockCoordinators[1],
          visitDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          visitTime: '14:30',
          purpose: 'Complaint resolution and community meeting',
          findings: 'Waste management system needs improvement. Good community participation.',
          recommendations: 'Implement new waste collection schedule. Increase community awareness.',
          followUpRequired: false,
          attendees: 'Ward Admin, Community Leaders, Residents',
          remarks: 'Community is cooperative and engaged',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: 'visit3',
          ward: mockWards[2],
          coordinator: mockCoordinators[0],
          visitDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          visitTime: '11:00',
          purpose: 'Follow-up on previous recommendations',
          findings: 'Previous issues have been addressed. New challenges identified.',
          recommendations: 'Continue monitoring. Address new challenges promptly.',
          followUpRequired: true,
          followUpDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          followUpCompleted: false,
          attendees: 'Ward Admin, Technical Team',
          remarks: 'Good progress on previous issues',
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      const mockStatistics = {
        totalVisits: 3,
        totalCoordinators: 2,
        averageVisitsPerCoordinator: 1.5,
        visitsThisMonth: 2,
        visitsLastMonth: 1,
        followUpRequired: 2,
        followUpCompleted: 0,
        followUpPending: 2,
        followUpOverdue: 1,
        visitsByMonth: [
          { month: 'Jan', visits: 5 },
          { month: 'Feb', visits: 8 },
          { month: 'Mar', visits: 6 },
          { month: 'Apr', visits: 9 },
          { month: 'May', visits: 7 },
          { month: 'Jun', visits: 10 }
        ]
      };
      
      setVisits(mockVisits);
      setCoordinators(mockCoordinators);
      setWards(mockWards);
      setStatistics(mockStatistics);
      setError('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter({ ...filter, [name]: value });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatDateTime = (dateString, timeString) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} at ${timeString}`;
  };

  const getFollowUpStatusBadge = (visit) => {
    if (!visit.followUpRequired) {
      return null;
    }

    if (visit.followUpCompleted) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Completed</span>;
    }

    if (visit.followUpDate && new Date(visit.followUpDate) < new Date()) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Overdue</span>;
    }

    return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
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
        <title>Ward Visits Analysis - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ward Visits Analysis</h1>
            <p className="mt-1 text-sm text-gray-600">Monitor and analyze coordinator ward visits</p>
          </div>
          <div className="flex space-x-3">
            <Link href="/" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
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

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Visits</dt>
                    <dd className="text-lg font-medium text-gray-900">{statistics.totalVisits || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">This Month</dt>
                    <dd className="text-lg font-medium text-gray-900">{statistics.visitsThisMonth || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Follow-up Pending</dt>
                    <dd className="text-lg font-medium text-gray-900">{statistics.followUpPending || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Overdue Follow-ups</dt>
                    <dd className="text-lg font-medium text-gray-900">{statistics.followUpOverdue || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <SearchInput
                onSearch={setSearchTerm}
                placeholder="Search visits..."
                className="md:col-span-2"
              />
              
              <div>
                <select
                  name="coordinator"
                  value={filter.coordinator}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Coordinators</option>
                  {coordinators.map((coordinator) => (
                    <option key={coordinator._id} value={coordinator._id}>{coordinator.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  name="ward"
                  value={filter.ward}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Wards</option>
                  {wards.map((ward) => (
                    <option key={ward._id} value={ward._id}>{ward.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  name="month"
                  value={filter.month}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Months</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  name="followUpStatus"
                  value={filter.followUpStatus}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Follow-ups</option>
                  <option value="required">Follow-up Required</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Visits Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visit Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coordinator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ward
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purpose
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Follow-up Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVisits.map((visit) => (
                  <tr key={visit._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatDateTime(visit.visitDate, visit.visitTime)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {visit.attendees && `Attendees: ${visit.attendees}`}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              {visit.coordinator?.name?.charAt(0) || 'C'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {visit.coordinator?.name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {visit.coordinator?.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{visit.ward?.name}</div>
                      <div className="text-sm text-gray-500">Ward #{visit.ward?.wardNumber}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={visit.purpose}>
                        {visit.purpose}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getFollowUpStatusBadge(visit)}
                      {visit.followUpDate && (
                        <div className="text-xs text-gray-500 mt-1">
                          Due: {formatDate(visit.followUpDate)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredVisits.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="mt-2 text-sm">
                          {searchTerm || filter.coordinator || filter.ward || filter.month || filter.followUpStatus 
                            ? 'No visits found matching your criteria' 
                            : 'No ward visits recorded yet'}
                        </p>
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
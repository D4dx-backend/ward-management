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
import Modal from '../../components/Modal';
export default function WardManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [wards, setWards] = useState([]);
  const [filteredWards, setFilteredWards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWard, setSelectedWard] = useState(null);
  const [showWardModal, setShowWardModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showVisitsModal, setShowVisitsModal] = useState(false);
  const [wardReports, setWardReports] = useState([]);
  const [wardVisits, setWardVisits] = useState([]);
  const [wardClusters, setWardClusters] = useState([]);
  const [filter, setFilter] = useState({
    status: '',
    reportStatus: '',
    sortBy: 'name'
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchWards();
    }
  }, [status, session, router]);

  useEffect(() => {
    let filtered = wards || [];

    if (searchTerm) {
      filtered = filtered.filter(ward =>
        ward.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ward.wardAdmin?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ward.district?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filter.status) {
      filtered = filtered.filter(ward => {
        switch (filter.status) {
          case 'active':
            return ward.wardAdmin && ward.isActive;
          case 'inactive':
            return !ward.wardAdmin || !ward.isActive;
          case 'no-admin':
            return !ward.wardAdmin;
          default:
            return true;
        }
      });
    }

    if (filter.reportStatus) {
      filtered = filtered.filter(ward => {
        switch (filter.reportStatus) {
          case 'up-to-date':
            return ward.reportStatus === 'up-to-date';
          case 'behind':
            return ward.reportStatus === 'behind';
          case 'overdue':
            return ward.reportStatus === 'overdue';
          default:
            return true;
        }
      });
    }

    // Sort wards
    filtered.sort((a, b) => {
      switch (filter.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'reports':
          return (b.submittedReports || 0) - (a.submittedReports || 0);
        case 'completion':
          return (b.completionRate || 0) - (a.completionRate || 0);
        case 'lastActivity':
          return new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0);
        default:
          return a.name.localeCompare(b.name);
      }
    });

    setFilteredWards(filtered);
  }, [wards, searchTerm, filter]);

  const fetchWards = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/coordinator/wards-detailed');
      setWards(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching wards:', error);
      setError('Failed to load ward data');
      
      // Mock data for development
      const mockWards = [
        {
          _id: 'ward1',
          name: 'Panchayath Ward 1',
          wardNumber: 1,
          district: 'Thiruvananthapuram',
          panchayath: 'Neyyattinkara',
          isActive: true,
          wardAdmin: {
            _id: 'admin1',
            name: 'Admin One',
            email: 'admin1@example.com',
            mobileNumber: '+91 9876543210',
            lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          },
          submittedReports: 15,
          expectedReports: 20,
          completionRate: 75,
          lastActivity: new Date().toISOString(),
          reportStatus: 'up-to-date',
          totalClusters: 8,
          visitedClusters: 6,
          housesVisited: 120,
          pendingTasks: 3
        },
        {
          _id: 'ward2',
          name: 'Panchayath Ward 2',
          wardNumber: 2,
          district: 'Thiruvananthapuram',
          panchayath: 'Neyyattinkara',
          isActive: true,
          wardAdmin: {
            _id: 'admin2',
            name: 'Admin Two',
            email: 'admin2@example.com',
            mobileNumber: '+91 9876543211',
            lastLogin: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
          },
          submittedReports: 8,
          expectedReports: 20,
          completionRate: 40,
          lastActivity: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          reportStatus: 'behind',
          totalClusters: 6,
          visitedClusters: 3,
          housesVisited: 65,
          pendingTasks: 7
        },
        {
          _id: 'ward3',
          name: 'Panchayath Ward 3',
          wardNumber: 3,
          district: 'Thiruvananthapuram',
          panchayath: 'Neyyattinkara',
          isActive: false,
          wardAdmin: null,
          submittedReports: 0,
          expectedReports: 20,
          completionRate: 0,
          lastActivity: null,
          reportStatus: 'overdue',
          totalClusters: 5,
          visitedClusters: 0,
          housesVisited: 0,
          pendingTasks: 12
        }
      ];
      setWards(mockWards);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWardDetails = async (wardId) => {
    try {
      const [reportsResponse, visitsResponse, clustersResponse] = await Promise.all([
        axios.get(`/api/coordinator/ward-reports?wardId=${wardId}`),
        axios.get(`/api/coordinator/ward-visits?wardId=${wardId}`),
        axios.get(`/api/coordinator/ward-clusters?wardId=${wardId}`)
      ]);

      setWardReports(reportsResponse.data || []);
      setWardVisits(visitsResponse.data || []);
      setWardClusters(clustersResponse.data || []);
    } catch (error) {
      console.error('Error fetching ward details:', error);
      // Set mock data for development
      setWardReports([
        { _id: 'r1', title: 'Weekly Report - Week 5', submittedAt: new Date().toISOString(), status: 'submitted' },
        { _id: 'r2', title: 'Infrastructure Report', submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), status: 'submitted' }
      ]);
      setWardVisits([
        { _id: 'v1', visitDate: new Date().toISOString(), purpose: 'Monthly inspection', findings: 'Good progress' }
      ]);
      setWardClusters([
        { _id: 'c1', name: 'Cluster A', housesVisited: 45, totalHouses: 60, completionRate: 75 },
        { _id: 'c2', name: 'Cluster B', housesVisited: 30, totalHouses: 50, completionRate: 60 }
      ]);
    }
  };

  const handleViewWard = async (ward) => {
    setSelectedWard(ward);
    await fetchWardDetails(ward._id);
    setShowWardModal(true);
  };

  const handleViewReports = (ward) => {
    setSelectedWard(ward);
    setShowReportsModal(true);
  };

  const handleViewVisits = (ward) => {
    setSelectedWard(ward);
    setShowVisitsModal(true);
  };

  const getStatusBadge = (ward) => {
    if (!ward.wardAdmin) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">No Admin</span>;
    }
    if (!ward.isActive) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Inactive</span>;
    }
    
    const daysSinceLogin = ward.wardAdmin.lastLogin 
      ? Math.floor((new Date() - new Date(ward.wardAdmin.lastLogin)) / (1000 * 60 * 60 * 24))
      : null;

    if (daysSinceLogin === null || daysSinceLogin > 7) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Inactive</span>;
    } else if (daysSinceLogin > 3) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Warning</span>;
    } else {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>;
    }
  };

  const getReportStatusBadge = (status) => {
    switch (status) {
      case 'up-to-date':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Up to Date</span>;
      case 'behind':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Behind</span>;
      case 'overdue':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Overdue</span>;
      default:
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Unknown</span>;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Ward Management - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ward Management</h1>
            <p className="mt-1 text-sm text-gray-600">Comprehensive management of wards under your coordination</p>
          </div>
          
          <div className="flex space-x-3">
            <Button onClick={() => fetchWards()} variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
            
            <Link href="/coordinator/analytics">
              <Button>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                View Analytics
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            <p className="text-sm">{success}</p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Wards</p>
                  <p className="text-2xl font-bold text-gray-900">{wards.length}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Wards</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {wards.filter(w => w.wardAdmin && w.isActive).length}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Need Attention</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {wards.filter(w => !w.wardAdmin || w.reportStatus === 'overdue').length}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Completion</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round(wards.reduce((sum, w) => sum + (w.completionRate || 0), 0) / wards.length) || 0}%
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <SearchInput
                onSearch={setSearchTerm}
                placeholder="Search wards..."
                className="md:col-span-2"
              />

              <div>
                <select
                  value={filter.status}
                  onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="no-admin">No Admin</option>
                </select>
              </div>

              <div>
                <select
                  value={filter.reportStatus}
                  onChange={(e) => setFilter({ ...filter, reportStatus: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Reports</option>
                  <option value="up-to-date">Up to Date</option>
                  <option value="behind">Behind</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              <div>
                <select
                  value={filter.sortBy}
                  onChange={(e) => setFilter({ ...filter, sortBy: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="name">Sort by Name</option>
                  <option value="reports">Sort by Reports</option>
                  <option value="completion">Sort by Completion</option>
                  <option value="lastActivity">Sort by Activity</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Wards Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ward Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ward Incharge
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reports
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clusters
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredWards.map((ward) => (
                  <tr key={ward._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{ward.name}</div>
                        <div className="text-sm text-gray-500">
                          Ward #{ward.wardNumber} • {ward.panchayath}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      {ward.wardAdmin ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">{ward.wardAdmin.name}</div>
                          <div className="text-sm text-gray-500">{ward.wardAdmin.mobileNumber}</div>
                          <div className="text-xs text-gray-400">
                            Last login: {ward.wardAdmin.lastLogin 
                              ? new Date(ward.wardAdmin.lastLogin).toLocaleDateString()
                              : 'Never'
                            }
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No admin assigned</span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {getStatusBadge(ward)}
                        {getReportStatusBadge(ward.reportStatus)}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {ward.submittedReports || 0} / {ward.expectedReports || 0}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${ward.completionRate || 0}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{ward.completionRate || 0}% complete</div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {ward.visitedClusters || 0} / {ward.totalClusters || 0}
                      </div>
                      <div className="text-xs text-gray-500">
                        {ward.housesVisited || 0} houses visited
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <Link href={`/coordinator/ward-profile/${ward._id}`}>
                          <Button
                            size="sm"
                            variant="outline"
                          >
                            View Profile
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewWard(ward)}
                        >
                          Analytics
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewReports(ward)}
                        >
                          Reports
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredWards.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="mt-2 text-sm">No wards found matching your criteria</p>
            </div>
          )}
        </Card>

        {/* Ward Details Modal */}
        <Modal
          isOpen={showWardModal}
          onClose={() => setShowWardModal(false)}
          title={selectedWard ? `${selectedWard.name} - Detailed View` : 'Ward Details'}
          size="xl"
        >
          {selectedWard && (
            <div className="space-y-6">
              {/* Ward Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Ward Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-600">Name:</span> <span className="font-medium">{selectedWard.name}</span></div>
                    <div><span className="text-gray-600">Number:</span> <span className="font-medium">#{selectedWard.wardNumber}</span></div>
                    <div><span className="text-gray-600">Panchayath:</span> <span className="font-medium">{selectedWard.panchayath}</span></div>
                    <div><span className="text-gray-600">District:</span> <span className="font-medium">{selectedWard.district}</span></div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Performance Metrics</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-600">Reports:</span> <span className="font-medium">{selectedWard.submittedReports} / {selectedWard.expectedReports}</span></div>
                    <div><span className="text-gray-600">Completion:</span> <span className="font-medium">{selectedWard.completionRate}%</span></div>
                    <div><span className="text-gray-600">Clusters:</span> <span className="font-medium">{selectedWard.visitedClusters} / {selectedWard.totalClusters}</span></div>
                    <div><span className="text-gray-600">Houses:</span> <span className="font-medium">{selectedWard.housesVisited} visited</span></div>
                  </div>
                </div>
              </div>

              {/* Recent Reports */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Recent Reports</h4>
                <div className="space-y-2">
                  {wardReports.slice(0, 5).map((report) => (
                    <div key={report._id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-900">{report.title}</span>
                      <span className="text-xs text-gray-500">{new Date(report.submittedAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {wardReports.length === 0 && (
                    <p className="text-sm text-gray-500">No reports available</p>
                  )}
                </div>
              </div>

              {/* Cluster Status */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Cluster Status</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {wardClusters.map((cluster) => (
                    <div key={cluster._id} className="p-3 bg-gray-50 rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900">{cluster.name}</span>
                        <span className="text-xs text-gray-500">{cluster.completionRate}%</span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {cluster.housesVisited} / {cluster.totalHouses} houses
                      </div>
                    </div>
                  ))}
                  {wardClusters.length === 0 && (
                    <p className="text-sm text-gray-500 col-span-2">No cluster data available</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
}
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

export default function CoordinatorWards() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [wards, setWards] = useState([]);
  const [filteredWards, setFilteredWards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWard, setSelectedWard] = useState(null);
  const [wardDetails, setWardDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    // Check if user is authenticated and is coordinator
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchCoordinatorWards();
    }
  }, [status, session, router]);

  useEffect(() => {
    // Filter wards based on search term
    let filtered = wards;

    if (searchTerm) {
      filtered = filtered.filter(ward =>
        ward.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ward.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ward.wardNumber?.toString().includes(searchTerm)
      );
    }

    setFilteredWards(filtered);
  }, [wards, searchTerm]);

  const fetchCoordinatorWards = async () => {
    try {
      setIsLoading(true);

      // Fetch wards assigned to this coordinator
      const response = await axios.get('/api/wards/coordinator');

      setWards(response.data || []);
      setError('');
    } catch (error) {
      console.error('Error fetching coordinator wards:', error);

      // Fallback to mock data for development
      const mockWards = [
        {
          _id: 'ward1',
          name: 'Panchayath Ward 1',
          wardNumber: 1,
          district: session?.user?.district || 'Thiruvananthapuram',
          coordinator: session?.user?.id,
          wardAdmin: {
            _id: 'admin1',
            name: 'Ward Admin 1',
            email: 'admin1@example.com',
            phone: '+91 9876543210'
          },
          population: 2500,
          households: 650,
          area: 2.5,
          status: 'active',
          lastReportDate: new Date().toISOString(),
          totalReports: 12,
          pendingReports: 1
        },
        {
          _id: 'ward2',
          name: 'Panchayath Ward 2',
          wardNumber: 2,
          district: session?.user?.district || 'Thiruvananthapuram',
          coordinator: session?.user?.id,
          wardAdmin: {
            _id: 'admin2',
            name: 'Ward Admin 2',
            email: 'admin2@example.com',
            phone: '+91 9876543211'
          },
          population: 3200,
          households: 800,
          area: 3.2,
          status: 'active',
          lastReportDate: new Date(Date.now() - 86400000).toISOString(),
          totalReports: 15,
          pendingReports: 0
        },
        {
          _id: 'ward3',
          name: 'Panchayath Ward 3',
          wardNumber: 3,
          district: session?.user?.district || 'Thiruvananthapuram',
          coordinator: session?.user?.id,
          wardAdmin: {
            _id: 'admin3',
            name: 'Ward Admin 3',
            email: 'admin3@example.com',
            phone: '+91 9876543212'
          },
          population: 1800,
          households: 450,
          area: 1.8,
          status: 'active',
          lastReportDate: new Date(Date.now() - 172800000).toISOString(),
          totalReports: 8,
          pendingReports: 2
        }
      ];

      setWards(mockWards);
      setError('');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWardDetails = async (wardId) => {
    try {
      setLoadingDetails(true);

      // Fetch comprehensive ward details
      const [wardResponse, reportsResponse, clustersResponse, formsResponse] = await Promise.all([
        axios.get(`/api/wards/${wardId}`),
        axios.get(`/api/responses?ward=${wardId}`),
        axios.get(`/api/clusters?ward=${wardId}`),
        axios.get(`/api/forms/ward/${wardId}`)
      ]);

      setWardDetails({
        ward: wardResponse.data,
        reports: reportsResponse.data || [],
        clusters: clustersResponse.data || [],
        forms: formsResponse.data || []
      });
    } catch (error) {
      console.error('Error fetching ward details:', error);

      // Mock detailed data
      const selectedWardData = wards.find(w => w._id === wardId);
      setWardDetails({
        ward: selectedWardData,
        reports: [
          {
            _id: 'report1',
            title: 'Weekly Progress Report - Week 29',
            type: 'wardReport',
            status: 'submitted',
            submittedAt: new Date().toISOString(),
            weekNumber: 29,
            year: 2024
          },
          {
            _id: 'report2',
            title: 'Infrastructure Assessment',
            type: 'infrastructure',
            status: 'submitted',
            submittedAt: new Date(Date.now() - 86400000).toISOString(),
            weekNumber: 28,
            year: 2024
          }
        ],
        clusters: [
          {
            _id: 'cluster1',
            name: 'Residential Cluster A',
            type: 'residential',
            households: 150,
            population: 600
          },
          {
            _id: 'cluster2',
            name: 'Commercial Hub',
            type: 'commercial',
            businesses: 25,
            employees: 200
          }
        ],
        forms: [
          {
            _id: 'form1',
            title: 'Ward Basic Information',
            type: 'basic',
            status: 'completed',
            lastUpdated: new Date().toISOString()
          },
          {
            _id: 'form2',
            title: 'Infrastructure Details',
            type: 'infrastructure',
            status: 'pending',
            lastUpdated: new Date(Date.now() - 172800000).toISOString()
          }
        ]
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleWardClick = (ward) => {
    setSelectedWard(ward);
    fetchWardDetails(ward._id);
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString();
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
        <title>Ward Profile - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ward Profile</h1>
            <p className="mt-1 text-sm text-gray-600">Manage and monitor wards under your coordination</p>
          </div>
          <div className="flex space-x-3">
            <Link href="/">
              <Button variant="outline">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ward List */}
          <div className="lg:col-span-1">
            <Card>
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Your Wards</h3>
                <SearchInput
                  onSearch={setSearchTerm}
                  placeholder="Search wards..."
                />
              </div>

              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {filteredWards.map((ward) => (
                  <div
                    key={ward._id}
                    onClick={() => handleWardClick(ward)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedWard?._id === ward._id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{ward.name}</h4>
                        <p className="text-sm text-gray-500">Ward #{ward.wardNumber}</p>
                        <p className="text-xs text-gray-400">{ward.district}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(ward.status)}`}>
                          {ward.status}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">{ward.totalReports} reports</p>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredWards.length === 0 && (
                  <div className="p-8 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">No wards found</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Ward Details */}
          <div className="lg:col-span-2">
            {selectedWard ? (
              <div className="space-y-6">
                {loadingDetails ? (
                  <Card>
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-500">Loading ward details...</p>
                    </div>
                  </Card>
                ) : wardDetails ? (
                  <>
                    {/* Ward Overview */}
                    <Card>
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium text-gray-900">{wardDetails.ward.name}</h3>
                          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadgeColor(wardDetails.ward.status)}`}>
                            {wardDetails.ward.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{wardDetails.ward.population?.toLocaleString()}</div>
                            <div className="text-sm text-blue-800">Population</div>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{wardDetails.ward.households?.toLocaleString()}</div>
                            <div className="text-sm text-green-800">Households</div>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">{wardDetails.ward.area} km²</div>
                            <div className="text-sm text-purple-800">Area</div>
                          </div>
                          <div className="text-center p-3 bg-orange-50 rounded-lg">
                            <div className="text-2xl font-bold text-orange-600">{wardDetails.ward.totalReports}</div>
                            <div className="text-sm text-orange-800">Total Reports</div>
                          </div>
                        </div>

                        {/* Ward Admin Info */}
                        {wardDetails.ward.wardAdmin && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Ward Administrator</h4>
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-600">
                                  {wardDetails.ward.wardAdmin.name?.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{wardDetails.ward.wardAdmin.name}</p>
                                <p className="text-sm text-gray-500">{wardDetails.ward.wardAdmin.email}</p>
                                <p className="text-sm text-gray-500">{wardDetails.ward.wardAdmin.phone}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>

                    {/* Recent Reports */}
                    <Card>
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium text-gray-900">Recent Reports</h3>
                          <Link href={`/coordinator/ward-reports?ward=${selectedWard._id}`}>
                            <Button variant="outline" size="sm">View All</Button>
                          </Link>
                        </div>

                        <div className="space-y-3">
                          {wardDetails.reports.slice(0, 5).map((report) => (
                            <div key={report._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{report.title}</p>
                                <p className="text-xs text-gray-500">
                                  {report.type} • Week {report.weekNumber}, {report.year}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(report.status)}`}>
                                  {report.status}
                                </span>
                                <p className="text-xs text-gray-500 mt-1">{formatDate(report.submittedAt)}</p>
                              </div>
                            </div>
                          ))}
                          {wardDetails.reports.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">No reports submitted yet</p>
                          )}
                        </div>
                      </div>
                    </Card>

                    {/* Clusters */}
                    <Card>
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium text-gray-900">Clusters</h3>
                          <Link href={`/admin/clusters?ward=${selectedWard._id}`}>
                            <Button variant="outline" size="sm">Manage</Button>
                          </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {wardDetails.clusters.map((cluster) => (
                            <div key={cluster._id} className="p-4 border border-gray-200 rounded-lg">
                              <h4 className="text-sm font-medium text-gray-900">{cluster.name}</h4>
                              <p className="text-xs text-gray-500 capitalize mb-2">{cluster.type}</p>
                              <div className="text-xs text-gray-600">
                                {cluster.households && <span>Households: {cluster.households}</span>}
                                {cluster.population && <span> • Population: {cluster.population}</span>}
                                {cluster.businesses && <span>Businesses: {cluster.businesses}</span>}
                                {cluster.employees && <span> • Employees: {cluster.employees}</span>}
                              </div>
                            </div>
                          ))}
                          {wardDetails.clusters.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-4 col-span-2">No clusters defined</p>
                          )}
                        </div>
                      </div>
                    </Card>

                    {/* Dynamic Forms */}
                    <Card>
                      <div className="p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Ward Profile Forms</h3>

                        <div className="space-y-3">
                          {wardDetails.forms.map((form) => (
                            <div key={form._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{form.title}</p>
                                <p className="text-xs text-gray-500">
                                  {form.type} • Last updated: {formatDate(form.lastUpdated)}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(form.status)}`}>
                                  {form.status}
                                </span>
                                <Button variant="outline" size="sm">View</Button>
                              </div>
                            </div>
                          ))}
                          {wardDetails.forms.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">No forms available</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  </>
                ) : null}
              </div>
            ) : (
              <Card>
                <div className="p-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">Select a ward to view details</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
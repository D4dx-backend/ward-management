import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import SearchInput from '../../../components/SearchInput';
import { ShimmerDashboard, ShimmerTable } from '../../../components/Shimmer';

export default function WardProfile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id, name } = router.query;
  
  const [activeTab, setActiveTab] = useState('profile');
  const [ward, setWard] = useState(null);
  const [wardReports, setWardReports] = useState([]);
  const [wardVisits, setWardVisits] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [advancedData, setAdvancedData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    } else if (status === 'authenticated' && id) {
      fetchWardData();
    }
  }, [status, session, router, id]);

  const fetchWardData = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Fetch all ward data in parallel
      const [profileResponse, reportsResponse, visitsResponse] = await Promise.all([
        axios.get(`/api/coordinator/ward-profile/${id}`).then(res => res.data),
        axios.get('/api/responses', {
          params: {
            formType: 'wardReport',
            coordinatorOnly: 'true'
          }
        }).then(res => 
          res.data.filter(report => report.ward?._id === id)
        ),
        axios.get('/api/ward-visits', {
          params: { wardId: id }
        })
      ]);

      setWard(profileResponse.ward);
      setWardReports(reportsResponse);
      setWardVisits(visitsResponse.data || []);
      setClusters(profileResponse.clusters || []);
      setAdvancedData(profileResponse.advancedData || null);
    } catch (error) {
      console.error('Error fetching ward data:', error);
      setError('Failed to load ward data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFieldValue = (field, value) => {
    if (!value || value === '' || (Array.isArray(value) && value.length === 0)) {
      return <span className="text-gray-400 italic">Not answered</span>;
    }

    switch (field.type) {
      case 'yesno':
        return (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${value === 'yes'
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
            }`}>
            {value === 'yes' ? 'Yes' : 'No'}
          </span>
        );
      case 'multiselect':
        if (Array.isArray(value) && value.length > 0) {
          return (
            <div className="flex flex-wrap gap-1">
              {value.map((item, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {item}
                </span>
              ))}
            </div>
          );
        }
        return <span className="text-gray-400 italic">No options selected</span>;
      case 'date':
        try {
          const date = new Date(value);
          return (
            <span className="text-gray-900">
              {date.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          );
        } catch (error) {
          return <span className="text-red-500">Invalid date</span>;
        }
      case 'email':
        return (
          <a href={`mailto:${value}`} className="text-blue-600 hover:text-blue-800 underline">{value}</a>
        );
      case 'phone':
        return (
          <a href={`tel:${value}`} className="text-blue-600 hover:text-blue-800 underline">{value}</a>
        );
      case 'url':
        return (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">{value}</a>
        );
      case 'number':
        return (
          <span className="text-gray-900 font-mono">{typeof value === 'number' ? value.toLocaleString() : value}</span>
        );
      case 'textarea':
        return (
          <div className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-2 rounded border">{value}</div>
        );
      case 'select':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">{value}</span>
        );
      case 'text':
      default:
        return <span className="text-gray-900">{value}</span>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} at ${timeString || ''}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const tabs = [
    { id: 'profile', name: 'Ward Profile', icon: '🏘️' },
    { id: 'reports', name: 'Reports', icon: '📋', count: wardReports.length },
    { id: 'visits', name: 'Visits', icon: '🚶', count: wardVisits.length },
    { id: 'clusters', name: 'Clusters', icon: '🏢', count: clusters.length },
    { id: 'analytics', name: 'Analytics', icon: '📊' }
  ];

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  if (error || !ward) {
    return (
      <Layout>
        <Head>
          <title>Ward Profile - Ward Management System</title>
        </Head>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ward Profile</h1>
              <p className="mt-1 text-sm text-gray-600">Unable to load ward data</p>
            </div>
            <Link href="/coordinator/wards">
              <Button variant="outline">Back to Wards</Button>
            </Link>
          </div>
          
          <Card>
            <div className="p-6 text-center">
              <div className="text-red-500 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-gray-600 mb-4">{error || 'Ward not found'}</p>
              <Button onClick={fetchWardData}>Try Again</Button>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>{ward.name} - Ward Profile - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <Link href="/coordinator/wards">
                <button className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">{ward.name}</h1>
              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(ward.status || 'active')}`}>
                {(ward.status || 'active').charAt(0).toUpperCase() + (ward.status || 'active').slice(1)}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Ward #{ward.wardNumber} • {ward.district} • {ward.panchayath}
            </p>
          </div>
          <div className="flex space-x-3">
            <Button onClick={fetchWardData} variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{ward.population?.toLocaleString() || 0}</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-800">Population</p>
                <p className="text-xs text-blue-600">Total residents</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{ward.totalHouseholds?.toLocaleString() || 0}</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">Households</p>
                <p className="text-xs text-green-600">Total families</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{wardReports.length}</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-800">Reports</p>
                <p className="text-xs text-purple-600">Submitted</p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{wardVisits.length}</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-orange-800">Visits</p>
                <p className="text-xs text-orange-600">Conducted</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
                {tab.count !== undefined && (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Ward Name</label>
                      <p className="text-sm text-gray-900 mt-1">{ward.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Ward Number</label>
                      <p className="text-sm text-gray-900 mt-1">#{ward.wardNumber}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">District</label>
                      <p className="text-sm text-gray-900 mt-1">{ward.district}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Panchayath</label>
                      <p className="text-sm text-gray-900 mt-1">{ward.panchayath || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Population</label>
                      <p className="text-sm text-gray-900 mt-1">{ward.population?.toLocaleString() || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Total Households</label>
                      <p className="text-sm text-gray-900 mt-1">{ward.totalHouseholds?.toLocaleString() || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Ward Administrator */}
              {ward.wardAdmin && (
                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Ward Administrator</h3>
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 font-semibold text-lg">
                            {ward.wardAdmin.name?.charAt(0) || 'A'}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Name</label>
                          <p className="text-sm text-gray-900 mt-1">{ward.wardAdmin.name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Email</label>
                          <p className="text-sm text-gray-900 mt-1">{ward.wardAdmin.email || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Mobile Number</label>
                          <p className="text-sm text-gray-900 mt-1">{ward.wardAdmin.mobileNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Last Login</label>
                          <p className="text-sm text-gray-900 mt-1">{formatDate(ward.wardAdmin.lastLogin)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Recent Activity */}
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Last Visit</div>
                      <div className="text-lg font-semibold text-gray-900">{formatDate(ward.lastVisitDate)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Total Visits</div>
                      <div className="text-lg font-semibold text-gray-900">{ward.totalVisits || 0}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Reports Submitted</div>
                      <div className="text-lg font-semibold text-gray-900">{ward.reportsSubmitted || 0}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Total Clusters</div>
                      <div className="text-lg font-semibold text-gray-900">{ward.totalClusters || 0}</div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Advanced Data (Full Field Forms) */}
              {advancedData && advancedData.form && (
                <Card>
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{advancedData.form.title}</h3>
                        <p className="text-sm text-gray-600">{advancedData.form.description}</p>
                      </div>
                      {advancedData.hasData && (
                        <div className="text-sm text-gray-500">
                          Last updated: {new Date(advancedData.submittedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {advancedData.hasData ? (
                      <div className="space-y-6">
                        {/* Ward-level fields */}
                        {advancedData.form.fields
                          .filter(field => !field.applicableToClusters)
                          .map((field) => (
                            <div key={field.id} className="border-l-4 border-blue-500 pl-4 py-2">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="text-sm font-medium text-gray-900 mb-1">
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                  </h4>
                                  <div className="text-sm">
                                    {formatFieldValue(field, advancedData.responses?.[field.id])}
                                  </div>
                                  {field.helpText && (
                                    <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}

                        {/* Cluster-level fields */}
                        {advancedData.form.fields.some(field => field.applicableToClusters) && (
                          <div>
                            <h4 className="text-md font-medium text-gray-900 mb-4">Cluster-specific Data</h4>
                            {clusters.map((cluster) => (
                              <div key={cluster._id} className="mb-6 border border-gray-200 rounded-lg p-4">
                                <h5 className="text-sm font-medium text-gray-900 mb-3">{cluster.name}</h5>
                                <div className="space-y-4">
                                  {advancedData.form.fields
                                    .filter(field => field.applicableToClusters)
                                    .map((field) => (
                                      <div key={field.id} className="border-l-4 border-green-500 pl-4 py-2">
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <h6 className="text-sm font-medium text-gray-900 mb-1">
                                              {field.label}
                                              {field.required && <span className="text-red-500 ml-1">*</span>}
                                            </h6>
                                            <div className="text-sm">
                                              {formatFieldValue(field, advancedData.clusterResponses?.[cluster._id]?.[field.id])}
                                            </div>
                                            {field.helpText && (
                                              <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="mt-2 text-sm text-gray-500">No data has been submitted for this form yet</p>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <Card>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Ward Reports</h3>
                  <SearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search reports..."
                    className="w-64"
                  />
                </div>
                
                {wardReports.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">No reports submitted yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week/Year</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted By</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted At</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {wardReports
                          .filter(report => 
                            !searchTerm || 
                            report.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            report.submittedBy?.name?.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((report) => (
                          <tr key={report._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">Week {report.weekNumber}</div>
                              <div className="text-sm text-gray-500">{report.year}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{report.submittedBy?.name || 'Unknown'}</div>
                              <div className="text-sm text-gray-500">{report.submittedBy?.role || 'Unknown Role'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(report.submittedAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <Link href={`/coordinator/ward-reports/detail/${report._id}?ward=${encodeURIComponent(ward.name)}&week=${report.weekNumber}&year=${report.year}`}>
                                <Button variant="outline" size="sm">View Details</Button>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          )}

          {activeTab === 'visits' && (
            <Card>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Ward Visits</h3>
                  <SearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search visits..."
                    className="w-64"
                  />
                </div>
                
                {wardVisits.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">No visits recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {wardVisits
                      .filter(visit => 
                        !searchTerm || 
                        visit.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        visit.findings?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((visit) => (
                      <div key={visit._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                visit.recordedByRole === 'coordinator' ? 'bg-blue-100' : 'bg-green-100'
                              }`}>
                                <svg className={`w-4 h-4 ${
                                  visit.recordedByRole === 'coordinator' ? 'text-blue-600' : 'text-green-600'
                                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">
                                  {formatDateTime(visit.visitDate, visit.visitTime)}
                                </h4>
                                <p className="text-xs text-gray-500">
                                  by {visit.recordedByRole === 'coordinator' 
                                    ? (visit.recordedBy?.name || visit.coordinator?.name || 'Unknown Coordinator')
                                    : (visit.recordedBy?.name || visit.ward?.wardAdmin?.name || 'Ward Admin')} 
                                  ({visit.recordedByRole === 'coordinator' ? 'Coordinator' : 'Ward Admin'})
                                </p>
                              </div>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">Purpose:</span>
                                <p className="text-gray-900 mt-1">{visit.purpose}</p>
                              </div>
                              {visit.findings && (
                                <div>
                                  <span className="font-medium text-gray-700">Findings:</span>
                                  <p className="text-gray-900 mt-1">{visit.findings}</p>
                                </div>
                              )}
                              {visit.recommendations && (
                                <div>
                                  <span className="font-medium text-gray-700">Recommendations:</span>
                                  <p className="text-gray-900 mt-1">{visit.recommendations}</p>
                                </div>
                              )}
                              {visit.attendees && (
                                <div>
                                  <span className="font-medium text-gray-700">Attendees:</span>
                                  <p className="text-gray-900 mt-1">{visit.attendees}</p>
                                </div>
                              )}
                            </div>

                            {visit.followUpRequired && (
                              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                <div className="flex items-center space-x-2">
                                  <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="text-sm font-medium text-yellow-800">Follow-up Required</span>
                                </div>
                                {visit.followUpDate && (
                                  <p className="text-xs text-yellow-700 mt-1">
                                    Due: {formatDate(visit.followUpDate)}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          {activeTab === 'clusters' && (
            <Card>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Ward Clusters</h3>
                  <SearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search clusters..."
                    className="w-64"
                  />
                </div>
                
                {clusters.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">No clusters found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clusters
                      .filter(cluster => 
                        !searchTerm || 
                        cluster.name?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((cluster) => (
                      <div key={cluster._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-900">{cluster.name}</h4>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            cluster.status === 'visited' ? 'bg-green-100 text-green-800' :
                            cluster.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            cluster.status === 'overdue' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {cluster.status || 'Unknown'}
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span>Households:</span>
                            <span className="font-medium text-gray-900">{cluster.householdCount || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Population:</span>
                            <span className="font-medium text-gray-900">{cluster.population || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Last Visited:</span>
                            <span className="font-medium text-gray-900">{formatDate(cluster.lastVisited)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Visit Count:</span>
                            <span className="font-medium text-gray-900">{cluster.visitCount || 0}</span>
                          </div>
                        </div>

                        {cluster.description && (
                          <p className="text-xs text-gray-500 mt-3 border-t border-gray-200 pt-2">
                            {cluster.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Ward Analytics</h3>
                  
                  {/* Report Submission Trends */}
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-800 mb-3">Report Submission Trends</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{wardReports.length}</div>
                          <div className="text-sm text-gray-600">Total Reports</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {wardReports.filter(r => new Date(r.submittedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
                          </div>
                          <div className="text-sm text-gray-600">Last 30 Days</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {wardReports.filter(r => new Date(r.submittedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
                          </div>
                          <div className="text-sm text-gray-600">Last 7 Days</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Visit Statistics */}
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-800 mb-3">Visit Statistics</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">{wardVisits.length}</div>
                          <div className="text-sm text-gray-600">Total Visits</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {wardVisits.filter(v => v.recordedByRole === 'coordinator').length}
                          </div>
                          <div className="text-sm text-gray-600">Coordinator Visits</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {wardVisits.filter(v => v.recordedByRole === 'wardAdmin').length}
                          </div>
                          <div className="text-sm text-gray-600">Ward Admin Visits</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">
                            {wardVisits.filter(v => v.followUpRequired && !v.followUpCompleted).length}
                          </div>
                          <div className="text-sm text-gray-600">Pending Follow-ups</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Performance Indicators */}
                  <div>
                    <h4 className="text-md font-medium text-gray-800 mb-3">Performance Indicators</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="text-sm font-medium text-gray-700">Report Submission Rate</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${Math.min(100, (wardReports.length / 52) * 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {Math.round((wardReports.length / 52) * 100)}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="text-sm font-medium text-gray-700">Visit Frequency</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${Math.min(100, (wardVisits.length / 12) * 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {Math.round((wardVisits.length / 12) * 100)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="text-sm font-medium text-gray-700">Admin Engagement</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full" 
                              style={{ width: `${ward.wardAdmin?.lastLogin ? 85 : 0}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {ward.wardAdmin?.lastLogin ? '85%' : '0%'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
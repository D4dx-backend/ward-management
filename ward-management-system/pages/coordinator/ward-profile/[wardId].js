import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../../components/Shimmer';

export default function CoordinatorWardProfile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { wardId } = router.query;
  const [ward, setWard] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [advancedData, setAdvancedData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState({});

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    } else if (status === 'authenticated' && wardId) {
      fetchWardData();
    }
  }, [status, session, router, wardId]);

  const fetchWardData = async () => {
    setIsLoading(true);

    try {
      // Verify ward belongs to coordinator
      const wardResponse = await axios.get(`/api/coordinator/ward-profile/${wardId}`);
      const profileData = wardResponse.data;

      setWard(profileData.ward);
      setClusters(profileData.clusters || []);
      setAdvancedData(profileData.advancedData);
      setError('');
    } catch (error) {
      console.error('Error fetching ward data:', error);
      
      if (error.response?.status === 403) {
        setError('Access denied to this ward. This ward is not under your coordination.');
      } else if (error.response?.status === 404) {
        setError('Ward not found.');
      } else if (error.response?.data?.message) {
        setError(`Error: ${error.response.data.message}`);
      } else {
        setError('Failed to fetch ward data. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);

    try {
      const response = await axios.get(`/api/coordinator/ward-profile/${wardId}/export-pdf`, {
        responseType: 'blob'
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ward-profile-${ward.name}-${ward.wardNumber}.html`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      setError('Failed to export ward profile');
    } finally {
      setIsExporting(false);
    }
  };

  const toggleQuestionExpansion = (questionId) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const formatValue = (value, defaultText = 'Not set') => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400 italic">{defaultText}</span>;
    }
    return <span className="text-gray-900">{value}</span>;
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
            {value === 'yes' ? (
              <>
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Yes
              </>
            ) : (
              <>
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                No
              </>
            )}
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
          <a
            href={`mailto:${value}`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {value}
          </a>
        );

      case 'phone':
        return (
          <a
            href={`tel:${value}`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {value}
          </a>
        );

      case 'url':
        return (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline inline-flex items-center"
          >
            {value}
            <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
          </a>
        );

      case 'number':
        return (
          <span className="text-gray-900 font-mono">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
        );

      case 'textarea':
        return (
          <div className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-2 rounded border">
            {value}
          </div>
        );

      case 'select':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            {value}
          </span>
        );

      case 'text':
      default:
        return <span className="text-gray-900">{value}</span>;
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  if (error && !ward) {
    return (
      <Layout>
        <Head>
          <title>Ward Profile - Ward Management System</title>
        </Head>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ward Profile</h1>
            <p className="mt-1 text-sm text-gray-600">View ward information</p>
          </div>
          <Card>
            <div className="p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
              <div className="mt-4">
                <Button onClick={() => router.back()} variant="outline">
                  Go Back
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>{ward?.name} Profile - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{ward?.name} Profile</h1>
            <p className="mt-1 text-sm text-gray-600">View ward information and data</p>
          </div>
          <div className="flex space-x-3">
            <Button onClick={() => router.back()} variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </Button>
            <Button onClick={handleExportPDF} disabled={isExporting} variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          </div>
        </div>

        {/* Basic Ward Information */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ward Name</label>
                <div className="text-sm text-gray-900">{ward?.name}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ward Number</label>
                <div className="text-sm text-gray-900">#{ward?.wardNumber}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                <div className="text-sm text-gray-900">{ward?.district}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Panchayath</label>
                <div className="text-sm text-gray-900">{ward?.panchayath}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Population</label>
                <div className="text-sm">{formatValue(ward?.population)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area (sq km)</label>
                <div className="text-sm">{formatValue(ward?.area)}</div>
              </div>
            </div>
            {ward?.description && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded border">
                  {ward.description}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Ward Incharge Information */}
        {ward?.wardAdmin && (
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Ward Incharge</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <div className="text-sm text-gray-900">{ward.wardAdmin.name}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="text-sm text-gray-900">{ward.wardAdmin.email}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                  <div className="text-sm text-gray-900">{ward.wardAdmin.mobileNumber || 'Not provided'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Login</label>
                  <div className="text-sm text-gray-900">
                    {ward.wardAdmin.lastLogin 
                      ? new Date(ward.wardAdmin.lastLogin).toLocaleString()
                      : 'Never logged in'
                    }
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Clusters Information */}
        {clusters && clusters.length > 0 && (
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Clusters ({clusters.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clusters.map((cluster) => (
                  <div key={cluster._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-sm font-medium text-gray-900">{cluster.name}</h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        cluster.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {cluster.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Cluster #{cluster.clusterNumber}</div>
                      <div>Coordinator: {cluster.coordinator?.name}</div>
                      {cluster.coordinator?.mobileNumber && (
                        <div>Mobile: {cluster.coordinator.mobileNumber}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Advanced Data */}
        {advancedData && advancedData.form && (
          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">{advancedData.form.title}</h2>
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
                            <h3 className="text-sm font-medium text-gray-900 mb-1">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </h3>
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
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Cluster-specific Data</h3>
                      {clusters.map((cluster) => (
                        <div key={cluster._id} className="mb-6 border border-gray-200 rounded-lg p-4">
                          <h4 className="text-md font-medium text-gray-900 mb-3">{cluster.name}</h4>
                          <div className="space-y-4">
                            {advancedData.form.fields
                              .filter(field => field.applicableToClusters)
                              .map((field) => (
                                <div key={field.id} className="border-l-4 border-green-500 pl-4 py-2">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h5 className="text-sm font-medium text-gray-900 mb-1">
                                        {field.label}
                                        {field.required && <span className="text-red-500 ml-1">*</span>}
                                      </h5>
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
    </Layout>
  );
}
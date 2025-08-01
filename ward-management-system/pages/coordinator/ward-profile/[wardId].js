import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../../components/Layout';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../../components/Shimmer';
import { useApiData } from '../../../hooks/useApiData';

export default function CoordinatorWardProfile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { wardId } = router.query;
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    } else if (status === 'authenticated' && wardId) {
      fetchWardProfile();
    }
  }, [status, session, router, wardId]);

  const fetchWardProfile = async () => {
    setIsLoading(true);
    
    try {
      const response = await axios.get(`/api/ward-profile/${wardId}`);
      setProfileData(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching ward profile:', error);
      setError(error.response?.data?.message || 'Failed to fetch ward profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    
    try {
      const response = await axios.get(`/api/ward-profile/${wardId}/export-pdf`, {
        responseType: 'blob'
      });
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ward-profile-${profileData.ward.name}-${profileData.ward.wardNumber}.html`);
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

  const formatValue = (value, defaultText = 'Not set') => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400 italic">{defaultText}</span>;
    }
    return <span className="text-gray-900">{value}</span>;
  };

  const formatFieldValue = (field, value) => {
    if (!value || value === '') {
      return <span className="text-gray-400 italic">Not answered</span>;
    }

    switch (field.type) {
      case 'yesno':
        return <span className={`px-2 py-1 rounded text-sm ${value === 'yes' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {value === 'yes' ? 'Yes' : 'No'}
        </span>;
      case 'multiselect':
        return Array.isArray(value) ? value.join(', ') : value;
      case 'date':
        return new Date(value).toLocaleDateString('en-IN');
      default:
        return value;
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }

  if (error && !profileData) {
    return (
      <Layout>
        <Head>
          <title>Ward Profile - Ward Management System</title>
        </Head>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ward Profile</h1>
            <p className="mt-1 text-sm text-gray-600">View ward information and statistics</p>
          </div>
          <Card>
            <div className="p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!profileData) return null;

  const { ward, clusters, advancedData } = profileData;

  return (
    <Layout>
      <Head>
        <title>Ward Profile - {ward.name} - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ward Profile</h1>
            <p className="mt-1 text-sm text-gray-600">{ward.name} (Ward #{ward.wardNumber})</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => router.back()}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </Button>
            <Button onClick={handleExportPDF} disabled={isExporting}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </Button>
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

        {/* Basic Ward Information */}
        <Card>
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
            <p className="text-sm text-gray-600 mt-1">Core ward details and administrative information</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Ward Name</h3>
                <p className="mt-1 text-sm text-gray-900">{ward.name}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Ward Number</h3>
                <p className="mt-1 text-sm text-gray-900">#{ward.wardNumber}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Panchayath</h3>
                <p className="mt-1 text-sm text-gray-900">{ward.panchayath}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">District</h3>
                <p className="mt-1 text-sm text-gray-900">{ward.district}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">State</h3>
                <p className="mt-1 text-sm text-gray-900">{ward.state || 'Kerala'}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  ward.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {ward.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Ward Statistics */}
        <Card>
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Ward Statistics</h2>
            <p className="text-sm text-gray-600 mt-1">Population and area information</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Population</h3>
                <p className="mt-1 text-sm">{formatValue(ward.population, 'Not set')}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Area (sq km)</h3>
                <p className="mt-1 text-sm">{formatValue(ward.area, 'Not set')}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Clusters</h3>
                <p className="mt-1 text-sm text-gray-900">{clusters.length}</p>
              </div>
            </div>
            
            {ward.description && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500">Description</h3>
                <p className="mt-1 text-sm text-gray-900">{ward.description}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Advanced Data from State Admin Forms */}
        {advancedData && (
          <Card>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Ward Advanced Data</h2>
              <p className="text-sm text-gray-600 mt-1">Data from state admin created forms</p>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-md font-medium text-gray-900">{advancedData.form.title}</h3>
                {advancedData.form.description && (
                  <p className="text-sm text-gray-600 mt-1">{advancedData.form.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Last updated: {new Date(advancedData.submittedAt).toLocaleDateString('en-IN')}
                </p>
              </div>

              {/* Ward-level questions */}
              {advancedData.form.fields.filter(field => !field.applicableToClusters).length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Ward Information</h4>
                  <div className="space-y-4">
                    {advancedData.form.fields
                      .filter(field => !field.applicableToClusters)
                      .map((field) => (
                        <div key={field.id} className="border-l-4 border-blue-500 pl-4">
                          <h5 className="text-sm font-medium text-gray-900">{field.label}</h5>
                          <div className="mt-1">
                            {formatFieldValue(field, advancedData.responses[field.id])}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Cluster-based questions */}
              {advancedData.form.fields.filter(field => field.applicableToClusters).length > 0 && clusters.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Cluster-Based Information</h4>
                  {clusters.map((cluster) => (
                    <div key={cluster._id} className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h5 className="text-md font-medium text-gray-900 mb-3">
                        {cluster.name} (Cluster #{cluster.clusterNumber})
                      </h5>
                      <div className="space-y-3">
                        {advancedData.form.fields
                          .filter(field => field.applicableToClusters)
                          .map((field) => (
                            <div key={field.id} className="border-l-4 border-green-500 pl-4">
                              <h6 className="text-sm font-medium text-gray-900">{field.label}</h6>
                              <div className="mt-1">
                                {formatFieldValue(field, advancedData.clusterResponses[cluster._id]?.[field.id])}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Clusters Information */}
        {clusters.length > 0 && (
          <Card>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Ward Clusters</h2>
              <p className="text-sm text-gray-600 mt-1">Clusters within this ward</p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clusters.map((cluster) => (
                  <div key={cluster._id} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900">{cluster.name}</h4>
                    <p className="text-sm text-gray-500">Cluster #{cluster.clusterNumber}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Coordinator: {cluster.coordinator?.name || 'Not assigned'}
                    </p>
                    {cluster.coordinator?.mobileNumber && (
                      <p className="text-sm text-gray-600">
                        Mobile: {cluster.coordinator.mobileNumber}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function WardProfile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [ward, setWard] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'wardAdmin') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchWardData();
    }
  }, [status, session, router]);

  const fetchWardData = async () => {
    setIsLoading(true);
    
    try {
      // Get user info which includes ward data
      const userResponse = await axios.get(`/api/users/${session.user.id}`);
      
      if (userResponse.data.ward) {
        setWard(userResponse.data.ward);
        setEditData({
          population: userResponse.data.ward.population || '',
          area: userResponse.data.ward.area || '',
          description: userResponse.data.ward.description || ''
        });
        
        // Get clusters for this ward
        try {
          const clustersResponse = await axios.get('/api/clusters', {
            params: { wardId: userResponse.data.ward._id }
          });
          setClusters(clustersResponse.data || []);
        } catch (clusterError) {
          console.error('Error fetching clusters:', clusterError);
          setClusters([]);
        }
      } else {
        setError('No ward assigned to your account. Please contact your coordinator.');
      }
      
      setError('');
    } catch (error) {
      console.error('Error fetching ward data:', error);
      setError('Failed to fetch ward data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setSuccess('');
    setError('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({
      population: ward?.population || '',
      area: ward?.area || '',
      description: ward?.description || ''
    });
    setError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.put(`/api/wards/${ward._id}`, {
        population: editData.population ? parseInt(editData.population) : null,
        area: editData.area ? parseFloat(editData.area) : null,
        description: editData.description || null
      });

      setWard(response.data);
      setIsEditing(false);
      setSuccess('Ward profile updated successfully!');
    } catch (error) {
      console.error('Error updating ward:', error);
      setError(error.response?.data?.message || 'Failed to update ward profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatValue = (value, defaultText = 'Not set') => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400 italic">{defaultText}</span>;
    }
    return <span className="text-gray-900">{value}</span>;
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
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
            <p className="mt-1 text-sm text-gray-600">View and manage your ward information</p>
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

  return (
    <Layout>
      <Head>
        <title>Ward Profile - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ward Profile</h1>
            <p className="mt-1 text-sm text-gray-600">View and manage your ward information</p>
          </div>
          <div className="flex space-x-3">
            {!isEditing ? (
              <Button onClick={handleEdit}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Profile
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{success}</p>
              </div>
            </div>
          </div>
        )}

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

        {ward && (
          <>
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

            {/* Editable Information */}
            <Card>
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Ward Statistics</h2>
                <p className="text-sm text-gray-600 mt-1">Population and area information</p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Population</h3>
                    {isEditing ? (
                      <input
                        type="number"
                        name="population"
                        value={editData.population}
                        onChange={handleInputChange}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter population"
                      />
                    ) : (
                      <p className="mt-1 text-sm">{formatValue(ward.population, 'Not set')}</p>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Area (sq km)</h3>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        name="area"
                        value={editData.area}
                        onChange={handleInputChange}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter area in sq km"
                      />
                    ) : (
                      <p className="mt-1 text-sm">{formatValue(ward.area, 'Not set')}</p>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Total Clusters</h3>
                    <p className="mt-1 text-sm text-gray-900">{clusters.length}</p>
                  </div>
                </div>
                
                {(isEditing || ward.description) && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-500">Description</h3>
                    {isEditing ? (
                      <textarea
                        name="description"
                        value={editData.description}
                        onChange={handleInputChange}
                        rows={3}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter ward description"
                      />
                    ) : (
                      <p className="mt-1 text-sm">{formatValue(ward.description, 'No description provided')}</p>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Coordinator Information */}
            {ward.coordinator && (
              <Card>
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Coordinator Information</h2>
                  <p className="text-sm text-gray-600 mt-1">Your assigned coordinator details</p>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Name</h3>
                      <p className="mt-1 text-sm text-gray-900">{ward.coordinator.name}</p>
                    </div>
                    
                    {ward.coordinator.email && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Email</h3>
                        <p className="mt-1 text-sm text-gray-900">{ward.coordinator.email}</p>
                      </div>
                    )}
                    
                    {ward.coordinator.mobileNumber && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Mobile Number</h3>
                        <p className="mt-1 text-sm text-gray-900">{ward.coordinator.mobileNumber}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Clusters Information */}
            {clusters.length > 0 && (
              <Card>
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Ward Clusters</h2>
                  <p className="text-sm text-gray-600 mt-1">Clusters within your ward</p>
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
          </>
        )}
      </div>
    </Layout>
  );
}
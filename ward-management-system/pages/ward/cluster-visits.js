import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import axios from 'axios';
import { useApiData } from '../../hooks/useApiData';

export default function ClusterVisits() {
  const { data: session } = useSession();
  const [clusterData, setClusterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [editingWeeks, setEditingWeeks] = useState(new Set());

  useEffect(() => {
    if (session?.user?.role === 'wardAdmin') {
      fetchClusterVisits();
    } else if (session?.user?.role && session?.user?.role !== 'wardAdmin') {
      setError('Access denied. Only Ward Incharges can access House Visits.');
      setLoading(false);
    }
  }, [session]);

  const fetchClusterVisits = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching House Visits...');
      const response = await axios.get(`/api/cluster-visits/my-ward?t=${Date.now()}`);
      console.log('House Visits response:', response.data);
      
      setClusterData(response.data);
    } catch (error) {
      console.error('Error fetching House Visits:', error);
      setError(error.response?.data?.message || 'Failed to load House Visits');
    } finally {
      setLoading(false);
    }
  };

  const updateClusterVisits = async () => {
    if (!clusterData?.clusterVisits) return;
    
    try {
      setSaving(true);
      setError(null);
      
      console.log('Updating House Visits...');
      const response = await axios.put('/api/cluster-visits/my-ward', {
        clusterVisits: clusterData.clusterVisits
      });
      
      console.log('Update response:', response.data);
      
      // Refresh the complete data after saving
      await fetchClusterVisits();
      
      // Show success message
      setSuccessMessage('House Visits updated successfully!');
      setTimeout(() => setSuccessMessage(''), 5000);
      
    } catch (error) {
      console.error('Error updating House Visits:', error);
      setError(error.response?.data?.message || 'Failed to update House Visits');
    } finally {
      setSaving(false);
    }
  };

  const updateClusterWeekData = (clusterIndex, weekKey, field, value) => {
    if (!clusterData?.clusterVisits) return;
    
    const newClusterData = { ...clusterData };
    const cluster = newClusterData.clusterVisits[clusterIndex];
    
    if (!cluster.weeklyData[weekKey]) {
      const [year, weekNumber] = weekKey.split('-').map(Number);
      cluster.weeklyData[weekKey] = {
        weekNumber,
        year,
        houses: 0,
        days: 0
      };
    }
    
    cluster.weeklyData[weekKey][field] = parseInt(value) || 0;
    
    setClusterData(newClusterData);
  };

  const toggleWeekEditing = (weekKey) => {
    setEditingWeeks((previousEditingWeeks) => {
      const updatedEditingWeeks = new Set(previousEditingWeeks);
      if (updatedEditingWeeks.has(weekKey)) {
        updatedEditingWeeks.delete(weekKey);
      } else {
        updatedEditingWeeks.add(weekKey);
      }
      return updatedEditingWeeks;
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (error || !clusterData) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {error ? 'Error Loading House Visits' : 'No Data Found'}
            </h2>
            <p className="text-gray-600 mb-4">
              {error || 'Unable to load House Visits data.'}
            </p>
            <div className="space-x-2">
              <Button onClick={fetchClusterVisits} disabled={loading}>
                {loading ? 'Loading...' : 'Retry'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/'}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>House Visit - House Visit Reports - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setSuccessMessage('')}
                  className="inline-flex text-green-400 hover:text-green-600"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError(null)}
                  className="inline-flex text-red-400 hover:text-red-600"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">House Visit - House Visit Reports</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track house visits and House Visit progress for form periods - Ward: {clusterData?.ward?.name}
          </p>
        </div>

        {/* Summary Stats - moved above table as requested */}
        {clusterData?.clusterVisits && clusterData.clusterVisits.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded">
                  <div className="text-2xl font-bold text-blue-600">{clusterData.totalClusters}</div>
                  <div className="text-sm text-blue-700">Total Clusters</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded">
                  <div className="text-2xl font-bold text-green-600">{clusterData.totalWeeks}</div>
                  <div className="text-sm text-green-700">Form Weeks</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded">
                  <div className="text-2xl font-bold text-purple-600">
                    {clusterData.clusterVisits.reduce((total, cluster) => total + (cluster.totalHouses || 0), 0)}
                  </div>
                  <div className="text-sm text-purple-700">Total Houses</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded">
                  <div className="text-2xl font-bold text-orange-600">
                    {clusterData.clusterVisits.reduce((total, cluster) => total + (cluster.totalDays || 0), 0)}
                  </div>
                  <div className="text-sm text-orange-700">Total Days</div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* House Visits Table */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                House Visit Status by Cluster
              </h2>
              <Button
                onClick={updateClusterVisits}
                disabled={saving}
                size="sm"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
            
            {clusterData?.clusterVisits && clusterData.clusterVisits.length > 0 ? (
            <div className="relative overflow-x-auto">
              {saving && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm text-gray-600">Saving changes...</span>
                  </div>
                </div>
              )}
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cluster
                    </th>
                    {/* Dynamic week headers based on actual form periods */}
                    {clusterData.formWeeks?.map((week, index) => {
                      const weekKey = `${week.year}-${week.weekNumber}`;
                      const isEditing = editingWeeks.has(weekKey);
                      return (
                        <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center space-x-2">
                            <span>Week {week.weekNumber}, {week.year}</span>
                            <Button
                              size="sm"
                              variant={isEditing ? 'success' : 'outline'}
                              onClick={() => toggleWeekEditing(weekKey)}
                            >
                              {isEditing ? 'Done' : 'Edit'}
                            </Button>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clusterData.clusterVisits.map((cluster, clusterIndex) => (
                    <tr key={clusterIndex}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {cluster.clusterName}
                      </td>
                      {/* Dynamic week data based on actual form periods */}
                      {clusterData.formWeeks?.map((week, weekIndex) => {
                        const weekKey = `${week.year}-${week.weekNumber}`;
                        const weekData = cluster.weeklyData?.[weekKey] || { houses: 0, days: 0 };
                        const isEditing = editingWeeks.has(weekKey);
                        
                        return (
                          <td key={weekIndex} className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <label className="text-xs text-gray-500 w-12">Houses:</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={weekData.houses || 0}
                                  onChange={(e) => updateClusterWeekData(clusterIndex, weekKey, 'houses', e.target.value)}
                                  disabled={!isEditing || saving}
                                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-400"
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <label className="text-xs text-gray-500 w-12">Days:</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="7"
                                  value={weekData.days || 0}
                                  onChange={(e) => updateClusterWeekData(clusterIndex, weekKey, 'days', e.target.value)}
                                  disabled={!isEditing || saving}
                                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-400"
                                />
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No House Visit data available</p>
              <p className="text-sm text-gray-400 mt-1">
                Create clusters in your ward to enable House Visit tracking
              </p>
              <Button
                onClick={() => window.location.href = '/admin/clusters'}
                variant="outline"
                className="mt-4"
              >
                Manage Clusters
              </Button>
            </div>
          )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
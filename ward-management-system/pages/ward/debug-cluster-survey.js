import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import axios from 'axios';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';
import { useApiData } from '../../hooks/useApiData';

export default function DebugClusterSurvey() {
  const { data: session } = useSession();
  const [debugInfo, setDebugInfo] = useState(null);
  const [clusterInfo, setClusterInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDebugInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [debugResponse, clusterResponse] = await Promise.all([
        axios.get('/api/debug/cluster-survey'),
        axios.get('/api/debug/ward-clusters')
      ]);
      
      setDebugInfo(debugResponse.data);
      setClusterInfo(clusterResponse.data);
    } catch (error) {
      console.error('Error fetching debug info:', error);
      setError(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === 'wardAdmin') {
      fetchDebugInfo();
    }
  }, [session]);

  if (session?.user?.role !== 'wardAdmin') {
    return (
      <Layout>
        <div className="text-center py-8">
          <p>Access denied. Only Ward Incharges can access this debug page.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Debug Cluster Survey - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Debug Cluster Survey</h1>
            <p className="mt-1 text-sm text-gray-600">Debug information for House Visits and forms</p>
          </div>
          <Button onClick={fetchDebugInfo} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {clusterInfo && (
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Ward & Cluster Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Ward Details</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Name:</span> {clusterInfo.ward.name}</p>
                    <p><span className="font-medium">District:</span> {clusterInfo.ward.district}</p>
                    <p><span className="font-medium">Panchayath:</span> {clusterInfo.ward.panchayath}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Cluster Summary</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Total Clusters:</span> {clusterInfo.clusters.total}</p>
                    <p><span className="font-medium">Active Clusters:</span> {clusterInfo.clusters.active}</p>
                    <p><span className="font-medium">Inactive Clusters:</span> {clusterInfo.clusters.inactive}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-2">All Clusters</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coordinator</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {clusterInfo.clusters.list.map((cluster) => (
                        <tr key={cluster.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cluster.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cluster.number}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              cluster.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {cluster.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cluster.coordinator}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Card>
        )}

        {debugInfo && (
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Form & Week Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Form Summary</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Total Forms:</span> {debugInfo.forms.total}</p>
                    <p><span className="font-medium">State Admin Forms:</span> {debugInfo.forms.stateAdminForms}</p>
                    <p><span className="font-medium">Forms with Weeks:</span> {debugInfo.forms.formsWithWeeks}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Current Week</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Week Number:</span> {debugInfo.currentWeek.weekNumber}</p>
                    <p><span className="font-medium">Year:</span> {debugInfo.currentWeek.year}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-2">Available Form Weeks</h3>
                {debugInfo.forms.formWeeks.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {debugInfo.forms.formWeeks.map((week, index) => (
                      <div key={index} className="bg-blue-50 px-3 py-2 rounded text-sm text-center">
                        Week {week.weekNumber} ({week.year})
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No form weeks found</p>
                )}
              </div>
              
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-2">Recent Forms with Week Numbers</h3>
                {debugInfo.forms.recentForms.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Week</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created By</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created At</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {debugInfo.forms.recentForms.map((form, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{form.title}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{form.weekNumber}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{form.year}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{form.createdBy}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(form.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No recent forms with week numbers found</p>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
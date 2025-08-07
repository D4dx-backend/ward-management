import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import axios from 'axios';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';
import { useApiData } from '../../hooks/useApiData';

export default function DebugSurveyClusters() {
  const { data: session } = useSession();
  const [debugInfo, setDebugInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDebugInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('/api/debug/survey-clusters');
      setDebugInfo(response.data);
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
        <title>Debug Survey Clusters - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Debug Survey Clusters</h1>
            <p className="mt-1 text-sm text-gray-600">Debug cluster filtering in survey</p>
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

        {debugInfo && (
          <>
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Analysis Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Survey Info</h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Ward:</span> {debugInfo.ward.name}</p>
                      <p><span className="font-medium">Survey ID:</span> {debugInfo.survey.id}</p>
                      <p><span className="font-medium">Clusters in Survey:</span> {debugInfo.survey.clusterVisitsCount}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Issues Found</h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Actual Ward Clusters:</span> {debugInfo.actualWardClusters.count}</p>
                      <p className={`font-medium ${debugInfo.analysis.clustersInSurveyButNotInWard > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        Wrong Ward Clusters: {debugInfo.analysis.clustersInSurveyButNotInWard}
                      </p>
                      <p className={`font-medium ${debugInfo.analysis.clustersInWardButNotInSurvey > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        Missing Clusters: {debugInfo.analysis.clustersInWardButNotInSurvey}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Clusters in Survey Document</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Survey Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cluster ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual Cluster</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Belongs to Ward</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {debugInfo.survey.clusterVisitDetails.map((cluster, index) => (
                        <tr key={index} className={!cluster.belongsToThisWard ? 'bg-red-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cluster.surveyClusterName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">{cluster.clusterId}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {typeof cluster.actualCluster === 'object' ? cluster.actualCluster.name : cluster.actualCluster}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              cluster.belongsToThisWard ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {cluster.belongsToThisWard ? 'YES' : 'NO'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Actual Ward Clusters</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {debugInfo.actualWardClusters.clusters.map((cluster) => (
                        <tr key={cluster.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cluster.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cluster.number}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">{cluster.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              cluster.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {cluster.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
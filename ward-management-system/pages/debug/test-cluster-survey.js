import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import axios from 'axios';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';
import { useApiData } from '../../hooks/useApiData';

export default function TestClusterSurvey() {
  const { data: session } = useSession();
  const [surveyData, setSurveyData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSurvey = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/docker-survey/my-ward');
      setSurveyData(response.data);
      console.log('Survey data:', response.data);
    } catch (error) {
      console.error('Error fetching survey:', error);
      alert('Error: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === 'wardAdmin') {
      fetchSurvey();
    }
  }, [session]);

  if (!session) {
    return <Layout><div>Please log in</div></Layout>;
  }

  if (session.user.role !== 'wardAdmin') {
    return <Layout><div>Access denied. Ward Incharge only.</div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test Cluster Survey Structure</h1>
          <p className="text-gray-600">Testing the dynamic week structure implementation</p>
        </div>

        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Survey Structure Test</h2>
              <Button onClick={fetchSurvey} disabled={loading} size="sm">
                {loading ? 'Loading...' : 'Refresh Survey'}
              </Button>
            </div>
            
            {surveyData ? (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-gray-700">Ward</h3>
                    <p className="text-sm text-gray-600">{surveyData.ward?.name}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-700">Clusters Count</h3>
                    <p className="text-sm text-gray-600">{surveyData.clusterVisits?.length || 0}</p>
                  </div>
                </div>

                {/* Cluster Structure Analysis */}
                {surveyData.clusterVisits && surveyData.clusterVisits.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-700 mb-3">Cluster Structure Analysis</h3>
                    
                    {/* Check if using new dynamic structure */}
                    {surveyData.clusterVisits[0]?.formWeeks ? (
                      <div className="p-4 bg-green-50 border border-green-200 rounded">
                        <h4 className="font-medium text-green-800">✅ New Dynamic Structure Detected!</h4>
                        <div className="mt-2 space-y-2">
                          <p className="text-sm text-green-700">
                            <strong>Form Weeks Found:</strong> {surveyData.clusterVisits[0].formWeeks.length}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {surveyData.clusterVisits[0].formWeeks.map((week, index) => (
                              <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                Week {week.weekNumber}, {week.year}
                              </span>
                            ))}
                          </div>
                          <p className="text-sm text-green-700">
                            <strong>Weekly Data Keys:</strong> {Object.keys(surveyData.clusterVisits[0].weeklyData || {}).join(', ')}
                          </p>
                        </div>
                      </div>
                    ) : surveyData.clusterVisits[0]?.week1 ? (
                      <div className="p-4 bg-red-50 border border-red-200 rounded">
                        <h4 className="font-medium text-red-800">❌ Old Static Structure Detected</h4>
                        <p className="text-sm text-red-700 mt-1">
                          Still using week1, week2, week3, week4 structure. The dynamic structure update didn't work.
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                        <h4 className="font-medium text-yellow-800">⚠️ Unknown Structure</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          Cluster structure doesn't match expected patterns.
                        </p>
                      </div>
                    )}

                    {/* Sample Cluster Data */}
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-700 mb-2">Sample Cluster Data:</h4>
                      <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64">
                        {JSON.stringify(surveyData.clusterVisits[0], null, 2)}
                      </pre>
                    </div>

                    {/* All Clusters List */}
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-700 mb-2">All Clusters:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {surveyData.clusterVisits.map((cluster, index) => (
                          <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                            {cluster.clusterName}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Raw Data */}
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Raw Survey Data (First 50 lines):</h3>
                  <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64">
                    {JSON.stringify(surveyData, null, 2).split('\n').slice(0, 50).join('\n')}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading survey data...</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
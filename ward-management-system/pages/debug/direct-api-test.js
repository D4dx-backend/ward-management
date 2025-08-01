import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import axios from 'axios';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../../components/Shimmer';
import { useApiData } from '../../hooks/useApiData';

export default function DirectApiTest() {
  const { data: session } = useSession();
  const [apiResponse, setApiResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testApi = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Testing API directly...');
      const response = await axios.get('/api/docker-survey/my-ward', {
        params: { t: Date.now() } // Cache buster
      });
      
      console.log('API Response:', response.data);
      setApiResponse(response.data);
      
    } catch (err) {
      console.error('API Error:', err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return <Layout><div>Please log in as ward admin</div></Layout>;
  }

  if (session.user.role !== 'wardAdmin') {
    return <Layout><div>Access denied. Ward admin only.</div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Direct API Test</h1>
          <p className="text-gray-600">Testing the docker survey API directly</p>
        </div>

        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">API Response Test</h2>
              <Button onClick={testApi} disabled={loading}>
                {loading ? 'Testing...' : 'Test API'}
              </Button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
                <h3 className="font-medium text-red-800">Error:</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            )}

            {apiResponse && (
              <div className="space-y-4">
                {/* Structure Analysis */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <h3 className="font-medium text-blue-800 mb-2">Structure Analysis:</h3>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p><strong>Ward:</strong> {apiResponse.ward?.name}</p>
                    <p><strong>Clusters Count:</strong> {apiResponse.clusterVisits?.length || 0}</p>
                    
                    {apiResponse.clusterVisits?.[0] && (
                      <>
                        <p><strong>First Cluster:</strong> {apiResponse.clusterVisits[0].clusterName}</p>
                        <p><strong>Has formWeeks:</strong> {apiResponse.clusterVisits[0].formWeeks ? '✅ YES' : '❌ NO'}</p>
                        <p><strong>Has weeklyData:</strong> {apiResponse.clusterVisits[0].weeklyData ? '✅ YES' : '❌ NO'}</p>
                        
                        {apiResponse.clusterVisits[0].formWeeks && (
                          <div>
                            <p><strong>Form Weeks:</strong></p>
                            <div className="ml-4 flex flex-wrap gap-2 mt-1">
                              {apiResponse.clusterVisits[0].formWeeks.map((week, index) => (
                                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                  Week {week.weekNumber}, {week.year}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {apiResponse.clusterVisits[0].weeklyData && (
                          <div>
                            <p><strong>Weekly Data Keys:</strong></p>
                            <div className="ml-4 flex flex-wrap gap-2 mt-1">
                              {Object.keys(apiResponse.clusterVisits[0].weeklyData).map((key, index) => (
                                <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                  {key}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Check for old structure */}
                        {apiResponse.clusterVisits[0].week1 && (
                          <p className="text-red-600"><strong>⚠️ OLD STRUCTURE DETECTED:</strong> Still has week1, week2, etc.</p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* All Clusters */}
                {apiResponse.clusterVisits && apiResponse.clusterVisits.length > 0 && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded">
                    <h3 className="font-medium text-gray-800 mb-2">All Clusters:</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {apiResponse.clusterVisits.map((cluster, index) => (
                        <div key={index} className="text-sm p-2 bg-white rounded border">
                          <div className="font-medium">{cluster.clusterName}</div>
                          <div className="text-xs text-gray-500">
                            {cluster.formWeeks ? `${cluster.formWeeks.length} weeks` : 'No formWeeks'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw JSON */}
                <div>
                  <h3 className="font-medium text-gray-800 mb-2">Raw API Response (First 100 lines):</h3>
                  <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-96 border">
                    {JSON.stringify(apiResponse, null, 2).split('\n').slice(0, 100).join('\n')}
                  </pre>
                </div>
              </div>
            )}

            {!apiResponse && !loading && !error && (
              <div className="text-center py-8 text-gray-500">
                Click "Test API" to see the actual API response
              </div>
            )}
          </div>
        </Card>

        {/* Instructions */}
        <Card>
          <div className="p-6">
            <h3 className="font-medium text-gray-800 mb-2">What to Look For:</h3>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li><strong>✅ Success:</strong> Should show "Has formWeeks: YES" and "Has weeklyData: YES"</li>
              <li><strong>✅ Form Weeks:</strong> Should show "Week 31, 2025", "Week 30, 2025", "Week 29, 2025"</li>
              <li><strong>✅ Weekly Data Keys:</strong> Should show "2025-31", "2025-30", "2025-29"</li>
              <li><strong>❌ Problem:</strong> If it shows "OLD STRUCTURE DETECTED" or missing formWeeks</li>
            </ul>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
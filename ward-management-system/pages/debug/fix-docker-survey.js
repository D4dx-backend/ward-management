import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import axios from 'axios';

export default function FixDockerSurvey() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const addResult = (message, type = 'info') => {
    setResults(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const fixDockerSurvey = async () => {
    try {
      setLoading(true);
      clearResults();
      
      addResult('🚀 Starting Docker Survey fix process...', 'info');
      
      // Step 1: Clear all existing DockerSurvey records
      addResult('Step 1: Clearing all existing DockerSurvey records...', 'info');
      const clearResponse = await axios.post('/api/debug/clear-docker-surveys');
      addResult(`✅ Cleared ${clearResponse.data.deletedCount} existing records`, 'success');
      
      // Step 2: Test the API to create new dynamic structure
      addResult('Step 2: Testing API to create new dynamic structure...', 'info');
      const apiResponse = await axios.get(`/api/docker-survey/my-ward?t=${Date.now()}`);
      
      if (apiResponse.data?.clusterVisits?.[0]?.formWeeks) {
        addResult(`✅ SUCCESS! Created dynamic structure with ${apiResponse.data.clusterVisits[0].formWeeks.length} weeks`, 'success');
        addResult(`📅 Form weeks found: ${apiResponse.data.clusterVisits[0].formWeeks.map(w => `Week ${w.weekNumber}, ${w.year}`).join(', ')}`, 'success');
        addResult(`🏢 Clusters: ${apiResponse.data.clusterVisits.length} clusters created`, 'success');
      } else if (apiResponse.data?.clusterVisits?.[0]?.week1) {
        addResult('❌ Still getting old structure (week1, week2, etc.)', 'error');
      } else {
        addResult('⚠️ Unexpected structure received', 'warning');
      }
      
      addResult('🎉 Fix process completed! Try refreshing your Docker Survey page.', 'success');
      
    } catch (error) {
      console.error('Error fixing Docker Survey:', error);
      addResult(`❌ Error: ${error.response?.data?.message || error.message}`, 'error');
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
          <h1 className="text-2xl font-bold text-gray-900">Fix Docker Survey Structure</h1>
          <p className="text-gray-600">This will fix the week1-week4 issue and create dynamic form-based weeks</p>
        </div>

        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Docker Survey Fix</h2>
              <div className="flex space-x-2">
                <Button onClick={clearResults} variant="outline" size="sm" disabled={loading}>
                  Clear Log
                </Button>
                <Button onClick={fixDockerSurvey} disabled={loading} className="bg-green-600">
                  {loading ? 'Fixing...' : 'Fix Docker Survey'}
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
              <h3 className="font-medium text-blue-800 mb-2">What this fix does:</h3>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>Deletes all existing DockerSurvey records with old week1-week4 structure</li>
                <li>Creates new dynamic structure based on your FormTemplate weeks</li>
                <li>Uses your actual form periods: Week 31, Week 30, Week 29 (2025)</li>
                <li>Updates all APIs to use the new dynamic structure</li>
              </ul>
            </div>

            {/* Results Log */}
            <div className="space-y-2">
              <h3 className="font-medium text-gray-800">Process Log:</h3>
              <div className="bg-gray-50 border border-gray-200 rounded p-4 max-h-64 overflow-y-auto">
                {results.length === 0 ? (
                  <p className="text-gray-500 text-sm">Click "Fix Docker Survey" to start the process...</p>
                ) : (
                  <div className="space-y-1">
                    {results.map((result, index) => (
                      <div key={index} className={`text-sm flex items-start space-x-2 ${
                        result.type === 'success' ? 'text-green-700' :
                        result.type === 'error' ? 'text-red-700' :
                        result.type === 'warning' ? 'text-yellow-700' :
                        'text-gray-700'
                      }`}>
                        <span className="text-xs text-gray-500 w-16 flex-shrink-0">{result.timestamp}</span>
                        <span>{result.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Next Steps */}
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
              <h3 className="font-medium text-green-800 mb-2">After running the fix:</h3>
              <ol className="text-sm text-green-700 space-y-1 list-decimal list-inside">
                <li>Go to your Docker Survey page: <code>/ward/docker-survey</code></li>
                <li>Click on the "Cluster Visits" tab</li>
                <li>You should see "Week 31, 2025", "Week 30, 2025", "Week 29, 2025" instead of "Old Structure"</li>
                <li>All 6 clusters should be visible with input fields for Houses and Days</li>
              </ol>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
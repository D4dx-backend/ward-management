import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import axios from 'axios';
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../components/Shimmer';
import { useApiData } from '../hooks/useApiData';

export default function DebugSurveys() {
  const { data: session } = useSession();
  const [dockerSurvey, setDockerSurvey] = useState(null);
  const [wardBasicData, setWardBasicData] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const testSession = async () => {
    try {
      setLoading(true);
      addLog('Testing session authentication...', 'info');

      const response = await axios.get('/api/test-session');
      addLog(`✓ Session test successful: ${response.data.user.name} (${response.data.user.role})`, 'success');
    } catch (error) {
      addLog(`❌ Session test failed: ${error.response?.data?.message || error.message}`, 'error');
      console.error('Session test error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testDockerSurvey = async () => {
    if (!session?.user?.role === 'wardAdmin') {
      addLog('You must be a Ward Incharge to test Docker Survey', 'error');
      return;
    }

    try {
      setLoading(true);
      addLog('Testing Docker Survey system...', 'info');

      // Test GET
      addLog('1. Fetching Docker Survey...', 'info');
      const getResponse = await axios.get('/api/docker-survey/my-ward');
      setDockerSurvey(getResponse.data);
      addLog(`✓ Survey fetched. Completion: ${getResponse.data.completionRate}%`, 'success');

      // Test question update
      addLog('2. Testing question update...', 'info');
      const updateResponse = await axios.put('/api/docker-survey/my-ward', {
        questionKey: 'populationCensus',
        status: 'ongoing'
      });
      addLog('✓ Question update successful', 'success');

      // Test basic survey update
      addLog('3. Testing basic survey update...', 'info');
      const basicResponse = await axios.put('/api/docker-survey/my-ward', {
        basicSurveyStatus: 'completed'
      });
      addLog('✓ Basic survey update successful', 'success');

      setDockerSurvey(basicResponse.data);
      addLog(`Final completion rate: ${basicResponse.data.completionRate}%`, 'success');

    } catch (error) {
      addLog(`❌ Docker Survey test failed: ${error.response?.data?.message || error.message}`, 'error');
      console.error('Docker Survey test error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testWardBasicData = async () => {
    try {
      setLoading(true);
      addLog('Testing Ward Basic Data system...', 'info');

      // Test GET forms
      addLog('1. Fetching ward basic forms...', 'info');
      const formsResponse = await axios.get('/api/ward-basic-forms');
      addLog(`✓ Found ${formsResponse.data.length} forms`, 'success');

      if (formsResponse.data.length === 0) {
        addLog('⚠️ No forms available for testing', 'warning');
        return;
      }

      // Test GET data
      addLog('2. Fetching ward basic data...', 'info');
      const dataResponse = await axios.get('/api/ward-basic-data');
      setWardBasicData(dataResponse.data);
      addLog(`✓ Found ${dataResponse.data.length} data entries`, 'success');

      if (dataResponse.data.length > 0) {
        // Test PUT update
        addLog('3. Testing data update...', 'info');
        const firstData = dataResponse.data[0];
        const updateResponse = await axios.put(`/api/ward-basic-data/${firstData._id}`, {
          data: { ...firstData.data, testField: 'Updated at ' + new Date().toISOString() }
        });
        addLog('✓ Data update successful', 'success');
      }

    } catch (error) {
      addLog(`❌ Ward Basic Data test failed: ${error.response?.data?.message || error.message}`, 'error');
      console.error('Ward Basic Data test error:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  if (!session) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p>Please log in to access the debug page.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Survey Systems Debug</h1>
          <div className="text-sm text-gray-500">
            User: {session.user.name} ({session.user.role})
          </div>
        </div>

        {/* Test Controls */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Test Controls</h2>
          <div className="flex space-x-4 flex-wrap">
            <Button 
              onClick={testSession} 
              disabled={loading}
              variant="outline"
            >
              Test Session
            </Button>
            <Button 
              onClick={testDockerSurvey} 
              disabled={loading || session.user.role !== 'wardAdmin'}
            >
              Test Docker Survey
            </Button>
            <Button 
              onClick={testWardBasicData} 
              disabled={loading}
              variant="outline"
            >
              Test Ward Basic Data
            </Button>
            <Button 
              onClick={clearLogs} 
              variant="outline"
              className="ml-auto"
            >
              Clear Logs
            </Button>
          </div>
          {session.user.role !== 'wardAdmin' && (
            <p className="text-sm text-yellow-600 mt-2">
              Note: Docker Survey tests require Ward Incharge role
            </p>
          )}
        </Card>

        {/* Logs */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Test Logs</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet. Run a test to see results.</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className={`mb-1 ${
                  log.type === 'error' ? 'text-red-400' : 
                  log.type === 'success' ? 'text-green-400' : 
                  log.type === 'warning' ? 'text-yellow-400' : 
                  'text-gray-300'
                }`}>
                  <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Docker Survey Status */}
        {dockerSurvey && (
          <Card>
            <h2 className="text-lg font-semibold mb-4">Docker Survey Status</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">Basic Info</h3>
                <p className="text-sm text-gray-600">Ward: {dockerSurvey.ward?.name}</p>
                <p className="text-sm text-gray-600">Completion: {dockerSurvey.completionRate}%</p>
                <p className="text-sm text-gray-600">Basic Survey: {dockerSurvey.basicSurvey?.status}</p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Question Status</h3>
                <div className="text-sm space-y-1">
                  {Object.entries(dockerSurvey.questions || {}).slice(0, 5).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="truncate">{key}:</span>
                      <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                        value.status === 'completed' ? 'bg-green-100 text-green-800' :
                        value.status === 'ongoing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {value.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Ward Basic Data Status */}
        {wardBasicData.length > 0 && (
          <Card>
            <h2 className="text-lg font-semibold mb-4">Ward Basic Data Status</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ward</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Form</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {wardBasicData.slice(0, 5).map((data) => (
                    <tr key={data._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {data.ward?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {data.form?.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          data.status === 'approved' ? 'bg-green-100 text-green-800' :
                          data.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {data.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(data.submittedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
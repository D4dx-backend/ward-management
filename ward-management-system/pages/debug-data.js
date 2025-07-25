import { useState } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';

export default function DebugData() {
  const { data: session } = useSession();
  const [data, setData] = useState(null);
  const [fixResult, setFixResult] = useState(null);
  const [cleanupResult, setCleanupResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/check-data');
      setData(response.data);
    } catch (error) {
      console.error('Error checking data:', error);
      setData({ error: error.message });
    }
    setLoading(false);
  };

  const fixCoordinatorDistrict = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/fix-coordinator-district');
      setFixResult(response.data);
    } catch (error) {
      console.error('Error fixing coordinator:', error);
      setFixResult({ error: error.message });
    }
    setLoading(false);
  };

  const cleanupActivityLogs = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/cleanup-activity-logs');
      setCleanupResult(response.data);
    } catch (error) {
      console.error('Error cleaning up activity logs:', error);
      setCleanupResult({ error: error.message });
    }
    setLoading(false);
  };

  if (!session) {
    return <div className="p-8">Please log in to access this debug page.</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Data Page</h1>
      
      <div className="space-y-4 mb-8">
        <button
          onClick={checkData}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Check System Data'}
        </button>
        
        <button
          onClick={fixCoordinatorDistrict}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 ml-4"
        >
          {loading ? 'Loading...' : 'Fix Coordinator District'}
        </button>
        
        <button
          onClick={cleanupActivityLogs}
          disabled={loading}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50 ml-4"
        >
          {loading ? 'Loading...' : 'Clean Activity Logs'}
        </button>
      </div>

      {data && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">System Data</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}

      {fixResult && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Fix Result</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(fixResult, null, 2)}
          </pre>
        </div>
      )}

      {cleanupResult && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Activity Logs Cleanup Result</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(cleanupResult, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Current Session</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>
    </div>
  );
}
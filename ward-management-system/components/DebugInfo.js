import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function DebugInfo() {
  const { data: session } = useSession();
  const [debugData, setDebugData] = useState(null);
  const [error, setError] = useState('');

  const testSession = async () => {
    try {
      const response = await axios.get('/api/test-session');
      setDebugData(response.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setDebugData(null);
    }
  };

  useEffect(() => {
    if (session) {
      testSession();
    }
  }, [session]);

  if (!session) return null;

  return (
    <div className="bg-gray-100 p-4 rounded mb-4">
      <h3 className="font-bold mb-2">Debug Information</h3>

      <div className="mb-2">
        <strong>Client Session:</strong>
        <pre className="text-xs bg-white p-2 rounded mt-1">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>

      {debugData && (
        <div className="mb-2">
          <strong>Server Session Test:</strong>
          <pre className="text-xs bg-white p-2 rounded mt-1">
            {JSON.stringify(debugData, null, 2)}
          </pre>
        </div>
      )}

      {error && (
        <div className="mb-2">
          <strong>Error:</strong>
          <div className="text-red-600 text-sm">{error}</div>
        </div>
      )}

      <button
        onClick={testSession}
        className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
      >
        Test Session
      </button>
    </div>
  );
}
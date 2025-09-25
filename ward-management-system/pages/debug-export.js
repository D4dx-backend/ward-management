import { useState } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';

export default function DebugExport() {
  const { data: session, status } = useSession();
  const [testResult, setTestResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const testExport = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      console.log('Testing export with session:', session);
      
      const response = await axios.get('/api/reports/export', {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      setTestResult({
        success: true,
        message: 'Export test successful',
        data: response.data
      });
    } catch (error) {
      console.error('Export test failed:', error);
      setTestResult({
        success: false,
        message: 'Export test failed',
        error: {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testSession = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      const response = await axios.get('/api/debug/session-test', {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      setTestResult({
        success: true,
        message: 'Session test successful',
        data: response.data
      });
    } catch (error) {
      console.error('Session test failed:', error);
      setTestResult({
        success: false,
        message: 'Session test failed',
        error: {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return <div className="p-8">Loading...</div>;
  }

  if (!session) {
    return <div className="p-8">Please log in to test export functionality.</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Export Debug Tool</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Current Session</h2>
        <pre className="text-sm bg-white p-2 rounded border overflow-auto">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>

      <div className="space-y-4">
        <button
          onClick={testSession}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test Session API'}
        </button>

        <button
          onClick={testExport}
          disabled={isLoading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 ml-4"
        >
          {isLoading ? 'Testing...' : 'Test Export API'}
        </button>
      </div>

      {testResult && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">
            Test Result: {testResult.success ? 'SUCCESS' : 'FAILED'}
          </h2>
          <p className="mb-2">{testResult.message}</p>
          <pre className="text-sm bg-white p-2 rounded border overflow-auto">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

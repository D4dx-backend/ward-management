import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function DebugFormStats() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [testResults, setTestResults] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'coordinator') {
      router.push('/');
    }
  }, [status, session, router]);

  const runTest = async (testName, endpoint) => {
    setIsLoading(true);
    try {
      const response = await axios.get(endpoint);
      setTestResults(prev => ({
        ...prev,
        [testName]: {
          success: true,
          data: response.data,
          status: response.status
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [testName]: {
          success: false,
          error: error.response?.data || error.message,
          status: error.response?.status || 'Network Error'
        }
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const runAllTests = async () => {
    await runTest('coordinator-test', '/api/coordinator/test');
    await runTest('form-statistics', '/api/coordinator/form-statistics');
  };

  return (
    <Layout>
      <Head>
        <title>Debug Form Statistics - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Debug Form Statistics</h1>
            <p className="mt-1 text-sm text-gray-600">Test API endpoints and troubleshoot issues</p>
          </div>
          
          <Button onClick={runAllTests} disabled={isLoading}>
            {isLoading ? 'Running Tests...' : 'Run All Tests'}
          </Button>
        </div>

        {/* Session Info */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Session Information</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-sm text-gray-700">
                {JSON.stringify(session, null, 2)}
              </pre>
            </div>
          </div>
        </Card>

        {/* Test Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Coordinator Test API</h3>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => runTest('coordinator-test', '/api/coordinator/test')}
                  disabled={isLoading}
                >
                  Test
                </Button>
              </div>
              
              {testResults['coordinator-test'] ? (
                <div className={`p-4 rounded-lg ${
                  testResults['coordinator-test'].success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center mb-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      testResults['coordinator-test'].success
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      Status: {testResults['coordinator-test'].status}
                    </span>
                  </div>
                  <pre className="text-sm text-gray-700 overflow-auto">
                    {JSON.stringify(
                      testResults['coordinator-test'].success 
                        ? testResults['coordinator-test'].data 
                        : testResults['coordinator-test'].error, 
                      null, 2
                    )}
                  </pre>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">Click "Test" to run this endpoint</div>
              )}
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Form Statistics API</h3>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => runTest('form-statistics', '/api/coordinator/form-statistics')}
                  disabled={isLoading}
                >
                  Test
                </Button>
              </div>
              
              {testResults['form-statistics'] ? (
                <div className={`p-4 rounded-lg ${
                  testResults['form-statistics'].success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center mb-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      testResults['form-statistics'].success
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      Status: {testResults['form-statistics'].status}
                    </span>
                  </div>
                  <pre className="text-sm text-gray-700 overflow-auto max-h-96">
                    {JSON.stringify(
                      testResults['form-statistics'].success 
                        ? testResults['form-statistics'].data 
                        : testResults['form-statistics'].error, 
                      null, 2
                    )}
                  </pre>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">Click "Test" to run this endpoint</div>
              )}
            </div>
          </Card>
        </div>

        {/* Quick Links */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Links</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                onClick={() => router.push('/coordinator/form-statistics')}
                className="justify-center"
              >
                Go to Form Statistics
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/coordinator')}
                className="justify-center"
              >
                Go to Dashboard
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="justify-center"
              >
                Reload Page
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
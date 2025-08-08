import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function TestWardAdminAPIs() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'wardAdmin') {
      router.push('/');
    }
  }, [status, session, router]);

  const addResult = (message, type = 'info') => {
    setResults(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }]);
  };

  const testAPIs = async () => {
    setResults([]);
    setIsLoading(true);
    
    try {
      addResult('Starting Ward Admin API tests...', 'info');
      addResult(`Testing as user: ${session.user.name} (${session.user.role})`, 'info');

      // Test 1: Forms API
      addResult('1. Testing /api/forms...', 'info');
      try {
        const formsResponse = await axios.get('/api/forms', {
          params: {
            formType: 'wardReport',
            availableOnly: true,
          }
        });
        addResult(`✓ Forms API successful - Found ${formsResponse.data.length} forms`, 'success');
        addResult(`Forms data: ${JSON.stringify(formsResponse.data.map(f => ({ id: f._id, title: f.title })), null, 2)}`, 'info');
      } catch (error) {
        addResult(`✗ Forms API failed: ${error.response?.data?.message || error.message}`, 'error');
        addResult(`Error details: ${JSON.stringify(error.response?.data, null, 2)}`, 'error');
      }

      // Test 2: Wards API
      addResult('2. Testing /api/wards...', 'info');
      try {
        const wardsResponse = await axios.get('/api/wards');
        addResult(`✓ Wards API successful - Found ${wardsResponse.data.length} wards`, 'success');
        addResult(`Wards data: ${JSON.stringify(wardsResponse.data.map(w => ({ id: w._id, name: w.name })), null, 2)}`, 'info');
      } catch (error) {
        addResult(`✗ Wards API failed: ${error.response?.data?.message || error.message}`, 'error');
        addResult(`Error details: ${JSON.stringify(error.response?.data, null, 2)}`, 'error');
      }

      // Test 3: Responses API
      addResult('3. Testing /api/responses...', 'info');
      try {
        const responsesResponse = await axios.get('/api/responses', {
          params: {
            formType: 'wardReport'
          }
        });
        addResult(`✓ Responses API successful - Found ${responsesResponse.data.length} responses`, 'success');
        addResult(`Responses data: ${JSON.stringify(responsesResponse.data.map(r => ({ id: r._id, formTitle: r.formTemplate?.title })), null, 2)}`, 'info');
      } catch (error) {
        addResult(`✗ Responses API failed: ${error.response?.data?.message || error.message}`, 'error');
        addResult(`Error details: ${JSON.stringify(error.response?.data, null, 2)}`, 'error');
      }

      // Test 4: Session info
      addResult('4. Session information:', 'info');
      addResult(`User ID: ${session.user.id}`, 'info');
      addResult(`User Role: ${session.user.role}`, 'info');
      addResult(`User District: ${session.user.district}`, 'info');
      addResult(`User Name: ${session.user.name}`, 'info');

    } catch (error) {
      addResult(`General error: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return <Layout><div>Loading...</div></Layout>;
  }

  if (status === 'unauthenticated' || session.user.role !== 'wardAdmin') {
    return <Layout><div>Access denied</div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ward Admin API Test</h1>
            <p className="mt-1 text-sm text-gray-600">Test the APIs used by ward admin report submission</p>
          </div>
          <Button onClick={testAPIs} disabled={isLoading}>
            {isLoading ? 'Testing...' : 'Run Tests'}
          </Button>
        </div>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Test Results</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.length === 0 ? (
                <p className="text-gray-500">Click "Run Tests" to start testing the APIs</p>
              ) : (
                results.map((result, index) => (
                  <div key={index} className={`p-2 rounded text-sm ${
                    result.type === 'success' ? 'bg-green-50 text-green-800' :
                    result.type === 'error' ? 'bg-red-50 text-red-800' :
                    'bg-gray-50 text-gray-800'
                  }`}>
                    <span className="text-xs text-gray-500">[{result.timestamp}]</span> {result.message}
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
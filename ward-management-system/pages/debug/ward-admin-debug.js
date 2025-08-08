import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function WardAdminDebug() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [wardData, setWardData] = useState(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session.user.role !== 'wardAdmin') {
      router.push('/');
    }
  }, [status, session, router]);

  const addResult = (message, type = 'info', data = null) => {
    setResults(prev => [...prev, { 
      message, 
      type, 
      data,
      timestamp: new Date().toLocaleTimeString() 
    }]);
  };

  const runDiagnostics = async () => {
    setResults([]);
    setIsLoading(true);
    
    try {
      addResult('🔍 Starting Ward Admin Diagnostics...', 'info');
      addResult(`👤 User: ${session.user.name} (${session.user.email})`, 'info');
      addResult(`🎭 Role: ${session.user.role}`, 'info');
      addResult(`🆔 User ID: ${session.user.id}`, 'info');
      addResult(`🏛️ District: ${session.user.district || 'Not set'}`, 'info');

      // Test 1: Session validation
      addResult('1️⃣ Testing session validity...', 'info');
      if (!session.user.id) {
        addResult('❌ Session missing user ID', 'error');
        return;
      }
      addResult('✅ Session is valid', 'success');

      // Test 2: Database connectivity
      addResult('2️⃣ Testing database connectivity...', 'info');
      try {
        const dbTest = await axios.get('/api/test-connection');
        addResult('✅ Database connection successful', 'success');
      } catch (dbError) {
        addResult(`❌ Database connection failed: ${dbError.message}`, 'error');
      }

      // Test 3: Wards API detailed test
      addResult('3️⃣ Testing Wards API...', 'info');
      try {
        const wardsResponse = await axios.get('/api/wards', {
          timeout: 15000,
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        addResult(`✅ Wards API successful - Found ${wardsResponse.data.length} wards`, 'success');
        setWardData(wardsResponse.data);
        
        if (wardsResponse.data.length === 0) {
          addResult('⚠️ No wards assigned to this user', 'warning');
          addResult('💡 This means the wardAdmin field in the Ward collection does not match your user ID', 'info');
        } else {
          wardsResponse.data.forEach((ward, index) => {
            addResult(`📍 Ward ${index + 1}: ${ward.name} (${ward.district})`, 'info', ward);
          });
        }
      } catch (wardsError) {
        addResult(`❌ Wards API failed: ${wardsError.response?.data?.message || wardsError.message}`, 'error');
        addResult(`🔍 Status: ${wardsError.response?.status}`, 'error');
        addResult(`🔍 Error details: ${JSON.stringify(wardsError.response?.data, null, 2)}`, 'error');
      }

      // Test 4: Forms API
      addResult('4️⃣ Testing Forms API...', 'info');
      try {
        const formsResponse = await axios.get('/api/forms', {
          params: {
            formType: 'wardReport',
            availableOnly: true,
          }
        });
        addResult(`✅ Forms API successful - Found ${formsResponse.data.length} forms`, 'success');
      } catch (formsError) {
        addResult(`❌ Forms API failed: ${formsError.response?.data?.message || formsError.message}`, 'error');
      }

      // Test 5: Responses API
      addResult('5️⃣ Testing Responses API...', 'info');
      try {
        const responsesResponse = await axios.get('/api/responses', {
          params: {
            formType: 'wardReport'
          }
        });
        addResult(`✅ Responses API successful - Found ${responsesResponse.data.length} responses`, 'success');
      } catch (responsesError) {
        addResult(`❌ Responses API failed: ${responsesError.response?.data?.message || responsesError.message}`, 'error');
      }

      // Test 6: Ward assignment check
      addResult('6️⃣ Checking ward assignments in database...', 'info');
      try {
        const userCheck = await axios.get(`/api/users/${session.user.id}`);
        addResult('✅ User data retrieved successfully', 'success');
        addResult(`👤 User details: ${JSON.stringify({
          name: userCheck.data.name,
          email: userCheck.data.email,
          role: userCheck.data.role,
          district: userCheck.data.district
        }, null, 2)}`, 'info');
      } catch (userError) {
        addResult(`❌ Failed to get user data: ${userError.message}`, 'error');
      }

      addResult('🎉 Diagnostics completed!', 'success');

    } catch (error) {
      addResult(`💥 General error: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const testReportsPage = () => {
    addResult('🚀 Navigating to reports page...', 'info');
    router.push('/ward/reports/submit');
  };

  if (status === 'loading') {
    return <Layout><div>Loading...</div></Layout>;
  }

  if (status === 'unauthenticated' || session.user.role !== 'wardAdmin') {
    return <Layout><div>Access denied - Ward Admin only</div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ward Admin Debug Center</h1>
            <p className="mt-1 text-sm text-gray-600">Diagnose and fix ward admin issues</p>
          </div>
          <div className="flex space-x-3">
            <Button onClick={runDiagnostics} disabled={isLoading}>
              {isLoading ? 'Running...' : '🔍 Run Diagnostics'}
            </Button>
            <Button variant="outline" onClick={testReportsPage}>
              🧪 Test Reports Page
            </Button>
          </div>
        </div>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Diagnostic Results</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.length === 0 ? (
                <p className="text-gray-500">Click "Run Diagnostics" to start testing</p>
              ) : (
                results.map((result, index) => (
                  <div key={index} className={`p-3 rounded text-sm ${
                    result.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
                    result.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                    result.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                    'bg-gray-50 text-gray-800 border border-gray-200'
                  }`}>
                    <div className="flex justify-between items-start">
                      <span className="flex-1">{result.message}</span>
                      <span className="text-xs text-gray-500 ml-2">[{result.timestamp}]</span>
                    </div>
                    {result.data && (
                      <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        {wardData && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Ward Assignment Details</h3>
              {wardData.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-red-500">
                    <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="mt-2 text-sm font-medium">No Ward Assignments Found</p>
                    <p className="mt-1 text-sm">Your user ID ({session.user.id}) is not assigned to any wards.</p>
                    <p className="mt-1 text-sm">Contact your administrator to assign you to a ward.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {wardData.map((ward, index) => (
                    <div key={ward._id} className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900">{ward.name}</h4>
                      <p className="text-sm text-gray-600">District: {ward.district}</p>
                      <p className="text-sm text-gray-600">Ward Number: {ward.wardNumber}</p>
                      <p className="text-xs text-gray-500 mt-2">ID: {ward._id}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Common Solutions</h3>
            <div className="space-y-4 text-sm">
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-medium">If "Failed to fetch wards" error:</h4>
                <ul className="mt-2 space-y-1 text-gray-600">
                  <li>• Check if you're assigned to any wards in the database</li>
                  <li>• Verify your user ID matches the wardAdmin field in Ward collection</li>
                  <li>• Ensure database connection is working</li>
                  <li>• Check if session is valid and contains correct user data</li>
                </ul>
              </div>
              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-medium">If no wards assigned:</h4>
                <ul className="mt-2 space-y-1 text-gray-600">
                  <li>• Contact your coordinator or administrator</li>
                  <li>• Ask them to assign you to a ward using the admin panel</li>
                  <li>• Verify your user role is set to 'wardAdmin'</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
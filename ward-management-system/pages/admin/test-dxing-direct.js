import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function TestDxingDirect() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [recipient, setRecipient] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  if (session.user.role !== 'stateAdmin') {
    router.push('/');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await axios.post('/api/test-dxing-direct', { recipient });
      setResult(response.data);
    } catch (error) {
      setResult({
        success: false,
        message: error.response?.data?.message || error.message,
        error: error.response?.data || error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Test DXing Direct API - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test DXing Direct API</h1>
          <p className="mt-1 text-sm text-gray-600">Direct test of DXing WhatsApp API with exact credentials</p>
        </div>

        <Card>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Mobile Number *
                </label>
                <input
                  type="text"
                  id="recipient"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 9876543210"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter 10-digit mobile number (will be formatted as 91xxxxxxxxxx)
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Test Configuration:</h3>
                <div className="text-xs text-blue-700 space-y-1">
                  <div><strong>Secret:</strong> 18ed3b36a814c961ecf50b5ab3079f9bcd1704e7</div>
                  <div><strong>Account:</strong> 1728045549a5771bce93e200c36f7cd9dfd0e5deaa66ffe1ed4ae7c</div>
                  <div><strong>URL:</strong> https://app.dxing.in/api/send/whatsapp</div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send Test Message'}
                </Button>
              </div>
            </form>
          </div>
        </Card>

        {result && (
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Test Result</h2>
              
              <div className={`p-4 rounded-lg mb-4 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    {result.success ? (
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                      {result.message}
                    </p>
                  </div>
                </div>
              </div>

              {result.payload && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Sent Payload:</h3>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(result.payload, null, 2)}
                  </pre>
                </div>
              )}

              {result.response && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">API Response:</h3>
                  <pre className="bg-green-100 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(result.response, null, 2)}
                  </pre>
                </div>
              )}

              {result.error && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Error Details:</h3>
                  <pre className="bg-red-100 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(result.error, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
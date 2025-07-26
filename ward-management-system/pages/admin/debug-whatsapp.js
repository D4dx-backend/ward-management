import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function DebugWhatsApp() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [formData, setFormData] = useState({
    recipient: '',
    message: 'Test message from Ward Management System - Debug Mode'
  });
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
      const response = await axios.post('/api/debug-whatsapp', formData);
      setResult(response.data);
    } catch (error) {
      setResult({
        success: false,
        error: error.response?.data?.message || error.message,
        debugInfo: error.response?.data || null
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  return (
    <Layout>
      <Head>
        <title>Debug WhatsApp Integration - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Debug WhatsApp Integration</h1>
          <p className="mt-1 text-sm text-gray-600">Debug and troubleshoot WhatsApp API issues</p>
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
                  name="recipient"
                  value={formData.recipient}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., +919876543210 or 9876543210"
                  required
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Test Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter test message"
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Debugging...' : 'Debug WhatsApp'}
                </Button>
              </div>
            </form>
          </div>
        </Card>

        {result && (
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Debug Results</h2>
              
              {/* Success/Error Status */}
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
                      {result.success ? 'WhatsApp API call successful!' : 'WhatsApp API call failed'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Debug Information */}
              {result.debugInfo && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Debug Information:</h3>
                  <div className="bg-gray-100 p-3 rounded text-xs">
                    <div><strong>Original Recipient:</strong> {result.debugInfo.originalRecipient}</div>
                    <div><strong>Formatted Recipient:</strong> {result.debugInfo.formattedRecipient}</div>
                    <div className="mt-2"><strong>Environment Variables:</strong></div>
                    <ul className="ml-4">
                      <li>DXING_API_SECRET: {result.debugInfo.environment.DXING_API_SECRET}</li>
                      <li>DXING_ACCOUNT_ID: {result.debugInfo.environment.DXING_ACCOUNT_ID}</li>
                      <li>DXING_API_URL: {result.debugInfo.environment.DXING_API_URL}</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Payload */}
              {result.payload && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">API Payload:</h3>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(result.payload, null, 2)}
                  </pre>
                </div>
              )}

              {/* API Response */}
              {result.apiResponse && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">API Response:</h3>
                  <pre className="bg-green-100 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(result.apiResponse, null, 2)}
                  </pre>
                </div>
              )}

              {/* API Error */}
              {result.apiError && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">API Error:</h3>
                  <pre className="bg-red-100 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(result.apiError, null, 2)}
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
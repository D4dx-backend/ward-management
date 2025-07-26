import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function TestWhatsApp() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [formData, setFormData] = useState({
    type: 'simple',
    recipient: '',
    name: 'Test User',
    email: 'test@example.com'
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
      const response = await axios.post('/api/test-whatsapp', formData);
      setResult(response.data);
    } catch (error) {
      setResult({
        success: false,
        message: error.response?.data?.message || error.message,
        error: error.response?.data?.error || error.message
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
        <title>Test WhatsApp Integration - Ward Management System</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test WhatsApp Integration</h1>
          <p className="mt-1 text-sm text-gray-600">Test the DXing WhatsApp API integration</p>
        </div>

        <Card>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Message Type
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="simple">Simple Test Message</option>
                  <option value="welcome">Welcome Message (with credentials)</option>
                  <option value="reset">Password Reset Message</option>
                </select>
              </div>

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
                <p className="text-xs text-gray-500 mt-1">
                  Enter mobile number with or without country code
                </p>
              </div>

              {(formData.type === 'welcome' || formData.type === 'reset') && (
                <>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      User Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Test User"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="test@example.com"
                    />
                  </div>
                </>
              )}

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
              <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
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
                    {result.error && (
                      <p className="text-sm text-red-600 mt-1">
                        Error: {result.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {result.data && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">API Response:</h3>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </Card>
        )}

        <Card>
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Configuration Info</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">API URL:</span> {process.env.NEXT_PUBLIC_DXING_API_URL || 'https://app.dxing.in/api/send/whatsapp'}
              </div>
              <div>
                <span className="font-medium">Account ID:</span> {process.env.NEXT_PUBLIC_DXING_ACCOUNT_ID ? '***configured***' : 'Not configured'}
              </div>
              <div>
                <span className="font-medium">API Secret:</span> {process.env.NEXT_PUBLIC_DXING_API_SECRET ? '***configured***' : 'Not configured'}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}